#!/usr/bin/env python3
"""Build data/live.json from public RSS and Atom feeds. Standard library only."""
import csv, email.utils, io, json, os, re, sys, urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from html import unescape

G = "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q="
FEEDS = {
    "enso": [("Google News", G + "El+Nino+when:7d")],
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
SITE = "https://thomaszaw.github.io/news/"
MAX_AGE = timedelta(hours=48)
PER_TOPIC = 30
UA = {"User-Agent": "ParabaikDaily/1.0 (personal news reader)"}
LOCAL = re.compile(r"myanmar|burma|yangon|mandalay|naypyi|sagaing|magway|bago|ayeyarwady|irrawaddy|rakhine|shan state|kachin|kayin|karen|kayah|chin state|mon state|tanintharyi|hpa-an|bay of bengal|andaman", re.I)
REGION = re.compile(r"myanmar|burma|bay of bengal|andaman|bangladesh|thailand", re.I)
CITIES = [("Yangon", 16.87, 96.20), ("Mandalay", 21.97, 96.08), ("Naypyitaw", 19.75, 96.12), ("Hpa-An", 16.89, 97.63),
          ("Mawlamyine", 16.49, 97.63), ("Pathein", 16.78, 94.73), ("Bago", 17.34, 96.48), ("Taunggyi", 20.79, 97.04),
          ("Sittwe", 20.15, 92.90), ("Myitkyina", 25.38, 97.40), ("Monywa", 22.11, 95.14), ("Kawthaung", 9.98, 98.55)]
METEO = ("https://api.open-meteo.com/v1/forecast?current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,"
         "weather_code,wind_speed_10m,wind_gusts_10m,is_day&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,"
         "weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,"
         "wind_gusts_10m_max,precipitation_sum,apparent_temperature_max&timezone=Asia%2FYangon&forecast_days=7")


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
        if topic == "weather" and source == "Google News":
            rows = [i for i in rows if LOCAL.search(i["title"])]
            for i in rows:
                if re.search(r"\bred\b", i["title"], re.I) or (re.search(r"\borange\b", i["title"], re.I) and re.search("myanmar|burma", i["title"], re.I)):
                    i["level"] = "red"
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
    nearby = [q for q in data.get("features", []) if 4 <= q["geometry"]["coordinates"][1] <= 32 and 86 <= q["geometry"]["coordinates"][0] <= 108]
    with open("data/quakes.json", "w", encoding="utf-8") as f:
        json.dump({"features": nearby}, f, separators=(",", ":"))
    out = []
    for q in data.get("features", []):
        lon, lat = q["geometry"]["coordinates"][:2]
        p = q["properties"]
        if 9 <= lat <= 29 and 91 <= lon <= 102 and p.get("mag"):
            d = datetime.fromtimestamp(p["time"] / 1000, timezone.utc)
            out.append({"title": f"Magnitude {p['mag']:.1f} earthquake: {p['place']}", "url": p["url"], "source": "USGS", "topic": "weather", "published": d.isoformat(timespec="seconds"), "level": "red" if p["mag"] >= 5 else None})
    return out


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def parse_weekly(text):
    """Read NOAA's weekly table: date, then SST and anomaly for Nino 1+2, 3, 3.4 and 4."""
    weeks = []
    for line in text.splitlines():
        m = re.match(r"\s*(\d{2}[A-Z]{3}\d{4})(.*)", line)
        if not m:
            continue
        v = re.findall(r"-?\d+\.\d", m.group(2))
        if len(v) == 8:
            weeks.append({"week": datetime.strptime(m.group(1).title(), "%d%b%Y").strftime("%Y-%m-%d"), "n12": float(v[1]), "n3": float(v[3]), "n34": float(v[5]), "n4": float(v[7])})
    return weeks


def parse_status(html):
    text = re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", html)))
    status = re.search(r"ENSO Alert System Status:\s*(.+?)\s*Synopsis:\s*(.+?\.)\s", text)
    issued = re.search(r"issued by.*?(\d{1,2} [A-Z][a-z]+ 20\d\d)", text) or re.search(r"(\d{1,2} [A-Z][a-z]+ 20\d\d)", text)
    return {"status": status.group(1) if status else "", "synopsis": status.group(2) if status else "", "issued": issued.group(1) if issued else ""}


def enso(path):
    out = {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    try:
        raw = get("https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for")
        out["weeks"] = parse_weekly(raw)[-26:]
        out.update(parse_status(get("https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml")))
    except Exception as e:
        print("skipped ENSO:", e, file=sys.stderr)
    if out.get("weeks"):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=1)
        print("ENSO", out.get("status"), out["weeks"][-1])


ALARM = re.compile(r"\b(earthquake|tsunami|cyclone|typhoon|hurricane|coup|assassinat\w*|explosion|war declared|invad\w*|dies|dead|killed|attack|crash|collapse\w*|resign\w*)\b", re.I)
STOP = set("the a an of in on at to for and or as is are was were with from by after over amid says say said new his her its their it this that will has have".split())


def words(t):
    return {w for w in re.findall(r"[a-z0-9]+", t.lower()) if w not in STOP and len(w) > 2}


def alerts(rows, now):
    """Keep this strict: official hazard data, or one story from at least 4 outlets within 3 hours."""
    out = []
    for r in rows:
        age = now - datetime.fromisoformat(r["published"])
        if r.get("level") and age <= timedelta(hours=12):
            out.append({k: r[k] for k in ("title", "url", "source", "published")})
    recent = [r for r in rows if now - datetime.fromisoformat(r["published"]) <= timedelta(hours=3) and r["source"] not in ("GDACS", "USGS")]
    used = set()
    for a in recent:
        if id(a) in used or not ALARM.search(a["title"]):
            continue
        ws, group = words(a["title"]), [a]
        for b in recent:
            if b is not a and id(b) not in used and len(ws & words(b["title"])) / max(1, len(ws | words(b["title"]))) >= 0.3:
                group.append(b)
        if len({g["source"] for g in group}) >= 4:
            used.update(id(g) for g in group)
            out.append({k: a[k] for k in ("title", "url", "source", "published")})
    return out[:3]


def key_of(a):
    return re.sub(r"[^a-z0-9]+", "", a["title"].lower())[:70]


def push(new):
    topic = os.environ.get("NTFY_TOPIC")
    if not topic:
        return
    for a in new:
        try:
            req = urllib.request.Request(f"https://ntfy.sh/{topic}", data=a["title"].encode("utf-8"), headers={"Title": "Parabaik breaking news", "Priority": "high", "Click": a["url"], "Tags": "rotating_light"})
            urllib.request.urlopen(req, timeout=20).close()
        except Exception as e:
            print("push failed:", e, file=sys.stderr)


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


def markets(path):
    names = {"Dow Jones": "^DJI", "S&P 500": "^GSPC", "Nasdaq": "^IXIC", "Russell 2000": "^RUT", "Nikkei 225": "^N225", "Kospi": "^KS11", "Hang Seng": "^HSI", "ASX 200": "^AXJO", "Brent crude": "BZ=F", "WTI crude": "CL=F", "Gold": "GC=F", "Bitcoin": "BTC-USD"}
    money = {"Brent crude", "WTI crude", "Gold", "Bitcoin"}
    out = {}
    for name, sym in names.items():
        try:
            url = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(sym) + "?range=1d&interval=5m"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                m = json.load(r)["chart"]["result"][0]["meta"]
            price, prev = m["regularMarketPrice"], m.get("chartPreviousClose") or m.get("previousClose")
            when = datetime.fromtimestamp(m["regularMarketTime"], timezone.utc) + timedelta(hours=6, minutes=30)
            out[name] = {"value": ("$" if name in money else "") + f"{price:,.2f}", "change": round((price / prev - 1) * 100, 2), "when": when.strftime("%b %-d, %H:%M Yangon")}
        except Exception as e:
            print("skipped market", name, e, file=sys.stderr)
    if out:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "items": out}, f, indent=1)
    print(len(out), "markets")


