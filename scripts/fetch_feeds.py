#!/usr/bin/env python3
"""Build data/live.json from public RSS and Atom feeds. Standard library only."""
import csv, email.utils, io, json, os, re, sys, urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from html import unescape

G = "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q="
GMM = "https://news.google.com/rss/search?hl=my&gl=MM&ceid=MM:my&q="
FEEDS = {
    "enso": [("Google News", G + "El+Nino+when:7d")],
    "weather": [("Google News", G + "Myanmar+weather+OR+storm+OR+flood+OR+cyclone+when:3d"),
                ("Google News", G + "Bay+of+Bengal+cyclone+when:3d"),
                ("Google News", G + "Myanmar+fire+breaks+out+when:3d"),
                ("Google News", G + "(Shan+OR+Inle+OR+Taunggyi+OR+Kachin+OR+Sagaing+OR+Ayeyarwady+OR+Rakhine)+flood+OR+flooding+OR+landslide+when:7d"),
                ("Google News", GMM + "%E1%80%9B%E1%80%B1%E1%80%80%E1%80%BC%E1%80%AE%E1%80%B8+OR+%E1%80%99%E1%80%AD%E1%80%AF%E1%80%B8%E1%80%9E%E1%80%8A%E1%80%BA%E1%80%B8%E1%80%91%E1%80%94%E1%80%BA+OR+%E1%80%99%E1%80%AF%E1%80%94%E1%80%BA%E1%80%90%E1%80%AD%E1%80%AF%E1%80%84%E1%80%BA%E1%80%B8+OR+%E1%80%99%E1%80%AE%E1%80%B8%E1%80%9C%E1%80%B1%E1%80%AC%E1%80%84%E1%80%BA+when:3d"),
                ("BNI", "https://www.bnionline.net/en/rss.xml"),
                ("Shan News", "https://english.shannews.org/feed"),
                ("Irrawaddy", "https://www.irrawaddy.com/feed"),
                ("Myanmar Now", "https://myanmar-now.org/en/feed/"),
                ("DVB", "https://english.dvb.no/feed/"),
                ("Global New Light of Myanmar", "https://www.gnlm.com.mm/feed/"),
                ("Google News", G + "Bangladesh+OR+Thailand+OR+Andaman+cyclone+OR+storm+OR+depression+when:3d"),
                ("GDACS", "https://www.gdacs.org/xml/rss.xml")],
    "myanmar": [("The Irrawaddy", "https://www.irrawaddy.com/feed"), ("Myanmar Now", "https://myanmar-now.org/en/feed/"),
                ("DVB", "https://english.dvb.no/feed/"),
                ("BNI", "https://www.bnionline.net/en/rss.xml"), ("Global New Light of Myanmar", "https://www.gnlm.com.mm/feed/"),
                ("The Diplomat", "https://thediplomat.com/regions/southeast-asia/feed/"),
                ("Google News", G + "Myanmar+when:2d"),
                ("Google News", G + "Myanmar+(economy+OR+business+OR+kyat+OR+trade+OR+investment+OR+fuel+OR+gold+price)+when:3d"),
                ("Google News", G + "Myanmar+(football+OR+sports+OR+SEA+Games+OR+lethwei+OR+athlete)+when:5d")],
    "burmese": [("BBC News မြန်မာ", "https://feeds.bbci.co.uk/burmese/rss.xml"), ("Myanmar Now မြန်မာ", "https://myanmar-now.org/mm/feed/"),
                ("ဧရာဝတီ", "https://burma.irrawaddy.com/feed")],
    "sports": [("BBC Sport", "https://feeds.bbci.co.uk/sport/rss.xml"), ("The Guardian", "https://www.theguardian.com/sport/rss"),
               ("Sky Sports", "https://www.skysports.com/rss/12040"), ("CBS Sports", "https://www.cbssports.com/rss/headlines/"), ("Google News", G + "football+OR+soccer+when:1d")],
    "world": [("BBC", "https://feeds.bbci.co.uk/news/world/rss.xml"), ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
              ("The Guardian", "https://www.theguardian.com/world/rss"),
              ("NPR", "https://feeds.npr.org/1004/rss.xml"), ("DW", "https://rss.dw.com/rdf/rss-en-world"), ("France 24", "https://www.france24.com/en/rss"),
              ("CNA", "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511"), ("Google News", G + "world+news+when:1d")],
    "politics": [("NPR", "https://feeds.npr.org/1014/rss.xml"), ("BBC", "https://feeds.bbci.co.uk/news/politics/rss.xml"),
                 ("The Guardian", "https://www.theguardian.com/politics/rss"),
                 ("Politico", "https://rss.politico.com/politics-news.xml"), ("The Hill", "https://thehill.com/news/feed/"), ("Google News", G + "politics+when:1d")],
    "business": [("BBC", "https://feeds.bbci.co.uk/news/business/rss.xml"), ("CNBC", "https://www.cnbc.com/id/10001147/device/rss/rss.html"),
                 ("The Guardian", "https://www.theguardian.com/uk/business/rss"),
                 ("NPR", "https://feeds.npr.org/1006/rss.xml"), ("DW", "https://rss.dw.com/rdf/rss-en-bus"), ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/topstories/"),
                 ("CNA", "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936")],
    "stocks": [("CNBC", "https://www.cnbc.com/id/20910258/device/rss/rss.html"), ("Google News", G + "stock+market+when:1d"),
               ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/marketpulse/"),
               ("Investing.com", "https://www.investing.com/rss/news_25.rss")],
    "tech": [("The Verge", "https://www.theverge.com/rss/index.xml"), ("TechCrunch", "https://techcrunch.com/feed/"),
             ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
             ("Wired", "https://www.wired.com/feed/rss"), ("Engadget", "https://www.engadget.com/rss.xml"), ("MIT Technology Review", "https://www.technologyreview.com/feed/")],
}
SITE = "https://thomaszaw.github.io/news/"
MAX_AGE = timedelta(hours=48)
PER_TOPIC = 30
UA = {"User-Agent": "ParabaikDaily/1.0 (personal news reader)"}
LOCAL = re.compile(r"myanmar|burma|yangon|mandalay|naypyi|sagaing|magway|bago|ayeyarwady|irrawaddy|rakhine|shan|inle|taunggyi|lashio|hsipaw|kengtung|tachileik|\bmuse\b|pekon|kachin|myitkyina|kayin|karen|kayah|loikaw|chin state|hakha|mon state|mawlamyine|tanintharyi|dawei|myeik|hpa-an|bay of bengal|andaman|[\u1000-\u109f]", re.I)
MMONLY = re.compile(r"myanmar|burma|yangon|mandalay|naypyi|sagaing|magway|bago|ayeyarwady|rakhine|shan state|southern shan|northern shan|inle|taunggyi|lashio|kachin|kayin|kayah|chin state|mon state|tanintharyi|[\u1000-\u109f]", re.I)
WXWORD = re.compile(r"flood|flooding|landslide|storm|cyclone|heavy rain|downpour|monsoon|drought|heatwave|heat wave|lightning|thunderstorm|strong wind|fire breaks|blaze|wildfire|forest fire|earthquake|tremor|\bdam\b|river level|water level|ရေကြီး|ရေလွှမ်း|မိုးသည်း|မုန်တိုင်း|မြေပြို|မီးလောင်|ငလျင်|လေပြင်း|မိုးကြိုး|ရေဘေး", re.I)
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
        img, best = None, -1
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
            elif name in ("content", "thumbnail") and c.get("url") and (c.get("medium", "image") == "image" or re.search(r"\.(jpe?g|png|webp)", c.get("url"), re.I)):
                w = int(c.get("width") or 0)
                if w > best:
                    img, best = c.get("url"), w
            elif name == "enclosure" and (c.get("type") or "").startswith("image") and not img:
                img = c.get("url")
            elif name in ("description", "encoded", "summary") and c.text and not img:
                m = re.search(r"<img[^>]+src=[\"']([^\"']+)", c.text)
                if m and not re.search(r"feedburner|pixel|1x1|gravatar", m.group(1)):
                    img = unescape(m.group(1))
        d = when(date)
        if not (title and link and d) or not link.strip().startswith(("https://", "http://")):
            continue
        title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", unescape(title))).strip()
        if source == "Google News":
            title = re.sub(r"\s+-\s+[^-]{2,60}$", "", title)
        row = {"title": title, "url": link.strip(), "source": origin, "topic": topic, "published": d.astimezone(timezone.utc).isoformat(timespec="seconds")}
        if img and img.startswith("https://"):
            row["img"] = re.sub(r"/ace/standard/\d+/", "/ace/standard/800/", img)
        out.append(row)
    return out


