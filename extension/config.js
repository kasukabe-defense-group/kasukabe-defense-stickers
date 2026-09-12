/* Kasukabe Defense Stickers - configuration
 * ------------------------------------------
 * The ONLY file you normally edit by hand.
 */
(() => {
  const NS = (window.__KDS = window.__KDS || {});

  // 1. Put your GitHub username here once the sticker repo is pushed.
  //    While it stays "__GH_USER__" the extension runs in LOCAL mode
  //    (stickers bundled inside the extension - works offline, no GitHub needed).
  const GH_USER = "kasukabe-defense-group";
  const REPO = "kasukabe-defense-stickers";
  const BRANCH = "main";

  const isPlaceholder = GH_USER === "__GH_USER__";

  NS.config = {
    ghUser: GH_USER,
    repo: REPO,
    branch: BRANCH,

    // "local" -> use stickers packaged with the extension
    // "cdn"   -> use the GitHub repo via jsDelivr (add stickers without re-sharing the extension)
    source: isPlaceholder ? "local" : "cdn",

    // NOTE: "stickers" lives inside the "extension" folder in the repo, so the
    // CDN path must include that prefix.
    cdnBase: `https://cdn.jsdelivr.net/gh/${GH_USER}/${REPO}@${BRANCH}/extension/stickers`,

    stickerSizePx: 140,     // how big stickers render in chat
    linkFallback: true,     // also append the image URL so people without the extension get a clickable link (cdn mode only)
    debug: true,            // console logging with the [KDS] prefix
  };

  NS.log = (...a) => { if (NS.config.debug) console.log("%c[KDS]", "color:#7C5CFC;font-weight:bold", ...a); };
  NS.warn = (...a) => console.warn("[KDS]", ...a);
  NS.log("config", NS.config);
})();
