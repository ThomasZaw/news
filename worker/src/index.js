// Parabaik Daily alert checker. Runs every minute and sends new alerts to ntfy.
// NTFY_TOPIC is a Cloudflare secret. Never put its value in this repository.
const SITE = "https://thomaszaw.github.io/news/";
const USGS = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
const WEEK = 604800;

export function inRegion(lat, lon) {
  return lat >= 9 && lat <= 29 && lon >= 91 && lon <= 102;
}

export function quakeAlerts(data, now) {
  const out = [];
  for (const q of data.features || []) {
    const p = q.properties || {};
    const [lon, lat] = q.geometry.coordinates;
    if (p.mag >= 4.5 && inRegion(lat, lon) && now - p.time <= 3 * 3600e3) {
      out.push({
        key: "q:" + q.id,
        title: "Earthquake in or near Myanmar",
        body: `Magnitude ${p.mag.toFixed(1)}: ${p.place || "location not given"}`,
        priority: p.mag >= 5 ? "max" : "high",
        tags: "warning",
        click: SITE + "#quakes",
      });
    }
  }
  return out;
}

export function newsAlerts(data) {
  return (data.alerts || [])
    .filter((a) => a.source !== "USGS")
    .map((a) => ({
      key: "n:" + a.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 70),
      title: "Parabaik breaking news",
      body: a.title,
      priority: "high",
      tags: "rotating_light",
      click: /^https?:\/\//.test(a.url) ? a.url : SITE,
    }));
}

async function push(env, a) {
  const r = await fetch("https://ntfy.sh/" + env.NTFY_TOPIC, {
    method: "POST",
    body: a.body,
    headers: { Title: a.title, Priority: a.priority, Tags: a.tags, Click: a.click },
  });
  if (!r.ok) throw new Error("ntfy returned " + r.status);
}

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "ParabaikDaily/1.0" } });
  if (!r.ok) throw new Error(url + " returned " + r.status);
  return r.json();
}

export async function run(env, now = Date.now()) {
  if (!env.NTFY_TOPIC) return console.log("NTFY_TOPIC is not set");
  const [q, n] = await Promise.allSettled([getJson(USGS), getJson(SITE + "data/live.json?t=" + now)]);
  const list = [];
  if (q.status === "fulfilled") list.push(...quakeAlerts(q.value, now));
  else console.log(String(q.reason));
  if (n.status === "fulfilled") list.push(...newsAlerts(n.value));
  else console.log(String(n.reason));
  for (const a of list.slice(0, 5)) {
    if (await env.SEEN.get(a.key)) continue;
    await push(env, a);
    await env.SEEN.put(a.key, "1", { expirationTtl: WEEK });
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (env.NTFY_TOPIC && path === "/test/" + env.NTFY_TOPIC) {
      await push(env, { title: "Parabaik Daily", body: "Test alert. Notifications are working.", priority: "high", tags: "white_check_mark", click: SITE });
      return new Response("Test alert sent");
    }
    return new Response("Parabaik alert checker is running");
  },
};