SUBS = [("weather", r"flood|flooding|landslide|storm|cyclone|heavy rain|monsoon|drought|heat|earthquake|tremor|fire breaks|blaze|lightning|ရေကြီး|မိုး|မုန်တိုင်း|ငလျင်|မီးလောင်"),
        ("sports", r"football|soccer|sea games|asian games|olympic|lethwei|chinlone|boxing|athlete|\bcup\b|league|tournament|medal|coach|striker|match"),
        ("business", r"econom|business|trade|kyat|invest|market|price|bank|fuel|gold|export|import|company|tariff|inflation|rice|tourism|factory|garment|jobs|workers|wage|currency|dollar"),
        ("politics", r"election|vote|junta|military|regime|government|parliament|party|minister|asean|talks|ceasefire|coup|sanction|resistance|nug|court|law|president|general|army|airstrike|attack|fighting|rebels|troops|un |united nations|diplomat|envoy")]


def sub_of(title):
    for name, pat in SUBS:
        if re.search(pat, title, re.I):
            return name
    return "general"


def og_images(items, limit=60):
    """Find the main photo for articles whose feed gave none. Google News links are skipped because they are redirects."""
    todo = [i for i in items if "img" not in i and "news.google.com" not in i["url"] and i["source"] not in ("USGS", "GDACS")][:limit]

    def one(i):
        try:
            req = urllib.request.Request(i["url"], headers={"User-Agent": "Mozilla/5.0 (compatible; ParabaikDaily/1.0)"})
            with urllib.request.urlopen(req, timeout=12) as r:
                html = r.read(300000).decode("utf-8", "replace")
            m = re.search(r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)', html, re.I) or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image)', html, re.I)
            if m and unescape(m.group(1)).startswith("https://"):
                i["img"] = unescape(m.group(1))
        except Exception:
            pass

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(12) as ex:
        list(ex.map(one, todo))
    print(sum(1 for i in items if "img" in i), "of", len(items), "headlines have photos")


