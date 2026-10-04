import logging
import smtplib
from email.message import EmailMessage

import httpx
from sqlmodel import Session

from app.core.config import Settings
from app.models.contact import ContactMessage
from app.schemas.contact import ContactRequest

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def save_message(session: Session, payload: ContactRequest, ip_address: str) -> ContactMessage:
    record = ContactMessage(
        name=payload.name,
        email=str(payload.email),
        message=payload.message,
        ip_address=ip_address,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def _subject(record: ContactMessage) -> str:
    return f"Portfolio contact: {record.name}"


def _body(record: ContactMessage) -> str:
    return (
        f"Name: {record.name}\nEmail: {record.email}\n"
        f"Received: {record.created_at:%Y-%m-%d %H:%M UTC}"
        f"\n\n{record.message}\n"
    )


def _send_via_resend(settings: Settings, record: ContactMessage) -> None:
    """Resend's HTTP API: works on hosts that block outgoing SMTP (e.g. Render's free plan)."""
    response = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json={
            "from": settings.resend_from,
            "to": [settings.contact_to_email],
            "reply_to": record.email,
            "subject": _subject(record),
            "text": _body(record),
        },
        timeout=15,
    )
    response.raise_for_status()


def _send_via_smtp(settings: Settings, record: ContactMessage) -> None:
    msg = EmailMessage()
    msg["Subject"] = _subject(record)
    msg["From"] = settings.smtp_from or settings.smtp_username or settings.contact_to_email
    msg["To"] = settings.contact_to_email
    msg["Reply-To"] = record.email
    msg.set_content(_body(record))
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            # Google shows App Passwords as "abcd efgh ijkl mnop"; the spaces aren't part of it.
            smtp.login(settings.smtp_username, settings.smtp_password.replace(" ", ""))
        smtp.send_message(msg)


def send_notification(settings: Settings, record: ContactMessage) -> None:
    """Email the site owner about a new message. Failures are logged, never raised.

    Uses Resend when RESEND_API_KEY is set, otherwise SMTP when it's configured.
    """
    try:
        if settings.resend_enabled:
            _send_via_resend(settings, record)
        elif settings.smtp_enabled:
            _send_via_smtp(settings, record)
    except (httpx.HTTPError, smtplib.SMTPException, OSError) as exc:
        detail = exc.response.text[:300] if isinstance(exc, httpx.HTTPStatusError) else ""
        logger.exception(
            "Failed to send contact notification email (message id=%s) %s", record.id, detail
        )
