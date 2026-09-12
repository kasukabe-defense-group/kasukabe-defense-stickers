/* picker.js - the sticker button + tray, rendered inside a Shadow DOM so Meet's
 * styles and ours never collide. The button floats, anchored to the chat input.
 */
(() => {
  const NS = (window.__KDS = window.__KDS || {});
  const cfg = NS.config;

  let host, shadow, btn, tray;
  let open = false;
  let curCtx = null;
  let anchorTimer = null;
  let activePack = "all";
  let lastQuery = "";
  let updateInfo = null;

  const BTN_SIZE = 36;
  const TRAY_WIDTH = 340;
  const CELL_SIZE = 96; // ~3 per row at TRAY_WIDTH - bigger, more readable stickers

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: Roboto, Arial, sans-serif; }
    .btn {
      position: fixed; z-index: 2147483000; width: ${BTN_SIZE}px; height: ${BTN_SIZE}px;
      border-radius: 50%; border: 2px solid rgba(255,255,255,.85); cursor: pointer;
      background: #FFB020; color: #1a1200; font-size: 18px;
      display: none; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,.45);
    }
    .btn:hover { filter: brightness(1.08); transform: scale(1.04); }
    .tray {
      position: fixed; z-index: 2147483000; width: ${TRAY_WIDTH}px; max-height: 440px;
      background: #1f1f24; color: #eee; border-radius: 12px; overflow: hidden;
      box-shadow: 0 10px 34px rgba(0,0,0,.55); display: flex; flex-direction: column;
    }
    .tray[hidden] { display: none; }
    .update {
      background: #3a2f00; color: #ffd36b; font-size: 12px; line-height: 1.4;
      padding: 8px 10px; border-bottom: 1px solid #4a3d00;
    }
    .update a { color: #ffd36b; font-weight: 700; text-decoration: underline; }
    .search {
      margin: 10px; padding: 8px 10px; border: 1px solid #3a3a44; border-radius: 8px;
      background: #26262c; color: #fff; font-size: 14px; outline: none;
    }
    .packs { display: flex; gap: 6px; padding: 0 10px 8px; flex-wrap: wrap; }
    .pack {
      font-size: 12px; padding: 3px 9px; border-radius: 999px; background: #33333b;
      cursor: pointer; user-select: none;
    }
    .pack.active { background: #7C5CFC; color: #fff; }
    .grid {
      display: flex; flex-wrap: wrap; align-content: flex-start; gap: 6px;
      padding: 0 10px 10px; overflow-y: auto;
    }
    .cell {
      width: ${CELL_SIZE}px; height: ${CELL_SIZE}px; flex: 0 0 auto;
      background: #2a2a31; border-radius: 8px; padding: 8px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .cell:hover { background: #3b3b45; }
    .cell img { max-width: 100%; max-height: 100%; }
    .empty { width: 100%; padding: 24px 10px; text-align: center; color: #999; font-size: 13px; }
    .foot { padding: 6px 10px; font-size: 11px; color: #888; border-top: 1px solid #333; }
  `;

  function ensureHost() {
    if (host) return;
    host = document.createElement("div");
    host.id = "kds-host";
    (document.body || document.documentElement).appendChild(host);
    shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);

    btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = "🩹"; // adhesive bandage - stands in for a sticker
    btn.title = "Kasukabe Defense Stickers";
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    shadow.appendChild(btn);

    tray = document.createElement("div");
    tray.className = "tray";
    tray.hidden = true;
    shadow.appendChild(tray);

    document.addEventListener("click", (e) => {
      if (!open) return;
      const path = e.composedPath();
      if (!path.includes(tray) && !path.includes(btn)) close();
    });
    window.addEventListener("resize", anchor, true);
    window.addEventListener("scroll", anchor, true);
  }

  function anchor() {
    if (!curCtx || !curCtx.input || !btn) return;
    const r = curCtx.input.getBoundingClientRect();
    if (r.width < 2 || r.bottom < 0 || r.top > innerHeight) { btn.style.display = "none"; return; }
    btn.style.display = "flex";

    // Prefer sitting just outside the input's left edge, vertically centered on
    // it - reads as "attached to the compose row" instead of floating above the
    // message list. If there's no room on the left (input spans near full width),
    // fall back to the input's bottom-right corner instead.
    const vCenter = r.top + (r.height - BTN_SIZE) / 2;
    let btnLeft = r.left - BTN_SIZE - 8;
    let btnTop = vCenter;
    if (btnLeft < 6) {
      btnLeft = Math.max(6, r.right - BTN_SIZE);
      btnTop = r.bottom + 6;
    }
    btn.style.left = btnLeft + "px";
    btn.style.top = Math.max(6, btnTop) + "px";

    if (!tray.hidden) {
      const w = TRAY_WIDTH;
      tray.style.left = Math.max(6, Math.min(r.right - w, innerWidth - w - 8)) + "px";
      // Anchor the tray's BOTTOM to just above the input, not a guessed top -
      // this way it always sits flush against the chat box no matter how tall
      // the content actually is (few stickers vs many), instead of floating
      // higher than needed and leaving a gap underneath.
      tray.style.top = "auto";
      tray.style.bottom = Math.max(6, innerHeight - r.top + 8) + "px";
    }
  }

  async function render() {
    await NS.library.load();
    const idx = NS.library.index;
    tray.innerHTML = "";

    if (updateInfo) {
      const banner = document.createElement("div");
      banner.className = "update";
      const notes = updateInfo.notes ? ` — ${updateInfo.notes}` : "";
      banner.innerHTML =
        `🔔 A new version (${updateInfo.latest}) is out${notes}. ` +
        `<a href="${updateInfo.releaseUrl}" target="_blank" rel="noopener">Get it from GitHub</a> ` +
        `and reload the extension to update.`;
      tray.appendChild(banner);
    }

    const search = document.createElement("input");
    search.className = "search";
    search.type = "text";
    search.placeholder = "Search stickers…";
    search.value = lastQuery;
    search.addEventListener("input", () => { lastQuery = search.value; renderGrid(); });
    tray.appendChild(search);

    const packs = document.createElement("div");
    packs.className = "packs";
    const addPack = (id, label) => {
      const el = document.createElement("span");
      el.className = "pack" + (activePack === id ? " active" : "");
      el.textContent = label;
      el.addEventListener("click", () => { activePack = id; render(); });
      packs.appendChild(el);
    };
    addPack("all", "All");
    (idx ? idx.packs : []).forEach((p) => addPack(p.id, p.title));
    tray.appendChild(packs);

    const grid = document.createElement("div");
    grid.className = "grid";
    grid.id = "kds-grid";
    tray.appendChild(grid);

    const foot = document.createElement("div");
    foot.className = "foot";
    foot.textContent = `${idx ? idx.stickers.length : 0} stickers · ${cfg.source} mode`;
    tray.appendChild(foot);

    renderGrid();
    setTimeout(() => search.focus(), 0);
  }

  function renderGrid() {
    const grid = shadow.getElementById("kds-grid");
    if (!grid) return;
    grid.innerHTML = "";
    let list = NS.library.search(lastQuery);
    if (activePack !== "all") list = list.filter((s) => s.pack === activePack);
    if (!list.length) {
      const e = document.createElement("div");
      e.className = "empty";
      e.textContent = "No stickers found.";
      grid.appendChild(e);
      return;
    }
    list.slice(0, 80).forEach((s) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.title = s.name;
      const img = document.createElement("img");
      img.alt = s.name;
      img.loading = "lazy";
      NS.library.displayUrl(s).then((u) => { img.src = u; });
      cell.appendChild(img);
      cell.addEventListener("click", () => pick(s));
      grid.appendChild(cell);
    });
  }

  async function pick(s) {
    let msg = NS.marker.encode(s.pack, s.id);
    if (cfg.linkFallback && cfg.source === "cdn") {
      msg += " " + NS.library.rawUrl(s);
    }
    close();
    await NS.sender.send(msg, curCtx);
  }

  function toggle() { open ? close() : openTray(); }
  async function openTray() {
    open = true; tray.hidden = false; anchor();
    // Checked fresh on every open (cheap - one small file) so a release
    // published while the tray was closed still gets noticed promptly,
    // instead of waiting on the sticker-list cache to expire.
    updateInfo = await NS.library.checkForUpdate().catch(() => null);
    await render();
    anchor();
  }
  function close() { open = false; if (tray) tray.hidden = true; }

  function mount(ctx) {
    ensureHost();
    curCtx = ctx;
    anchor();
    if (anchorTimer) clearInterval(anchorTimer);
    anchorTimer = setInterval(anchor, 500);
  }
  function unmount() {
    curCtx = null;
    close();
    if (btn) btn.style.display = "none";
    if (anchorTimer) { clearInterval(anchorTimer); anchorTimer = null; }
  }

  NS.picker = { mount, unmount };
})();