def fetch(job):
    topic, source, url = job
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            rows = parse(r.read(), source, topic)
        if topic == "myanmar" and source == "The Diplomat":
            rows = [i for i in rows if MMONLY.search(i["title"])]
        if source == "GDACS":
            rows = [i for i in rows if REGION.search(i["title"])]
        if topic == "weather" and source != "GDACS":
            MMOUT = ("BNI", "Shan News", "Irrawaddy", "Myanmar Now", "DVB", "Global New Light of Myanmar", "ReliefWeb")
            rows = [i for i in rows if WXWORD.search(i["title"]) and (LOCAL.search(i["title"]) or source in MMOUT)]
            for i in rows:
                if source in MMOUT or MMONLY.search(i["title"]):
                    i["mm"] = True
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


def get(url, tries=3):
    """Download a page, trying again after short waits if the connection fails."""
    import time
    for n in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code < 500 or n == tries - 1:
                raise
        except Exception:
            if n == tries - 1:
                raise
        time.sleep(3 * (n + 1))


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
    """Build today's edition by itself if the morning writer did not run."""
    yangon = datetime.now(timezone.utc) + timedelta(hours=6, minutes=30)
    today = yangon.strftime("%Y-%m-%d")
    with open(path, encoding="utf-8") as f:
        ed = json.load(f)
    if ed.get("date") == today or yangon.hour < 6:
        return
    for sec in ed["sections"]:
        rows = [i for i in items if i["topic"] == sec["id"]][:8]
        if rows:
            sec["items"] = [{"title": i["title"], "body": "", "sources": [{"name": i["source"], "url": i["url"]}]} for i in rows]
        elif sec["id"] != "stocks":
            sec["items"] = []
    top = next((i for i in items if i["topic"] in ("myanmar", "world")), None)
    if top:
        ed["lead"] = {"flag": "Latest", "title": top["title"], "body": "", "sources": [{"name": top["source"], "url": top["url"]}]}
    with open("data/daily.json", encoding="utf-8") as f:
        bank = json.load(f)
    n = yangon.toordinal()
    w = bank["words"]
    ed["words"] = [w[(n * 3 + k) % len(w)] for k in range(3)]
    ed["quote"] = bank["quotes"][n % len(bank["quotes"])]
    hs = bank["history"]
    exact = [h for h in hs if h["month"] == yangon.month and h["day"] == yangon.day]
    month = [h for h in hs if h["month"] == yangon.month]
    h, label = (exact[0], "On this day") if exact else (month[n % len(month)], "This month in history") if month else (hs[n % len(hs)], "From Burmese history")
    ed["history"] = {"label": label, "title": h["title"] + ", " + str(h["year"]), "body": h["body"], "source": h["source"]}
    try:
        with open("data/markets.json", encoding="utf-8") as f:
            mk = json.load(f)["items"]
        ed["markets"] = [{"name": k, "value": v["value"], "change": v["change"], "when": v["when"]} for k, v in mk.items()]
        short = {"S&P 500": "S&P 500", "Dow Jones": "Dow", "Nasdaq": "Nasdaq", "Brent crude": "Brent", "Gold": "Gold", "Bitcoin": "Bitcoin"}
        ed["tape"] = [{"label": b, "value": mk[a]["value"], "change": mk[a]["change"]} for a, b in short.items() if a in mk]
        ed["marketNote"] = "Prices come from Yahoo Finance and refresh about every 15 minutes. The As of column shows when each was last traded."
    except Exception as e:
        print("edition markets skipped:", e, file=sys.stderr)
    ed["date"], ed["updated"] = today, yangon.strftime("%H:%M Yangon") + " (automatic)"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(ed, f, ensure_ascii=False, indent=1)
    print("Built automatic edition", today)


