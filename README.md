# Haja Shafrith Suhail — Portfolio

Personal portfolio for a Senior Software Engineer (Angular + GenAI & Agentic AI).
**Frontends that scale. Agents that deliver.**

The site is itself a demo: a typed, layered FastAPI backend serves all content from one JSON file, and an
**"Ask my AI"** RAG assistant answers recruiters' questions grounded only in that data.

```
portfolio/
├── backend/                 FastAPI · Pydantic v2 · SQLModel (SQLite) · pytest
│   ├── app/
│   │   ├── content/profile.json   ← ALL portfolio content lives here
│   │   ├── core/            config, DB, rate limiting, dependencies
│   │   ├── models/          SQLModel tables (contact messages)
│   │   ├── routers/         /api endpoints
│   │   ├── schemas/         Pydantic request/response models
│   │   └── services/        content loading, RAG retrieval, LLM providers, chat, contact/email
│   └── tests/               pytest suite covering every endpoint
├── frontend/                React 18 · Vite · TypeScript (strict) · Tailwind · Framer Motion · TanStack Query
│   ├── public/              profile.jpg, resume.pdf, favicons, og-image.png
│   └── src/
├── docker-compose.yml       runs the whole stack
└── render.yaml              Render blueprint for the API
```

---

## TODO before going live

| What | Where |
| --- | --- |
| GitHub links for the 3 AI projects | `profile.json` → `projects[].github` (and `demo` if you have one) |
| Confirm final LinkedIn URL | `profile.json` → `profile.links.linkedin`, plus `sameAs` in `frontend/index.html` |
| Final domain | `VITE_SITE_URL` (frontend) and `CORS_ORIGINS` (backend / `render.yaml`) |

Any link that is empty or starts with `TODO` is treated as missing by the API and its button is hidden on the
site, so the site looks finished even before you fill these in.

**Updating your photo or resume:** replace `frontend/public/profile.jpg` (square, ~800×800 real JPEG,
< 150 KB) or `frontend/public/resume.pdf` (downloads as "Haja Shafrith Suhail - Resume.pdf"). Vercel and
`npm run dev` pick these up automatically; for Docker run `docker compose up -d --build frontend`.
Note: the published resume includes your phone number, unlike the rest of the site.

---

## Local setup

### Prerequisites
Python 3.12 (3.11+ works), Node 20+, optionally Docker.

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # optional: add an LLM API key / SMTP settings
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/api/docs

```bash
pytest          # run the tests
ruff check .    # lint
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm run dev                   # http://localhost:5173
npm run typecheck && npm run lint && npm run build
```

### Everything with Docker
```bash
docker compose up --build
```
Frontend: http://localhost:8080 · API: http://localhost:8000. Put secrets in `backend/.env` (optional) and
compose picks them up. `profile.json` is mounted read-only into the container, so edits show up without a
rebuild.

---

## Environment variables

