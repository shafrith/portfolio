import json
import os
import shutil
import time

from app.core.config import BASE_DIR


def test_profile(client):
    res = client.get("/api/profile")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Haja Shafrith Suhail"
    assert data["shortName"] == "Shafrith"
    assert data["shortTitle"] == "AI Engineer · Angular Developer"
    assert data["tagline"] == "Frontends that scale. Agents that deliver."
    assert data["links"]["email"] == "shafrith777@gmail.com"
    assert [s["value"] for s in data["stats"]] == [7, 4, 8, 3]
    assert data["education"][0]["institution"] == "Karpagam College of Engineering"


def test_profile_links(client):
    links = client.get("/api/profile").json()["links"]
    assert links["github"] == "https://github.com/shafrith"
    assert links["linkedin"] == "https://www.linkedin.com/in/shafrith-suhail"


def test_profile_never_exposes_phone(client):
    body = client.get("/api/profile").text.lower()
    assert "phone" not in body


def test_experience_newest_first_with_grouped_roles(client):
    res = client.get("/api/experience")
    assert res.status_code == 200
    companies = res.json()
    assert [c["company"] for c in companies] == [
        "Anteriad Pvt Ltd",
        "Vyshnavi Information Technologies Pvt Ltd",
    ]
    assert companies[0]["roles"][0]["end"] is None
    vyshnavi = companies[1]
    assert [r["title"] for r in vyshnavi["roles"]] == [
        "Software Engineer",
        "Software Engineer Trainee",
    ]
    assert [p["name"] for p in vyshnavi["roles"][0]["projects"]] == [
        "IntelliBuddies",
        "Market Rhythm",
    ]


def test_experience_has_short_summaries(client):
    for company in client.get("/api/experience").json():
        for role in company["roles"]:
            for item in [role, *role["projects"]]:
                label = item.get("title") or item.get("name")
                if item["highlights"]:
                    assert item["summary"], f"missing summary for {label}"
                assert len(item["summary"]) <= 300  # keep the site to 1-3 lines


def test_projects(client):
    res = client.get("/api/projects")
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) == 3
    assert {"CrewAI", "AutoGen", "Neo4j"} <= {t for p in projects for t in p["tech"]}
    assert all(p["github"] is None and p["demo"] is None for p in projects)


def test_skills(client):
    res = client.get("/api/skills")
    assert res.status_code == 200
    assert [g["category"] for g in res.json()] == [
        "Frontend",
        "GenAI & Automation",
        "Backend & Cloud",
        "Practices",
    ]


def test_content_hot_reloads(make_client, tmp_path):
    path = tmp_path / "profile.json"
    shutil.copy(BASE_DIR / "content" / "profile.json", path)
    client = make_client(content_path=path)
    assert client.get("/api/profile").json()["location"] == "India · Open to relocation"

    data = json.loads(path.read_text(encoding="utf-8"))
    data["profile"]["location"] = "Remote"
    path.write_text(json.dumps(data), encoding="utf-8")
    future = time.time() + 5
    os.utime(path, (future, future))
    assert client.get("/api/profile").json()["location"] == "Remote"
