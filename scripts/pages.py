"""Make a separate page for each main section so search engines can list them on their own."""
import os

PAGES = [
    ("weather", "weather", "Myanmar weather today and storm warnings", "Live weather for Yangon, Mandalay and other Myanmar cities, with storm, heavy rain, heat and fire danger alerts. မြန်မာ ရာသီဥတုနှင့် မုန်တိုင်းသတိပေးချက်။"),
    ("earthquakes", "quakes", "Myanmar earthquake today: live map and alerts", "Latest earthquakes in and near Myanmar from USGS, EMSC and GEOFON, checked every minute, with a live map. မြန်မာ ငလျင် နောက်ဆုံးရ။"),
    ("el-nino", "enso", "El Niño tracker for Myanmar", "Live El Niño reading from NOAA and what it means for heat, drought and fire risk in Myanmar."),
    ("safety", "safety", "Myanmar fire hotspots and emergency numbers", "NASA fire hotspot map for Myanmar, air quality, river levels and emergency numbers."),
    ("calendar", "calendar", "Myanmar calendar with full moon days and holidays", "Burmese calendar with Myanmar dates, full moon and new moon days, and public holidays. မြန်မာ ပြက္ခဒိန်။"),
    ("news", "all", "Myanmar news today and world headlines", "Latest Myanmar news and world, business, stock and tech headlines, updated every 15 minutes. မြန်မာ သတင်း နောက်ဆုံးရ။"),
]


def main(site="_site"):
    with open(os.path.join(site, "index.html"), encoding="utf-8") as f:
        base = f.read()
    urls = ["https://parabaikdaily.com/"]
    for slug, view, title, desc in PAGES:
        url = "https://parabaikdaily.com/" + slug + "/"
        h = base.replace("<head>", '<head>\n<base href="/">', 1)
        h = h.replace("<title>Parabaik Daily: Myanmar news, weather and earthquake alerts</title>", "<title>" + title + " | Parabaik Daily</title>")
        h = h.replace('<link rel="canonical" href="https://parabaikdaily.com/">', '<link rel="canonical" href="' + url + '">')
        h = h.replace('<meta property="og:url" content="https://parabaikdaily.com/">', '<meta property="og:url" content="' + url + '">')
        h = h.replace('<meta property="og:title" content="Parabaik Daily: Myanmar news, weather and earthquake alerts">', '<meta property="og:title" content="' + title + '">')
        start = h.index('<meta name="description" content="')
        end = h.index('">', start) + 2
        h = h[:start] + '<meta name="description" content="' + desc + '">' + h[end:]
        h = h.replace("<head>\n<base", "<head>\n<script>if(!location.hash)history.replaceState(null,'','#" + view + "');document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^=\"#\"]');if(a){e.preventDefault();location.hash=a.getAttribute('href')}})</script>\n<base", 1)
        os.makedirs(os.path.join(site, slug), exist_ok=True)
        with open(os.path.join(site, slug, "index.html"), "w", encoding="utf-8") as f:
            f.write(h)
        urls.append(url)
    with open(os.path.join(site, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write(" <url><loc>" + u + "</loc></url>\n")
        f.write("</urlset>\n")
    print(len(urls), "pages")


if __name__ == "__main__":
    main()