def in_poly(x, y, ring):
    hit = False
    for i in range(len(ring)):
        a, b = ring[i], ring[i - 1]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            hit = not hit
    return hit


def firms(path, polys):
    key = os.environ.get("FIRMS_KEY")
    if not key:
        return False
    seen = {}
    for src in ("VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT"):
        try:
            text = get(f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{src}/86,4,108,32/2")
            for r in csv.DictReader(io.StringIO(text)):
                a, b = round(float(r["latitude"]), 3), round(float(r["longitude"]), 3)
                seen[(a, b, r["acq_time"])] = [a, b, 1 if any(in_poly(b, a, p[0]) for p in polys) else 0, r["confidence"], float(r["frp"] or 0), r["acq_date"], r["acq_time"].zfill(4), r["satellite"], r["daynight"]]
        except Exception as e:
            print("skipped FIRMS", src, type(e).__name__, file=sys.stderr)
    if not seen:
        return False
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"date": max(v[5] for v in seen.values()), "detail": True, "points": list(seen.values())}, f, separators=(",", ":"))
    print("FIRMS", len(seen), "detections,", sum(v[2] for v in seen.values()), "in Myanmar")
    return True


def hotspots(path):
    """Use FIRMS detail when a key is set, otherwise NASA's heat image for yesterday."""
    from PIL import Image
    text = open("lib/myanmar.js", encoding="utf-8").read()
    geo = json.loads(text[text.index("{"):text.rindex("}") + 1])
    polys = geo["coordinates"] if geo["type"] == "MultiPolygon" else [geo["coordinates"]]
    if firms(path, polys):
        return
    day = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    W, H = 1760, 2240
    pts = {}
    for layer in ("VIIRS_NOAA20_Thermal_Anomalies_375m_All", "VIIRS_SNPP_Thermal_Anomalies_375m_All"):
        url = f"https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS={layer}&CRS=EPSG:4326&BBOX=4,86,32,108&WIDTH={W}&HEIGHT={H}&FORMAT=image/png&TRANSPARENT=true&TIME={day}"
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                img = Image.open(io.BytesIO(r.read())).convert("RGBA")
        except Exception as e:
            print("skipped hotspots", layer, e, file=sys.stderr)
            continue
        px = img.load()
        for y in range(H):
            for x in range(W):
                if px[x, y][3] > 40:
                    pts[(round((32 - y * 28 / H) * 20) / 20, round((86 + x * 22 / W) * 20) / 20)] = 1
    rows = [[a, b, 1 if any(in_poly(b, a, p[0]) for p in polys) else 0] for a, b in sorted(pts)]
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"date": day, "points": rows}, f, separators=(",", ":"))
    print("hotspots", day, len(rows), "areas,", sum(r[2] for r in rows), "in Myanmar")


