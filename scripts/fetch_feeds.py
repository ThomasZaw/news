#!/usr/bin/env python3
"""Build data/live.json from public RSS and Atom feeds. Standard library only."""
import email.utils, json, re, sys, urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from html import unescape

G = "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q="
FEEDS = {
    "weather": [("Google News", G + "Myanmar+weather+OR+storm+OR+flood+OR+cyclone+when:3d"),
                ("Google News", G + "Bay+of+Bengal+cyclone+when:3d"),
                ("Google News", G + "Myanmar+fire+breaks+out+when:3d"),
                ("GDACS", "https://www.gdacs.org/xml/rss.xml")],
    "myanmar": [("The Irrawaddy", "https://www.irrawaddy.com/feed"), ("Myanmar Now", "https://myanmar-now.org/en/feed/"),
                ("Mizzima", "https://eng.mizzima.com/feed"), ("Google News", G + "Myanmar+when:2d")],
    "world": [("BBC", "https://feeds.bbci.co.uk/news/world/rss.xml"), ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
              ("The Guardian", "https://www.theguardian.com/world/rss")],
    "politics": [("NPR", "https://feeds.npr.org/1014/rss.xml"), ("BBC", "https://feeds.bbci.co.uk/news/politics/rss.xml"),
                 ("The Guardian", "https://www.theguardian.com/politics/rss")],
    "business": [("BBC", "https://feeds.bbci.co.uk/news/business/rss.xml"), ("CNBC", "https://www.cnbc.com/id/10001147/device/rss/rss.html"),
                 ("The Guardian", "https://www.theguardian.com/uk/business/rss")],
    "stocks": [("CNBC", "https://www.cnbc.com/id/20910258/device/rss/rss.html"), ("Google News", G + "stock+market+when:1d")],
    "tech": [("The Verge", "https://www.theverge.com/rss/index.xml"), ("TechCrunch", "https://techcrunch.com/feed/"),
             ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index")],
}
MAX_AGE = timedelta(hours=48)
PER_TOPIC = 30
UA = {"User-Agent": "ParabaikDaily/1.0 (personal news reader)"}
REGION = re.compile(r"myanmar|burma|bay of bengal|andaman|bangladesh|thailand", re.I)
CITIES = [("Yangon", 16.87, 96.20), ("Mandalay", 21.97, 96.08), ("Naypyitaw", 19.75, 96.12), ("Hpa-An", 16.89, 97.63),
          ("Mawlamyine", 16.49, 97.63), ("Pathein", 16.78, 94.73), ("Bago", 17.34, 96.48), ("Taunggyi", 20.79, 97.04),
          ("Sittwe", 20.15, 92.90), ("Myitkyina", 25.38, 97.40), ("Monywa", 22.11, 95.14), ("Kawthaung", 9.98, 98.55)]
METEO = ("https://api.open-meteo.com/v1/forecast?current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,"
         "weather_code,wind_speed_10m,wind_gusts_10m,is_day&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,"
         "weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,"
         "wind_gusts_10m_max&timezone=Asia%2FYangon&forecast_days=7")


def local(tag):
    return tag.rsplit("}", 1)[-1]


def when(text):
    if not text:
        return None
    text = text.strip()
    try:
        d = email.utils.parsedate_to_datetime(text)
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def parse(raw, source, topic):
    out = []
    for node in ET.fromstring(raw).iter():
        if local(node.tag) not in ("item", "entry"):
            continue
        title = link = date = None
        origin = source
        for c in node:
            name = local(c.tag)
            if name == "title":
                title = c.text
            elif name == "link":
                link = c.get("href") if c.get("href") and c.get("rel", "alternate") == "alternate" else (c.text or link)
            elif name in ("pubDate", "published", "updated", "date") and not date:
                date = c.text
            elif name == "source" and c.text:
                origin = c.text.strip()
        d = when(date)
        if not (title and link and d) or not link.strip().startswith(("https://", "http://")):
            continue
        title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", unescape(title))).strip()
        if source == "Google News":
            title = re.sub(r"\s+-\s+[^-]{2,60}$", "", title)
        out.append({"title": title, "url": link.strip(), "source": origin, "topic": topic, "published": d.astimezone(timezone.utc).isoformat(timespec="seconds")})
    return out


def fetch(job):
    topic, source, url = job
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            rows = parse(r.read(), source, topic)
        if source == "GDACS":
            rows = [i for i in rows if REGION.search(i["title"])]
        return rows, None
    except Exception as e:
        return [], f"{source} ({topic}): {e}"


def quakes():
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
            data = json.load(r)
    except Exception as e:
        print("skipped USGS:", e, file=sys.stderr)
        return []
    out = []
    for q in data.get("features", []):
        lon, lat = q["geometry"]["coordinates"][:2]
        p = q["properties"]
        if 9 <= lat <= 29 and 91 <= lon <= 102 and p.get("mag"):
            d = datetime.fromtimestamp(p["time"] / 1000, timezone.utc)
            out.append({"title": f"Magnitude {p['mag']:.1f} earthquake: {p['place']}", "url": p["url"], "source": "USGS", "topic": "weather", "published": d.isoformat(timespec="seconds")})
    return out


def weather(path):
    out = {}
    for name, lat, lon in CITIES:
        try:
            with urllib.request.urlopen(urllib.request.Request(f"{METEO}&latitude={lat}&longitude={lon}", headers=UA), timeout=25) as r:
                out[name] = json.load(r)
        except Exception as e:
            print("skipped weather", name, e, file=sys.stderr)
    if out:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "cities": out}, f, separators=(",", ":"))
    print(len(out), "cities of weather")


def main(path="data/live.json"):
    jobs = [(t, s, u) for t, fs in FEEDS.items() for s, u in fs]
    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(fetch, jobs))
    for _, err in results:
        if err:
            print("skipped", err, file=sys.stderr)
    now = datetime.now(timezone.utc)
    seen, by_topic = set(), {t: [] for t in FEEDS}
    rows = sorted([i for r, _ in results for i in r] + quakes(), key=lambda i: i["published"], reverse=True)
    for i in rows:
        key = re.sub(r"[^a-z0-9]+", "", i["title"].lower())[:70]
        age = now - datetime.fromisoformat(i["published"])
        if key in seen or age > MAX_AGE or age < timedelta(minutes=-10) or len(by_topic[i["topic"]]) >= PER_TOPIC:
            continue
        seen.add(key)
        by_topic[i["topic"]].append(i)
    items = sorted((i for v in by_topic.values() for i in v), key=lambda i: i["published"], reverse=True)
    if not items:
        sys.exit("No headlines fetched")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"updated": now.isoformat(timespec="seconds"), "items": items}, f, ensure_ascii=False, indent=1)
    weather("data/weather.json")
    print(len(items), "headlines", {t: len(v) for t, v in by_topic.items()})


if __name__ == "__main__":
    main(*sys.argv[1:])
