# E-Commerce App — Phase 0 Scaffold

This is the Phase 0 scaffold from `BLUEPRINT.md`: Next.js (App Router) + TypeScript + Tailwind + a MongoDB connection singleton. No separate Node/Express server — API routes live in `app/api/**` and act as the backend.

## Setup (run these on your own machine)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Then fill in `.env.local` with:
   - `MONGODB_URI` — from MongoDB Atlas (free tier is enough for now)
   - Leave the rest blank for now — they're needed starting Phase 2 (Auth) and Phase 6 (Payments)

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` — you should see "Phase 0 Setup Complete".

4. **Verify the database connection**
   Visit `http://localhost:3000/api/health` — should return:
   ```json
   { "status": "ok", "db": "connected" }
   ```
   If it errors, double check `MONGODB_URI` in `.env.local` (make sure your IP is allow-listed in Atlas, or allow `0.0.0.0/0` for local dev).

## What's included in this scaffold
- `app/` — App Router pages and API routes
- `lib/db.ts` — Mongoose connection singleton (prevents connection leaks across hot reloads/serverless calls)
- `app/api/health/route.ts` — sanity-check route for the DB connection
- Tailwind CSS configured and working
- `.env.local.example` — matches every variable listed in `BLUEPRINT.md` Section 12

## Not included yet (upcoming phases)
- `models/` folder is empty — Phase 1 adds all Mongoose schemas + a seed script
- No auth yet — Phase 2
- No admin panel yet — Phase 3
- See `BLUEPRINT.md` for the full phase-by-phase plan

## Next step
Once `npm install` and `/api/health` both work locally, come back and say **"Phase 0 confirmed, start Phase 1"** and we'll build all the Mongoose models + seed script.
