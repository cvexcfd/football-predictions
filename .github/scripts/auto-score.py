#!/usr/bin/env python3
"""Auto-score: fetch worldcup26.ir API, score finished matches via Supabase RPC.

Called by GitHub Actions cron (every 10 min), repository_dispatch, push, or
manually via workflow_dispatch.

Includes overdue-match recovery and a health-check mode (HEALTH_MODE=1).
Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WC2026_API_KEY
"""

import json, os, sys, time, urllib.request, urllib.error, urllib.parse

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
WC2026_API_KEY = os.environ.get("WC2026_API_KEY")

API_URL = "https://worldcup26.ir/get/games"
SCORE_AFTER_S = 2 * 60 * 60  # 2 hours past kickoff


def die(msg: str, code: int = 1) -> None:
    print(f"FATAL: {msg}")
    sys.exit(code)


def _headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }


def supabase_get(table: str, params: dict | None = None) -> dict | list | None:
    """GET rows from a Supabase table with optional query params."""
    # Build query string manually — urlencode would mangle Supabase operators like eq(status)
    qs_list = []
    if params:
        for k, v in params.items():
            encoded_v = urllib.parse.quote(str(v), safe='')
            qs_list.append(f"{k}={encoded_v}")
    qs = "?" + "&".join(qs_list) if qs_list else ""
    url = f"{SUPABASE_URL}/rest/v1/{table}{qs}"
    req = urllib.request.Request(url, headers={**_headers(), "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            return json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.code != 204 else "{}"
        print(f"HTTP {e.code} GET {url}: {body[:200]}")
        return None
    except Exception as e:
        print(f"GET {url} failed: {e}")
        return None


def supabase_patch(table: str, body_obj: dict, where: str | None = None) -> bool:
    """PATCH (update) rows in a Supabase table."""
    qs = f"?{where}" if where else ""
    url = f"{SUPABASE_URL}/rest/v1/{table}{qs}"
    data = json.dumps(body_obj).encode()
    req = urllib.request.Request(url, data=data, method="PATCH", headers={
        **_headers(), "Content-Type": "application/json", "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30):
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code} PATCH {url}: {body[:200]}")
        return False
    except Exception as e:
        print(f"PATCH {url} failed: {e}")
        return False


def supabase_rpc(rpc_name: str, params: dict | None = None) -> dict | None:
    """Call a Supabase RPC function."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/{rpc_name}"
    data = json.dumps(params or {}).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={
        **_headers(), "Content-Type": "application/json", "Accept": "application/json",
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
    """Insert a log entry into auto_score_logs."""
    entry = {
        "action": action,
        "details": details,
        "success": success,
        "match_id": match_id,
        "external_id": external_id,
    }
    url = f"{SUPABASE_URL}/rest/v1/auto_score_logs"
    data = json.dumps(entry).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={
        **_headers(), "Content-Type": "application/json", "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req, timeout=30):
            pass
    except Exception as e:
        print(f"  WARN: log insert failed: {e}")


def update_config(result: str) -> None:
    """Update the auto_score_config singleton row."""
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    ok = supabase_patch("auto_score_config",
                        {"last_run_at": now, "last_run_result": result},
                        where="id=eq.true")
    if not ok:
        print("  WARN: config update failed")


def log_with_context(action: str, details: str, success: bool,
                     match_id: str | None = None,
                     external_id: int | None = None) -> None:
    """Log entry with workflow context (run ID, event name)."""
    enriched = {
        "workflow_run_id": os.environ.get("GITHUB_RUN_ID", "manual"),
        "event_name": os.environ.get("GITHUB_EVENT_NAME", "unknown"),
    }
    entry = log_entry(action, details, success, match_id, external_id)
    return entry


def check_for_overdue_matches() -> None:
    """Recover finished matches that were never scored (e.g. due to cron failure).

    Queries Supabase for matches with status='finished' and home_score IS NULL
    past the scoring deadline, then fetches worldcup26.ir and scores them.
    """
    cutoff_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                               time.gmtime(time.time() - SCORE_AFTER_S))
    params = {
        "select": "id,external_id,home_team:home_team_id(code),away_team:away_team_id(code)",
        "status": "eq.finished",
        "home_score": "is.null",
        "kickoff_at": "lt." + cutoff_iso,
    }
    overdue = supabase_get("matches", params)
    if overdue is None:
        log_entry("error", "Overdue query failed", False)
        return
    if not overdue or len(overdue) == 0:
        print("  No overdue matches to recover")
        return

    print(f"  Found {len(overdue)} overdue matches — attempting recovery")
    games = fetch_games()
    if games is None:
        log_entry("error", "Cannot fetch API for overdue recovery", False)
        return

    recovered = 0
    for m in overdue:
        eid = m.get("external_id")
        if eid is None:
            continue
        game = next((g for g in games if str(g.get("id", "")) == str(eid)), None)
        if game is None:
            log_entry("error", f"Overdue game {eid} not in API response",
                      False, m["id"], eid)
            continue
        finished = str(game.get("finished", "")).upper() == "TRUE"
        if not finished:
            print(f"  Overdue game {eid} still not finished, skipping")
            continue
        home_score = int(game.get("home_score", 0))
        away_score = int(game.get("away_score", 0))
        res = supabase_rpc("calculate_match_points", {
            "p_match_id": m["id"],
            "p_home_score": home_score,
            "p_away_score": away_score,
        })
        if res is None:
            log_entry("error", f"Overdue recovery RPC failed for game {eid}",
                      False, m["id"], eid)
        else:
            ht = m.get("home_team") or {}
            at = m.get("away_team") or {}
            hc = ht.get("code", "?") if isinstance(ht, dict) else "?"
            ac = at.get("code", "?") if isinstance(at, dict) else "?"
            log_entry("auto_score", f"{hc} {home_score}-{away_score} {ac}",
                      True, m["id"], eid)
            recovered += 1

    if recovered > 0:
        log_entry("info", f"overdue_recovered={recovered}", True)


def health_check() -> None:
    """Print health check JSON to stdout (used when HEALTH_MODE=1)."""
    cutoff_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                               time.gmtime(time.time() - SCORE_AFTER_S))
    status = {
        "status": "ok",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "workflow_run_id": os.environ.get("GITHUB_RUN_ID", "manual"),
        "event_name": os.environ.get("GITHUB_EVENT_NAME", "unknown"),
        "env_vars_ok": bool(SUPABASE_URL and SUPABASE_KEY and WC2026_API_KEY),
    }

    # Check database via lightweight query
    try:
        test = supabase_get("auto_score_config")
        status["db_reachable"] = test is not None
    except Exception:
        status["db_reachable"] = False

    # Count overdue matches
    try:
        params = {
            "status": "eq.finished",
            "home_score": "is.null",
            "kickoff_at": "lt." + cutoff_iso,
        }
        overdue = supabase_get("matches", params)
        status["overdue_count"] = len(overdue) if overdue else 0
    except Exception:
        status["overdue_count"] = -1

    if not status["env_vars_ok"] or not status["db_reachable"]:
        status["status"] = "degraded"

    print(json.dumps(status, indent=2))


def fetch_games() -> list[dict] | None:
    """Fetch games from worldcup26.ir with retries."""
    max_retries = 3
    retry_delays = [5, 10, 20]

    for attempt in range(max_retries):
        req = urllib.request.Request(API_URL, headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status != 200:
                    print(f"API attempt {attempt+1} returned {resp.status}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delays[attempt])
                        continue
                    return None
                data = json.loads(resp.read().decode())
                games = data.get("games", [])
                if not isinstance(games, list):
                    print("Unexpected API response: games not a list")
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
    cutoff_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                               time.gmtime(time.time() - SCORE_AFTER_S))
    params = {
        "select": "id,external_id,home_team:home_team_id(code),away_team:away_team_id(code)",
        "status": "eq.locked",
        "kickoff_at": "lt." + cutoff_iso,
    }
    matches = supabase_get("matches", params)
    if matches is None:
        log_entry("error", "Failed to query matches", False)
        update_config("error_db_query")
        die("DB query failed")

    if not matches or len(matches) == 0:
        log_entry("check", "No locked matches past deadline", True)
        print("No locked matches past deadline")
        # Recovery: if cron missed windows, some matches may be finished but unscored
        check_for_overdue_matches()
        update_config("ok_no_matches")
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

        game = next((g for g in games if str(g.get("id", "")) == str(eid)), None)

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
            ht = m.get("home_team") or {}
            at = m.get("away_team") or {}
            hc = ht.get("code", "?") if isinstance(ht, dict) else "?"
            ac = at.get("code", "?") if isinstance(at, dict) else "?"
            log_entry("auto_score", f"{hc} {home_score}-{away_score} {ac}",
                      True, m["id"], eid)
            scored += 1

    # ── 5. Recovery sweep – score any overdue matches missed by cron ──
    check_for_overdue_matches()

    # ── 6. Update config ──
    summary = f"scored={scored} checked={checked} errors={errors}"
    update_config(summary)
    log_entry("info", summary, True)
    print(f"Done: {summary}")


if __name__ == "__main__":
    if os.environ.get("HEALTH_MODE") == "1":
        health_check()
    else:
        main()
