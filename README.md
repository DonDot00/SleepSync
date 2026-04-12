# SleepSync

> An AI-assistant scheduling tool that optimizes your calendar around your sleep so you perform at your best, every day.

### About

SleepSync is an AI assistant that analyzes your schedule and helps you build positive habits around optimal sleep, tailored to you. Instead of letting the demands of daily life eat into your rest, SleepSync meticulously plans your day with your sleep health as its main priority.

Whether you're striving to meet a deadline or managing a packed week, SleepSync makes sure you're not sacrificing the sleep you need to get things done efficiently.

## Features

- ⚡ **Real-time Adjustments** - Adapts your schedule on the fly when sudden changes come up.
- 🤖 **AI assistant** — Chat to plan your day, reschedule events, and get personalized sleep advice.
- 😴 **Sleep optimization** — Suggests ideal bedtimes and wake times based on your workload and personal inputs.
- 🗓 **Smart scheduling** — AI assists in setting the best times for tasks based on your sleep patterns.


## Tech Stack 
| Layer      | Technology       |
|------------|------------------|
| Frontend   | Node.js + React  |
| Backend    | Python + FastAPI |
| AI         | Open API         |
| Styling    | Tailwind CSS     |




## How It Works
1. 
# Team
**Built with C4's, Celsius, Aulani's and not enough sleep at HackHound's Loyola Maryland - 4/11/2026 to 4/12/2026**

| Name             | Role |
|------------------|------|
| Donovan Raymond  |   Back End Developer   |
| Rasheed Mustapha |   Front End Developer   |

# SleepSync

> An AI-powered scheduling assistant that optimizes your calendar around your sleep — so you perform at your best, every day.

---