def dmh(path):
    """Read the newest official warning of each type from Myanmar's weather department."""
    out, now = [], datetime.now(timezone.utc) + timedelta(hours=6, minutes=30)
    for slug, kind in (("cyclone-warning", "Cyclone"), ("strong-wind-warning", "Strong wind"), ("heavy-rainfall-warning", "Heavy rainfall"), ("untimely-rainfall-warning", "Untimely rainfall"), ("tsunami-warning", "Tsunami")):
        try:
            html = get("https://www.moezala.gov.mm/en/" + slug)
            html = html[html.find("main-content"):]
            text = re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", html)))
            m = re.search(r"([A-Z][A-Za-z ,.()/0-9-]{3,90}?) (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d/\d\d/\d{4}) - (\d\d:\d\d)(.*?)Read More", text)
            link = re.search(r"href=[\"'](/en/warning/\d+)", html)
            if not m:
                print("DMH no entry", slug)
                continue
            when = datetime.strptime(m.group(2) + " " + m.group(3), "%m/%d/%Y %H:%M")
            title = m.group(1).strip()[-80:]
            body = m.group(4).strip()[:200]
            quiet = re.search(r"(?i)nothing|no warning|not issued", title + " " + body)
            active = not quiet and now.replace(tzinfo=None) - when <= timedelta(hours=48)
            out.append({"kind": kind, "title": title, "body": body, "issued": when.strftime("%Y-%m-%d %H:%M"), "active": bool(active), "url": "https://www.moezala.gov.mm" + (link.group(1) if link else "/en/" + slug)})
        except Exception as e:
            print("skipped DMH", slug, e, file=sys.stderr)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"checked": now.strftime("%Y-%m-%d %H:%M"), "items": out}, f, ensure_ascii=False, indent=1)
    print("DMH", [(i["kind"], i["issued"], i["active"]) for i in out])


RCAP = {"Rakhine": (20.15, 92.90), "Chin": (22.64, 93.61), "Kachin": (25.38, 97.40), "Sagaing": (22.11, 95.14), "Shan": (20.78, 97.04),
        "Kayah": (19.67, 97.21), "Kayin": (16.89, 97.63), "Mon": (16.49, 97.63), "Tanintharyi": (14.08, 98.20), "Ayeyarwady": (16.78, 94.73),
        "Yangon": (16.87, 96.20), "Bago": (17.34, 96.48), "Magway": (20.15, 94.93), "Mandalay": (21.97, 96.08)}
RWORDS = {"Rakhine": r"rakhine|arakan|sittwe|kyaukphyu|thandwe|maungdaw|ရခိုင်", "Chin": r"\bchin\b|hakha|falam|tedim|mindat|ချင်း",
          "Kachin": r"kachin|myitkyina|bhamo|putao|hpakant|ကချင်", "Sagaing": r"sagaing|monywa|shwebo|kalay|kale|tamu|homalin|katha|စစ်ကိုင်း",
          "Shan": r"\bshan\b|taunggyi|inle|lashio|hsipaw|kengtung|tachileik|pekon|nyaungshwe|kalaw|ရှမ်း", "Kayah": r"kayah|karenni|loikaw|ကယား",
          "Kayin": r"kayin|karen state|hpa-an|myawaddy|ကရင်", "Mon": r"\bmon state|mawlamyine|thaton|kyaikto|မွန်",
          "Tanintharyi": r"tanintharyi|dawei|myeik|kawthaung|တနင်္သာရီ", "Ayeyarwady": r"ayeyarwady|irrawaddy delta|pathein|hinthada|labutta|pyapon|ဧရာဝတီ",
          "Yangon": r"yangon|rangoon|thanlyin|ရန်ကုန်", "Bago": r"\bbago\b|taungoo|toungoo|pyay|ပဲခူး", "Magway": r"magway|pakokku|minbu|chauk|gangaw|မကွေး",
          "Mandalay": r"mandalay|naypyi|nay pyi|meiktila|myingyan|kyaukse|pyin oo lwin|မန္တလေး|နေပြည်တော်"}
HAZ = r"flood|flooding|landslide|storm|cyclone|heavy rain|downpour|inundat|evacuat|earthquake|wildfire|forest fire|heatwave|ရေကြီး|ရေလွှမ်း|မြေပြို|မုန်တိုင်း"
SEVERE = r"dead|death|killed|died|missing|evacuat|destroy|swept|ပျက်စီး|သေဆုံး"


