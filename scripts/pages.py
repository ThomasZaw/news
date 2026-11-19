"""Make a separate page for each main section, in English and in Burmese, so search engines can list each one.

Every page is the same app. What changes is the address, the language, the title and description,
the links that tell search engines which pages are translations of each other, and the breadcrumb data.
"""
import json
import os

SITE = "https://parabaikdaily.com/"
HOME_T = "Parabaik Daily: Myanmar news, weather and earthquake alerts"
HOME_D = "Myanmar news, live weather, earthquake alerts, fire hotspots and the Burmese calendar in one page. မြန်မာသတင်း၊ ရာသီဥတု၊ ငလျင်သတိပေးချက်နှင့် မြန်မာပြက္ခဒိန်။"

# slug, section opened, crumb name (en, my), title (en, my), description (en, my)
PAGES = [
    ("", "home", ("Home", "ပင်မ"),
     (HOME_T, "ပုရပိုက်: မြန်မာသတင်း၊ ရာသီဥတုနှင့် ငလျင်သတိပေးချက်"),
     (HOME_D, "မြန်မာသတင်း၊ တိုက်ရိုက်ရာသီဥတု၊ ငလျင်သတိပေးချက်၊ အန္တရာယ်မြေပုံ၊ ဈေးနှုန်းများနှင့် မြန်မာပြက္ခဒိန်ကို တစ်နေရာတည်းတွင် ကြည့်ရှုနိုင်ပါသည်။")),
    ("weather", "weather", ("Weather", "ရာသီဥတု"),
     ("Myanmar weather today and storm warnings", "မြန်မာ ရာသီဥတု ယနေ့နှင့် မုန်တိုင်းသတိပေးချက်"),
     ("Live weather for Yangon, Nay Pyi Taw, Mandalay and other Myanmar towns, with a seven-day forecast and storm, heavy rain, heat and fire danger alerts.",
      "ရန်ကုန်၊ နေပြည်တော်၊ မန္တလေးနှင့် အခြားမြို့များအတွက် တိုက်ရိုက်ရာသီဥတု၊ ခုနစ်ရက်ခန့်မှန်းချက်၊ မုန်တိုင်း၊ မိုးသည်းထန်မှု၊ အပူလွန်ကဲမှုနှင့် မီးဘေးသတိပေးချက်များ။")),
    ("earthquakes", "quakes", ("Earthquakes", "ငလျင်"),
     ("Myanmar earthquake today: live map and alerts", "မြန်မာ ငလျင် ယနေ့: တိုက်ရိုက်မြေပုံနှင့် သတိပေးချက်"),
     ("Latest earthquakes in and near Myanmar from USGS, EMSC, GEOFON, China CENC, India NCS and Myanmar DMH, with a live map, the nearest town and a weekly count.",
      "မြန်မာနိုင်ငံနှင့် အနီးတစ်ဝိုက်တွင် နောက်ဆုံးလှုပ်ခတ်သော ငလျင်များကို USGS၊ EMSC၊ GEOFON၊ CENC၊ NCS နှင့် မိုးလေဝသနှင့်ဇလဗေဒဦးစီးဌာန တို့မှ တစ်မိနစ်တစ်ကြိမ် စစ်ဆေး၍ မြေပုံနှင့်တကွ ပြသသည်။")),
    ("el-nino", "enso", ("El Niño", "အယ်လ်နီညို"),
     ("El Niño tracker for Myanmar", "မြန်မာအတွက် အယ်လ်နီညို စောင့်ကြည့်ချက်"),
     ("Weekly El Niño reading from NOAA and what it means for heat, drought and fire risk in Myanmar.",
      "NOAA ၏ အပတ်စဉ် အယ်လ်နီညို တိုင်းတာချက်နှင့် မြန်မာနိုင်ငံ၏ အပူချိန်၊ မိုးခေါင်မှုနှင့် မီးဘေးအန္တရာယ်အပေါ် သက်ရောက်မှု။")),
    ("safety", "safety", ("Danger map", "အန္တရာယ်မြေပုံ"),
     ("Myanmar danger map, fire hotspots and emergency numbers", "မြန်မာ အန္တရာယ်မြေပုံ၊ မီးလောင်နေရာများနှင့် အရေးပေါ်ဖုန်းနံပါတ်များ"),
     ("A danger map for every state and region of Myanmar, NASA fire hotspots, air quality, river levels, emergency numbers and what to do in an earthquake, flood, storm or fire.",
      "ပြည်နယ်နှင့် တိုင်းဒေသကြီးအလိုက် အန္တရာယ်မြေပုံ၊ NASA မီးလောင်နေရာမြေပုံ၊ လေထုအရည်အသွေး၊ အရေးပေါ်ဖုန်းနံပါတ်များနှင့် ငလျင်၊ ရေကြီးမှု၊ မုန်တိုင်း၊ မီးဘေးတွင် လုပ်ဆောင်ရမည့်အချက်များ။")),
    ("calendar", "calendar", ("Calendar", "ပြက္ခဒိန်"),
     ("Myanmar calendar with full moon days and holidays", "မြန်မာပြက္ခဒိန်: လပြည့်၊ လကွယ်နှင့် ရုံးပိတ်ရက်များ"),
     ("Burmese calendar with Myanmar dates, full moon and new moon days, sabbath days and public holidays.",
      "မြန်မာရက်စွဲ၊ လပြည့်လကွယ်၊ ဥပုသ်နေ့နှင့် အများပြည်သူရုံးပိတ်ရက်များပါဝင်သော မြန်မာပြက္ခဒိန်။")),
    ("prices", "prices", ("Prices", "ဈေးနှုန်း"),
     ("Myanmar gold price, dollar rate and fuel prices today", "ယနေ့ ရွှေဈေး၊ ဒေါ်လာဈေးနှင့် စက်သုံးဆီဈေး"),
     ("Gold price per kyattha, the US dollar rate and Yangon fuel prices for Octane 92, 95, 97 and diesel, with official Central Bank rates.",
      "မြန်မာနိုင်ငံ ရွှေဈေး (တစ်ကျပ်သား)၊ ဒေါ်လာဈေးနှင့် ရန်ကုန် စက်သုံးဆီဈေးနှုန်းများကို ဗဟိုဘဏ် ရည်ညွှန်းနှုန်းများနှင့်အတူ ဖော်ပြသည်။")),
    ("news", "all", ("News", "သတင်း"),
     ("Myanmar news today and world headlines", "ယနေ့ မြန်မာသတင်းနှင့် ကမ္ဘာ့သတင်းများ"),
     ("Latest Myanmar news with world, business, sports and tech headlines from more than thirty outlets, cross-checked and updated every 15 minutes.",
      "နောက်ဆုံးရ မြန်မာသတင်း၊ ကမ္ဘာ့သတင်း၊ စီးပွားရေး၊ အားကစားနှင့် နည်းပညာသတင်းများကို ၁၅ မိနစ်တစ်ကြိမ် အသစ်တင်ပေးသည်။")),
    ("about", "about", ("About and sources", "အကြောင်းနှင့် သတင်းရင်းမြစ်"),
     ("About Parabaik Daily and its sources", "ပုရပိုက်အကြောင်းနှင့် သတင်းရင်းမြစ်များ"),
     ("What Parabaik Daily is, how often each part updates, how headlines are chosen and cross-checked, and every source it uses.",
      "ပုရပိုက်ဆိုသည်မှာ ဘာလဲ၊ အချက်အလက်များကို မည်မျှမကြာခဏ အသစ်တင်သည်၊ သတင်းများကို မည်သို့ရွေးချယ်သည်နှင့် အသုံးပြုထားသော သတင်းရင်းမြစ်များ။")),
]


