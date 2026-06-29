#!/usr/bin/env python3
"""Auto-score: fetch football-data.org scores and update Supabase matches.

Uses score.regularTime to get only 90-minute results (not ET/penalties).
Matches API games to DB matches by team name + kickoff date proximity.

Environment variables (set as GH Actions secrets):
  SUPABASE_URL              - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY - Service role key (full access)
  FOOTBALL_DATA_API_KEY     - football-data.org API key

"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
FOOTBALL_DATA_KEY = os.environ.get("FOOTBALL_DATA_API_KEY", "")
DEADLINE_HOURS = float(os.environ.get("DEADLINE_HOURS", "2.5"))

NOW_UTC = datetime.now(timezone.utc)
NOW_STR = NOW_UTC.strftime("%Y-%m-%dT%H:%M:%SZ")

MISSING = []
if not SUPABASE_URL:
    MISSING.append("SUPABASE_URL")
if not SUPABASE_KEY:
    MISSING.append("SUPABASE_SERVICE_ROLE_KEY")
if not FOOTBALL_DATA_KEY:
    MISSING.append("FOOTBALL_DATA_API_KEY")
if MISSING:
    print(f"FATAL: Missing env vars: {', '.join(MISSING)}")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# football-data.org config
FD_BASE = "https://api.football-data.org/v4"
FD_HEADERS = {"X-Auth-Token": FOOTBALL_DATA_KEY}
WC_ID = 2000  # FIFA World Cup competition ID

# Team name aliases: DB seed name -> list of known API name variants
TEAM_NAME_ALIASES = {
    "United States": ["USA"],
    "South Korea": ["Korea Republic"],
    "Ivory Coast": ["Côte d'Ivoire"],
    "DR Congo": ["Congo DR"],
}


def sb_get(path: str) -> dict | list | None:
    """GET from Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers=HEADERS, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  Supabase GET {path} failed: HTTP {e.code}")
        return None
    except Exception as e:
        print(f"  Supabase GET {path} failed: {e}")
        return None


def sb_rpc(rpc: str, params: dict | None = None) -> dict | list | int | None:
    """Call a Supabase RPC function."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/{rpc}"
    body = json.dumps(params or {}).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            if not raw:
                return None
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  RPC {rpc} failed: HTTP {e.code} {body[:200]}")
        return None
    except Exception as e:
        print(f"  RPC {rpc} failed: {e}")
        return None


def sb_patch(table: str, data: dict, where: str):
    """PATCH a Supabase table row."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{where}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=30) as _:
            return True
    except urllib.error.HTTPError as e:
        print(f"  PATCH {table} failed: HTTP {e.code}")
        return False
    except Exception as e:
        print(f"  PATCH {table} failed: {e}")
        return False


def fd_get(path: str) -> dict | None:
    """GET from football-data.org API with retry & backoff."""
    url = f"{FD_BASE}{path}"
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers=FD_HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                remaining = resp.headers.get("X-Requests-Available-Minute", "?")
                data = json.loads(resp.read().decode())
                if attempt > 0:
                    print(f"  football-data.org attempt {attempt+1}/5 OK (rate: {remaining}/min)")
                return data
        except urllib.error.HTTPError as e:
            print(f"  football-data.org attempt {attempt+1}/5: HTTP {e.code}")
            if e.code == 429:
                wait = 30  # rate limited — wait half minute
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            if e.code in (502, 503, 504):
                wait = min(2 ** attempt * 10, 120)
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
                continue
            if e.code == 403:
                print("  API key invalid or forbidden — check FOOTBALL_DATA_API_KEY")
                return None
            return None
        except Exception as e:
            print(f"  football-data.org attempt {attempt+1}/5 failed: {e}")
            if attempt < 4:
                wait = 2 ** attempt * 5
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
                continue
            return None
    print("  football-data.org exhausted retries")
    return None


