def test_health_reports_keyword_mode_without_key(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "ai_mode": "keyword"}


def test_health_reports_llm_mode_with_key(make_client):
    client = make_client(anthropic_api_key="sk-test")
    assert client.get("/api/health").json()["ai_mode"] == "llm:anthropic"


def test_cors_allows_configured_origin(client):
    res = client.options(
        "/api/profile",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert res.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_rejects_unknown_origin(client):
    res = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in res.headers
