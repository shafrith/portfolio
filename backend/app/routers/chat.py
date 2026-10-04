import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.core.deps import ContentDep, SettingsDep, enforce_rate_limit
from app.core.rate_limit import client_ip
from app.schemas.chat import ChatQuota, ChatRequest
from app.schemas.content import PortfolioContent
from app.services.chat import ChatEvent, answer
from app.services.rag import Retriever, build_retriever

router = APIRouter(tags=["chat"])


def _retriever_for(request: Request, content: PortfolioContent) -> Retriever:
    """Rebuild the index only when profile.json has changed (load_content returns a new object)."""
    cached = getattr(request.app.state, "retriever_cache", None)
    if cached is None or cached[0] is not content:
        cached = (content, build_retriever(content, request.app.state.settings))
        request.app.state.retriever_cache = cached
    return cached[1]


def _sse(event: ChatEvent) -> str:
    return f"event: {event.event}\ndata: {json.dumps(event.data, ensure_ascii=False)}\n\n"


def _limit_message(content: PortfolioContent, limit: int) -> str:
    p = content.profile
    reach = f"at {p.links.email} or " if p.links.email else ""
    return (
        f"You've used all {limit} questions for today. Thanks for your interest in "
        f"{p.short_name}! To keep the conversation going, reach him {reach}"
        "through the contact form."
    )


@router.get("/chat/quota", response_model=ChatQuota)
def chat_quota(request: Request, settings: SettingsDep) -> ChatQuota:
    """How many questions this visitor has left (doesn't use one up)."""
    limiter = request.app.state.chat_limiter
    key = client_ip(request, settings.trust_proxy_headers)
    return ChatQuota(limit=limiter.limit, remaining=limiter.remaining(key))


@router.post(
    "/chat",
    response_class=StreamingResponse,
    responses={200: {"content": {"text/event-stream": {}}, "description": "SSE stream"}},
)
async def chat(
    payload: ChatRequest, request: Request, settings: SettingsDep, content: ContentDep
) -> StreamingResponse:
    if len(payload.message) > settings.chat_max_message_chars:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Message must be at most {settings.chat_max_message_chars} characters.",
        )
    limiter = request.app.state.chat_limiter
    enforce_rate_limit(limiter, request, settings, _limit_message(content, limiter.limit))
    quota = {
        "limit": limiter.limit,
        "remaining": limiter.remaining(client_ip(request, settings.trust_proxy_headers)),
    }

    retriever = _retriever_for(request, content)

    async def stream() -> AsyncIterator[str]:
        async for event in answer(
            payload.message,
            payload.history,
            content,
            retriever,
            request.app.state.llm,
            settings.rag_top_k,
        ):
            if event.event == "meta":
                event.data.update(quota)
            yield _sse(event)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