def risk(path, items):
    """Give each state and region a level: 0 safe, 1 be aware, 2 danger, with the reasons."""
    regs = json.load(open("data/regions.geojson", encoding="utf-8"))["features"]
    out = {n: {"level": 0, "why": []} for n in RCAP}

    def bump(n, lvl, why):
        r = out[n]
        r["level"] = max(r["level"], lvl)
        if why not in r["why"]:
            r["why"].append(why)

    def region_at(lat, lon):
        for f in regs:
            if any(in_poly(lon, lat, poly[0]) for poly in f["geometry"]["coordinates"]):
                return f["properties"]["name"]
        return None

    names = list(RCAP)
    try:
        url = ("https://api.open-meteo.com/v1/forecast?latitude=" + ",".join(str(RCAP[n][0]) for n in names) + "&longitude=" + ",".join(str(RCAP[n][1]) for n in names)
               + "&daily=precipitation_sum,wind_gusts_10m_max,apparent_temperature_max&timezone=Asia%2FYangon&forecast_days=2")
        data = json.loads(get(url))
        for n, d in zip(names, data if isinstance(data, list) else [data]):
            day = d["daily"]
            rain, gust, feel = max(day["precipitation_sum"]), max(day["wind_gusts_10m_max"]), max(day["apparent_temperature_max"])
            if rain >= 100: bump(n, 2, f"Very heavy rain forecast, {round(rain)} mm in a day")
            elif rain >= 50: bump(n, 1, f"Heavy rain forecast, {round(rain)} mm in a day")
            if gust >= 75: bump(n, 2, f"Damaging wind gusts forecast, {round(gust)} km/h")
            elif gust >= 50: bump(n, 1, f"Strong wind gusts forecast, {round(gust)} km/h")
            if feel >= 46: bump(n, 2, f"Dangerous heat, feels like {round(feel)}°")
            elif feel >= 41: bump(n, 1, f"High heat, feels like {round(feel)}°")
    except Exception as e:
        print("risk weather skipped:", e, file=sys.stderr)
    try:
        q = json.loads(get("https://parabaikdaily.com/quakes?days=1"))
        for f in q["features"]:
            p, (lon, lat, _) = f["properties"], f["geometry"]["coordinates"]
            n = region_at(lat, lon)
            if n and p["mag"] >= 5: bump(n, 2, f"Magnitude {p['mag']:.1f} earthquake in the last day")
            elif n and p["mag"] >= 4: bump(n, 1, f"Magnitude {p['mag']:.1f} earthquake in the last day")
    except Exception as e:
        print("risk quakes skipped:", e, file=sys.stderr)
    now = datetime.now(timezone.utc)
    for i in items:
        if i["topic"] not in ("weather", "myanmar", "burmese") or now - datetime.fromisoformat(i["published"]) > timedelta(hours=72) or not re.search(HAZ, i["title"], re.I):
            continue
        for n, pat in RWORDS.items():
            if re.search(pat, i["title"], re.I):
                bump(n, 2 if re.search(SEVERE, i["title"], re.I) else 1, "Reported: " + i["title"])
    try:
        for w in json.load(open("data/dmh.json", encoding="utf-8"))["items"]:
            if not w.get("active"):
                continue
            hit = [n for n, pat in RWORDS.items() if re.search(pat, w["title"] + " " + w.get("body", ""), re.I)]
            for n in hit or names:
                bump(n, 2 if hit else 1, "Official " + w["kind"].lower() + " warning")
    except Exception as e:
        print("risk warnings skipped:", e, file=sys.stderr)
    try:
        for st in json.load(open("data/stations.json", encoding="utf-8"))["stations"]:
            if now - datetime.fromisoformat(st["time"]) > timedelta(hours=12):
                continue
            n = region_at(st["lat"], st["lon"])
            if not n:
                continue
            r24 = st.get("rain24") or 0
            if r24 >= 100: bump(n, 2, f"{r24:g} mm of rain measured at {st['name']} in 24 hours")
            elif r24 >= 50: bump(n, 1, f"{r24:g} mm of rain measured at {st['name']} in 24 hours")
            if st.get("storm"): bump(n, 1, f"Thunderstorm reported at {st['name']} weather station")
    except Exception as e:
        print("risk stations skipped:", e, file=sys.stderr)
    try:
        pts = json.load(open("data/hotspots.json", encoding="utf-8")).get("points", [])
        count = {}
        for p in pts:
            if len(p) > 2 and p[2]:
                n = region_at(p[0], p[1])
                if n:
                    count[n] = count.get(n, 0) + 1
        for n, c in count.items():
            if c >= 40: bump(n, 1, f"{c} fire hotspots seen by satellite")
    except Exception as e:
        print("risk fires skipped:", e, file=sys.stderr)
    for r in out.values():
        r["why"] = r["why"][:5]
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"updated": now.isoformat(timespec="seconds"), "regions": out}, f, ensure_ascii=False, indent=1)
    print("RISK", {n: r["level"] for n, r in out.items() if r["level"]})


STOP = set("a an the of in on at to for and or but with from by as is are was were be been after over amid into new says say said will its it his her their than that this what who how why more most out up off about against".split())
TRUST = {"BBC News မြန်မာ": 9, "Myanmar Now မြန်မာ": 9, "ဧရာဝတီ": 9, "BBC": 9, "BBC Sport": 9, "Reuters": 9, "Associated Press": 9, "AP News": 9, "The Guardian": 8, "Al Jazeera": 8, "NPR": 8, "DW": 8, "France 24": 7,
         "The Irrawaddy": 9, "Irrawaddy": 9, "Myanmar Now": 9, "Frontier Myanmar": 9, "DVB": 8, "BNI": 8, "Mizzima": 8, "Shan News": 7, "Global New Light Of Myanmar": 7,
         "Global New Light of Myanmar": 7, "Eleven Myanmar": 7, "elevenmyanmar.com": 7, "Nikkei Asia": 8, "CNA": 8, "The Diplomat": 7, "CNBC": 8, "MarketWatch": 7,
         "Bloomberg": 9, "Financial Times": 9, "The Verge": 8, "Ars Technica": 8, "TechCrunch": 7, "Wired": 7, "Politico": 8, "The Hill": 7, "Sky Sports": 8,
         "ReliefWeb": 9, "GDACS": 9, "USGS": 10, "DMH Myanmar": 10}


