from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from sqlmodel import Session

from app.core.db import get_session
from app.core.deps import SettingsDep, enforce_rate_limit
from app.core.rate_limit import client_ip
from app.schemas.contact import ContactRequest, ContactResponse
from app.services.contact import save_message, send_notification

router = APIRouter(tags=["contact"])

SUCCESS_MESSAGE = "Thanks for reaching out! I'll get back to you soon."


@router.post("/contact", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    payload: ContactRequest,
    request: Request,
    background: BackgroundTasks,
    settings: SettingsDep,
    session: Annotated[Session, Depends(get_session)],
) -> ContactResponse:
    enforce_rate_limit(request.app.state.contact_limiter, request, settings)

    if payload.website:
        # Honeypot tripped: pretend success so bots learn nothing.
        return ContactResponse(message=SUCCESS_MESSAGE)

    record = save_message(session, payload, client_ip(request, settings.trust_proxy_headers))
    background.add_task(send_notification, settings, record)
    return ContactResponse(message=SUCCESS_MESSAGE)
