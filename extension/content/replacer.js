/* replacer.js - watch the chat and swap ":stkr:pack/id:" codes for sticker images.
 * Mutation-driven (only looks at nodes that were added / changed) so it stays cheap
 * even when observing a busy page. Idempotent - safe to re-run.
 */
(() => {
  const NS = (window.__KDS = window.__KDS || {});
  const cfg = NS.config;
  const TOKEN = ":stkr:";

  let mo = null;
  let root = null;

  function buildSticker(pack, id) {
    const wrap = document.createElement("span");
    wrap.className = "kds-sticker";
    wrap.dataset.kdsKey = `${pack}/${id}`;

    const st = NS.library.resolve(pack, id);
    if (st) { fillImage(wrap, st); return wrap; }

    // library not ready yet - show a placeholder, retry once it loads
    wrap.classList.add("kds-missing");
    wrap.textContent = `[sticker: ${pack}/${id}]`;
    NS.library.load().then(() => {
      const s2 = NS.library.resolve(pack, id);
      if (s2 && wrap.isConnected) {
        wrap.textContent = "";
        wrap.classList.remove("kds-missing");
        fillImage(wrap, s2);
      }
    });
    return wrap;
  }

  function fillImage(wrap, st) {
    const img = document.createElement("img");
    img.className = "kds-sticker-img";
    img.alt = st.name || st.id;
    img.title = st.name || st.id;
    img.loading = "lazy";
    img.style.maxWidth = (cfg.stickerSizePx || 140) + "px";
    img.style.maxHeight = (cfg.stickerSizePx || 140) + "px";
    img.addEventListener("error", () => {
      wrap.classList.add("kds-missing");
      wrap.textContent = `[sticker: ${st.name || st.id}]`;
    });
    wrap.appendChild(img);
    NS.library.displayUrl(st).then((u) => { img.src = u; });
  }

  function processTextNode(tn) {
    if (!tn || !tn.parentNode || tn.nodeType !== Node.TEXT_NODE) return;
    const text = tn.nodeValue;
    if (!text || text.indexOf(TOKEN) === -1) return;
    if (tn.parentNode.classList && tn.parentNode.classList.contains("kds-sticker")) return;

    const re = NS.marker.RE();
    let m, last = 0, any = false;
    const frag = document.createDocumentFragment();
    while ((m = re.exec(text))) {
      any = true;
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(buildSticker(m[1].toLowerCase(), m[2].toLowerCase()));
      last = m.index + m[0].length;
      // swallow " <image url>" appended by the link fallback
      const um = text.slice(last).match(/^\s+https?:\/\/[^\s]+\.(?:svg|png|gif|webp|jpg|jpeg)(\?[^\s]*)?/i);
      if (um) last += um[0].length;
    }
    if (!any) return;
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    tn.parentNode.replaceChild(frag, tn);
  }

  function scanSubtree(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) { processTextNode(node); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "INPUT") return;
    if (node.classList && node.classList.contains("kds-sticker")) return;
    if ((node.textContent || "").indexOf(TOKEN) === -1) return; // fast reject

    const tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (tw.nextNode()) {
      if (tw.currentNode.nodeValue && tw.currentNode.nodeValue.indexOf(TOKEN) !== -1) hits.push(tw.currentNode);
    }
    hits.forEach(processTextNode);
  }

  function onMutations(muts) {
    for (const mu of muts) {
      if (mu.type === "characterData") {
        processTextNode(mu.target);
      } else if (mu.type === "childList") {
        for (const n of mu.addedNodes) scanSubtree(n);
      }
    }
  }

  function start(ctx) {
    stop();
    root = (ctx && ctx.messageList) || document.body;
    scanSubtree(root); // one-time full scan of the current content
    mo = new MutationObserver(onMutations);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    NS.log("replacer watching", root === document.body ? "document.body" : root);
  }
  function stop() {
    if (mo) mo.disconnect();
    mo = null;
  }
  function rescan() { scanSubtree(root || document.body); }

  NS.replacer = { start, stop, rescan };
})();