def toks(t):
    return {w for w in re.findall(r"[a-z0-9က-႟]+", t.lower()) if w not in STOP and len(w) > 2}


def cluster(rows, now):
    """Group stories about the same event from different outlets, keep the best version, and count how many outlets reported it."""
    groups = []
    for i in rows:
        tk = toks(i["title"])
        for g in groups:
            common = len(tk & g["tk"])
            if tk and common / len(tk | g["tk"]) >= 0.4 or common >= 5:
                g["rows"].append(i)
                break
        else:
            groups.append({"tk": tk, "rows": [i]})
    out = []
    for g in groups:
        rs = g["rows"]
        best = max(rs, key=lambda i: (TRUST.get(i["source"], 5) + (3 if "img" in i else 0) - (2 if i.get("_g") else 0), i["published"]))
        srcs = []
        for i in rs:
            if i["source"] != best["source"] and i["source"] not in [s["name"] for s in srcs]:
                srcs.append({"name": i["source"], "url": i["url"]})
        best["n"] = 1 + len(srcs)
        if srcs:
            best["also"] = srcs[:4]
        best["published"] = max(i["published"] for i in rs)
        out.append(best)
    return sorted(out, key=lambda i: i["published"], reverse=True)


# Myanmar weather department stations that send reports to the international network (WMO number: name, lat, lon).
STATIONS = {"48001": ("Putao", 27.333, 97.417), "48004": ("Hkamti", 26.0, 95.7), "48008": ("Myitkyina", 25.367, 97.4), "48010": ("Homalin", 24.867, 94.917),
            "48017": ("Pinlebu", 24.083, 95.367), "48018": ("Katha", 24.167, 96.333), "48019": ("Bhamo", 24.267, 97.2), "48020": ("Mawlaik", 23.633, 94.417),
            "48024": ("Kalay", 23.2, 94.067), "48025": ("Kalewa", 23.2, 94.3), "48030": ("Hakha", 22.65, 93.633), "48031": ("Falam", 22.917, 93.683),
            "48033": ("Shwebo", 22.583, 95.717), "48035": ("Lashio", 22.933, 97.75), "48036": ("Gangaw", 22.167, 94.133), "48037": ("Monywa", 22.1, 95.133),
            "48040": ("Hsipaw", 22.6, 97.3), "48042": ("Mandalay", 21.983, 96.1), "48045": ("Mindat", 21.383, 93.95), "48047": ("Myingyan", 21.467, 95.383),
            "48048": ("Nyaung-U (Bagan)", 21.2, 94.917), "48051": ("Kyauktaw", 20.85, 92.633), "48052": ("Chauk", 20.9, 94.833), "48053": ("Meiktila", 20.833, 95.833),
            "48057": ("Taunggyi", 20.783, 97.05), "48058": ("Loilem", 20.917, 97.55), "48060": ("Kengtung", 21.3, 99.617), "48062": ("Sittwe", 20.133, 92.873),
            "48064": ("Minbu", 20.167, 94.883), "48067": ("Yamethin", 20.417, 96.15), "48068": ("Pinlaung", 20.133, 96.767), "48070": ("Mong Hsat", 20.55, 99.267),
            "48071": ("Kyaukphyu", 19.417, 93.55), "48072": ("Manaung", 18.85, 93.733), "48074": ("Pyinmana", 19.717, 96.217), "48075": ("Loikaw", 19.683, 97.217),
            "48077": ("Pyay", 18.8, 95.217), "48078": ("Taungoo", 18.917, 96.467), "48080": ("Thandwe", 18.467, 94.35), "48085": ("Gwa", 17.583, 94.583),
            "48087": ("Hinthada", 17.667, 95.417), "48088": ("Tharrawaddy", 17.633, 95.8), "48089": ("Shwegyin", 17.917, 96.867), "48093": ("Bago", 17.333, 96.5),
            "48094": ("Pathein", 16.767, 94.767), "48095": ("Maubin", 16.733, 95.65), "48096": ("Mingaladon", 16.9, 96.183), "48097": ("Yangon (Kaba-Aye)", 16.867, 96.2),
            "48098": ("Thaton", 16.917, 97.367), "48099": ("Hpa-An", 16.75, 97.667), "48101": ("Pyapon", 16.267, 95.667), "48103": ("Mawlamyine", 16.5, 97.617),
            "48107": ("Ye", 15.25, 97.867), "48108": ("Dawei", 14.1, 98.217), "48109": ("Coco Island", 14.117, 93.367), "48110": ("Myeik", 12.433, 98.6),
            "48112": ("Kawthaung", 9.967, 98.583)}
WW_TEXT = [(range(91, 100), "Thunderstorm"), ((17, 29), "Thunderstorm"), (range(80, 91), "Showers"), (range(60, 70), "Rain"), (range(50, 60), "Drizzle"),
           (range(40, 50), "Fog"), ((10,), "Mist"), ((4, 5), "Haze or smoke"), ((20, 21, 22, 23, 24, 25, 26, 27), "Recent rain")]


