from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class ContactMessage(SQLModel, table=True):
    __tablename__ = "contact_messages"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    email: str = Field(max_length=254, index=True)
    message: str = Field(max_length=5000)
    ip_address: str = Field(default="", max_length=64)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
