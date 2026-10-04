import asyncio

from app.core.config import BASE_DIR
from app.services.content import load_content
from app.services.rag import Retriever, build_passages

from .conftest import parse_sse


def _ask(client, message, history=None):
    res = client.post("/api/chat", json={"message": message, "history": history or []})
    assert res.status_code == 200, res.text
    assert res.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(res.text)
    text = "".join(d["text"] for e, d in events if e == "token")
    return events, text


def test_keyword_fallback_answers_from_profile(client):
    events, text = _ask(client, "Does he know CrewAI?")
    assert events[0][0] == "meta" and events[0][1]["mode"] == "keyword"
    assert events[-1][0] == "done"
    assert "CrewAI" in text


def test_keyword_fallback_angular(client):
    _, text = _ask(client, "What has he built with Angular?")
    assert "Angular" in text


def test_keyword_fallback_says_when_unknown(client):
    events, text = _ask(client, "What is his favourite pizza topping?")
    assert "don't have that information" in text
    assert "shafrith777@gmail.com" in text
    assert events[0][1]["sources"] == []


def test_keyword_fallback_ignores_previous_question(client):
    history = [
        {"role": "user", "content": "Does he know CrewAI?"},
        {"role": "assistant", "content": "Yes."},
    ]
    _, text = _ask(client, "What is his favourite pizza topping?", history)
    assert "don't have that information" in text
    assert "CrewAI" not in text


def test_message_length_is_capped(make_client):
    client = make_client(chat_max_message_chars=50)
    assert client.post("/api/chat", json={"message": "x" * 51}).status_code == 422


def test_empty_message_rejected(client):
    assert client.post("/api/chat", json={"message": "   "}).status_code == 422


def test_chat_rate_limit(make_client):
    client = make_client(chat_rate_limit=2)
    assert client.post("/api/chat", json={"message": "Angular?"}).status_code == 200
    assert client.post("/api/chat", json={"message": "Angular?"}).status_code == 200
    assert client.post("/api/chat", json={"message": "Angular?"}).status_code == 429


def test_quota_starts_full_and_counts_down(make_client):
    client = make_client(chat_rate_limit=3)
    assert client.get("/api/chat/quota").json() == {"limit": 3, "remaining": 3}
    events, _ = _ask(client, "Does he know CrewAI?")
    assert events[0][1]["remaining"] == 2 and events[0][1]["limit"] == 3
    assert client.get("/api/chat/quota").json()["remaining"] == 2


def test_limit_reached_returns_polite_message(make_client):
    client = make_client(chat_rate_limit=1)
    _ask(client, "Angular?")
    res = client.post("/api/chat", json={"message": "Angular?"})
    assert res.status_code == 429
    detail = res.json()["detail"]
    assert "You've used all 1 questions for today" in detail
    assert "shafrith777@gmail.com" in detail
    assert client.get("/api/chat/quota").json()["remaining"] == 0


def test_default_limit_is_10_per_day(make_settings):
    settings = make_settings()
    assert (settings.chat_rate_limit, settings.chat_rate_window_seconds) == (10, 86400)


class FakeLLM:
    name = "fake"

    def __init__(self, fail_after=None):
        self.calls = []
        self.fail_after = fail_after

    async def stream(self, system, messages):
        self.calls.append((system, messages))
        for i, token in enumerate(["Shafrith ", "uses ", "CrewAI."]):
            if self.fail_after is not None and i >= self.fail_after:
                raise RuntimeError("provider down")
            yield token


def test_llm_mode_streams_grounded_answer(client):
    fake = FakeLLM()
    client.app.state.llm = fake
    history = [
        {"role": "assistant", "content": "Hi! Ask me anything."},  # leading assistant turn dropped
        {"role": "user", "content": "Tell me about his AI work"},
        {"role": "assistant", "content": "He builds agents."},
    ]
    events, text = _ask(client, "Does he know CrewAI?", history)
    assert events[0][1]["mode"] == "llm"
    assert text == "Shafrith uses CrewAI."
    system, messages = fake.calls[0]
    assert "<profile>" in system and "CrewAI" in system
    assert "Professional summary" in system  # summary is always pinned
    assert [m["role"] for m in messages] == ["user", "assistant", "user"]
    assert messages[-1]["content"] == "Does he know CrewAI?"


def test_llm_failure_before_tokens_falls_back_to_keyword(client):
    client.app.state.llm = FakeLLM(fail_after=0)
    events, text = _ask(client, "Does he know CrewAI?")
    metas = [d for e, d in events if e == "meta"]
    assert [m["mode"] for m in metas] == ["llm", "keyword"]
    assert "CrewAI" in text
    assert events[-1][0] == "done"


def test_llm_failure_mid_stream_reports_error(client):
    client.app.state.llm = FakeLLM(fail_after=1)
    events, _ = _ask(client, "Does he know CrewAI?")
    assert events[-1][0] == "error"


def _top(query):
    content = load_content(BASE_DIR / "content" / "profile.json")
    retriever = Retriever(build_passages(content))
    return asyncio.run(retriever.retrieve(query, 3))[0].passage


def test_retriever_ranks_relevant_passages():
    assert _top("multi-agent AutoGen Gmail").id == "ai-project-multi-agent-it-workspace"
    assert _top("Where did he study?").section == "education"
    assert _top("Is he open to relocation?").id == "location-contact"