def fallback_edition(items, path="data/edition.json"):
    """Keep the news fresh if the morning writer did not run."""
    yangon = datetime.now(timezone.utc) + timedelta(hours=6, minutes=30)
    with open(path, encoding="utf-8") as f:
        ed = json.load(f)
    if ed.get("date") == yangon.strftime("%Y-%m-%d") or yangon.hour < 8:
        return
    for sec in ed["sections"]:
        rows = [i for i in items if i["topic"] == sec["id"]][:8]
        if rows:
            sec["items"] = [{"title": i["title"], "body": "", "sources": [{"name": i["source"], "url": i["url"]}]} for i in rows]
    top = next((i for i in items if i["topic"] in ("myanmar", "world")), None)
    if top:
        ed["lead"] = {"flag": "Latest", "title": top["title"], "body": "", "sources": [{"name": top["source"], "url": top["url"]}]}
    ed["date"], ed["updated"] = yangon.strftime("%Y-%m-%d"), yangon.strftime("%H:%M Yangon") + " (automatic headlines)"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(ed, f, ensure_ascii=False, indent=1)
    print("Used automatic headlines")


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
    found = alerts(rows, now)
    try:
        before = {key_of(a) for a in json.loads(get(SITE + "data/live.json")).get("alerts", [])}
    except Exception:
        before = None
    if before is not None:
        push([a for a in found if key_of(a) not in before])
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"updated": now.isoformat(timespec="seconds"), "alerts": found, "items": items}, f, ensure_ascii=False, indent=1)
    fallback_edition(items)
    try:
        print("METAR", get("https://aviationweather.gov/api/data/metar?ids=VYYY,VYMD,VYNT,VYMM,VYHH,VYSW,VYMK,VYKT,VYPT,VYMY&format=raw&hours=2")[:900].replace("\n", " | "))
    except Exception as e:
        print("METAR failed", e)
    print("OM", get("https://api.open-meteo.com/v1/forecast?latitude=16.87&longitude=96.2&current=weather_code,precipitation,temperature_2m&timezone=Asia%2FYangon")[-130:])
    weather("data/weather.json")
    enso("data/enso.json")
    markets("data/markets.json")
    try:
        hotspots("data/hotspots.json")
    except Exception as e:
        print("skipped hotspots:", e, file=sys.stderr)
    print(len(items), "headlines", {t: len(v) for t, v in by_topic.items()})


if __name__ == "__main__":
    main(*sys.argv[1:])
