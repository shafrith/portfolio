"""Retrieval for the "Ask my AI" assistant.

profile.json is chunked into small, self-contained passages. Every passage is embedded with a
local TF-IDF model (no network, no API key). When LLM_PROVIDER=openai and a key is configured,
passages are additionally embedded with OpenAI embeddings and scored with a hybrid of dense and
sparse similarity. If dense embedding fails for any reason, retrieval silently falls back to
sparse-only so the assistant never breaks.
"""

from __future__ import annotations

import asyncio
import logging
import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any, Protocol

from app.schemas.content import PortfolioContent

logger = logging.getLogger(__name__)

DENSE_WEIGHT = 0.65


@dataclass(frozen=True)
class Passage:
    id: str
    section: str
    title: str
    text: str


@dataclass(frozen=True)
class ScoredPassage:
    passage: Passage
    score: float


# --------------------------------------------------------------------------- chunking


def _fmt_period(start: str, end: str | None) -> str:
    return f"{start} to {end or 'present'}"


def build_passages(content: PortfolioContent) -> list[Passage]:
    p = content.profile
    who = p.name
    passages: list[Passage] = [
        Passage("summary", "about", "Professional summary", f"{p.title}. {p.summary}"),
        Passage(
            "location-contact",
            "about",
            "Location, availability and contact",
            f"{who} is based in {p.location}. "
            f"Contact email: {p.links.email or 'via the contact form'}."
            + (f" LinkedIn: {p.links.linkedin}." if p.links.linkedin else "")
            + (f" GitHub: {p.links.github}." if p.links.github else ""),
        ),
        Passage(
            "stats",
            "about",
            "Career at a glance",
            "; ".join(f"{s.value:,}{s.suffix} {s.label}" for s in p.stats) + ".",
        ),
    ]
    for edu in p.education:
        passages.append(
            Passage(
                f"education-{len(passages)}",
                "education",
                "Education",
                f"{edu.degree} from {edu.institution} ({edu.start} - {edu.end}).",
            )
        )

    for company in content.experience:
        titles = ", ".join(f"{r.title} ({_fmt_period(r.start, r.end)})" for r in company.roles)
        passages.append(
            Passage(
                f"company-{_slug(company.company)}",
                "experience",
                company.company,
                f"{who} worked at {company.company} as: {titles}.",
            )
        )
        for role in company.roles:
            if role.highlights:
                passages.append(
                    Passage(
                        f"role-{_slug(company.company)}-{_slug(role.title)}",
                        "experience",
                        f"{role.title} at {company.company}",
                        f"{role.title} at {company.company} ({_fmt_period(role.start, role.end)}): "
                        + " ".join(_sentence(h) for h in role.highlights),
                    )
                )
            for proj in role.projects:
                passages.append(
                    Passage(
                        f"project-{_slug(company.company)}-{_slug(proj.name)}",
                        "experience",
                        f"{proj.name} ({proj.role}) at {company.company}",
                        f"As {role.title} at {company.company}, worked on {proj.name} as "
                        f"{proj.role} ({_fmt_period(proj.start, proj.end)}): "
                        + " ".join(_sentence(h) for h in proj.highlights),
                    )
                )

    for proj in content.projects:
        passages.append(
            Passage(
                f"ai-project-{proj.id}",
                "projects",
                f"AI project: {proj.title}",
                f"{proj.title} (personal GenAI / agentic AI project): "
                f"{_sentence(proj.description)} "
                f"Built with {', '.join(proj.tech)}.",
            )
        )

    for group in content.skills:
        passages.append(
            Passage(
                f"skills-{_slug(group.category)}",
                "skills",
                f"Skills: {group.category}",
                f"{group.category} skills: {', '.join(group.items)}.",
            )
        )
    return passages


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _sentence(text: str) -> str:
    text = text.strip()
    return text if text.endswith((".", "!", "?")) else f"{text}."


# --------------------------------------------------------------------------- sparse (TF-IDF)

_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#]*(?:\.[a-z0-9]+)*")
_STOPWORDS = frozenset(
    """a about above after again all also am an and any are as at be been being both but by can
    could did do does doing done for from had has have having he her here him his how i if in into
    is it its just know knows me more most my no not of on or our out over own please same she
    should so some such tell than that the their them then there these they this those through to
    too under up use used uses using very was we were what when where which while who whom why will
    with would you your yes experience experienced work worked working haja shafrith suhail
    """.split()
)
# Map common query phrasings onto the vocabulary used in profile.json.
_SYNONYMS = {
    "ai": ["genai", "generative", "agentic"],
    "llm": ["genai", "openai", "rag"],
    "agent": ["agentic", "crewai", "autogen"],
    "multiagent": ["agentic", "crewai", "autogen"],
    "frontend": ["angular", "typescript"],
    "front": ["frontend"],
    "cloud": ["aws"],
    "test": ["selenium", "testing"],
    "qa": ["selenium", "testing"],
    "degree": ["education", "b.tech"],
    "college": ["education"],
    "university": ["education"],
    "study": ["education"],
    "studied": ["education"],
    "based": ["location"],
    "live": ["location"],
    "relocate": ["relocation"],
    "email": ["contact"],
    "reach": ["contact"],
    "hire": ["contact"],
    "current": ["present"],
    "currently": ["present"],
    "now": ["present"],
    "job": ["present"],
    "years": ["year"],
    "ci": ["ci/cd", "pipelines"],
    "devops": ["docker", "ci", "pipelines"],
}


