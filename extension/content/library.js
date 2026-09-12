/* library.js - load the sticker index + resolve sticker image URLs
 * Works in two modes (see config.js): "local" (bundled) or "cdn" (jsDelivr).
 */
(() => {
  const NS = (window.__KDS = window.__KDS || {});
  const cfg = NS.config;
  const CACHE_KEY = "kds_index_cache";
  const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

  let _index = null;      // { version, updated, packs, stickers, byKey }
  let _loading = null;
  const _urlCache = new Map();

  function indexUrl() {
    return cfg.source === "cdn"
      ? `${cfg.cdnBase}/index.json`
      : chrome.runtime.getURL("stickers/index.json");
  }

  function shape(raw) {
    const byKey = {};
    (raw.stickers || []).forEach((s) => { byKey[`${s.pack}/${s.id}`] = s; });
    return {
      version: raw.version, updated: raw.updated,
      packs: (raw.packs || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)),
      stickers: raw.stickers || [],
      byKey,
    };
  }

  async function fromCache() {
    try {
      const o = await chrome.storage.local.get(CACHE_KEY);
      const c = o[CACHE_KEY];
      if (c && c.raw && Date.now() - c.ts < CACHE_TTL) return c.raw;
    } catch (e) {}
    return null;
  }
  async function toCache(raw) {
    try { await chrome.storage.local.set({ [CACHE_KEY]: { ts: Date.now(), raw } }); } catch (e) {}
  }

  async function load(force) {
    if (_index && !force) return _index;
    if (_loading) return _loading;
    _loading = (async () => {
      let raw = null;
      if (!force && cfg.source === "cdn") raw = await fromCache();
      if (!raw) {
        try {
          const res = await fetch(indexUrl(), { cache: "no-cache" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          raw = await res.json();
          if (cfg.source === "cdn") await toCache(raw);
        } catch (e) {
          NS.warn("index load failed:", e.message);
          raw = (await fromCache()) || { version: 0, packs: [], stickers: [] };
        }
      }
      _index = shape(raw);
      NS.log(`library: ${_index.stickers.length} stickers / ${_index.packs.length} packs (source: ${cfg.source})`);
      return _index;
    })();
    try { return await _loading; } finally { _loading = null; }
  }

  function resolve(pack, id) {
    return _index ? _index.byKey[`${pack}/${id}`] || null : null;
  }

  function search(q) {
    if (!_index) return [];
    q = (q || "").trim().toLowerCase();
    if (!q) return _index.stickers.slice();
    const terms = q.split(/\s+/);
    return _index.stickers.filter((s) => {
      const hay = (s.name + " " + s.id + " " + s.pack + " " + (s.tags || []).join(" ")).toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  // Raw URL (may be blocked by Google Meet's CSP in cdn mode - prefer displayUrl()).
  function rawUrl(st) {
    return cfg.source === "cdn"
      ? `${cfg.cdnBase}/${st.file}`
      : chrome.runtime.getURL(`stickers/${st.file}`);
  }

  // CSP-safe URL for putting into an <img> on the Meet page.
  async function displayUrl(st) {
    const key = `${st.pack}/${st.id}`;
    if (_urlCache.has(key)) return _urlCache.get(key);
    let url;
    if (cfg.source === "local") {
      url = chrome.runtime.getURL(`stickers/${st.file}`);
    } else {
      try {
        const res = await fetch(`${cfg.cdnBase}/${st.file}`, { cache: "force-cache" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        url = URL.createObjectURL(await res.blob());
      } catch (e) {
        NS.warn("sticker fetch failed, using direct URL:", st.file, e.message);
        url = `${cfg.cdnBase}/${st.file}`;
      }
    }
    _urlCache.set(key, url);
    return url;
  }

  async function clearCache() {
    try { await chrome.storage.local.remove(CACHE_KEY); } catch (e) {}
    _index = null; _urlCache.clear();
  }

  NS.library = { load, resolve, search, rawUrl, displayUrl, clearCache, get index() { return _index; } };
})();
