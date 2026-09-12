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

  function buildSticker(pack, id, container) {
    const wrap = document.createElement("span");
    wrap.className = "kds-sticker";
    wrap.dataset.kdsKey = `${pack}/${id}`;

    const st = NS.library.resolve(pack, id);
    if (st) { fillImage(wrap, st, container); return wrap; }

    // library not ready yet - show a placeholder, retry once it loads.
    // Deliberately leaves any link-fallback text/link alone in this case -
    // if we can't show the sticker, the link is the fallback, per spec.
    wrap.classList.add("kds-missing");
    wrap.textContent = `[sticker: ${pack}/${id}]`;
    NS.library.load().then(() => {
      const s2 = NS.library.resolve(pack, id);
      if (s2 && wrap.isConnected) {
        wrap.textContent = "";
        wrap.classList.remove("kds-missing");
        fillImage(wrap, s2, container);
      }
    });
    return wrap;
  }

  function fillImage(wrap, st, container) {
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
    // The sticker rendered successfully - the link-fallback text is now
    // redundant. Google Meet auto-linkifies plain URLs into their own <a>
    // element before we ever see the message, so cleaning up leftover PLAIN
    // TEXT (below) isn't enough on its own - also hunt down and hide an <a>
    // Meet may have already built for this exact sticker's URL.
    hideLeftoverLink(container, st);
  }

  // Enforce: sticker visible -> no link. Sticker not visible -> link stays
  // (handled by simply not calling this in the unresolved-placeholder case).
  function hideLeftoverLink(container, st) {
    if (!container || !st) return;
    const needle = NS.library.linkNeedle(st); // e.g. "p=praise&i=jhakaas" - unique per sticker
    const scopes = [container, container.parentElement].filter(Boolean);
    for (const scope of scopes) {
      if (!scope.querySelectorAll) continue;
      // Case A: Meet turned the URL into its own <a> element.
      const links = scope.querySelectorAll("a[href]:not([data-kds-hidden-link])");
      for (const a of links) {
        let href = a.getAttribute("href") || "";
        try { href = decodeURIComponent(href); } catch (e) {}
        if (href.indexOf(needle) !== -1) {
          a.style.display = "none";
          a.setAttribute("data-kds-hidden-link", "1");
          return;
        }
      }
      // Case B: the URL is still plain text, but in a sibling text node
      // rather than trailing the marker in the same one.
      for (const child of Array.from(scope.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE && child.nodeValue && child.nodeValue.indexOf(needle) !== -1) {
          child.nodeValue = child.nodeValue.replace(/\s*https?:\/\/\S*/i, "");
        }
      }
    }
  }

  function processTextNode(tn) {
    if (!tn || !tn.parentNode || tn.nodeType !== Node.TEXT_NODE) return;
    const text = tn.nodeValue;
    if (!text || text.indexOf(TOKEN) === -1) return;
    if (tn.parentNode.classList && tn.parentNode.classList.contains("kds-sticker")) return;

    const container = tn.parentNode; // capture before we replace tn below
    const re = NS.marker.RE();
    let m, last = 0, any = false;
    const frag = document.createDocumentFragment();
    while ((m = re.exec(text))) {
      any = true;
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(buildSticker(m[1].toLowerCase(), m[2].toLowerCase(), container));
      last = m.index + m[0].length;
      // swallow " <landing page url>" appended by the link fallback, when
      // it's still plain text right here (the common case; see
      // hideLeftoverLink for when Meet already turned it into an <a>)
      const um = text.slice(last).match(/^\s+https?:\/\/\S+/i);
      if (um) last += um[0].length;
    }
    if (!any) return;
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    container.replaceChild(frag, tn);
  }

  // Reverse direction of hideLeftoverLink: a link Meet builds AFTER our
  // sticker already rendered (a separate/later mutation) never gets a chance
  // to be found by the "sticker resolved -> hunt for its link" check, because
  // that check only ever runs at the moment the sticker itself is built. So
  // also check the other way: whenever a NEW link shows up anywhere we're
  // watching, see if it matches a sticker we already placed near it.
  function tryHideLinkAgainstSticker(a) {
    if (!a || a.hasAttribute("data-kds-hidden-link")) return;
    let href = a.getAttribute("href") || "";
    try { href = decodeURIComponent(href); } catch (e) {}
    if (href.indexOf("/s.html?") === -1) return; // fast reject: not one of our landing links
    const scopes = [a.parentElement, a.parentElement && a.parentElement.parentElement].filter(Boolean);
    for (const scope of scopes) {
      const stickers = scope.querySelectorAll ? scope.querySelectorAll(".kds-sticker[data-kds-key]") : [];
      for (const s of stickers) {
        const [pack, id] = (s.dataset.kdsKey || "").split("/");
        const st = NS.library.resolve(pack, id);
        if (st && href.indexOf(NS.library.linkNeedle(st)) !== -1) {
          a.style.display = "none";
          a.setAttribute("data-kds-hidden-link", "1");
          return;
        }
      }
    }
  }

  function scanSubtree(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) { processTextNode(node); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "INPUT") return;
    if (node.classList && node.classList.contains("kds-sticker")) return;

    if (tag === "A" && node.hasAttribute("href")) tryHideLinkAgainstSticker(node);
    else if (node.querySelectorAll) node.querySelectorAll("a[href]").forEach(tryHideLinkAgainstSticker);

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
