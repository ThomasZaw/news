# Parabaik Daily

A personal morning news page. `data/edition.json` holds the daily stories, words and quote. A GitHub Action builds `data/live.json` and `data/weather.json` from public feeds about every 30 minutes and deploys the site to GitHub Pages.

`worker/` is a Cloudflare Worker that checks for earthquakes and breaking alerts every minute. It sends web push notifications, signed with the Cloudflare secret `VAPID_PRIVATE`.
