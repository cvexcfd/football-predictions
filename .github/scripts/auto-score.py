#!/usr/bin/env python3
"""Auto-score: fetch worldcup26.ir API, score finished matches via Supabase RPC.

Called by GitHub Actions cron (every 30 min) or manually via workflow_dispatch.
Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WC2026_API_KEY
"""

import json, os, sys, time, urllib.request, urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
WC2026_API_KEY = os.environ.get("WC2026_API_KEY")

API_URL = "https://worldcup26.ir/get/games"
SCORE_AFTER_MS = 2 * 60 * 60 * 1000  # 2 hours past kickoff

def die(msg: str, code: int = 1) -> None:
    print(f"FATAL: {msg}")
    sys.exit(code)

def supabase_get(path: str) -> dict | list | None:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            return json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.code != 204 else "{}"
        print(f"HTTP {e.code} GET {path}: {body[:200]}")
        return None
    except Exception as e:
        print(f"GET {path} failed: {e}")
        return None

def supabase_post(path: str, body_obj: dict) -> dict | None:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body_obj).encode()
    req = urllib.request.Request(url, data=data, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            return json.loads(body) if body else {"status": "ok"}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code} POST {path}: {body[:200]}")
        return None
    except Exception as e:
        print(f"POST {path} failed: {e}")
        return None

def supabase_rpc(rpc_name: str, params: dict | None = None) -> dict | None:
    url = f"{SUPABASE_URL}/rest/v1/rpc/{rpc_name}"
    data = json.dumps(params or {}).encode()
    req = urllib.request.Request(url, data=data, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode()
            return json.loads(body) if body else {"status": "ok"}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"RPC {rpc_name} HTTP {e.code}: {body[:300]}")
        return None
    except Exception as e:
        print(f"RPC {rpc_name} failed: {e}")
        return None

def log_entry(action: str, details: str, success: bool,
              match_id: str | None = None,
              external_id: int | None = None) -> None:
    entry = {
        "action": action,
        "details": details,
        "success": success,
        "match_id": match_id,
        "external_id": external_id,
    }
    result = supabase_post("auto_score_logs", entry)
    if result is None:
        print(f"  WARN: failed to log entry: {action}")

def update_config(result: str) -> None:
    """Update the auto_score_config table."""
    supabase_post("auto_score_config?id=eq.true", {
        "last_run_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "last_run_result": result,
    })

def fetch_games() -> list[dict] | None:
    """Fetch games from worldcup26.ir with retries."""
    max_retries = 3
    retry_delays = [5, 10, 20]

    for attempt in range(max_retries):
        req = urllib.request.Request(API_URL, headers={
            "Accept": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                code = resp.status
                if code != 200:
                    print(f"API attempt {attempt+1} returned {code}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delays[attempt])
                        continue
                    return None
                body = resp.read().decode()
                data = json.loads(body)
                games = data.get("games", [])
                if not isinstance(games, list):
                    print(f"Unexpected API response shape (games not a list)")
                    return None
                return games
        except urllib.error.HTTPError as e:
            print(f"API attempt {attempt+1} HTTP {e.code}: {e.read().decode()[:200]}")
            if attempt < max_retries - 1:
                time.sleep(retry_delays[attempt])
                continue
            return None
        except Exception as e:
            print(f"API attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delays[attempt])
                continue
            return None
    return None

def main():
    # ── Validate env ──
    missing = [k for k, v in [("SUPABASE_URL", SUPABASE_URL),
                               ("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_KEY),
                               ("WC2026_API_KEY", WC2026_API_KEY)] if not v]
    if missing:
        die(f"Missing env vars: {', '.join(missing)}")

    print(f"=== Auto-score run at {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} ===")

    # ── 1. Lock matches ──
    print("Locking matches via auto_lock_matches RPC...")
    lock_res = supabase_rpc("auto_lock_matches")
    if lock_res is None:
        print("  Lock RPC failed (non-fatal)")
    else:
        print(f"  Lock result: {lock_res}")

    # ── 2. Fetch API games ──
    print("Fetching games from worldcup26.ir...")
    games = fetch_games()
    if games is None:
        log_entry("error", "API unavailable after retries", False)
        update_config("error_api_unavailable")
        die("API unavailable. Aborting.")

    print(f"  Got {len(games)} games from API")

    # ── 3. Get locked matches past deadline ──
    cutoff_ts = (time.time() * 1000) - SCORE_AFTER_MS
    cutoff_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(cutoff_ts / 1000))

    params = f"select=id,external_id,home_team:home_team_id(code),away_team:away_team_id(code)&eq(status,locked)&not(external_id,is,null)&lt(kickoff_at,{cutoff_iso})"
    matches = supabase_get(params)
    if matches is None:
        log_entry("error", "Failed to query matches", False)
        update_config("error_db_query")
        die("DB query failed")

    if not matches or len(matches) == 0:
        log_entry("check", "No locked matches past deadline", True)
        update_config("ok_no_matches")
        print("No matches to score")
        return

    print(f"  Found {len(matches)} locked matches past deadline")

    # ── 4. Score each match ──
    scored = 0
    checked = 0
    errors = 0

    for m in matches:
        eid = m.get("external_id")
        if eid is None:
            continue

        # Find matching game from API
        game = None
        for g in games:
            if str(g.get("id", "")) == str(eid):
                game = g
                break

        if game is None:
            log_entry("error", f"Game ID {eid} not found in API response",
                      False, m["id"], eid)
            errors += 1
            continue

        finished = str(game.get("finished", "")).upper() == "TRUE"
        if not finished:
            log_entry("check", f"Not yet finished (finished={game.get('finished')})",
                      True, m["id"], eid)
            checked += 1
            continue

        home_score = int(game.get("home_score", 0))
        away_score = int(game.get("away_score", 0))

        res = supabase_rpc("calculate_match_points", {
            "p_match_id": m["id"],
            "p_home_score": home_score,
            "p_away_score": away_score,
        })

        if res is None:
            log_entry("error", f"Score RPC failed for game {eid}",
                      False, m["id"], eid)
            errors += 1
        else:
            hc = ""
            ht = m.get("home_team")
            if isinstance(ht, dict):
                hc = ht.get("code", "?")
            ac = ""
            at = m.get("away_team")
            if isinstance(at, dict):
                ac = at.get("code", "?")
            log_entry("auto_score", f"{hc} {home_score}-{away_score} {ac}",
                      True, m["id"], eid)
            scored += 1

    # ── 5. Update config ──
    summary = f"scored={scored} checked={checked} errors={errors}"
    update_config(summary)
    log_entry("info", summary, True)
    print(f"Done: {summary}")

if __name__ == "__main__":
    main()
