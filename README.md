# Pragyan (प्रज्ञान) — Open Digital Learning & Assessment Portal

> **Smart India Hackathon (SIH 2026)**  
> **Team Name:** PRAGYAN  
> **Project Title:** Pragyan — Open Digital Learning & Assessment Portal (SIH Edition)

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=flat&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express-000000?style=flat&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-green?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![SQLite WASM](https://img.shields.io/badge/Database-SQLite_(sql.js_WASM)-003b57?style=flat&logo=sqlite)](https://sql.js.org/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-success?style=flat)](#)

---

## 📖 1. Overview & Vision

**Pragyan** is a lightweight, accessible digital learning and assessment portal aligned with the official **NCERT curriculum** for **Class 7 and Class 8**. Designed specifically for the Indian public school ecosystem, it bridges the gap between students and educators through faculty-verified video lectures, peer-reviewed community notes, previous years' question (PYQ) assessments, and a real-time gamified peer-benchmarking engine.

Built strictly according to the **National Portal of India Design Guidelines (NIC)**, Pragyan features a clean Indian Government aesthetic (Deep Blue `#133b5c`, Saffron `#d97706`/`#f59e0b`, High-Contrast Typography, and an Ashoka Chakra emblem).

The codebase is arranged as a clean **frontend / backend** split (see [§6 Project Structure](#-6-project-structure)):

- **`frontend/`** — a Next.js **SPA** that renders the UI and talks to the API over HTTP.
- **`backend/`** — a standalone **Express REST API** server that owns the database, auth and business logic.

---

## 🌟 2. Key Features & SIH Innovations

### 📶 Low-Bandwidth Adaptive Mode (Data Saver)
- **Problem:** Students in rural and government schools frequently face unstable 2G/3G connectivity.
- **Solution:** A one-click **Data Saver Toggle** in the header that suppresses heavy video auto-loading, reduces layout animations, and serves instant compressed/cached notes and text first.

### 🏷️ DIKSHA & NCERT Learning Outcome Schema
- Every chapter is directly mapped to standard national education metadata:
  - **NCERT Learning Outcome IDs:** e.g., `LO-8-SCI-06-01`, `LO-8-SCI-06-02`
  - **DIKSHA QR Codes:** e.g., `D-8-SCI-06`
  - Fully compliant with Indian digital education standards (NDEAR).

### 👥 Dual Sub-Portal Chapter Architecture
Each NCERT chapter is partitioned into two distinct sub-portals:
1. **Learning Sub-Portal**:
   - **Faculty Video Lectures:** Embedded HTML5/YouTube video player with timestamped chapter markers and downloadable slide decks (`.md`/PDF).
   - **Crowdsourced Notes & Upvoting:** Students and faculty upload notes in text/PDF/Image formats.
   - **Dynamic Ranking Algorithm:** Notes are sorted real-time based on the formula:
     $$\text{Ranking Score} = \text{Upvotes} \times 0.7 + (\text{Faculty Verified Badge} \times 30)$$
   - **"Faculty Verified" Green Tick:** Teachers can verify community notes in 1 click, elevating trusted notes to prevent misinformation.
   - **XP Milestone:** When a note hits $10+$ upvotes, the author automatically earns **+50 XP**.

2. **Test Your Knowledge Sub-Portal**:
   - **Objective Assessment (20 Timed MCQs):** Minimum $90\%$ of questions are mapped directly to verified previous years' questions (annotated with tags like `[CBSE 2023]`, `[NCERT Exemplar]`, `[State Board 2022]`). Features real-time countdown timer, question palette, instant scoring, and step-by-step solutions (**+10 XP per correct answer**).
   - **Subjective Assessment (15 Question Pool):** Divided into 5 Short Answer ($2\text{M}$), 5 Medium Answer ($3\text{M}$), and 5 Long Answer ($5\text{M}$) questions.
   - **Self-Paced "Model Answer Reveal":** Interactive step-by-step scoring scheme rubrics and downloadable official marking scheme text files (**+30 XP for completion**).

### 🏆 Gamified Leaderboard & Peer Benchmarking
- **Class-Wide Leaderboard:** Overall ranks across all active learners in Class 7 or Class 8.
- **Chapter-Wise Master Leaderboard:** Specialized ranks based solely on test performance in a specific chapter.
- Displays rank medals, badges (*Science Scholar*, *Top Contributor*, *Math Wizard*), accuracy percentage, and total XP.

### ⚡ 1-Click Zero-Friction Evaluator Access
- Unified login (`/login`) and registration (`/register`) with **1-click evaluator demo buttons** (*"Try as Guest Student"* and *"Try as Guest Faculty"*), plus pre-seeded persona switchers to test both Student and Faculty perspectives instantly.

---

## 👥 3. Pre-Seeded Evaluator Accounts

| Role | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Faculty** | Ms. Anita Sharma | `anita.sharma@Pragyan.gov.in` | `demo123` | Science Faculty · SCH-GJ-204 (Gujarat) |
| **Faculty** | Ravi Verma | `ravi.verma@Pragyan.gov.in` | `demo123` | Mathematics Faculty · SCH-MH-112 (Maharashtra) |
| **Student** | Diya Mehta | `diya@student.in` | `demo123` | Class 8 · KV Ahmedabad · **Rank #1** |
| **Student** | Aarav Patel | `aarav@student.in` | `demo123` | Class 8 · Shiksha Kendra, Rajkot |
| **Student** | Arjun Thakur | `arjun@student.in` | `demo123` | Class 7 · Shiksha Kendra, Patna |
| **Guest Student** | Guest Student | *(1-Click Button)* | — | Open demo session (Class 8) |
| **Guest Faculty** | Guest Faculty | *(1-Click Button)* | — | Open demo session (Faculty) |

---

## 🛠️ 4. Tech Stack & Architecture

The project is split into two deployable apps.

| Layer | Directory | Technology | Key Advantage |
| :--- | :--- | :--- | :--- |
| **Frontend (SPA)** | `frontend/` | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 | Server-rendered shell + client components; talks to the API over HTTP |
| **Backend (REST API)** | `backend/` | Express 4, Drizzle ORM, SQLite (`sql.js` WASM), TypeScript | **Zero-server setup** — SQLite runs in-process with persistent file `data/app.db` |
| **Auth & Security** | `backend/` | Scrypt password hashing & HMAC-signed session cookies | Session management with RBAC (student / faculty) |

```
Browser ── HTTP (same-origin, proxied) ──► Next.js frontend (frontend/)
                                              │  /api/* and /uploads/*
                                              ▼
                                        Express REST API (backend/)
                                              │
                                        SQLite (sql.js WASM) · Drizzle ORM
```

> **How the two talk to each other:** the frontend SPA calls relative `/api/*` and
> `/uploads/*` URLs. Next.js rewrites those to the backend (configured in
> `frontend/next.config.ts` via `API_BASE_URL`, default `http://localhost:3001`).
> Because the browser only ever talks to the frontend origin, session cookies
> flow automatically and no CORS is needed in the browser (the backend still
> enables CORS for direct use).

---

## 🚀 5. How to Run Locally

### Prerequisites
- **Node.js** (v20+ or v22 LTS / v24 LTS recommended)
- **npm** (included with Node.js)
- **Git**

### Step 1: Clone the Repository
```bash
git clone https://github.com/surya-prakash11/SIH-PRAGYAN-2026.git
cd SIH-PRAGYAN-2026
```

### Step 2: Install Dependencies (backend + frontend)
```bash
npm run install:all
```

### Step 3: Initialize and Seed the Database
This creates the SQLite database tables and seeds demo students, faculty, NCERT curriculum, 20-MCQ PYQ pools, subjective rubrics, and leaderboards:
```bash
npm run db:setup
```

### Step 4: Start the Backend API (terminal 1)
```bash
npm run dev:backend      # → http://localhost:3001
```

### Step 5: Start the Frontend (terminal 2)
```bash
npm run dev:frontend     # → http://localhost:3000
```

### Step 6: Open in Your Browser
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📂 6. Project Structure

```
SIH-2026---Sample-1/
├── backend/                                  # 🖥️ BACKEND — standalone REST API (Express)
│   ├── src/
│   │   ├── index.ts · app.ts                 #    server entry + Express app factory
│   │   ├── routes/                           #    auth · data · notes · objective · subjective · health
│   │   ├── db/                               #    SQLite (sql.js WASM) client, Drizzle schema, ensure-db
│   │   ├── auth/                             #    HMAC cookie sessions · scrypt hashing
│   │   ├── data/queries.ts                   #    type-safe database read queries
│   │   └── shared/                           #    curriculum & badge constants used by seeding
│   ├── scripts/                              #    migrate.ts · seed.ts · seed-content.ts
│   ├── drizzle/                              #    SQL migration files & snapshots
│   ├── drizzle.config.json                   #    Drizzle Kit config
│   └── package.json
├── frontend/                                 # 🎨 FRONTEND — Next.js SPA
│   ├── src/
│   │   ├── app/                              #    routes (pages)
│   │   │   ├── home/ · account/ · leaderboard/ · login/ · register/
│   │   │   ├── class/[classNo]/[subject]/[chapter]/
│   │   │   ├── layout.tsx · page.tsx · globals.css · not-found.tsx
│   │   ├── components/                       #    React UI components (header, quiz, notes, video…)
│   │   ├── lib/                              #    api.ts (typed API client) · use-api.ts (fetch hook)
│   │   └── shared/                           #    curriculum & badge constants
│   ├── public/                               #    static assets (videos, slide decks)
│   ├── next.config.ts                        #    rewrites /api & /uploads → backend
│   └── package.json
└── package.json                              # root orchestrator scripts
```

### Frontend ↔ Backend map

| Concern | Location |
| :--- | :--- |
| Pages, UI, client components (frontend) | `frontend/src/app/**` pages + `frontend/src/components/**` |
| Typed API client (frontend) | `frontend/src/lib/api.ts` — calls the backend over HTTP |
| HTTP endpoints (backend) | `backend/src/routes/**` — REST API |
| Auth, database, queries (backend) | `backend/src/**` (`db/`, `auth/`, `data/`) |
| DB migrations & seeding (backend) | `backend/drizzle/` + `backend/scripts/` |

---

## 🌐 7. Deploying to the Web

The two apps are independent and deploy separately.

1. **Backend** — any Node host (Render, Railway, Fly.io, a VPS…):
   - Build/run: `npm --prefix backend install && npm --prefix backend run db:setup && npm --prefix backend start`
   - Set `SESSION_SECRET` to a long random value and mount a **persistent disk** so `data/app.db` (and `uploads/`) survive redeploys.
   - `DATABASE_URL` is optional — defaults to `data/app.db`.

2. **Frontend** — any Node host or Vercel:
   - Build: `npm --prefix frontend run build` · Start: `npm --prefix frontend start`
   - Set `API_BASE_URL` to the deployed backend URL, e.g. `https://pragyan-api.example.com`.
   - The SPA rewrites `/api/*` and `/uploads/*` to that URL at runtime.

3. **No manual DB setup on the server** — on first boot the backend automatically runs migrations and seeds the demo database.

---

## 📜 8. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run install:all` | Installs dependencies for both `backend/` and `frontend/` |
| `npm run dev:backend` | Starts the backend API on `http://localhost:3001` |
| `npm run dev:frontend` | Starts the frontend SPA on `http://localhost:3000` |
| `npm run build` | Builds the production frontend bundle |
| `npm run typecheck` | Runs TypeScript checks for backend and frontend |
| `npm run db:setup` | Runs backend migrations and seeds demo data |
| `npm run db:migrate` | Applies pending SQL migrations from `backend/drizzle/` |
| `npm run db:seed` | Reseeds demo users, assessments, and leaderboard data |

---

## 🇮🇳 9. Team PRAGYAN (SIH 2026)
Developed for the **Smart India Hackathon 2026** to empower government and rural school students across India with accessible, high-quality NCERT foundational education.
