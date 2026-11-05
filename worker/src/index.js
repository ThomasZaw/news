// Parabaik Daily alert checker. Runs every minute and sends new alerts as web push notifications.
// VAPID_PRIVATE is a Cloudflare secret. Never put its value in this repository.
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

export async function run(env, now = Date.now()) {
  if (!env.VAPID_PRIVATE) return console.log("VAPID_PRIVATE is not set");
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
    const cors = { "Access-Control-Allow-Origin": "https://thomaszaw.github.io", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    const path = new URL(request.url).pathname;
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
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
    return new Response("Parabaik alert checker is running", { headers: cors });
  },
};
