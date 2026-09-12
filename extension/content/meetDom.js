/* meetDom.js - everything that reaches into Google Meet's DOM.
 * Meet's class names are obfuscated and change over time, so this file uses
 * structural / aria / role heuristics and logs what it finds. If Meet changes
 * and something breaks, THIS is the file to fix.
 */
(() => {
  const NS = (window.__KDS = window.__KDS || {});

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  }

  // --- the chat message composer ------------------------------------------------
  function findInput() {
    const cands = [
      ...document.querySelectorAll('textarea[aria-label]'),
      ...document.querySelectorAll('div[contenteditable="true"][role="textbox"]'),
      ...document.querySelectorAll('textarea'),
      ...document.querySelectorAll('div[contenteditable="true"]'),
    ];
    // pass 1: something that clearly looks like a chat composer
    for (const el of cands) {
      if (!isVisible(el)) continue;
      const label = (el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").toLowerCase();
      if (/message|chat|send|everyone|type|संदेश|मैसेज/.test(label)) return el;
    }
    // pass 2: first visible textarea anywhere (Meet chat is a bare textarea in some builds)
    for (const el of cands) if (isVisible(el)) return el;
    return null;
  }

  function findSendButton(input) {
    if (!input) return null;
    let node = input;
    for (let i = 0; i < 6 && node; i++) {
      node = node.parentElement;
      if (!node) break;
      const btns = [...node.querySelectorAll('button, [role="button"]')].filter(isVisible);
      const named = btns.find((b) =>
        /send|भेज/i.test((b.getAttribute("aria-label") || "") + " " + (b.getAttribute("data-tooltip") || "") + " " + b.textContent)
      );
      if (named) return named;
      if (btns.length && i >= 2) return btns[btns.length - 1];
    }
    return null;
  }

  // --- the message log --------------------------------------------------------
  function findMessageList(input) {
    const live = [...document.querySelectorAll('div[aria-live="polite"], div[role="log"]')].filter(isVisible);
    if (live.length) return live.sort((a, b) => b.clientHeight - a.clientHeight)[0];

    if (input) {
      let panel = input;
      for (let i = 0; i < 10 && panel.parentElement; i++) panel = panel.parentElement;
      const scrollers = [...panel.querySelectorAll("div")].filter(
        (d) => isVisible(d) && d.scrollHeight > d.clientHeight + 24 && d.clientHeight > 80
      );
      if (scrollers.length) return scrollers.sort((a, b) => b.clientHeight - a.clientHeight)[0];
    }
    return null;
  }

  function getContext() {
    const input = findInput();
    if (!input) return null;
    return {
      input,
      sendButton: findSendButton(input),
      messageList: findMessageList(input),
    };
  }

  // --- open/close watcher ---------------------------------------------------------
  function watch({ onReady, onGone }) {
    let ready = false;
    let last = null;
    let debounce = null;
    const tick = () => {
      const ctx = getContext();
      const open = !!(ctx && ctx.input);
      if (open && (!ready || ctx.input !== last)) {
        ready = true; last = ctx.input;
        NS.log("chat composer found", {
          input: ctx.input.tagName,
          label: ctx.input.getAttribute("aria-label"),
          sendButton: !!ctx.sendButton,
          messageList: !!ctx.messageList,
        });
        onReady && onReady(ctx);
      } else if (!open && ready) {
        ready = false; last = null;
        NS.log("chat composer gone");
        onGone && onGone();
      }
    };
    const mo = new MutationObserver(() => {
      if (debounce) return;
      debounce = setTimeout(() => { debounce = null; tick(); }, 600);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    const iv = setInterval(tick, 2000);
    tick();
    return () => { mo.disconnect(); clearInterval(iv); if (debounce) clearTimeout(debounce); };
  }

  NS.meetDom = { getContext, watch, findInput, findSendButton, findMessageList, isVisible };
})();