### Backend (`backend/.env`)
| Variable | Default | Purpose |
| --- | --- | --- |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Comma-separated allowed frontend origins |
| `TRUST_PROXY_HEADERS` | `false` | Set `true` behind Render/Railway/nginx so rate limits use the real client IP |
| `DATABASE_URL` | `sqlite:///./data/portfolio.db` | Where contact messages are stored |
| `LLM_PROVIDER` | `anthropic` | `anthropic`, `openai` or `none` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | – | Key for the chosen provider. **No key = keyword-retrieval fallback** |
| `LLM_MODEL` | provider default | Override the model (defaults: `claude-sonnet-5-5`, `gpt-4.1-mini`) |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Dense embeddings when `LLM_PROVIDER=openai` |
| `RAG_TOP_K` | `4` | Passages retrieved per question |
| `CHAT_MAX_MESSAGE_CHARS` | `500` | Max question length (keep in sync with `frontend/src/components/chat/suggestions.ts`) |
| `CHAT_RATE_LIMIT` / `CHAT_RATE_WINDOW_SECONDS` | `10` / `86400` | "Ask my AI" questions per visitor (IP) per window: 10 a day by default |
| `CONTACT_RATE_LIMIT` / `CONTACT_RATE_WINDOW_SECONDS` | `5` / `3600` | Contact submissions per IP per window |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_TLS`, `SMTP_FROM` | – | Optional: email each new contact message |
| `CONTACT_TO_EMAIL` | – | Where contact notifications are sent (needed with `SMTP_HOST`) |

For Gmail SMTP, use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587` and an
[app password](https://support.google.com/accounts/answer/185833).

### Frontend (`frontend/.env`)
| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the API, no trailing slash |
| `VITE_SITE_URL` | Public site URL, used for the canonical URL, Open Graph tags, `sitemap.xml` and `robots.txt` |

API keys live only on the backend. The frontend never sees them.

---

## Editing your content (`profile.json`)

Everything on the site (hero text, stats, experience, projects, skills, education, links) comes from
`backend/app/content/profile.json`. The "Ask my AI" assistant answers from the same file.

- **Save the file and refresh the page.** The API reloads it when the file changes, with no restart needed.
- The file is validated against Pydantic models (`backend/app/schemas/content.py`). If you break the
  structure, the API returns a 500 error and `pytest` will tell you which field is wrong.
- Dates use `YYYY-MM`. Use `"end": null` for a current role.
- **Experience:** one entry per company, with `roles` inside it. Multiple roles at one company appear grouped,
  and the newest one gets a "Promoted" badge (as with Vyshnavi). Roles can contain `projects`.
- **Experience text:** `summary` (1–3 sentences) is what the site shows. `highlights` (detailed points) is
  not displayed, but the "Ask my AI" assistant uses it to answer specific questions, so keep both.
- **Stats:** `{ "value": 1500, "suffix": "+", "label": "commits shipped" }` animates as **1,500+**.
- **Projects:** leave `github` / `demo` as `""` to hide those buttons.
- Your phone number is intentionally not part of the schema, so it can't appear on the site.

---

## How "Ask my AI" works

1. **Chunk:** `profile.json` is split into self-contained passages (summary, each role, each project, each
   skill group, education, location/contact). See `services/rag.py`.
2. **Embed & retrieve:** passages are embedded with a local TF-IDF model, so it needs no key and no network.
   With `LLM_PROVIDER=openai`, they are also embedded with OpenAI embeddings and ranked by a hybrid
   dense + sparse score. The top-k passages are retrieved for each question.
3. **Generate:** the LLM (Anthropic or OpenAI) gets a system prompt that allows answers **only** from the
   retrieved context. If the answer isn't there, it says so and suggests contacting you.
4. **Stream:** tokens are streamed to the browser over Server-Sent Events (`POST /api/chat`).
5. **Never breaks:** if no key is set, or the provider errors before answering, the API returns the
   best-matching passage(s) verbatim (marked "Keyword match" in the UI), or a polite "I don't have that
   information" message.

Safeguards: questions are capped at 500 characters, each visitor gets 10 questions a day (shown in the chat), history is limited to
6 turns, and the prompt tells the model to ignore attempts to override its rules.

---

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Status and current AI mode (`llm:anthropic` / `keyword`) |
| GET | `/api/profile` | Name, title, tagline, summary, location, links, stats, education |
| GET | `/api/experience` | Companies with roles, newest first |
| GET | `/api/projects` | AI projects |
| GET | `/api/skills` | Grouped skills |
| POST | `/api/contact` | `{name, email, message, website}`. `website` is a honeypot. Rate-limited to 5/hour per IP. Returns 201 |
| POST | `/api/chat` | `{message, history?}` returns `text/event-stream` with `meta`, `token`, `done` and `error` events |

---

## Deployment

### Backend → Render
1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint**, pick the repo, and Render reads `render.yaml`. Or create a
   **Web Service** manually with root directory `backend` and runtime Docker.
3. Set `ANTHROPIC_API_KEY` (or `LLM_PROVIDER=openai` + `OPENAI_API_KEY`), the SMTP variables if you want email,
   and set `CORS_ORIGINS` to your Vercel domain.
4. The health check path is `/api/health`.

> SQLite on Render's free plan is **ephemeral**: contact messages are lost on redeploy. Enable SMTP so every
> message also reaches your inbox, attach a persistent disk mounted at `/app/data`, or point
> `DATABASE_URL` at a managed Postgres (add `psycopg[binary]` to `requirements.txt`).
> Free instances also sleep when idle. The frontend shows skeletons and retries while the API wakes up.

### Backend → Railway (alternative)
**New Project → Deploy from GitHub repo**, then set the service root directory to `backend`. Railway detects
the Dockerfile and injects `$PORT`. Add the same variables as above (including `TRUST_PROXY_HEADERS=true`)
and a volume mounted at `/app/data` for SQLite persistence.

### Frontend → Vercel
1. **Add New → Project**, import the repo, and set **Root Directory** to `frontend`. Vercel detects Vite
   (build `npm run build`, output `dist`).
2. Environment variables: `VITE_API_URL=https://<your-api>.onrender.com` and
   `VITE_SITE_URL=https://<your-domain>`.
3. Deploy, then add the Vercel URL to the backend's `CORS_ORIGINS`.

`frontend/vercel.json` adds long-term caching for hashed assets and basic security headers.

---

## Quality checks

- **Backend:** `pytest` (27 tests covering every endpoint, rate limits, honeypot, SMTP, RAG ranking, LLM
  streaming/fallback) and `ruff check .`
- **Frontend:** `npm run typecheck`, `npm run lint` (including `jsx-a11y`), `npm run build`
- **Lighthouse** (production build, local): mobile 98 / 100 / 100 / 100, desktop 100 / 100 / 100 / 100
  (Performance / Accessibility / Best Practices / SEO)
- Responsive at 375 px, 768 px and 1440 px with no horizontal scroll. Dark theme by default, light theme
  toggle saved per visitor. Animations respect `prefers-reduced-motion`.
