from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.core.config import Settings
from app.core.rate_limit import RateLimiter, client_ip
from app.schemas.content import PortfolioContent
from app.services.content import load_content


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


SettingsDep = Annotated[Settings, Depends(get_app_settings)]


def get_content(settings: SettingsDep) -> PortfolioContent:
    return load_content(settings.content_path)


ContentDep = Annotated[PortfolioContent, Depends(get_content)]


def enforce_rate_limit(
    limiter: RateLimiter,
    request: Request,
    settings: Settings,
    message: str = "Too many requests. Please try again later.",
) -> None:
    allowed, retry_after = limiter.hit(client_ip(request, settings.trust_proxy_headers))
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
            headers={"Retry-After": str(retry_after)},
        )
