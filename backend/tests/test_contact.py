from sqlmodel import Session, select

from app.models.contact import ContactMessage

VALID = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "message": "Hello, I would love to chat about a role.",
}


def _messages(client):
    with Session(client.app.state.engine) as session:
        return session.exec(select(ContactMessage)).all()


def test_contact_saves_message(client):
    res = client.post("/api/contact", json=VALID)
    assert res.status_code == 201
    assert res.json()["ok"] is True
    [saved] = _messages(client)
    assert saved.email == "ada@example.com"
    assert saved.ip_address


def test_contact_validates_fields(client):
    res = client.post(
        "/api/contact", json={"name": "A", "email": "not-an-email", "message": "short"}
    )
    assert res.status_code == 422
    fields = {e["loc"][-1] for e in res.json()["detail"]}
    assert fields == {"name", "email", "message"}


def test_contact_honeypot_is_silently_dropped(client):
    res = client.post("/api/contact", json={**VALID, "website": "http://spam.example"})
    assert res.status_code == 201
    assert _messages(client) == []


def test_contact_rate_limit(client):
    for _ in range(5):
        assert client.post("/api/contact", json=VALID).status_code == 201
    res = client.post("/api/contact", json=VALID)
    assert res.status_code == 429
    assert int(res.headers["retry-after"]) > 0
    assert len(_messages(client)) == 5


def test_contact_sends_email_when_smtp_configured(make_client, monkeypatch):
    sent = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            sent.append(("connect", host, port))

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def starttls(self):
            sent.append(("starttls",))

        def login(self, user, password):
            sent.append(("login", user))

        def send_message(self, msg):
            sent.append(("send", msg["To"], msg["Reply-To"]))

    monkeypatch.setattr("app.services.contact.smtplib.SMTP", FakeSMTP)
    client = make_client(
        smtp_host="smtp.example.com",
        smtp_username="bot",
        smtp_password="app-password",
        contact_to_email="me@example.com",
    )
    assert client.post("/api/contact", json=VALID).status_code == 201
    assert ("login", "bot") in sent
    assert ("send", "me@example.com", "ada@example.com") in sent


def test_contact_skips_email_until_password_is_set(make_settings):
    settings = make_settings(
        smtp_host="smtp.gmail.com", smtp_username="me@gmail.com", contact_to_email="me@gmail.com"
    )
    assert settings.smtp_enabled is False
    assert make_settings(**{**settings.model_dump(), "smtp_password": "x"}).smtp_enabled is True