def log_entry(match_id: str | None, fd_id: int | None, action: str, details: str | None, success: bool):
    """Insert a log entry into auto_score_logs."""
    record = {
        "match_id": match_id,
        "external_id": fd_id,
        "action": action,
        "details": details,
        "success": success,
    }
    body = json.dumps(record).encode()
    url = f"{SUPABASE_URL}/rest/v1/auto_score_logs"
    req = urllib.request.Request(
        url, data=body,
        headers={**HEADERS, "Prefer": "return=minimal"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
    except Exception:
        pass  # best-effort logging


def normalize_team(name: str) -> str:
    """Normalize a team name to match against DB seed names."""
    n = name.strip()
    # Check known aliases (reverse lookup)
    for db_name, api_variants in TEAM_NAME_ALIASES.items():
        if n.lower() in [v.lower() for v in api_variants]:
            return db_name
    return n


def build_team_name_map() -> dict[str, str]:
    """Fetch teams from Supabase and return {normalized_name: id}."""
    teams = sb_get("teams?select=id,name")
    if not teams:
        print("  Failed to fetch teams from Supabase")
        return {}
    if not isinstance(teams, list):
        teams = [teams]
    mapping = {}
    for t in teams:
        mapping[t["name"]] = t["id"]
        # Also add alias variants
        if t["name"] in TEAM_NAME_ALIASES:
            for alias in TEAM_NAME_ALIASES[t["name"]]:
                mapping[alias] = t["id"]
    print(f"  Loaded {len(teams)} teams from DB")
    return mapping


def fetch_fd_matches() -> list[dict]:
    """Fetch all WC matches from football-data.org."""
    print("  Fetching from football-data.org...")
    data = fd_get(f"/competitions/{WC_ID}/matches")
    if not data:
        return []
    matches = data.get("matches", [])
    if not isinstance(matches, list):
        print(f"  Unexpected response shape: {type(matches).__name__}")
        return []
    # Filter to only FINISHED or IN_PLAY matches that have scores
    finished = [m for m in matches if m.get("status") in ("FINISHED", "IN_PLAY")]
    print(f"  Got {len(matches)} total matches ({len(finished)} finished/in-play)")
    return finished


def extract_score_90min(match: dict) -> tuple[int | None, int | None]:
    """Extract 90-minute score from a football-data.org match.

    Returns (home_score, away_score) from score.regularTime.
    Falls back to score.fullTime if regularTime is absent (match ended in regular time).
    """
    score = match.get("score") or {}
    rt = score.get("regularTime") or {}
    if rt.get("homeTeam") is not None and rt.get("awayTeam") is not None:
        return int(rt["homeTeam"]), int(rt["awayTeam"])
    # No regularTime means the match ended in regular time — use fullTime
    ft = score.get("fullTime") or {}
    if ft.get("homeTeam") is not None and ft.get("awayTeam") is not None:
        return int(ft["homeTeam"]), int(ft["awayTeam"])
    return None, None


def match_fd_to_db(
    db_match: dict,
    fd_matches: list[dict],
    team_names: dict[str, str],
) -> dict | None:
    """Find the football-data.org match corresponding to a DB match.

    Matches on (home team, away team) with date proximity check.
    """
    db_home_id = db_match.get("home_team_id")
    db_away_id = db_match.get("away_team_id")
    db_kickoff = db_match.get("kickoff_at", "")

    # Find DB team names from our mapping (reverse lookup)
    db_home_name = None
    db_away_name = None
    for name, tid in team_names.items():
        if tid == db_home_id:
            db_home_name = name
        if tid == db_away_id:
            db_away_name = name

    if not db_home_name or not db_away_name:
        return None

    # Parse DB kickoff date for comparison
    try:
        db_date = datetime.fromisoformat(db_kickoff.replace("Z", "+00:00")).date()
    except Exception:
        db_date = None

    home_norm = normalize_team(db_home_name).lower()
    away_norm = normalize_team(db_away_name).lower()

    candidates = []
    for fd_m in fd_matches:
        fd_home = (fd_m.get("homeTeam") or {}).get("name", "")
        fd_away = (fd_m.get("awayTeam") or {}).get("name", "")

        fd_home_norm = normalize_team(fd_home).lower()
        fd_away_norm = normalize_team(fd_away).lower()

        # Check if teams match (home vs away or reversed)
        teams_match = (
            (home_norm == fd_home_norm and away_norm == fd_away_norm)
            or (home_norm == fd_away_norm and away_norm == fd_home_norm)
        )
        if not teams_match:
            continue

        # Date proximity check
        try:
            fd_date = datetime.fromisoformat(
                (fd_m.get("utcDate") or "").replace("Z", "+00:00")
            ).date()
        except Exception:
            fd_date = None

        if db_date and fd_date:
            diff = abs((db_date - fd_date).days)
            if diff > 3:
                continue  # too far apart

        candidates.append(fd_m)

    if len(candidates) == 1:
        return candidates[0]
    if len(candidates) > 1:
        # Multiple matches between same teams (e.g. home-and-away) —
        # pick the one closest in date
        if db_date:
            best = min(
                candidates,
                key=lambda m: abs(
                    datetime.fromisoformat(
                        (m.get("utcDate") or "").replace("Z", "+00:00")
                    ).date()
                    - db_date
                )
                if m.get("utcDate")
                else 999,
            )
            return best
        return candidates[0]
    return None


def main():
    print(f"=== Auto-score run at {NOW_STR} ===")

    # 1. Lock matches that are close to kickoff
    print("Locking matches via auto_lock_matches RPC...")
    lock_result = sb_rpc("auto_lock_matches")
    print(f"  Lock result: {lock_result}")

    # 2. Fetch matches from football-data.org
    print("Fetching WC matches from football-data.org...")
    fd_matches = fetch_fd_matches()
    if not fd_matches:
        print("  No finished matches from football-data.org, nothing to score")
        sb_patch("auto_score_config", {"last_run_at": NOW_STR, "last_run_result": "api_error"}, "id=eq.true")
        log_entry(None, None, "error", "API returned no data", False)
        sys.exit(1)

    # 3. Load team name -> ID mapping from DB
    print("Loading team name mappings...")
    team_names = build_team_name_map()
    if not team_names:
        print("  Failed to load teams — aborting")
        sys.exit(1)

    # 4. Get locked matches past deadline
    cutoff = (NOW_UTC - timedelta(hours=DEADLINE_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    matches = sb_get(
        f"matches?select=id,home_team_id,away_team_id,kickoff_at,home_score,away_score,status"
        f"&status=eq.locked&kickoff_at=lt.{cutoff}"
    )
    scored = 0
    checked = 0
    errors = 0

    if matches:
        locked = matches if isinstance(matches, list) else [matches]
        print(f"  Found {len(locked)} locked matches past deadline")
    else:
        locked = []
        print("  No locked matches past deadline")

    # 5. Match and score each locked match
    for m in locked:
        fd_match = match_fd_to_db(m, fd_matches, team_names)
        if not fd_match:
            checked += 1
            continue

        # Extract 90-min score
        home_score, away_score = extract_score_90min(fd_match)
        if home_score is None or away_score is None:
            checked += 1
            # Match had no score yet (possible if "IN_PLAY" but no goals)
            continue

        # Update match in DB
        ok = sb_patch(
            "matches",
            {"status": "finished", "home_score": home_score, "away_score": away_score},
            f"id=eq.{m['id']}",
        )
        if ok:
            scored += 1
            sb_rpc("calculate_match_points", {
                "p_match_id": m["id"],
                "p_home_score": home_score,
                "p_away_score": away_score,
            })
            fd_id = fd_match.get("id")
            log_entry(m["id"], fd_id, "auto_score", f"Scored {home_score}-{away_score}", True)
            print(f"  Match {m['id'][:8]}: scored {home_score}-{away_score}")
        else:
            errors += 1
            log_entry(m["id"], None, "error", "Failed to update match score", False)

    # 6. Recovery: Calculate points for finished matches that lack them
    print("Checking finished matches for missing point calculations...")
    finished = sb_get(
        "matches?select=id,home_score,away_score"
        "&status=eq.finished&order=created_at.desc&limit=50"
    )
    if finished:
        f_list = finished if isinstance(finished, list) else [finished]
        recovered = 0
        for m in f_list:
            check = sb_get(
                f"predictions?select=id&match_id=eq.{m['id']}&pts_total=gt.0&limit=1"
            )
            has_points = bool(check and (isinstance(check, list) and len(check) > 0))
            if not has_points:
                hs = m.get("home_score")
                aws = m.get("away_score")
                if hs is not None and aws is not None:
                    sb_rpc("calculate_match_points", {
                        "p_match_id": m["id"],
                        "p_home_score": int(hs),
                        "p_away_score": int(aws),
                    })
                    recovered += 1
                    print(f"  Recovery {m['id'][:8]}: calculated points ({hs}-{aws})")
        if recovered:
            print(f"  Recovered {recovered} matches with missing points")
    else:
        print("  No finished matches found for recovery")

    # 7. Update config
    result_str = f"scored={scored} checked={checked} errors={errors}"
    sb_patch("auto_score_config", {"enabled": False, "last_run_at": NOW_STR, "last_run_result": result_str}, "id=eq.true")
    print(f"Done: {result_str}")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
