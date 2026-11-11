#!/usr/bin/env python3
"""Download public GUZ RUZ timetable data into static JSON files for GitHub Pages."""
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "ruz"
BASE = "https://ruz.guz.ru/api/"
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "MyRhythm-RUZ-cache/1.0 (GitHub Actions)",
}

def get_json(url: str):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = response.read().decode("utf-8-sig")
    return json.loads(payload)

def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    groups = get_json(BASE + "dictionary/groups")
    write_json(OUT / "groups.json", groups)

    today = datetime.now(ZoneInfo("Europe/Moscow")).date()
    expected = set()
    for offset in range(-7, 43):
        day = today + timedelta(days=offset)
        date_text = day.isoformat()
        expected.add(date_text + ".json")
        query = urllib.parse.urlencode({"start": date_text, "finish": date_text})
        items = get_json(BASE + "courseinfo/?" + query)
        write_json(OUT / (date_text + ".json"), items)
        time.sleep(0.12)

    # Keep the previous 7 days (for the current calendar week) and the next 42 days.
    for path in OUT.glob("*.json"):
        if path.name != "groups.json" and path.name not in expected:
            path.unlink()

    write_json(OUT / "updated.json", {
        "updatedAt": datetime.now(ZoneInfo("Europe/Moscow")).isoformat(timespec="seconds"),
        "timezone": "Europe/Moscow",
        "daysCached": 50,\n        "daysPast": 7,\n        "daysAhead": 42,
        "source": "https://ruz.guz.ru/api/",
    })
    print(f"RUZ cache updated: {len(expected)} days, {len(groups) if isinstance(groups, list) else 'groups'} group entries")

if __name__ == "__main__":
    main()
