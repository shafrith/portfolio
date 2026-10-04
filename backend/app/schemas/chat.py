from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Hard ceilings; the configurable CHAT_MAX_MESSAGE_CHARS is enforced in the router.
MAX_HISTORY_TURNS = 6


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)


class Source(BaseModel):
    title: str
    section: str


class ChatMeta(BaseModel):
    mode: Literal["llm", "keyword"]
    sources: list[Source]


class ChatQuota(BaseModel):
    limit: int
    remaining: int
