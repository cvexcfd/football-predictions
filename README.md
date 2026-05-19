# Football Predictions

Mobile-first web app for a group of friends to predict football match scores.

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Run the SQL migrations in order:
   - `supabase/migrations/001_schema.sql` — all tables, RLS policies, functions
   - `supabase/migrations/002_seed_wc2026.sql` — World Cup 2026 seed data
   - `supabase/migrations/003_seed_fix_knockout.sql` — additional knockout matches

3. Create an admin player:
   ```sql
   INSERT INTO players (name, access_code, is_admin) VALUES ('Admin', 'ADMIN01', true);
   ```

4. Install and run:
   ```
   npm install
   npm run dev
   ```

## Deployment

- Push to GitHub → connect to Vercel
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars in Vercel
- Add `SUPABASE_SERVICE_ROLE_KEY` for the auto-lock cron
- Deploy: Vercel auto-deploys from main branch
- Cron for auto-locking matches is configured in `vercel.json` (1-min interval)
