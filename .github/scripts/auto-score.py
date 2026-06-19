#!/usr/bin/env python3
"""Auto-score: fetch worldcup26.ir scores and update Supabase matches.

Environment variables (set as GH Actions secrets):
  SUPABASE_URL       - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY - Service role key (full access)

"""

import os
import sys
import time
import json
import ssl
import urllib.request
import urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DEADLINE_HOURS = int(os.environ.get("DEADLINE_HOURS", "2"))

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

NOW = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

MISSING = []
if not SUPABASE_URL:
    MISSING.append("SUPABASE_URL")
if not SUPABASE_KEY:
    MISSING.append("SUPABASE_SERVICE_ROLE_KEY")
if MISSING:
    print(f"FATAL: Missing env vars: {', '.join(MISSING)}")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
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


def fetch_games() -> list[dict]:
    """Fetch all games from worldcup26.ir."""
    url = "https://worldcup26.ir/get/games"
    for attempt in range(5):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as resp:
                data = json.loads(resp.read().decode())
            games = data if isinstance(data, list) else data.get("games", data.get("data", []))
            if not isinstance(games, list):
                print(f"  Unexpected API response shape: {type(games).__name__}")
                return []
            print(f"  Got {len(games)} games from API")
            return games
        except urllib.error.HTTPError as e:
            print(f"  API attempt {attempt+1}/5: HTTP {e.code}")
            if e.code in (429, 502, 503, 504):
                wait = min(2 ** attempt * 10, 120)
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
                continue
            return []
        except Exception as e:
            print(f"  API attempt {attempt+1}/5 failed: {e}")
            if attempt < 4:
                wait = 2 ** attempt * 5
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
                continue
            return []
    print("  API exhausted retries")
    return []


def log_entry(match_id: str | None, external_id: int | None, action: str, details: str | None, success: bool):
    """Insert a log entry into auto_score_logs."""
    record = {
        "match_id": match_id,
        "external_id": external_id,
        "action": action,
        "details": details,
        "success": success,
    }
    sb_patch_data = json.dumps(record).encode()
    url = f"{SUPABASE_URL}/rest/v1/auto_score_logs"
    req = urllib.request.Request(
        url, data=sb_patch_data,
        headers={**HEADERS, "Prefer": "return=minimal"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
    except Exception:
        pass  # best-effort logging


def main():
    print(f"=== Auto-score run at {NOW} ===")

    # 1. Lock matches that are close to kickoff
    print("Locking matches via auto_lock_matches RPC...")
    lock_result = sb_rpc("auto_lock_matches")
    print(f"  Lock result: {lock_result}")

    # 2. Fetch games from API
    print("Fetching games from worldcup26.ir...")
    games = fetch_games()
    if not games:
        print("  No games from API, nothing to score")
        sb_patch("auto_score_config", {"last_run_at": NOW, "last_run_result": "api_error"}, "id=eq.true")
        log_entry(None, None, "error", "API returned no data", False)
        sys.exit(1)

    # Build lookup: external_id -> game
    game_map: dict[int, dict] = {}
    for g in games:
        eid = g.get("external_id") or g.get("id")
        if eid is not None:
            game_map[int(eid)] = g

    # 3. Get locked matches past deadline
    cutoff = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - DEADLINE_HOURS * 3600))
    matches = sb_get(
        f"matches?select=id,external_id,kickoff_at,home_score,away_score,status"
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

    for m in locked:
        eid = m.get("external_id")
        if eid is None:
            continue
        game = game_map.get(eid)
        if not game:
            # Try matching by other fields (home/away team names)
            checked += 1
            continue

        home_score = game.get("home_score")
        away_score = game.get("away_score")

        if home_score is not None and away_score is not None:
            # Score available — update match
            ok = sb_patch(
                "matches",
                {"status": "finished", "home_score": int(home_score), "away_score": int(away_score)},
                f"id=eq.{m['id']}",
            )
            if ok:
                scored += 1
                sb_rpc("calculate_match_points", {
                    "p_match_id": m["id"],
                    "p_home_score": int(home_score),
                    "p_away_score": int(away_score),
                })
                log_entry(m["id"], eid, "auto_score", f"Scored {home_score}-{away_score}", True)
                print(f"  Match #{eid}: scored {home_score}-{away_score}")
            else:
                errors += 1
                log_entry(m["id"], eid, "error", "Failed to update match score", False)
        else:
            checked += 1
            log_entry(m["id"], eid, "checked", "Match finished but no API score yet", True)

    # 4. Recovery: Calculate points for already-finished matches that lack them
    #    (matches scored by older buggy versions that never called calculate_match_points)
    print("Checking finished matches for missing point calculations...")
    finished = sb_get(
        "matches?select=id,external_id,home_score,away_score"
        "&status=eq.finished&order=updated_at.desc&limit=50"
    )
    print(f"  Query returned: {repr(finished)[:200] if finished else 'None or empty'}")
    if finished:
        f_list = finished if isinstance(finished, list) else [finished]
        print(f"  Processing {len(f_list)} finished matches...")
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
                    pts = sb_rpc("calculate_match_points", {
                        "p_match_id": m["id"],
                        "p_home_score": int(hs),
                        "p_away_score": int(aws),
                    })
                    recovered += 1
                    if m.get("external_id"):
                        print(f"  Recovery #{m['external_id']}: calculated points ({hs}-{aws})")
                    else:
                        print(f"  Recovery {m['id'][:8]}: calculated points ({hs}-{aws})")
        if recovered:
            print(f"  Recovered {recovered} matches with missing points")
    else:
        print("  No finished matches found for recovery")

    # 5. Update config
    result_str = f"scored={scored} checked={checked} errors={errors}"
    sb_patch("auto_score_config", {"enabled": False, "last_run_at": NOW, "last_run_result": result_str}, "id=eq.true")
    print(f"Done: {result_str}")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
