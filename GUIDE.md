# Admin & Player Guide — World Cup 2026 Predictor

## For the League Organizer (Admin)

### 1. Admin Login
- Go to `/` and enter the admin access code: **WC2026ADMIN** (case-insensitive)
- You'll see the **Admin Dashboard** at `/admin` with links to all management pages

### 2. Create Your League
- Go to **Admin > Leagues** (`/admin/leagues`)
- Click **Add League**, give it a name (e.g. "My WC2026 Pool")
- This creates an empty league container. The default league with all 104 matches already exists.

### 3. Create Players (6–8)
- Go to **Admin > Players** (`/admin/players`)
- Click **Add Player**, enter a name. An 8-char access code is auto-generated.
- **Write down each code** — players need it to log in. Example codes: `A3B7K9P1`, `M2X8R4F6`
- Create 6–8 players. That's the sweet spot: enough for competition, well under free tier limits.

### 4. Let Players Join
- Players go to the site URL, enter their access code, and land on **Matches** page.
- They submit predictions for upcoming matches by entering scores in the two input boxes.
- **They can edit predictions anytime** before the match locks (2h before kickoff). The existing prediction pre-fills in the inputs, and the button says "Update Prediction" instead of "Submit". Editing calls the same RPC with UPSERT — old badge is refunded, new badge deducted, prediction overwritten.

### 5. Match Lifecycle
| Status | What happens |
|--------|-------------|
| `upcoming` | Players submit/edit predictions freely |
| `locked` | Auto-locked 2h before kickoff; predictions frozen |
| `finished` | Admin enters scores → points auto-calculated |

### 6. Entering Scores (Admin)
- Go to **Admin > Matches** (`/admin/matches`)
- Find the finished match → click **Enter Score** → type home & away goals → **Save**
- The `calculate_match_points` RPC runs immediately, awarding:
  - **E (pts_exact)**: correct exact score → max points
  - **R (pts_result)**: correct result (win/loss/draw) → fewer points
  - Players' `total_points` update instantly. No refresh needed.
- **Manual lock/unlock**: Use 🔒/🔓 buttons if a match needs early locking.

### 7. Badges (Optional)
- Go to **Admin > Badges** to create multiplier (×N) or bonus (+N) badges
- Distribute to individual players or "All players"
- Players select a badge when submitting a prediction

### 8. Scoring Flow
1. Player submits prediction → stored with UPSERT
2. Match finishes → admin enters actual score
3. `calculate_match_points` compares prediction vs actual, assigns points
4. Player `total_points` is recalculated from all their predictions
5. Leaderboard, profiles, results all reflect updated points

## What Won't Crash

The free Supabase + Vercel stack handles 6–8 players with huge margin:

| Resource | Free Limit | 8 Players Usage |
|----------|-----------|----------------|
| DB rows | unlimited | ~1,000 predictions total |
| Bandwidth | 2 GB/month | ~50 MB/month |
| Function timeout | 10s | queries complete in <200ms |
| Concurrent users | 100+ | 8 at most |

**Safe practices already in place:**
- All predictions use a single RPC call (`submit_prediction`) — no N+1 queries
- Leaderboard loads in one query with all relations
- Match list loads with pre-joined prediction data
- Badge increments/decrements happen atomically inside the RPC (row-level locks)
- Audit logs don't affect user-facing performance

## If Something Goes Wrong

### "Match is not open for predictions"
The match is either locked or has kicked off. Check status in Admin > Matches. Use 🔓 to unlock if needed.

### "Failed to save prediction" toast
- Match may have just locked (cron runs every minute)
- Badge quantity may be 0
- Check browser console for the actual error message

### Points not showing
Admin must enter BOTH home and away scores and click Save. The RPC only runs after both scores are saved.

### Admin can't log in
Code is **WC2026ADMIN** (11 chars). If reset was needed, it's set back to this.

## Quick Start Checklist

1. [ ] Admin logs in with WC2026ADMIN
2. [ ] Creates 6–8 players in Admin > Players
3. [ ] Shares access codes with friends
4. [ ] Friends log in and submit predictions
5. [ ] After each match, admin enters scores in Admin > Matches
6. [ ] Everyone checks Leaderboard for rankings, Compare for head-to-head
7. [ ] Player profiles show personal stats, badges, streak

That's it. 6–8 players on free tier = no issues.
