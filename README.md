# CAT 2026 Tracker

A visual study tracker for the [CAT 2026 6-Month Study Plan](./CAT_2026_6_Month_Study_Plan.md). Plan your prep **daily, weekly and monthly**, run a built-in **Pomodoro focus timer**, log **mock analysis** and a spaced-repetition **error log**, track which **topics** you've covered (so you stop repeating them), record **extra work beyond the plan**, and visualize your **mock marks vs. the plan's targets**.

Built with **Next.js 14 (App Router) · TypeScript · MongoDB Atlas (Mongoose) · Tailwind CSS · Recharts**.

---

## Features

| Page | What it does |
|---|---|
| **Dashboard** | Exam countdown, current phase, study streak, mock %ile trend vs. monthly target, sectional trends, study-hours bars, accuracy by area, weekly volume vs. target, error-cause pie, LR time/accuracy. |
| **Daily** | Per-day log: phase block checklist with **per-block topic tagging + repeat warnings**, hours/sleep/energy, LR sets·time·accuracy, questions+accuracy by area, and an **extra-work** logger that rolls into the same totals. |
| **Timer** | Pomodoro focus timer (configurable focus/break, auto-cycle, sound, notifications). Survives reloads/page switches and shows a live countdown in the navbar. Completed focus sessions log to the day. |
| **Topics** | Cumulative topic coverage across all areas — times studied, first/last date, freshness ("revisit" after 21 days), search & sort. So you never grind the same topic twice by accident. |
| **Mocks** | Log full mocks / sectionals / topic tests with section-wise score, %ile, attempts, accuracy & time. Overall-vs-target line, latest-mock radar, full editable history. |
| **Error Log** | Master error log tagged by **cause** + section; auto-schedules **spaced-repetition reviews** at day 1/3/7/21, graduating to "resolved." |
| **Weekly** | Per-week aggregates: hours, volume vs. phase target, accuracy, topics covered, mocks, and a saved self-review. |
| **Monthly** | Headline monthly %ile trend vs. plan targets, accuracy, error-reduction trend, topics covered, syllabus-coverage sliders, saved monthly review. |
| **Plan** | Read-only reference of the whole roadmap: 4 phases, daily templates, LR/DI set types, milestones, volume targets, calendar. |

---

## Tech stack

- **Next.js 14** (App Router, API routes) + **TypeScript**
- **MongoDB Atlas** via **Mongoose** (connection cached for serverless)
- **Tailwind CSS** for styling, **Recharts** for charts

---

## Run locally

### Prerequisites
- **Node.js 18.18+** (Node 20 recommended)
- A free **MongoDB Atlas** cluster

### 1. Install
```bash
npm install
```

### 2. Configure the database
Create **`.env.local`** in the project root (copy from `.env.example`) and set your Atlas connection string:
```
MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/cat2026?retryWrites=true&w=majority"
```
- Atlas → **Connect** → **Drivers** → copy the URI.
- Replace `<password>` with your DB user's password.
- Add a database name (e.g. `/cat2026`) before the `?`. If omitted, Mongoose uses the `test` database.

> `.env.local` is git-ignored — your credentials are never committed.

### 3. Start
```bash
npm run dev      # http://localhost:3000
```
Collections are created automatically the first time you save anything — no seeding required.

### Production build (optional, to test locally)
```bash
npm run build
npm start
```

---

## Deploy to Vercel

This app is a standard Next.js project — Vercel detects and builds it with zero config. You only need to set one environment variable and open Atlas to Vercel.

### Step 0 — Allow Vercel to reach Atlas (important)
Vercel's serverless functions use **dynamic IPs**, so you must allow access from anywhere:

1. Atlas → **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.
2. Atlas → **Database Access** → make sure your DB user has a password and **Read and write to any database**.

(If you skip this, the deployed site will throw a connection/timeout error even though localhost works.)

### Step 1 — Push the code to GitHub
From the project folder:
```bash
git init
git add .
git commit -m "CAT 2026 tracker"
git branch -M main
git remote add origin https://github.com/<you>/cat-2026-tracker.git
git push -u origin main
```
`.env.local` is git-ignored, so your Mongo URI is **not** pushed — you'll add it in Vercel next.

### Step 2 — Import into Vercel
1. Go to **vercel.com** → **Add New… → Project** → **Import** your GitHub repo.
2. Framework Preset: **Next.js** (auto-detected). Leave Build & Output settings as default.

### Step 3 — Add the environment variable
In the import screen (or later under **Project → Settings → Environment Variables**) add:

| Name | Value | Environments |
|---|---|---|
| `MONGODB_URI` | your full Atlas URI (incl. `/cat2026`) | Production, Preview, Development |

### Step 4 — Deploy
Click **Deploy**. When it finishes you'll get a `https://<project>.vercel.app` URL.

> Changed `MONGODB_URI` after deploying? Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new value is picked up.

### Alternative — Vercel CLI
```bash
npm i -g vercel
vercel            # follow prompts, links the project
vercel env add MONGODB_URI    # paste the URI when asked
vercel --prod     # production deploy
```

### Deploy checklist
- [ ] Atlas Network Access allows `0.0.0.0/0`
- [ ] DB user can read/write
- [ ] `MONGODB_URI` set in Vercel (with a database name in the path)
- [ ] `.env.local` is **not** in the repo (it's git-ignored)

---

## Project structure

```
src/
  app/
    page.tsx              Dashboard
    daily/                Daily log (topics, extra work)
    timer/                Pomodoro timer
    topics/               Topic coverage tracker
    mocks/                Mocks + charts
    errors/               Error log (spaced repetition)
    weekly/ monthly/      Period reviews
    plan/                 Plan reference
    api/                  REST routes (daily, daily/focus, mocks, errors, reviews)
  components/             Nav, shared UI primitives
  lib/
    mongodb.ts            Cached Mongoose connection
    planData.ts           The plan encoded as data (targets, phases, LR types)
    compute.ts            Aggregation helpers
    utils.ts              Date/phase helpers
  models/                 Mongoose schemas (DailyLog, Mock, ErrorLog, Review)
```

## Data model (MongoDB collections)
- `dailylogs` — one document per date (upserted): hours, practice by area, LR, topics, extra work, pomodoros.
- `mocks` — one per mock/sectional/topic test.
- `errorlogs` — one per logged error, with spaced-repetition state.
- `reviews` — weekly & monthly review notes.

## Customizing the plan
All targets — phases & dates, daily templates, weekly volume targets, monthly %ile targets, LR/DI set types — live in **[`src/lib/planData.ts`](./src/lib/planData.ts)**. When the official CAT 2026 notification confirms the exam date, update `EXAM_DATE` there and every countdown, phase boundary and target recalculates.

---

*Mock %iles run on a different pool than the real exam — track the trend, not single numbers.*
