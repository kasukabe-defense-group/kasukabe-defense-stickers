/* marker.js - encode/decode the chat code that carries a sticker
 * Format:  :stkr:<pack>/<id>:
 * Example: :stkr:reactions/yes:
 */
(() => {
  const NS = (window.__KDS = window.__KDS || {});
  const PREFIX = ":stkr:";
  const PATTERN = ":stkr:([a-z0-9_-]+)\\/([a-z0-9_-]+):";

  NS.marker = {
    PREFIX,
    RE: () => new RegExp(PATTERN, "gi"),

    encode(pack, id) {
      return `${PREFIX}${pack}/${id}:`;
    },

    hasMarker(text) {
      return !!text && new RegExp(PATTERN, "i").test(text);
    },

    findAll(text) {
      const out = [];
      if (!text) return out;
      const re = new RegExp(PATTERN, "gi");
      let m;
      while ((m = re.exec(text))) {
        out.push({
          raw: m[0],
          pack: m[1].toLowerCase(),
          id: m[2].toLowerCase(),
          index: m.index,
          length: m[0].length,
        });
      }
      return out;
    },
  };
})();
