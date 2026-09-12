/* sender.js - put the sticker code into Meet's chat box and send it.
 * This is the most fragile part of the extension (Meet controls that input).
 * Strategy: native value setter + input events, then click the real Send button,
 * falling back to synthesising Enter.
 */
(() => {
  const NS = (window.__KDS = window.__KDS || {});

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  }

  function fillTextarea(el, text) {
    el.focus();
    const cur = el.value || "";
    setNativeValue(el, cur ? cur.replace(/\s*$/, "") + " " + text : text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    try {
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
    } catch (e) {}
  }

  function fillContentEditable(el, text) {
    el.focus();
    const sel = window.getSelection();
    sel.selectAllChildren(el);
    sel.collapseToEnd();
    const pre = el.textContent ? " " : "";
    let ok = false;
    try { ok = document.execCommand("insertText", false, pre + text); } catch (e) {}
    if (!ok) el.textContent = (el.textContent || "") + pre + text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
  }

  function pressEnter(el) {
    for (const type of ["keydown", "keypress", "keyup"]) {
      el.dispatchEvent(new KeyboardEvent(type, {
        key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true,
      }));
    }
  }

  async function send(text, ctx) {
    ctx = ctx || NS.meetDom.getContext();
    if (!ctx || !ctx.input) { NS.warn("send: no chat input found"); return false; }
    const el = ctx.input;

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") fillTextarea(el, text);
    else fillContentEditable(el, text);

    await new Promise((r) => setTimeout(r, 80));

    const btn = ctx.sendButton || NS.meetDom.findSendButton(el);
    const disabled = btn && (btn.disabled || btn.getAttribute("aria-disabled") === "true");
    if (btn && !disabled) {
      btn.click();
      NS.log("sent (button):", text);
      return true;
    }
    pressEnter(el);
    NS.log("sent (Enter):", text);
    return true;
  }

  NS.sender = { send };
})();
