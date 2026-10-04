"""Loads profile.json, validates it, and hot-reloads it when the file changes."""

from pathlib import Path
from threading import Lock

from app.schemas.content import Company, PortfolioContent

_cache: dict[Path, tuple[float, PortfolioContent]] = {}
_lock = Lock()


def load_content(path: Path) -> PortfolioContent:
    mtime = path.stat().st_mtime
    with _lock:
        cached = _cache.get(path)
        if cached and cached[0] == mtime:
            return cached[1]
        content = PortfolioContent.model_validate_json(path.read_text(encoding="utf-8"))
        _cache[path] = (mtime, content)
        return content


def experience_newest_first(content: PortfolioContent) -> list[Company]:
    companies = []
    for company in content.experience:
        roles = [
            role.model_copy(
                update={"projects": sorted(role.projects, key=lambda p: p.start, reverse=True)}
            )
            for role in sorted(company.roles, key=lambda r: r.start, reverse=True)
        ]
        companies.append(company.model_copy(update={"roles": roles}))
    return sorted(companies, key=lambda c: c.latest_start, reverse=True)
