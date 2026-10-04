import logging
import smtplib
from email.message import EmailMessage

from sqlmodel import Session

from app.core.config import Settings
from app.models.contact import ContactMessage
from app.schemas.contact import ContactRequest

logger = logging.getLogger(__name__)


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


def send_notification(settings: Settings, record: ContactMessage) -> None:
    """Email the site owner about a new message. Failures are logged, never raised."""
    if not settings.smtp_enabled:
        return
    msg = EmailMessage()
    msg["Subject"] = f"Portfolio contact: {record.name}"
    msg["From"] = settings.smtp_from or settings.smtp_username or settings.contact_to_email
    msg["To"] = settings.contact_to_email
    msg["Reply-To"] = record.email
    msg.set_content(
        f"Name: {record.name}\nEmail: {record.email}\n"
        f"Received: {record.created_at:%Y-%m-%d %H:%M UTC}"
        f"\n\n{record.message}\n"
    )
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                # Google shows App Passwords as "abcd efgh ijkl mnop"; the spaces aren't part of it.
                smtp.login(settings.smtp_username, settings.smtp_password.replace(" ", ""))
            smtp.send_message(msg)
    except (smtplib.SMTPException, OSError):
        logger.exception("Failed to send contact notification email (message id=%s)", record.id)
