# WC2026 Betting League — PRD & Plan of Attack

## Context

World Cup 2026 runs June–July 2026. Felix and friends want a private, invite-only betting tracker where each member logs their wagers, sees live match fixtures, and competes on a leaderboard. The goal is a polished, sportsbook-dark-themed webapp that can be shipped quickly and hosted on Vercel.

---

## Product Requirements Document (PRD)

### Product Vision
A private group betting league tracker for World Cup 2026 — think a personal sportsbook ledger meets a fantasy football leaderboard, but for real-money bets.

### Users
- **Admin**: Creates the league, manages invite link, can mark match results
- **Member**: Joins via invite link, logs bets, views their own stats and the group leaderboard

### Must-Have Features (MVP)

#### 1. Auth & Onboarding
- Clerk + Google OAuth sign-in
- After sign-in: join a league via invite link OR create one (admin role auto-assigned to creator)
- League invite link is a unique slug (e.g. `/join/abc123`)

#### 2. Live Match Schedule
- Pulls fixtures from API-Football (World Cup 2026 tournament)
- Shows: Date, Group/Round, Teams, Kickoff time (local timezone), Current score / Final score
- Matches are the anchor for adding bets — click a match to bet on it
- Scores auto-update (polling or webhook)

#### 3. Bet Log
- Each bet records:
  - **Match** (linked to fixture, or "Other" for futures/specials)
  - **Bet type**: Match Winner (1X2), Over/Under, Both Teams to Score, Accumulator/Parlay, Custom (free-text description)
  - **Selection** (e.g. "Brazil to win", "Over 2.5", custom text)
  - **Odds** (decimal format, e.g. 1.85)
  - **Stake** (real money, user's currency)
  - **Status**: Pending / Won / Lost / Void / Cashed Out
  - **Payout** (auto-calculated: stake × odds if Won, 0 if Lost, custom if Cashed Out)
  - **Notes** (optional free text)
  - **Created at** timestamp
- For Accumulators: support multiple legs, each with their own odds; combined odds = product of all legs
- Users can only edit/delete their own bets

#### 4. P&L Dashboard (per user)
- **Summary cards**: Total staked, Total returned, Net P&L, ROI %, Win rate %, Bets placed
- **P&L chart**: Cumulative profit/loss over time (line chart)
- **Bet breakdown**: By type, by status
- **Best/worst bets** highlights

#### 5. Leaderboard
- Ranked table with all league members
- Sortable by: Net P&L, ROI %, Win Rate %, Total Bets
- Default sort: Net P&L
- Shows each member's key stats at a glance
- Live updates (polling)

#### 6. Settings
- User: display name, preferred currency (default USD), timezone
- Admin: regenerate invite link, rename league

#### 7. Proxy Bet Entry (Bet on Behalf of Another Member)
- Any league member can log a bet attributed to another member
- Use case: one person holds the actual bookie account and places bets for the whole group; they log everyone's bets in one session
- "Add Bet" modal has a **"Placing for…"** dropdown listing all league members (defaults to yourself)
- `placed_by_user_id` (the logger) is stored separately from `user_id` (the attributed bettor)
- The bet appears on the attributed member's dashboard, history, and leaderboard stats — not the logger's
- Both the attributed member and the logger can edit/delete the bet (admin can always delete)

#### 8. Mobile-First Responsive Design
- All pages designed mobile-first; no separate mobile app needed
- Bottom navigation bar on mobile (Dashboard, Schedule, Bets, Leaderboard)
- Sidebar navigation on desktop (≥ 1024px)
- Bet entry modal is a full-screen bottom sheet on mobile
- Leaderboard table scrolls horizontally on small screens; key columns (rank, name, P&L) are sticky
- Fixture cards stack vertically on mobile, grid on tablet/desktop

### Non-Goals (post-MVP)
- Multiple leagues per user
- Odds comparison / bookie integration
- Push notifications
- Native mobile app

---

## Technical Architecture

### Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, Vercel-native, RSC for perf |
| Auth | Clerk | Google OAuth, webhooks, user management out of box |
| Database | Neon (PostgreSQL) | Serverless Postgres, generous free tier, Drizzle ORM |
| ORM | Drizzle ORM | Type-safe, lightweight, pairs perfectly with Neon |
| Styling | Tailwind CSS v4 + shadcn/ui | Dark theme, fast to build |
| Charts | Recharts | React-native, good dark mode support |
| External API | API-Football (v3) | Real-time WC fixtures and scores |
| Hosting | Vercel | Zero-config Next.js deploys |
| Background jobs | Vercel Cron | Sync match scores every 5 minutes |

### Database Schema (Drizzle / PostgreSQL)

```sql
-- Users (synced from Clerk via webhook)
users: id, clerk_id, email, display_name, currency (default 'USD'), timezone, created_at

-- Leagues
leagues: id, name, slug (unique invite key), admin_id (→ users), created_at

-- League memberships
league_members: id, league_id, user_id, joined_at
-- unique(league_id, user_id)

-- Fixtures (cached from API-Football)
fixtures: id, api_football_id (unique), league_id_ext, season, round, home_team, away_team,
          kickoff_at, status, home_score, away_score, synced_at

-- Bets
bets: id, user_id (attributed bettor), placed_by_user_id (logger, nullable — null = self),
      league_id, fixture_id (nullable), bet_type (enum), description,
      selection, odds (numeric), stake (numeric), currency, status (enum),
      payout (numeric, nullable), notes, created_at, updated_at
-- user_id drives all stats; placed_by_user_id is audit trail only

-- Accumulator legs (for parlay bets)
bet_legs: id, bet_id, fixture_id (nullable), description, selection, odds (numeric), status (enum)

-- Enums
bet_type: 'match_winner' | 'over_under' | 'btts' | 'accumulator' | 'custom'
bet_status: 'pending' | 'won' | 'lost' | 'void' | 'cashed_out'
```

### Key API Routes (Next.js Route Handlers)

```
POST /api/webhooks/clerk                  — sync user creation/updates from Clerk
GET  /api/fixtures                        — list WC fixtures (from DB cache)
POST /api/bets                            — create a bet (with optional placed_for)
PATCH /api/bets/[id]                      — update bet status/payout
DELETE /api/bets/[id]                     — delete bet (attributed user, logger, or admin)
GET  /api/league/[slug]/leaderboard       — aggregate stats per member
POST /api/league                          — create league
POST /api/league/[slug]/join              — join league via invite
GET  /api/league/[slug]/members           — list members (for proxy dropdown)
GET  /api/dashboard                       — personal P&L stats for current user
```

### Fixture Sync (Vercel Cron)
- Cron at `*/5 * * * *` during tournament: `GET /api/cron/sync-fixtures`
- Calls API-Football `/fixtures?league=1&season=2026` (WC 2026 league ID)
- Upserts into `fixtures` table
- Auto-resolves pending bets where the match has a final score (marks bets that can be settled)

### App Router Page Structure

```
app/
  (auth)/
    sign-in/          — Clerk SignIn component
    sign-up/          — Clerk SignUp component
  (app)/
    layout.tsx        — sidebar (desktop) + bottom nav (mobile), auth guard
    dashboard/        — personal P&L dashboard
    schedule/         — fixture list with "Add Bet" CTA
    bets/             — full bet history table (filterable by member for proxy view)
    leaderboard/      — group rankings
    settings/         — user + league settings
  join/[slug]/        — invite landing page (public)
  api/                — route handlers
```

---

## Design System

- **Theme**: Dark (`bg-zinc-950`, `bg-zinc-900` cards)
- **Accent**: Emerald green (`#10B981`) for wins/positive, Rose (`#F43F5E`) for losses/negative, Amber for pending
- **Typography**: `Inter` (body), `Geist` (headings/numbers)
- **Key components** (via shadcn/ui): Table, Card, Badge, Dialog/Drawer (bet entry), Select, Input, Tabs
- **Chart**: Recharts `AreaChart` for P&L curve (dark background, emerald line, rose fill below zero)
- **Mobile nav**: Fixed bottom bar with 4 icon+label tabs; hides on scroll down, shows on scroll up

---

## Skill Execution Pipeline (One-Shot UI Build)

Use this sequence when building the UI in a single session:

### Step 1 — Design System (`/ui-ux-pro-max:ui-ux-pro-max`)
Establish the full design language before writing a single component:
- Dark sportsbook theme: zinc-950 base, zinc-900 cards, zinc-800 borders
- Accent palette: emerald-500 (wins), rose-500 (losses), amber-500 (pending)
- Typography: Geist for headings/numbers, Inter for body
- Spacing scale, border radius, shadow tokens
- Component anatomy: cards, badges, tables, bottom sheet, stat cards, charts
- Mobile-first breakpoints: base = 375px, md = 768px, lg = 1024px

### Step 2 — Page-by-Page UI (`/document-skills:frontend-design`)
Build each page against the Step 1 design system, in order:
1. `(app)/layout.tsx` — shell: sidebar (desktop) + bottom nav (mobile)
2. `dashboard/page.tsx` — stat cards + P&L area chart
3. `schedule/page.tsx` — fixture cards grouped by date
4. `bets/page.tsx` — filterable bet history table
5. `leaderboard/page.tsx` — sortable rankings table with sticky columns
6. `BetModal.tsx` — Dialog on desktop, Drawer (bottom sheet) on mobile

### Step 3 — Code Quality (`/simplify`)
After each page is built, run `/simplify` to eliminate duplication, tighten props, and ensure reuse of shared components.

### Step 4 — Validation (`/document-skills:webapp-testing`)
With dev server running, Playwright tests cover:
- Add a bet (mobile viewport 375px)
- Proxy bet for another member
- Leaderboard sort toggle
- Bet modal opens as bottom sheet on mobile

---

## Implementation Plan (Phases)

### Phase 1 — Project Scaffold & Auth (Day 1)
1. `npx create-next-app@latest wc2026-bets --typescript --tailwind --app`
2. Install: `@clerk/nextjs`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `shadcn/ui`, `recharts`
3. Configure Clerk (Google OAuth, webhooks endpoint)
4. Create Neon DB, set up Drizzle config and migrations
5. Run initial migration (all tables)
6. Clerk webhook: `POST /api/webhooks/clerk` → upsert user into `users` table
7. Auth middleware: protect all `/(app)/*` routes, redirect unauthenticated to `/sign-in`

### Phase 2 — League & Invite System (Day 1–2)
1. "Create League" flow: admin names the league, gets a shareable `/join/[slug]` URL
2. `/join/[slug]` page: shows league info, "Join League" CTA (requires sign-in first)
3. After joining, redirect to `/dashboard`
4. Guard: users without a league can't access app pages — show "You're not in a league yet" screen

### Phase 3 — Fixture Sync & Schedule Page (Day 2)
1. API-Football integration: `GET /api/cron/sync-fixtures` pulls WC 2026 fixtures
2. Store in `fixtures` table (upsert by `api_football_id`)
3. Schedule page: grouped by date, shows round/group, teams, kickoff, score/status; fixture cards stack on mobile, grid on desktop
4. Vercel Cron: every 5 min during tournament (`vercel.json` cron config)
5. Seed initial fixtures manually if API-Football WC 2026 data isn't live yet

### Phase 4 — Bet Entry & Management (Day 2–3)
1. "Add Bet" modal / bottom sheet (triggered from schedule or `/bets`)
   - **"Placing for…" dropdown** — lists all league members, defaults to current user (proxy betting)
   - Match selector (search or click from schedule)
   - Bet type dropdown (Match Winner, O/U, BTTS, Accumulator, Custom)
   - Dynamic form: Accumulator shows "Add Leg" repeater with per-leg odds; combined odds auto-calculated
   - Odds (decimal), Stake, Currency, Notes fields
   - On mobile: renders as shadcn/ui `<Drawer>` (full-screen bottom sheet); on desktop: `<Dialog>`
2. `POST /api/bets` → stores `user_id` = selected member, `placed_by_user_id` = current user (if different)
3. Bet list page (`/bets`): filterable by status, type, date, member; sortable columns; "Logged by X" badge for proxy bets
4. Edit/settle bet: update status to Won/Lost/Void/Cashed Out, set actual payout
5. Delete bet (attributed member, logger, or admin)

### Phase 5 — P&L Dashboard (Day 3)
1. Server-side aggregate query for current user: total staked, returned, P&L, ROI, win rate, counts
2. Summary stat cards at top of `/dashboard`
3. Recharts `AreaChart` of cumulative P&L over time (one data point per settled bet, ordered by date)
4. Bet breakdown by type and by status
5. Best bet / worst bet highlight cards

### Phase 6 — Leaderboard (Day 3–4)
1. `GET /api/league/[slug]/leaderboard` → aggregate stats per user in the league
2. Leaderboard table: rank, name, net P&L, ROI %, win rate %, total bets
3. Sortable columns (client-side); default sort: Net P&L
4. On mobile: sticky rank + name columns, horizontal scroll for stat columns
5. Polling refresh every 30 seconds via SWR `refreshInterval`

### Phase 7 — Polish & Deploy (Day 4)
1. Dark theme audit — ensure consistent zinc/emerald/rose palette throughout
2. Loading skeletons for all async data fetches
3. Mobile layout: fixed bottom tab bar on < 1024px; collapsible sidebar on desktop
4. Error states: API-Football down, invalid invite link, network errors
5. `vercel.json` with cron config
6. Set env vars in Vercel dashboard
7. Deploy + smoke test the full flow: sign in → create league → invite → add bet → proxy bet for teammate → view leaderboard

---

## Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Neon
DATABASE_URL=           # Neon connection string (pooled)

# API-Football
API_FOOTBALL_KEY=       # RapidAPI key for api-football.com
API_FOOTBALL_HOST=v3.football.api-sports.io

# App
NEXT_PUBLIC_APP_URL=https://wc2026-bets.vercel.app
```

---

## Verification Checklist

- [ ] Sign in with Google via Clerk → user row created in DB
- [ ] Create a league → invite URL generated
- [ ] Open invite URL in incognito → sign in → join league → land on dashboard
- [ ] Fixture sync cron fires → WC 2026 matches appear in `/schedule`
- [ ] Add a Match Winner bet (for yourself) → appears in `/bets` as Pending
- [ ] Add a bet **on behalf of another member** → appears on their dashboard/bets, not yours; "Logged by X" badge shown
- [ ] Add an Accumulator bet with 3 legs → combined odds calculated correctly as product of legs
- [ ] Settle a bet as Won → P&L dashboard of attributed member updates: net P&L, ROI %, win rate
- [ ] Leaderboard shows all users with correct rankings
- [ ] Admin can regenerate invite link; old link stops working
- [ ] On mobile (375px): bottom nav visible, bet modal opens as bottom sheet, schedule cards stack vertically
- [ ] Leaderboard scrolls horizontally on mobile with rank+name columns sticky

---

## Critical Files to Create

```
wc2026-bets/
  src/
    app/
      (app)/layout.tsx             ← sidebar + mobile bottom nav shell
      (app)/dashboard/page.tsx
      (app)/schedule/page.tsx
      (app)/bets/page.tsx
      (app)/leaderboard/page.tsx
      (app)/settings/page.tsx
      join/[slug]/page.tsx
      api/webhooks/clerk/route.ts
      api/bets/route.ts
      api/bets/[id]/route.ts
      api/fixtures/route.ts
      api/cron/sync-fixtures/route.ts
      api/league/route.ts
      api/league/[slug]/join/route.ts
      api/league/[slug]/members/route.ts
      api/league/[slug]/leaderboard/route.ts
      api/dashboard/route.ts
    db/
      schema.ts        ← Drizzle schema (all tables + enums)
      index.ts         ← Neon + Drizzle client singleton
      migrations/      ← auto-generated by drizzle-kit
    lib/
      api-football.ts  ← API-Football client wrapper
      utils.ts         ← P&L calculation helpers (stake, payout, ROI)
    components/
      BetModal.tsx     ← Dialog on desktop, Drawer on mobile
      FixtureCard.tsx
      LeaderboardTable.tsx
      PLChart.tsx
      StatCard.tsx
      BottomNav.tsx    ← Mobile bottom navigation bar
  drizzle.config.ts
  vercel.json          ← cron job config
  middleware.ts        ← Clerk auth middleware
```