def address(slug, lang):
    return SITE + ("my/" if lang == "my" else "") + (slug + "/" if slug else "")


def build(base, slug, view, crumb, titles, descs, lang):
    i = 1 if lang == "my" else 0
    url, title, desc = address(slug, lang), titles[i], descs[i]
    full = title if not slug else title + (" | ပုရပိုက်" if lang == "my" else " | Parabaik Daily")
    h = base
    extra = '<head>\n<base href="/">'
    if slug:
        extra = '<head>\n<meta name="pd-view" content="' + view + '">\n<base href="/">'
    if lang == "my":
        extra = extra.replace("<head>\n", '<head>\n<meta name="pd-lang" content="mm">\n')
        h = h.replace('<html lang="en"', '<html lang="my"', 1)
    h = h.replace("<head>", extra, 1)
    h = h.replace('<h1 class="sr-only">' + HOME_T + "</h1>", '<h1 class="sr-only">' + title + "</h1>")
    h = h.replace("<title>" + HOME_T + "</title>", "<title>" + full + "</title>")
    h = h.replace('<meta property="og:title" content="' + HOME_T + '">', '<meta property="og:title" content="' + title + '">')
    h = h.replace('<meta property="og:url" content="' + SITE + '">', '<meta property="og:url" content="' + url + '">')
    for key in ('<meta name="description" content="', '<meta property="og:description" content="'):
        start = h.index(key)
        end = h.index('">', start) + 2
        h = h[:start] + key + desc + '">' + h[end:]
    links = '<link rel="canonical" href="' + url + '">\n'
    links += '<link rel="alternate" hreflang="en" href="' + address(slug, "en") + '">\n'
    links += '<link rel="alternate" hreflang="my" href="' + address(slug, "my") + '">\n'
    links += '<link rel="alternate" hreflang="x-default" href="' + address(slug, "en") + '">'
    if slug:
        crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "ပုရပိုက်" if lang == "my" else "Parabaik Daily", "item": address("", lang)},
            {"@type": "ListItem", "position": 2, "name": crumb[i], "item": url}]}
        links += '\n<script type="application/ld+json">' + json.dumps(crumbs, ensure_ascii=False) + "</script>"
    h = h.replace('<link rel="canonical" href="' + SITE + '">', links)
    return h


def main(site="_site"):
    with open(os.path.join(site, "index.html"), encoding="utf-8") as f:
        base = f.read()
    rows = []
    for slug, view, crumb, titles, descs in PAGES:
        for lang in ("en", "my"):
            folder = os.path.join(site, "my" if lang == "my" else "", slug)
            os.makedirs(folder, exist_ok=True)
            with open(os.path.join(folder, "index.html"), "w", encoding="utf-8") as f:
                f.write(build(base, slug, view, crumb, titles, descs, lang))
        rows.append(slug)
    with open(os.path.join(site, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n')
        for slug in rows:
            for lang in ("en", "my"):
                f.write(" <url><loc>" + address(slug, lang) + "</loc>")
                for alt, code in (("en", "en"), ("my", "my"), ("en", "x-default")):
                    f.write('<xhtml:link rel="alternate" hreflang="' + code + '" href="' + address(slug, alt) + '"/>')
                f.write("</url>\n")
        f.write("</urlset>\n")
    print(len(rows) * 2, "pages")


if __name__ == "__main__":
    main()