def _stem(token: str) -> str:
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 3 and token.endswith("s") and not token.endswith(("ss", "us", "is")):
        return token[:-1]
    return token


def tokenize(text: str, expand: bool = False) -> list[str]:
    tokens = []
    for raw in _TOKEN_RE.findall(text.lower()):
        if raw in _STOPWORDS:
            continue
        token = _stem(raw)
        tokens.append(token)
        if expand:
            tokens.extend(_SYNONYMS.get(raw, ()) or _SYNONYMS.get(token, ()))
    return tokens


class SparseIndex:
    def __init__(self, documents: list[str]) -> None:
        tokenized = [tokenize(doc) for doc in documents]
        n_docs = len(tokenized)
        df: Counter[str] = Counter()
        for tokens in tokenized:
            df.update(set(tokens))
        self.idf = {term: math.log((1 + n_docs) / (1 + freq)) + 1.0 for term, freq in df.items()}
        self.vectors = [self._vectorize(Counter(tokens)) for tokens in tokenized]

    def _vectorize(self, counts: Counter[str]) -> dict[str, float]:
        vec = {t: (1 + math.log(c)) * self.idf[t] for t, c in counts.items() if t in self.idf}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        return {t: v / norm for t, v in vec.items()}

    def query_tokens(self, query: str) -> list[str]:
        return [t for t in tokenize(query, expand=True) if t in self.idf]

    def scores(self, query: str) -> list[float]:
        qvec = self._vectorize(Counter(self.query_tokens(query)))
        return [sum(w * doc.get(t, 0.0) for t, w in qvec.items()) for doc in self.vectors]


# --------------------------------------------------------------------------- dense (optional)


class Embedder(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class OpenAIEmbedder:
    def __init__(self, api_key: str, model: str) -> None:
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=api_key, timeout=20)
        self._model = model

    async def embed(self, texts: list[str]) -> list[list[float]]:
        response = await self._client.embeddings.create(model=self._model, input=texts)
        return [item.embedding for item in response.data]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


# --------------------------------------------------------------------------- retriever


class Retriever:
    def __init__(self, passages: list[Passage], embedder: Embedder | None = None) -> None:
        self.passages = passages
        self._docs = [f"{p.title}. {p.title}. {p.text}" for p in passages]
        self.sparse = SparseIndex(self._docs)
        self._embedder = embedder
        self._dense: list[list[float]] | None = None
        self._dense_lock = asyncio.Lock()

    @property
    def mode(self) -> str:
        return "hybrid" if self._embedder else "sparse"

    def has_signal(self, query: str) -> bool:
        """True when the query shares vocabulary with the profile at all."""
        return bool(self.sparse.query_tokens(query))

    async def _dense_scores(self, query: str) -> list[float] | None:
        if not self._embedder:
            return None
        try:
            async with self._dense_lock:
                if self._dense is None:
                    self._dense = await self._embedder.embed(self._docs)
            [qvec] = await self._embedder.embed([query])
            return [_cosine(qvec, dvec) for dvec in self._dense]
        except Exception:  # noqa: BLE001 - any provider failure degrades to sparse retrieval
            logger.exception("Dense embedding failed; using sparse retrieval only")
            self._embedder = None
            return None

    async def retrieve(self, query: str, k: int) -> list[ScoredPassage]:
        sparse = self.sparse.scores(query)
        dense = await self._dense_scores(query)
        if dense is not None:
            combined = [
                DENSE_WEIGHT * d + (1 - DENSE_WEIGHT) * s
                for d, s in zip(dense, sparse, strict=True)
            ]
        else:
            combined = sparse
        ranked = sorted(zip(self.passages, combined, strict=True), key=lambda x: x[1], reverse=True)
        return [ScoredPassage(p, s) for p, s in ranked[:k]]


def build_retriever(content: PortfolioContent, settings: Any) -> Retriever:
    embedder: Embedder | None = None
    if settings.llm_provider == "openai" and settings.openai_api_key:
        embedder = OpenAIEmbedder(settings.openai_api_key, settings.openai_embedding_model)
    return Retriever(build_passages(content), embedder)
