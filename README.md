# CivicRoute

**Semantic Intent Recognition and Heap-Based Prioritization for Municipal Grievance Management on Elastic VMs**

CivicRoute is an AI-powered civic grievance redressal system. Citizens submit complaints as text (optionally with an image); the system automatically identifies the issue, classifies the correct government department, assigns a priority, predicts a resolution ETA, and issues a trackable complaint ID — replacing manual, poorly categorized complaint intake with an automated, data-structure-driven pipeline.

## Architecture

- **Frontend:** React (Vite) — public complaint submission form, complaint tracker, live analytics dashboard
- **Backend:** Node.js / Express — REST API, classification pipeline
- **Database:** SQLite (via better-sqlite3)
- **AI:** Groq API (Llama 3.3 for text, Llama 3.2 Vision for images)
- **Deployment:** AWS EC2 (Elastic IP) + Nginx reverse proxy + PM2 + Certbot (HTTPS)

## DSA Components

| Component | Where it's used |
|---|---|
| Min-heap priority queue | Ranks complaints by urgency for processing/dashboard order |
| Trie (prefix tree) | Keyword-based fallback department classifier when AI is unavailable/low-confidence |
| Rule-based ETA engine | Department avg resolution time + priority factor + live backlog count |

## Project Structure

```
civicroute/
├── backend/
│   ├── src/
│   │   ├── routes/          # Express route definitions
│   │   ├── controllers/     # Request handlers / business logic
│   │   ├── db/               # SQLite schema, seed data
│   │   └── utils/            # Trie, min-heap, AI classifier, ETA engine
│   ├── server.js
│   └── .env.example
└── frontend/                 # React (Vite) app
```

## Local Setup

```bash
cd backend
npm install
cp .env.example .env    # add your GROQ_API_KEY
npm run dev
```

## Departments Covered

Roads & PWD, Water Supply, Electricity, Sanitation & Garbage, Food Safety, Drugs & Medicines, Public Health, Police, Education, Municipal & Property Tax, Public Transport, Environment & Pollution, Street Lighting, Building & Encroachment, Consumer Affairs, Telecom & Utilities.

## Status

🚧 Under active development — Final Year Major Project (2026-27)
