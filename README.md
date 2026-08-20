# CivicRoute

AI-assisted civic complaint routing, prioritisation, and public progress tracking.

CivicRoute is a final-year major project for municipal grievance intake. A citizen can report a civic issue in English, Hindi, Marathi, or a mixed-language form such as Hinglish/Marathi-English, optionally attach a photo, and receive a trackable complaint ID. The API classifies the issue, routes it to a department, calculates priority and a transparent ETA, then records each step of the complaint lifecycle.

## What is implemented

- Public React interface for reporting, tracking, and viewing aggregate city data.
- English, Hindi, Marathi, and mixed-language text support in both Groq prompting and offline keyword fallback.
- Text classification with `openai/gpt-oss-20b` and optional image classification with `meta-llama/llama-4-scout-17b-16e-instruct` through the Groq OpenAI-compatible API.
- Strict AI response validation. Invalid, unavailable, or low-confidence AI results automatically fall back to the Trie classifier; unmatched complaints use a clearly labelled general municipal route.
- 18 scalable seeded departments: Roads & PWD, Water Supply, Electricity, Sanitation & Garbage, Food Safety, Drugs & Medicines, Public Health, Police & Public Safety, Education, Municipal & Property Tax, Public Transport, Environment & Pollution, Street Lighting, Building & Encroachment, Consumer Affairs, Telecom & Utilities, Parks & Recreation, and Fire & Disaster Response.
- Complaint lifecycle: `Submitted -> Routed -> In Progress -> Resolved`, with an immutable status history.
- Persistent JSON-file store with atomic writes. It is portable on Windows and suitable for one Node process on one EC2 instance.
- Upload validation for JPG, PNG, and WebP files up to 5 MB.
- CORS configuration, request-size limits, production error responses, and server-side admin-key protection for lifecycle updates.

## Data structures and routing pipeline

1. The API validates the complaint and optional image.
2. Groq text classification runs first; photo classification also runs when an image and `GROQ_API_KEY` are available.
3. Text and image results are combined when they agree, or the highest-confidence result is used.
4. A Unicode-normalising Trie scores English, Hindi, and Marathi department keywords when AI is unavailable, malformed, or below confidence threshold.
5. The ETA engine combines department baseline resolution time, priority, and current open backlog.
6. Every open department queue is built with the included Min-Heap. Lower priority number is served first; equal priorities retain earlier submission order. The citizen tracker shows a complaint's current queue position, while the public dashboard exposes only aggregate queue information.

## Architecture

```
frontend/                 React + Vite public application
  src/components/         complaint form, tracker, lifecycle track, dashboard
backend/                  Node.js + Express API
  src/controllers/        routing, persistence, lifecycle, statistics
  src/utils/              Groq adapter, Trie, Min-Heap, ETA engine
  data.json               ignored persistent local data store
deploy/                   PM2 and Nginx configuration templates
docs/DEPLOYMENT.md        EC2 deployment guide
```

## Local setup

Prerequisite: Node.js 20 LTS or newer.

```bash
# Terminal 1
cd backend
copy .env.example .env
# Set GROQ_API_KEY in .env if AI classification is desired.
npm install
npm run dev

# Terminal 2
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open the Vite URL shown in the second terminal (normally `http://localhost:5173`). Without a Groq key, CivicRoute remains usable through its multilingual Trie fallback.

### Environment variables

Backend `.env` is intentionally ignored by Git. Never put API keys in frontend variables, source code, or commits.

| Variable | Purpose |
|---|---|
| `PORT` | API port; defaults to `5000`. |
| `GROQ_API_KEY` | Optional secret enabling Groq text and image classification. |
| `GROQ_TEXT_MODEL` | Optional text-model override; default `openai/gpt-oss-20b`. |
| `GROQ_VISION_MODEL` | Optional vision-model override; default `meta-llama/llama-4-scout-17b-16e-instruct`. |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins. |
| `ADMIN_API_KEY` | Required for lifecycle updates through the protected status endpoint. |
| `CIVICROUTE_DATA_PATH` | Optional absolute path for the persistent JSON store. |

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/complaints` | Submit multipart `text` and optional `image`. |
| `GET` | `/api/complaints/:id` | Citizen-safe tracking result, history, and queue position. |
| `GET` | `/api/complaints/stats` | Aggregated public dashboard metrics. |
| `GET` | `/api/complaints/queues` | Privacy-preserving priority queue summaries. |
| `PATCH` | `/api/complaints/:id/status` | Protected lifecycle update; provide `x-admin-key`. |
| `GET` | `/api/health` | Health check for deployment monitoring. |

Status transitions are constrained to prevent invalid state changes: `Submitted -> Routed -> In Progress -> Resolved`. New complaints are stored as `Routed` immediately after the `Submitted` and automatic-routing history entries are recorded.

## Testing and verification

```bash
cd backend && npm test
cd frontend && npm run build
```

The backend tests cover Min-Heap ordering, multilingual Trie fallback, ETA calculation, and exclusion of resolved work from active queues. The frontend build is the production compilation check.

## AWS EC2 deployment

Deployment assets are included in this repository:

- [EC2 deployment guide](docs/DEPLOYMENT.md)
- `deploy/ecosystem.config.cjs` for PM2
- `deploy/nginx-civicroute.conf` for Nginx and SPA fallback

For production, build the frontend with `VITE_API_URL=/api`, keep the API behind Nginx, use HTTPS via Certbot, set a persistent `CIVICROUTE_DATA_PATH`, lock down the EC2 security group, and back up the data file daily. This implementation must run as one API process because JSON-file storage is not safe for clustered writers; move to PostgreSQL and private object storage before horizontal scaling.

## Project status

Day 2 foundation completed and expanded into a public-deployment-ready single-instance prototype. It is designed for a final-year demonstration and a clear migration path to managed production infrastructure.
