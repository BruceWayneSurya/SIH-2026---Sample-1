# Pragyan (प्रज्ञान) — Open Digital Learning & Assessment Portal

> **Smart India Hackathon (SIH 2026)**  
> **Team Name:** PRAGYAN  
> **Project Title:** Pragyan — Open Digital Learning & Assessment Portal (SIH Edition)

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-green?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![SQLite WASM](https://img.shields.io/badge/Database-SQLite_(sql.js_WASM)-003b57?style=flat&logo=sqlite)](https://sql.js.org/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-success?style=flat)](#)

---

## 📖 1. Overview & Vision

**Pragyan** is a lightweight, accessible digital learning and assessment portal aligned with the official **NCERT curriculum** for **Class 7 and Class 8**. Designed specifically for the Indian public school ecosystem, it bridges the gap between students and educators through faculty-verified video lectures, peer-reviewed community notes, previous years' question (PYQ) assessments, and a real-time gamified peer-benchmarking engine.

Built strictly according to the **National Portal of India Design Guidelines (NIC)**, Pragyan features a clean Indian Government aesthetic (Deep Blue `#133b5c`, Saffron `#d97706`/`#f59e0b`, High-Contrast Typography, and an Ashoka Chakra emblem).

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
   - **Self-Paced "Model Answer Reveal":** Interactive step-by-step scoring scheme rubrics (Step 1 = 1M, Diagram = 1M) and downloadable official marking scheme text files (**+30 XP for completion**).

### 🏆 Gamified Leaderboard & Peer Benchmarking
- **Class-Wide Leaderboard:** Overall ranks across all active learners in Class 7 or Class 8.
- **Chapter-Wise Master Leaderboard:** Specialized ranks based solely on test performance in a specific chapter (e.g., *Top Performers in Class 8 Science · Chapter 6*).
- Displays rank medals, badges (*Science Scholar*, *Top Contributor*, *Math Wizard*), accuracy percentage, and total XP.

### ⚡ 1-Click Zero-Friction Evaluator Access
- Unified login (`/login`) and registration (`/register`) with **1-click evaluator demo buttons** (*"Try as Guest Student"* and *"Try as Guest Faculty"*), plus pre-seeded persona switchers to test both Student and Faculty perspectives instantly without manual signup.

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

| Layer | Technology | Key Advantage |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | Server Components, fast static streaming, zero layout shift |
| **Styling & UI** | Tailwind CSS 4, Lucide Icons | Accessible, high-contrast Government of India theme |
| **Database** | SQLite via `sql.js` (WebAssembly) | **Zero-server setup**: runs in-process with persistent file `data/app.db`. No PostgreSQL/MySQL/Docker required |
| **ORM** | Drizzle ORM & Drizzle Kit | Type-safe queries and automated migrations |
| **Auth & Security**| Scrypt password hashing & HMAC-signed cookies | Session management with RBAC |

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

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Initialize and Seed the Database
This creates the SQLite database tables and seeds demo students, faculty, NCERT curriculum, 20-MCQ PYQ pools, subjective rubrics, and leaderboards:
```bash
npm run db:setup
```

### Step 4: Start the Development Server
```bash
npm run dev
```

### Step 5: Open in Your Browser
Open your browser and visit:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📂 6. Project Structure

```
SIH-PRAGYAN-2026/
├── drizzle/                     # SQL migration files & schema snapshots
├── public/
│   └── slides/                  # Downloadable Markdown & presentation decks
├── scripts/
│   ├── migrate.ts               # Drizzle SQLite migration runner
│   ├── seed.ts                  # Database seeding script
│   └── seed-content.ts          # Curated NCERT questions, MCQs, and rubrics
├── src/
│   ├── app/
│   │   ├── account/page.tsx     # Student/Faculty profile & Evaluator Sandbox
│   │   ├── api/                 # REST APIs (Auth, Notes, Quizzes, Votes)
│   │   ├── class/[classNo]/     # Class & Subject chapter indices
│   │   ├── home/page.tsx        # Main student/faculty dashboard
│   │   ├── leaderboard/page.tsx # Class-wide & Chapter-specific leaderboards
│   │   ├── login/page.tsx       # Unified NIC-themed login with 1-click demo access
│   │   ├── register/page.tsx    # Unified student/faculty registration
│   │   ├── globals.css          # Tailwind CSS 4 theme rules & animations
│   │   └── layout.tsx           # Global root layout & national portal header
│   ├── components/
│   │   ├── data-saver-toggle.tsx# Low-bandwidth mode controller
│   │   ├── header.tsx           # National portal navigation bar
│   │   ├── notes-section.tsx    # Upvoting & faculty verification component
│   │   ├── objective-quiz.tsx   # Timed 20-MCQ PYQ assessment engine
│   │   ├── subjective-practice.tsx # 15-question subjective rubric reveal engine
│   │   ├── ui.tsx               # Reusable UI cards, wordmarks & progress bars
│   │   └── video-player.tsx     # Lecture video player with chapter markers
│   ├── db/
│   │   ├── index.ts             # sql.js WASM SQLite connection & disk persistence
│   │   └── schema.ts            # Drizzle ORM relational schema
│   └── lib/
│       ├── badges.ts            # Gamification badge definitions
│       ├── curriculum.ts        # NCERT Class 7 & 8 subject/chapter mappings
│       ├── queries.ts           # Type-safe database queries
│       └── session.ts           # RBAC authentication & session helpers
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📜 7. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local development server at `http://localhost:3000` |
| `npm run build` | Builds the production bundle |
| `npm run start` | Starts the production server |
| `npm run typecheck` | Runs TypeScript static type checking (`tsc --noEmit`) |
| `npm run db:setup` | Runs migrations and seeds demo data |
| `npm run db:migrate` | Applies pending SQL migrations from `drizzle/` |
| `npm run db:seed` | Reseeds demo users, assessments, and leaderboard data |

---

## 🇮🇳 8. Team PRAGYAN (SIH 2026)
Developed for the **Smart India Hackathon 2026** to empower government and rural school students across India with accessible, high-quality NCERT foundational education.

