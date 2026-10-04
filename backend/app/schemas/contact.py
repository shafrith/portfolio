from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ContactRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    message: str = Field(min_length=10, max_length=5000)
    # Honeypot: hidden from humans in the UI. Bots that fill it are silently ignored.
    website: str = Field(default="", max_length=200)


class ContactResponse(BaseModel):
    ok: bool = True
    message: str