def rain_mm(rrr):
    v = int(rrr)
    return 0.0 if v == 990 else round((v - 990) / 10, 1) if v > 990 else float(v)


def parse_synop(msg):
    """Read the main parts of one SYNOP weather station report."""
    g = msg.replace("=", " ").split()
    if len(g) < 5 or g[0] != "AAXX":
        return None
    iw = g[1][-1]
    i = 3
    ir, ix = g[i][0], g[i][1]
    i += 1
    out = {}
    nddff = g[i]
    i += 1
    if nddff[0] in "012345678":
        out["cloud"] = int(nddff[0])
    dd, ff = nddff[1:3], nddff[3:5]
    if ff == "99" and i < len(g) and g[i].startswith("00"):
        ff = g[i][2:5]
        i += 1
    if dd.isdigit() and ff.isdigit():
        f = int(ff)
        out["wind"] = round(f * (1.852 if iw in "34" else 3.6))
        out["dir"] = int(dd) * 10
    sec3 = False
    rain = []
    for grp in g[i:]:
        if grp in ("333", "999"):
            sec3 = True
            continue
        if grp in ("444", "555") or grp.startswith("9"):
            if not sec3:
                continue
        if "/" in grp[:2] or len(grp) != 5:
            continue
        k = grp[0]
        if not sec3:
            if k == "1" and "temp" not in out and grp[1] in "01" and grp[2:].isdigit():
                out["temp"] = (-1 if grp[1] == "1" else 1) * int(grp[2:]) / 10
            elif k == "2" and "dew" not in out and grp[1] in "01" and grp[2:].isdigit():
                out["dew"] = (-1 if grp[1] == "1" else 1) * int(grp[2:]) / 10
            elif k == "6" and grp[1:4].isdigit():
                rain.append((rain_mm(grp[1:4]), grp[4]))
            elif k == "7" and grp[1:3].isdigit():
                out["ww"] = int(grp[1:3])
        else:
            if k == "6" and grp[1:4].isdigit():
                rain.append((rain_mm(grp[1:4]), grp[4]))
            elif k == "7" and grp[1:].isdigit():
                v = int(grp[1:])
                out["rain24"] = 0.0 if v == 9999 else v / 10
    hours = {"1": 6, "2": 12, "3": 18, "4": 24, "5": 1, "6": 2, "7": 3, "8": 9, "9": 15}
    if rain:
        mm, t = rain[0]
        out["rain"], out["rain_h"] = mm, hours.get(t, 6)
    if "temp" in out and "dew" in out:
        import math
        a, b = 17.625, 243.04
        t, d = out["temp"], out["dew"]
        out["rh"] = round(100 * math.exp(a * d / (b + d)) / math.exp(a * t / (b + t)))
    return out


def stations(path):
    """Latest real readings from Myanmar's weather stations, sent every 3 hours."""
    begin = (datetime.now(timezone.utc) - timedelta(hours=26)).strftime("%Y%m%d%H00")
    latest, rain24 = {}, {}
    for block in ("480", "481"):
        try:
            text = get("https://www.ogimet.com/cgi-bin/getsynop?block=" + block + "&begin=" + begin)
        except Exception as e:
            print("stations block", block, "skipped:", e, file=sys.stderr)
            continue
        for line in text.splitlines():
            p = line.split(",", 6)
            if len(p) < 7 or p[0] not in STATIONS:
                continue
            try:
                when = datetime(int(p[1]), int(p[2]), int(p[3]), int(p[4]), int(p[5]), tzinfo=timezone.utc)
                r = parse_synop(p[6])
            except Exception:
                continue
            if not r:
                continue
            if r.get("rain") is not None and r.get("rain_h", 99) <= 12:
                rain24.setdefault(p[0], []).append((when, r["rain"], r["rain_h"]))
            if p[0] not in latest or when > latest[p[0]][0]:
                latest[p[0]] = (when, r)
    out = []
    for sid, (when, r) in latest.items():
        name, lat, lon = STATIONS[sid]
        ww = r.get("ww")
        cond = next((t for codes, t in WW_TEXT if ww is not None and ww in codes), None)
        if "rain24" not in r and sid in rain24:
            spans = sorted(rain24[sid], key=lambda x: x[0], reverse=True)
            total, covered = 0.0, 0
            for w, mm, h in spans:
                if covered >= 24:
                    break
                total += mm
                covered += h
            if covered >= 12:
                r["rain24"] = round(total, 1)
        row = {"id": sid, "name": name, "lat": lat, "lon": lon, "time": when.isoformat(timespec="minutes"), **r}
        if cond:
            row["cond"] = cond
        row["storm"] = ww is not None and (ww in (17, 29) or 91 <= ww <= 99)
        out.append(row)
    out.sort(key=lambda x: x["name"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "source": "Myanmar Department of Meteorology and Hydrology, via Ogimet", "stations": out}, f, ensure_ascii=False)
    print(len(out), "weather stations", [(x["name"], x["time"][11:16], x.get("temp"), x.get("rh"), x.get("wind"), x.get("cond"), x.get("rain"), x.get("rain24")) for x in out if x["name"] in ("Yangon (Kaba-Aye)", "Mandalay", "Pyinmana", "Taunggyi", "Sittwe", "Loikaw") or x.get("storm") or (x.get("rain24") or 0) >= 20])


