/* popup.js - status + "reload library" */
(() => {
  const cfg = (window.__KDS && window.__KDS.config) || {};
  const $ = (id) => document.getElementById(id);
  const CACHE_KEY = "kds_index_cache";

  $("mode").textContent = cfg.source === "cdn" ? "CDN (jsDelivr)" : "Local (bundled)";
  const isPlaceholder = !cfg.ghUser || cfg.ghUser === "__GH_USER__";
  $("ghuser").textContent = isPlaceholder ? "not set" : cfg.ghUser;

  if (isPlaceholder) {
    $("hint").textContent =
      "Running on bundled stickers. Set your GitHub username in config.js to switch to the online library.";
  }

  chrome.storage.local.get(CACHE_KEY, (o) => {
    const c = o[CACHE_KEY];
    if (c && c.raw && Array.isArray(c.raw.stickers)) {
      $("count").textContent = `${c.raw.stickers.length} stickers (cached)`;
    } else if (cfg.source === "local") {
      // read the bundled index directly
      fetch(chrome.runtime.getURL("stickers/index.json"))
        .then((r) => r.json())
        .then((j) => { $("count").textContent = `${(j.stickers || []).length} stickers (bundled)`; })
        .catch(() => { $("count").textContent = "unavailable"; });
    } else {
      $("count").textContent = "not loaded yet";
    }
  });

  $("reload").addEventListener("click", () => {
    chrome.storage.local.remove(CACHE_KEY, () => {
      $("reload").textContent = "Cleared - reopen your Meet tab";
      setTimeout(() => { $("reload").textContent = "Reload sticker library"; }, 2500);
    });
  });
})();
