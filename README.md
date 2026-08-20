# CivicRoute

AI-assisted civic complaint routing, prioritisation, and public progress tracking.

CivicRoute is a final-year major project for municipal grievance intake. Citizens report civic issues in English, Hindi, Marathi, or mixed-language text, optionally attach a photo, and receive a trackable complaint ID. The API classifies the issue, routes it to a department, calculates priority and a transparent ETA, then records each lifecycle step.

## Implemented capabilities

- React/Vite public interface for complaint submission, citizen tracking, and aggregate city data.
- English, Hindi, Marathi, Hinglish, and mixed-language support in Groq prompting and offline keyword fallback.
- Groq text classification using `openai/gpt-oss-20b` and optional image classification using `meta-llama/llama-4-scout-17b-16e-instruct`.
- Strict AI response validation. Invalid, unavailable, or low-confidence responses fall back to a Unicode-normalising Trie; unmatched cases take a labelled general municipal route.
- 18 seeded departments: Roads & PWD, Water Supply, Electricity, Sanitation & Garbage, Food Safety, Drugs & Medicines, Public Health, Police & Public Safety, Education, Municipal & Property Tax, Public Transport, Environment & Pollution, Street Lighting, Building & Encroachment, Consumer Affairs, Telecom & Utilities, Parks & Recreation, and Fire & Disaster Response.
- Lifecycle with immutable history: `Submitted -> Routed -> In Progress -> Resolved`.
- Persistent JSON-backed data store with atomic writes; portable on Windows and suitable for one Node process on one EC2 instance.
- JPG, PNG, and WebP upload validation up to 5 MB, CORS controls, request-size limits, and protected lifecycle updates.

## Routing pipeline and DSA

1. CivicRoute validates the complaint text and optional image.
2. It calls Groq for text classification and, where available, photo classification.
3. Matching text and image results are fused; otherwise the highest-confidence valid result wins.
4. The Trie scores English, Hindi, Marathi, and Romanised fallback keywords when AI is unavailable or uncertain.
5. The ETA engine combines each department's baseline resolution time, complaint priority, and open backlog.
6. A Min-Heap orders every open department queue by urgency (lowest priority number first), then submission time. The tracker provides an individual queue position; the public dashboard only shows privacy-preserving aggregates.

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
# Terminal 1 (Windows)
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

Open the Vite URL shown in the second terminal, normally `http://localhost:5173`. The multilingual Trie fallback keeps routing usable without a Groq key.

### Environment variables

Backend `.env` is ignored by Git. Never put API keys in frontend variables, source code, or commits.

| Variable | Purpose |
|---|---|
| `PORT` | API port; defaults to `5000`. |
| `GROQ_API_KEY` | Optional secret enabling Groq text and image classification. |
| `GROQ_TEXT_MODEL` | Optional override; default `openai/gpt-oss-20b`. |
| `GROQ_VISION_MODEL` | Optional override; default `meta-llama/llama-4-scout-17b-16e-instruct`. |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins. |
| `ADMIN_API_KEY` | Required for protected lifecycle updates. |
| `CIVICROUTE_DATA_PATH` | Optional absolute path for the persistent JSON store. |

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/complaints` | Submit multipart `text` and optional `image`. |
| `GET` | `/api/complaints/:id` | Citizen-safe tracking result, history, and queue position. |
| `GET` | `/api/complaints/stats` | Aggregate public-dashboard metrics. |
| `GET` | `/api/complaints/queues` | Privacy-preserving priority-queue summaries. |
| `PATCH` | `/api/complaints/:id/status` | Protected lifecycle update; use `x-admin-key`. |
| `GET` | `/api/health` | Health check for deployment monitoring. |

New complaints are automatically routed after submission, so their current state becomes `Routed` while both initial history entries are retained. Valid transitions are constrained to prevent invalid state changes.

## Testing

```bash
cd backend && npm test
cd frontend && npm run build
```

The backend suite covers Min-Heap ordering, multilingual Trie fallback, ETA calculation, and exclusion of resolved work from active queues. The frontend build is the production compilation check.

## AWS EC2 deployment

Use the included [EC2 deployment guide](docs/DEPLOYMENT.md), `deploy/ecosystem.config.cjs` for PM2, and `deploy/nginx-civicroute.conf` for Nginx. Build the frontend with `VITE_API_URL=/api`, run the API behind Nginx and HTTPS, set `CIVICROUTE_DATA_PATH` to a persistent volume, restrict the EC2 security group, and back up the data file daily.

The JSON store requires one API process. For horizontal scaling, migrate the persistence adapter to PostgreSQL and upload storage to a private object store such as S3.
