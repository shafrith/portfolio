from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    ai_mode: str


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    llm = request.app.state.llm
    return HealthResponse(status="ok", ai_mode=f"llm:{llm.name}" if llm else "keyword")
