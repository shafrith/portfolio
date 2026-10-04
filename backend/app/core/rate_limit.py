import math
import time
from collections import deque
from threading import Lock

from fastapi import Request


class RateLimiter:
    """In-memory sliding-window rate limiter keyed by client identifier.

    Good enough for a single-instance portfolio API; swap for Redis if you scale out.
    """

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def hit(self, key: str) -> tuple[bool, int]:
        """Record a request. Returns (allowed, retry_after_seconds)."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return False, max(1, math.ceil(self.window - (now - hits[0])))
            hits.append(now)
            return True, 0

    def remaining(self, key: str) -> int:
        """How many more requests this key may make right now (does not record a hit)."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits.get(key)
            if not hits:
                return self.limit
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            return max(0, self.limit - len(hits))

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def client_ip(request: Request, trust_proxy_headers: bool) -> str:
    if trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
