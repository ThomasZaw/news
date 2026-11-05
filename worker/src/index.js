// Parabaik Daily alert checker. Runs every minute and sends new alerts as web push notifications.
// VAPID_PRIVATE is a Cloudflare secret. Never put its value in this repository.
const SITE = "https://parabaikdaily.com/";
const ORIGIN = "https://thomaszaw.github.io/news";
const ALLOWED = ["https://parabaikdaily.com", "https://thomaszaw.github.io"];
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

const enc = new TextEncoder();
const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const join = (...a) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; }
  return out;
};

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}

// RFC 8291 message encryption with the aes128gcm content coding.
export async function encrypt(sub, text) {
  const uaPub = unb64(sub.keys.p256dh), auth = unb64(sub.keys.auth), salt = crypto.getRandomValues(new Uint8Array(16));
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const peer = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, as.privateKey, 256));
  const prk = await hkdf(auth, shared, join(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const cek = await hkdf(salt, prk, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const iv = await hkdf(salt, prk, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, join(enc.encode(text), new Uint8Array([2]))));
  return join(salt, new Uint8Array([0, 0, 16, 0, 65]), asPub, data);
}

async function vapid(env, endpoint) {
  const pub = unb64(env.VAPID_PUBLIC);
  const jwk = { kty: "EC", crv: "P-256", d: env.VAPID_PRIVATE, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)) };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(enc.encode('{"typ":"JWT","alg":"ES256"}'));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 43200, sub: SITE })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}

async function sendOne(env, keyName, sub, a) {
  const r = await fetch(sub.endpoint, {
    method: "POST",
    body: await encrypt(sub, JSON.stringify({ title: a.title, body: a.body, url: a.click })),
    headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "3600", Urgency: "high", Authorization: await vapid(env, sub.endpoint) },
  });
  if (r.status === 404 || r.status === 410) await env.SEEN.delete(keyName);
  else if (!r.ok) console.log("push returned " + r.status);
  return r.status;
}

async function push(env, a) {
  const { keys } = await env.SEEN.list({ prefix: "s:" });
  for (const k of keys) {
    const sub = await env.SEEN.get(k.name, "json");
    if (sub) await sendOne(env, k.name, sub, a).catch((e) => console.log(String(e)));
  }
}

async function subKey(endpoint) {
  return "s:" + b64u(await crypto.subtle.digest("SHA-256", enc.encode(endpoint)));
}

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "ParabaikDaily/1.0" } });
  if (!r.ok) throw new Error(url + " returned " + r.status);
  return r.json();
}

const CITIES = [["Yangon", 16.87, 96.2], ["Mandalay", 21.97, 96.08], ["Naypyitaw", 19.75, 96.12], ["Hpa-An", 16.89, 97.63], ["Mawlamyine", 16.49, 97.63], ["Pathein", 16.78, 94.73], ["Bago", 17.34, 96.48], ["Taunggyi", 20.79, 97.04], ["Sittwe", 20.15, 92.9], ["Myitkyina", 25.38, 97.4], ["Monywa", 22.11, 95.14], ["Kawthaung", 9.98, 98.55]];

export function weatherAlerts(data, day) {
  const out = [];
  (Array.isArray(data) ? data : [data]).forEach((d, i) => {
    const city = CITIES[i][0], y = d.daily || {}, rain = (y.precipitation_sum || [0])[0] || 0, gust = (y.wind_gusts_10m_max || [0])[0] || 0, heat = (y.apparent_temperature_max || [0])[0] || 0;
    const add = (type, body) => out.push({ key: `w:${day}:${city}:${type}`, title: `Weather warning: ${city}`, body, click: SITE + "#weather" });
    if (rain >= 100) add("rain", `Heavy rain: ${Math.round(rain)} mm forecast today`);
    if (gust >= 75) add("wind", `Strong wind: gusts up to ${Math.round(gust)} km/h today`);
    if (heat >= 46) add("heat", `Extreme heat: feels like up to ${Math.round(heat)}° today`);
  });
  return out;
}

export function yangonDay(now) {
  return new Date(now + 6.5 * 3600e3).toISOString().slice(0, 10);
}

export function healthAlerts(edition, live, now) {
  const out = [], y = new Date(now + 6.5 * 3600e3), day = y.toISOString().slice(0, 10);
  if (edition && y.getUTCHours() >= 8 && edition.date !== day) out.push({ key: "h:edition:" + day, title: "Parabaik Daily needs attention", body: "The morning update did not run today.", click: SITE });
  if (live && now - Date.parse(live.updated) > 2 * 3600e3) out.push({ key: "h:live:" + day, title: "Parabaik Daily needs attention", body: "The live feed has not updated for 2 hours.", click: SITE });
  return out;
}

async function sendNew(env, list) {
  for (const a of list.slice(0, 5)) {
    if (await env.SEEN.get(a.key)) continue;
    await push(env, a);
    await env.SEEN.put(a.key, "1", { expirationTtl: WEEK });
  }
}

