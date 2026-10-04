import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.db import build_engine, init_db
from app.core.rate_limit import RateLimiter
from app.routers import chat, contact, content, health
from app.services.llm import build_llm

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        init_db(app.state.engine)
        yield
        app.state.engine.dispose()

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.engine = build_engine(settings.database_url)
    app.state.llm = build_llm(settings)
    app.state.contact_limiter = RateLimiter(
        settings.contact_rate_limit, settings.contact_rate_window_seconds
    )
    app.state.chat_limiter = RateLimiter(
        settings.chat_rate_limit, settings.chat_rate_window_seconds
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
        max_age=600,
    )

    for module in (health, content, contact, chat):
        app.include_router(module.router, prefix="/api")

    return app


app = create_app()