## Table of Contents
- [About](#about)
- [Why SleepSync?](#why-sleepsync)
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Team](#team)

---

## About

SleepSync is an AI assistant that analyzes your schedule and helps you build positive habits around optimal sleep — tailored to you. Instead of letting the demands of daily life eat into your rest, SleepSync meticulously plans your day with your sleep health as its main priority.

Whether you're striving to meet a deadline or managing a packed week, SleepSync makes sure you're never sacrificing the sleep you need to perform at your best.

---

## Why SleepSync?

### Sleep-first scheduling matters more than you think

Most calendar apps treat sleep as an afterthought — a blank block at the end of the day. SleepSync treats it as the foundation everything else is built around.

> **The average adult needs 7–9 hours of sleep. Most get 6.5.**

That gap compounds fast. One night of poor sleep reduces cognitive performance by up to 30%. Three nights and decision-making, emotional regulation, and physical performance all decline measurably. No productivity system fixes a sleep debt.

### How SleepSync is different

| Feature | Google Calendar / Notion | SleepSync |
|---|---|---|
| Scheduling | Manual | AI-assisted |
| Sleep awareness | None | Core feature |
| Bedtime protection | None | Non-negotiable |
| Pattern learning | None | Tracks misses and habits |
| AI assistant | No | Yes — chat to reschedule |
| Wind-down reminders | No | Automatic |
| Energy-aware scheduling | No | Energy slider input |

### The science behind it

SleepSync is built around three principles from sleep research:

- **Circadian consistency** — going to bed and waking at the same time every day, even weekends, is the single highest-impact sleep habit.
- **Sleep pressure** — your body builds adenosine (sleep pressure) throughout the day. SleepSync uses this to schedule demanding tasks when you're naturally alert and lighter tasks as pressure builds.
- **REM protection** — REM sleep, the most cognitively restorative phase, is concentrated in the last third of the night. Cutting sleep short — even by 90 minutes — eliminates most of it. SleepSync treats your wake time as sacred.

---

## Features

- 🤖 **AI assistant** — Chat naturally to plan your day, reschedule events, and get personalized sleep advice.
- 😴 **Sleep optimization** — Suggests ideal bedtimes and wake times based on your workload and personal goals.
- 🗓 **Smart scheduling** — AI places flexible tasks in optimal time slots based on your energy and sleep patterns.
- ⚡ **Real-time adjustments** — Adapts your schedule on the fly when things change.
- 📊 **Sleep health panel** — Tracks Deep, REM, and Light sleep with estimated stage breakdowns.
- 🔁 **Repeating events** — Set recurring tasks (e.g. class MWF at 9am) and the scheduler accounts for them automatically.
- 🌙 **Bedtime line** — A visible bedtime line on your calendar warns you when events conflict with your wind-down window.
- ⚡ **Energy slider** — Tell SleepSync how you feel today and it adjusts your schedule accordingly.
- 🎨 **Custom event colors** — Color-code events by type with 8 theme options.
- 📅 **Dual-day view** — See today and tomorrow side by side, collapsing to one column on smaller screens.
- 🔴 **Priority tracking** — High / Medium / Low priority with automatic demotion after repeated misses.

---

## How It Works

```
1. Input your sleep goals
   └── Set your bedtime, wake time, and sleep goal (e.g. 8h)

2. Add your tasks and events
   └── Fixed tasks (class at 9am), flexible tasks (study session),
       and free-time blocks — with priority and repeat settings

3. The AI optimizes your day
   └── Fills your schedule around sleep, respects fixed commitments,
       and places flexible tasks in your best focus windows

4. Adjust on the fly
   └── Chat with the assistant: "I'm tired today" or "move my run to 6am"
       and it reschedules intelligently without touching your sleep block

5. Track patterns over time
   └── Missed a task 3 times? The AI notices and adapts your schedule.
       Consistently completing your morning workout? It gets locked in earlier.
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│                                                     │
│   React + Vite frontend                             │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────┐  │
│   │  Calendar   │  │  AI Chat     │  │  Sleep   │  │
│   │ (drag/drop) │  │  Panel       │  │  Health  │  │
│   └──────┬──────┘  └──────┬───────┘  └────┬─────┘  │
└──────────┼────────────────┼───────────────┼─────────┘
           │    REST API calls (fetch)       │
           ▼                                ▼
┌─────────────────────────────────────────────────────┐
│                  FastAPI Backend                    │
│                                                     │
│   POST /tasks      ← create event                  │
│   GET  /tasks      ← load calendar                 │
│   PATCH /tasks/:id ← edit / mark complete/missed   │
│   DELETE /tasks/:id← remove event                  │
│   POST /chat       ← send message to AI            │
│                                                     │
│   ┌──────────────────────────────────────────────┐  │
│   │  Scheduling Engine (schedule_engine.py)      │  │
│   │  Sorts tasks by priority, fills time slots,  │  │
│   │  protects sleep block                        │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   ┌──────────────────────────────────────────────┐  │
│   │  AI Assistant (ai_assistant.py)              │  │
│   │  Sends schedule context to OpenAI GPT-4o-mini│  │
│   │  Returns structured JSON action + message    │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   SQLite Database (rem_ai.db)                       │
│   └── tasks table — all events, priorities,        │
│       miss counts, repeat configs                   │
└─────────────────────────────────────────────────────┘
           │
           ▼
    OpenAI API (GPT-4o-mini)
```

### Data flow for a chat message

```
User types "I'm stressed, move my workout to later"
    ↓
Frontend sends POST /chat { message, wake_time, sleep_time }
    ↓
Backend fetches all tasks from DB
    ↓
Builds schedule_context dict (tasks + times)
    ↓
Sends context + message to OpenAI
    ↓
OpenAI returns { message, action, task_name, new_time, warning }
    ↓
Backend returns JSON to frontend
    ↓
Frontend displays AI message + optionally refreshes calendar
```

---

## Tech Stack

| Layer      | Technology              | Why                                       |
|------------|-------------------------|-------------------------------------------|
| Frontend   | React + Vite            | Fast dev server, component-based UI       |
| Styling    | Plain CSS + Rubik/Syne  | Custom dark theme, no framework overhead  |
| Backend    | Python + FastAPI        | Fast, typed, auto-generates API docs      |
| Database   | SQLite + SQLAlchemy     | Zero config for hackathon, easy to swap   |
| AI         | OpenAI GPT-4o-mini      | Fast, cheap, structured JSON output       |
| Drag/Drop  | @dnd-kit/core           | Modern React drag-and-drop                |

---

## Setup & Installation

### Prerequisites

- Node.js v18+
- Python 3.10+
- An OpenAI API key (get one at [platform.openai.com](https://platform.openai.com))

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/sleepsync.git
cd sleepsync
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/Scripts/activate   # Windows (Git Bash)
source .venv/bin/activate        # Mac / Linux

# Install dependencies
pip install -r requirements.txt

# Add your OpenAI key
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Start the server
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`  
API docs available at `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend runs at `http://localhost:5173`

### Environment variables

| Variable         | File           | Description            |
|------------------|----------------|------------------------|
| `OPENAI_API_KEY` | `backend/.env` | Your OpenAI secret key |

---

## Screenshots

> Dashboard — full calendar view with Today + Tomorrow columns

![Dashboard](docs/screenshots/dashboard.png)

> AI chat assistant — natural language scheduling

![Chat](docs/screenshots/chat.png)

> Sleep health panel — stage breakdown and editable goals

![Sleep](docs/screenshots/sleep.png)

> Event modal — priority, task type, repeat settings, color picker

![Modal](docs/screenshots/modal.png)

---

## Roadmap

The hackathon build covers the core scheduling loop. Here is where SleepSync goes next:

### Near term
- [ ] User accounts and authentication
- [ ] Persistent sleep history across sessions
- [ ] Weekly sleep report — % completed, most missed tasks, goal hit rate
- [ ] Streak tracking (Duolingo-style) for consistent habits
- [ ] Mobile-responsive layout

### Medium term
- [ ] Google Calendar and Outlook sync — pull existing events automatically
- [ ] Wearable integration — Fitbit, Oura Ring, Apple Health sleep data
- [ ] Circadian rhythm modeling — schedule tasks around your natural alertness curve
- [ ] Burnout detection — flags when sleep debt accumulates over multiple days
- [ ] Mood journal — one-word daily check-in, correlated with sleep score over time

### Long term
- [ ] Team scheduling — find shared availability without anyone sacrificing sleep
- [ ] Multi-timezone support for distributed teams
- [ ] Native iOS and Android apps
- [ ] LLM fine-tuning on anonymized scheduling patterns for better personalization
- [ ] Integration with academic calendars (Canvas, Blackboard) for student scheduling

---

## Team

**Built with C4's, Celsius, Aulani's and not enough sleep at HackHound — Loyola Maryland, 4/11/2026 to 4/12/2026**

| Name             | Role                |
|------------------|---------------------|
| Donovan Raymond  | Back End Developer  |
| Rasheed Mustapha | Front End Developer |