export async function run30(env, now = Date.now()) {
  if (!env.VAPID_PRIVATE) return;
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + CITIES.map((c) => c[1]).join(",") + "&longitude=" + CITIES.map((c) => c[2]).join(",") + "&daily=precipitation_sum,wind_gusts_10m_max,apparent_temperature_max&forecast_days=1&timezone=Asia%2FYangon";
  const [w, e, l, d, m] = await Promise.allSettled([getJson(url), getJson(ORIGIN + "/data/edition.json?t=" + now), getJson(ORIGIN + "/data/live.json?t=" + now), getJson(ORIGIN + "/data/dmh.json?t=" + now), getJson("https://aviationweather.gov/api/data/metar?ids=VYYY&format=json&hours=1")]);
  const list = [];
  if (d.status === "fulfilled") for (const x of d.value.items || []) if (x.active) list.push({ key: "d:" + x.url, title: "Official warning: " + x.kind, body: x.title, click: x.url });
  if (m.status === "fulfilled" && m.value[0] && /TS/.test(m.value[0].wxString || "")) list.push({ key: "ts:" + yangonDay(now) + ":" + Math.floor(new Date(now + 6.5 * 3600e3).getUTCHours() / 3), title: "Thunderstorm in Yangon", body: "Reported at Yangon Airport. Stay clear of open ground and tall trees.", click: SITE + "#weather" });
  if (w.status === "fulfilled") list.push(...weatherAlerts(w.value, yangonDay(now)));
  list.push(...healthAlerts(e.status === "fulfilled" ? e.value : null, l.status === "fulfilled" ? l.value : null, now));
  await sendNew(env, list);
}

async function dueReminders(env, now) {
  const list = (await env.SEEN.get("reminders", "json")) || [];
  const due = list.filter((r) => r.at <= now);
  if (!due.length) return;
  await env.SEEN.put("reminders", JSON.stringify(list.filter((r) => r.at > now)));
  for (const r of due) await sendOne(env, await subKey(r.sub.endpoint), r.sub, { title: "Parabaik reminder", body: r.text, click: SITE + "#reminders" }).catch((e) => console.log(String(e)));
}

export async function run(env, now = Date.now()) {
  if (!env.VAPID_PRIVATE) return console.log("VAPID_PRIVATE is not set");
  await dueReminders(env, now);
  const [q, n] = await Promise.allSettled([getJson(USGS), getJson(ORIGIN + "/data/live.json?t=" + now)]);
  const list = [];
  if (q.status === "fulfilled") list.push(...quakeAlerts(q.value, now));
  else console.log(String(q.reason));
  if (n.status === "fulfilled") list.push(...newsAlerts(n.value));
  else console.log(String(n.reason));
  await sendNew(env, list);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(event.cron === "*/30 * * * *" ? run30(env) : run(env));
  },
  async fetch(request, env) {
    const from = request.headers.get("Origin");
    const cors = { "Access-Control-Allow-Origin": ALLOWED.includes(from) ? from : ALLOWED[0], Vary: "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    const url = new URL(request.url), path = url.pathname;
    if (url.hostname === "www.parabaikdaily.com") return Response.redirect("https://parabaikdaily.com" + path + url.search, 301);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method === "POST" && path === "/reminder") {
      const b = await request.json().catch(() => null);
      if (!b || !b.sub || !/^https:\/\//.test(b.sub.endpoint || "") || !b.sub.keys || !(b.at > Date.now()) || typeof b.text !== "string") return new Response("Invalid reminder", { status: 400, headers: cors });
      const list = ((await env.SEEN.get("reminders", "json")) || []).filter((r) => r.id !== b.id);
      if (list.length >= 500) return new Response("Reminder list is full", { status: 429, headers: cors });
      list.push({ id: String(b.id).slice(0, 40), at: b.at, text: b.text.slice(0, 200), sub: { endpoint: b.sub.endpoint, keys: b.sub.keys } });
      await env.SEEN.put("reminders", JSON.stringify(list));
      return new Response("Saved", { headers: cors });
    }
    if (request.method === "POST" && path === "/reminder/delete") {
      const b = await request.json().catch(() => null);
      const list = (await env.SEEN.get("reminders", "json")) || [];
      if (b && list.some((r) => r.id === String(b.id))) await env.SEEN.put("reminders", JSON.stringify(list.filter((r) => r.id !== String(b.id))));
      return new Response("Deleted", { headers: cors });
    }
    if (request.method === "POST" && (path === "/subscribe" || path === "/test")) {
      const sub = await request.json().catch(() => null);
      if (!sub || !/^https:\/\//.test(sub.endpoint || "") || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return new Response("Invalid subscription", { status: 400, headers: cors });
      const key = await subKey(sub.endpoint);
      if (path === "/subscribe") {
        await env.SEEN.put(key, JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }));
        return new Response("Subscribed", { headers: cors });
      }
      const status = await sendOne(env, key, sub, { title: "Parabaik Daily", body: "Test alert. Notifications are working.", click: SITE });
      return new Response(String(status), { status: status < 300 ? 200 : 502, headers: cors });
    }
    if (path === "/obs") {
      const r = await fetch("https://aviationweather.gov/api/data/metar?ids=VYYY,VYMD,VYNT,VYMM,VYHH,VYSW,VYMK,VYKT,VYPT,VYMY&format=json&hours=3", { headers: { "User-Agent": "ParabaikDaily/1.0" }, cf: { cacheTtl: 240, cacheEverything: true } });
      return new Response(r.ok ? await r.text() : "[]", { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "max-age=120" } });
    }
    if (path === "/health") return new Response("Parabaik alert checker is running", { headers: cors });
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: cors });
    return fetch(ORIGIN + path + url.search, { method: request.method, headers: { "User-Agent": "ParabaikDaily/1.0" } });
  },
};