def gpm(path):
    """Time of the newest NASA GPM satellite rain picture."""
    t = get("https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0")
    m = re.search(r"<Name>IMERG_Precipitation_Rate_30min</Name>.*?default=\"([^\"]+)\"", t, re.S)
    if m:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"layer": "IMERG_Precipitation_Rate_30min", "time": m.group(1)}, f)
        print("GPM", m.group(1))


def prices(path):
    """Official exchange rates, world gold converted to kyattha, and oil."""
    out = {}
    try:
        j = json.loads(get("https://forex.cbm.gov.mm/api/latest"))
        r = j["rates"]
        out["cbm"] = [[c, float(r[c].replace(",", ""))] for c in ("USD", "EUR", "SGD", "THB", "CNY") if c in r]
        out["cbm_date"] = datetime.fromtimestamp(int(j["timestamp"]), timezone.utc).strftime("%-d %b %Y")
    except Exception as e:
        print("prices cbm skipped:", e, file=sys.stderr)
    try:
        mk = json.load(open("data/markets.json", encoding="utf-8"))["items"]
        g = float(re.sub(r"[^0-9.]", "", mk["Gold"]["value"]))
        out["gold_usd_oz"], out["gold_when"] = round(g), mk["Gold"].get("when", "")
        usd = next((v for c, v in out.get("cbm", []) if c == "USD"), None)
        if usd:
            out["gold_kyattha"] = round(g / 31.1035 * 16.329 * usd, -2)
        b = mk.get("Brent crude")
        if b:
            out["brent"], out["brent_when"] = b["value"].replace("$", ""), b.get("when", "")
    except Exception as e:
        print("prices world skipped:", e, file=sys.stderr)
    out["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print("PRICES", {k: v for k, v in out.items() if k != "updated"})


def main(path="data/live.json"):
    jobs = [(t, s, u) for t, fs in FEEDS.items() for s, u in fs]
    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(fetch, jobs))
    for _, err in results:
        if err:
            print("skipped", err, file=sys.stderr)
    now = datetime.now(timezone.utc)
    seen, pool = set(), {t: [] for t in FEEDS}
    for (t, src, u), (r, _) in zip(jobs, results):
        for i in r:
            i["_g"] = src == "Google News"
    rows = sorted([i for r, _ in results for i in r] + quakes(), key=lambda i: i["published"], reverse=True)
    for i in rows:
        key = re.sub(r"[^a-z0-9]+", "", i["title"].lower())[:70]
        age = now - datetime.fromisoformat(i["published"])
        if key in seen or age > (timedelta(days=7) if i["topic"] == "weather" else timedelta(days=4) if i["topic"] == "burmese" else MAX_AGE) or age < timedelta(minutes=-10):
            continue
        seen.add(key)
        pool[i["topic"]].append(i)
    by_topic = {}
    for t, v in pool.items():
        best = cluster(v, now)
        cap, out, g = (45 if t == "myanmar" else PER_TOPIC), [], 0
        for i in best:
            if i.get("_g") and i.get("n", 1) < 2 and t not in ("weather", "enso"):
                g += 1
                if g > (25 if t == "myanmar" else 10):
                    continue
            if len(out) < cap:
                out.append(i)
        by_topic[t] = out
    items = sorted((i for v in by_topic.values() for i in v), key=lambda i: i["published"], reverse=True)
    for i in items:
        i.pop("_g", None)
    for i in items:
        if i["topic"] == "myanmar" or (i["topic"] == "weather" and i.get("mm")):
            i["sub"] = "weather" if i["topic"] == "weather" else sub_of(i["title"])
    picks = [i for v in by_topic.values() for i in v[:10]]
    picks += [i for i in by_topic["myanmar"][10:] + by_topic["weather"] if "news.google.com" not in i["url"] and i not in picks]
    og_images(picks, limit=90)
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
    markets("data/markets.json")
    fallback_edition(items)
    dmh("data/dmh.json")
    weather("data/weather.json")
    enso("data/enso.json")
    try:
        hotspots("data/hotspots.json")
    except Exception as e:
        print("skipped hotspots:", e, file=sys.stderr)
    for name, job in (("stations", lambda: stations("data/stations.json")), ("gpm", lambda: gpm("data/gpm.json")), ("prices", lambda: prices("data/prices.json"))):
        try:
            job()
        except Exception as e:
            print("skipped", name + ":", e, file=sys.stderr)
    try:
        risk("data/risk.json", items)
    except Exception as e:
        print("skipped risk:", e, file=sys.stderr)
    print(len(items), "headlines", {t: len(v) for t, v in by_topic.items()})


if __name__ == "__main__":
    main(*sys.argv[1:])
