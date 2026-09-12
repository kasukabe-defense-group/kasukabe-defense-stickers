/* index.js - wire the pieces together. */
(() => {
  const NS = (window.__KDS = window.__KDS || {});
  NS.log("loaded on", location.href);

  NS.library.load().catch(() => {});

  // Body-wide replacer from the start, so incoming stickers render even if we
  // never manage to pin down the exact message-list element.
  NS.replacer.start({ messageList: null });

  NS.meetDom.watch({
    onReady: (ctx) => {
      NS.picker.mount(ctx);
      if (ctx.messageList) NS.replacer.start(ctx); // narrow the observer if we found the log
    },
    onGone: () => {
      NS.picker.unmount();
      NS.replacer.start({ messageList: null }); // fall back to body-wide
    },
  });

  // expose a tiny manual hook for debugging from the console
  NS.debugSend = (pack, id) => NS.sender.send(NS.marker.encode(pack, id));
})();
