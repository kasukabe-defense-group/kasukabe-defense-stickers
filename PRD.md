# Meet Stickers — Product Requirements Document

**Status:** Locked — building
**Name:** Kasukabe Defense Stickers
**Type:** Personal / team fun project
**Budget:** $0 (hard constraint)
**Date:** 2026-09-11
**Platform:** Chrome / Chromium desktop only

### Locked decisions (2026-09-11)

- **Name:** Kasukabe Defense Stickers.
- **Packs (renamed 2026-09-12, content-descriptive instead of Shin-chan-themed):**
  `reactions` (13), `praise` (5), `roast` (14). Extension name stays
  "Kasukabe Defense Stickers" — only the pack names changed.
- **Repo:** one repo, **public**, `kasukabe-defense-stickers`, with `/stickers`
  and `/extension`. Hosted via jsDelivr CDN.
- **Sticker files are publicly downloadable** — accepted; "view but not download"
  is not possible on the web.
- **Link fallback: ON** — messages carry the code + the CDN URL; non-extension
  users get a clickable link.
- **Browsers:** Chrome + Edge + Brave now (one codebase). Firefox later. No Safari.
- **Platform:** `meet.google.com`, personal Gmail (no Workspace).
- **No build tools, no backend, no API keys, $0.** User uploads deferred to v2.
- **Shipped:** repo live at github.com/kasukabe-defense-group/kasukabe-defense-stickers
  (moved to a dedicated free GitHub org so the URL doesn't expose a personal
  GitHub username; fresh commit history, no old identity-bearing commits carried
  over), running in CDN mode, release v1.0.3 with a direct-download link +
  in-folder START-HERE.txt for teammates.

---

## 1. Problem

Google Meet's in-call chat is **plain text only**. You cannot attach an image, paste
a photo, or send a GIF. Messages are broadcast by Google's servers as text to every
participant, and Meet's own client renders that text — it does not unfurl links into
thumbnails on personal Gmail accounts. So there is no way, today, to react in a Meet
with a sticker.

## 2. Goal

A Chrome extension that adds a **sticker picker to Meet's in-call chat**. You click a
button next to the chat box, search a shared sticker library, click a sticker, and it
appears as an **inline image/GIF in the chat** for everyone in the call who also has
the extension — in their view and yours. GIFs animate.

## 3. The one hard limit (read this before anything else)

A Meet chat message is only ever a **text string**. The only thing that turns that
string into pixels on someone else's screen is **Google's Meet code**, which no
extension can touch. Therefore:

```
You pick a sticker
   -> extension writes a short code into the chat box:  :stkr:memes/jhakaas:
   -> sends it as a normal text message
   -> Google broadcasts that text to everyone
        - participant WITH the extension:  code is swapped for the real image  ✅
        - participant WITHOUT the extension: sees the text ":stkr:memes/jhakaas:"
          (or, if link-fallback is enabled, a clickable link to the image)
```

**There is no workaround for an inline image to non-extension users on personal
Gmail.** This was researched thoroughly:

- Every comparable extension (StampIt, "Google Meet Image Viewer", Google-Meet-
  Formatting) requires the extension on **both** sides.
- Meet *did* get native image sharing in Nov 2025 — but it is **paid Google
  Workspace Business/Enterprise only, same-domain only**. Not available on personal
  Gmail.
- Camera-feed overlay ("sticker on your video tile") reaches non-extension viewers,
  but the **sender** still needs it, it shows only on that person's tile (missable,
  layout-dependent), and it is a bigger, more fragile build. **Rejected.**

**Conclusion:** everyone who wants to see stickers installs the extension once. The
optional link-fallback softens it for anyone who hasn't.

## 4. Users

You and your team. Assumptions:
- Everyone installs the extension once (unpacked / private — no store needed).
- Everyone on **personal Gmail**, **Chrome/Chromium desktop**, meeting at
  **meet.google.com**.
- Starting sticker set: ~30–40 stickers you already have, possibly scaling to a few
  hundred later.

## 5. Scope

### In scope (v1)
- "+" / sticker button injected next to the Meet chat input.
- Picker tray: search bar, pack sections, thumbnail grid, recently-used.
- Sticker library hosted in a GitHub repo, served via jsDelivr CDN, cached locally.
- Send: insert the sticker code into chat and send.
- Receive: swap codes for inline images in everyone's messages; GIF animation;
  fallback for unknown/broken stickers.
- Offline cache of the library index + images.
- Small popup: on/off toggle, "reload library", link to the library repo.

### Out of scope (v1) — deferred or rejected
- **User uploads / custom stickers** — deferred to v2. v1 ships a "can't find one?
  → how to add to the library" note instead.
- **Inline images for non-extension users** — impossible (see §3).
- **Camera-feed / video overlay stickers** — rejected.
- **Mobile, Safari, Firefox** — Chrome/Chromium desktop only.
- **Chrome Web Store publishing** — optional, later; not needed to use it.
- **Any backend, database, server, or paid service.**

## 6. User experience

### 6.1 The button
A small sticker icon injected next to the chat message input, shown only when the
chat panel is open. If the extension can't read Meet's layout (e.g. Google changed
the HTML), the button simply does not appear — Meet is never broken or blocked.

### 6.2 The picker tray
Opens above the chat input, in an isolated container (Shadow DOM) so Meet's styles
and ours don't collide. Dark-mode aware.
- **Search bar** at the top — matches sticker `name` + `tags` (see §7.4).
- **Pack sections / tabs** — Reactions, Memes, Bollywood, etc.
- **Thumbnail grid** — lazy-loaded; hover shows the name; GIFs preview on hover.
- **Recently used** row.
- Click a sticker → inserted into chat + sent → tray closes.
- "Can't find one? → How to add a sticker" link (v1 = doc; v2 = real upload).

### 6.3 In the chat
The sticker renders inline at ~140 px where the message appears, for every
participant with the extension, in your view and theirs. GIFs animate. A small
caption ("Jhakaas") can show on hover.

## 7. Sticker library

### 7.1 Location & hosting
One GitHub repo. Folder layout:

```
/stickers
  index.json
  packs/
    reactions/   ok.gif   clap.gif   ...
    memes/       jhakaas.gif   idhar-dard.png   ...
    bollywood/   ...
```

Served to the extension via **jsDelivr** (free CDN, no account, fast globally):

```
https://cdn.jsdelivr.net/gh/<user>/<repo>@main/stickers/packs/memes/jhakaas.gif
```

The extension fetches `index.json` once, caches it, and lazy-loads + caches images.

### 7.2 `index.json` format

```json
{
  "version": 3,
  "updated": "2026-09-11",
  "packs": [
    { "id": "reactions", "title": "Reactions", "order": 1 },
    { "id": "memes",     "title": "Memes",     "order": 2 },
    { "id": "bollywood", "title": "Bollywood", "order": 3 }
  ],
  "stickers": [
    {
      "id": "jhakaas",
      "pack": "memes",
      "name": "Jhakaas",
      "file": "packs/memes/jhakaas.gif",
      "type": "gif",
      "tags": ["anil kapoor", "jhakaas", "awesome", "great", "nice",
               "approve", "bollywood", "thumbs up"],
      "added": "2026-09-11"
    },
    {
      "id": "idhar-dard",
      "pack": "memes",
      "name": "Idhar Dard Hota Hai",
      "file": "packs/memes/idhar-dard.png",
      "type": "png",
      "tags": ["modi", "pain", "it hurts", "dard", "sad", "ouch", "hindi"],
      "added": "2026-09-11"
    }
  ]
}
```

### 7.3 Field reference

| Field   | Meaning                                   | Rules |
|---------|-------------------------------------------|-------|
| `id`    | unique, permanent id; goes in the chat code | lowercase `a-z 0-9 -`; never rename or reuse |
| `pack`  | which group it appears under              | must match a `packs[].id` |
| `name`  | shown on hover / "sent a sticker: X"      | short, human-readable |
| `file`  | path under `/stickers`                    | real extension: `.gif` / `.png` / `.webp` |
| `type`  | `gif` \| `png` \| `webp`                  | drives whether it's treated as animated |
| `tags`  | search keywords                          | **the important field — see §7.4** |
| `added` | ISO date                                 | enables a "New" sort |

### 7.4 Tag guidance (so search actually works)

Give each sticker **5–12 tags** across these angles:

- **Who / what is in it:** `modi`, `anil kapoor`, `doge`, `baba`
- **The line / caption:** `jhakaas`, `idhar dard hota hai`, `chala jaa`
- **The meaning / when you'd send it:** `awesome`, `approve`, `pain`, `get lost`,
  `heart touching`, `sarcastic`
- **Mood:** `funny`, `angry`, `sad`, `celebrate`
- **Language:** `hindi`, `english`, `desi`
- **Synonyms:** `great` / `nice` / `superb` all pointing at "jhakaas"

Lowercase, spaces allowed, no `#`. More synonyms = found faster.

### 7.5 The chat marker code

Format: `:stkr:<pack>/<id>:` — e.g. `:stkr:memes/jhakaas:`
- Distinctive delimiters, unlikely to collide with normal chat text.
- Matched by a strict regex on the receive side; only exact matches are swapped.

**Open decision A — link fallback:** optionally append the CDN URL so non-extension
users get a clickable image:
`:stkr:memes/jhakaas: https://cdn.jsdelivr.net/gh/.../jhakaas.gif`
Extension users see only the swapped image (the link is hidden on swap).
*Recommendation: ON.* Small extra cost, meaningfully better for mixed calls.

## 8. Architecture

### 8.1 Components

- **Sticker repo** — images + `index.json`. Not code. Editable by non-developers.
- **Extension** — Chrome MV3, plain JavaScript, **no build step**:
  - `manifest.json`
  - `content/` — injected on `https://meet.google.com/*`, in this order:
    - `marker.js`   — encode/decode the `:stkr:...:` code
    - `library.js`  — fetch + cache `index.json` and images from the CDN
    - `meetDom.js`  — every Meet selector + resilient (re)acquisition
    - `sender.js`   — put the code into Meet's input and click send
    - `picker.js`   — the button + tray UI (Shadow DOM)
    - `replacer.js` — MutationObserver: swap codes → `<img>` in all messages
    - `index.js`    — wire it together; start/stop with the chat panel
    - `content.css`
  - `popup.html` / `popup.js` — on/off, "reload library", repo link
  - `assets/` — icons
- **No server. No database. No backend. No API keys.**

### 8.2 Storage (all local, all free)

- `chrome.storage.local` — settings, recently-used list, cached `index.json`.
- Cache Storage / IndexedDB — cached sticker images for offline + speed.

### 8.3 Data flow

```
Meet page
  -> meetDom finds the chat panel + input + message list
  -> picker shows the button; user searches (library, from cache)
  -> user clicks a sticker
  -> sender inserts marker.encode(pack,id) into Meet's input, clicks send
  -> Meet broadcasts the text to all participants
  -> each client's replacer sees the marker, swaps it for <img> (CDN/cache)
```

### 8.4 No dependencies / no build — how

MV3 content scripts can't use `import`, so the `content/*.js` files are listed
individually in the manifest; Chrome injects them into one shared scope in order.
Each file is an IIFE that hangs its exports on one global (`window.__MS ||= {}`).
Edit a file, hit "reload" on the extensions page — done. No Node, no npm, no
bundler, no framework.

## 9. Dependencies — complete list

### Runtime (needed for the extension to work)

| Dependency | Why | Cost | Notes |
|---|---|---|---|
| Chrome / Chromium desktop (Edge, Brave) | runs the extension | $0 | Manifest V3 |
| Internet to `cdn.jsdelivr.net` | fetch sticker index + images | $0 | cached after first load; brief offline is fine |
| GitHub.com | hosts the sticker repo | $0 | only the **maintainer** needs an account; users never touch GitHub |

### Build / development

| Dependency | Cost |
|---|---|
| **None** — no Node, npm, bundler, or framework. Plain files, edit + reload. | $0 |

### Optional / later (v2 uploads only)

| Dependency | Why | Cost | Notes |
|---|---|---|---|
| catbox.moe or 0x0.st | free anonymous host for user-uploaded stickers | $0, no account, no key | files may be rate-limited or removed over time; not for anything permanent |

### Explicitly NOT used

No paid APIs. No AI / LLM calls. No analytics. No tracking. No domain name. No
hosting bill. No Chrome Web Store fee (unless you choose to publish: one-time $5).

## 10. Cost & consumption

- **Money: $0** — end to end, forever, for private team use.
- **AI tokens: 0** — the extension contains no AI and calls no LLM or metered API at
  runtime.
- **Only charge that could ever exist:** the optional one-time **$5** Chrome Web
  Store developer registration — only if you decide to list it publicly. Sharing it
  privately with your team (load unpacked, or a `.zip`) is free.
- **Rate limits (not money):** jsDelivr is generous and built for this. Free upload
  hosts (v2) have per-hour limits. Keep the GitHub repo under ~1 GB.

## 11. Risks / things to take care of

| # | Risk | Mitigation |
|---|---|---|
| 1 | Meet's HTML is obfuscated and changes without notice | All selectors isolated in `meetDom.js`; structural / `aria` / `role` heuristics; on failure the button just doesn't render and Meet keeps working |
| 2 | Inserting text + triggering send in Meet's framework-controlled input is finicky | Layered approach: native value setter + `input`/`beforeinput` events, fallback to synthetic paste; click the real send button. **Budget iteration time here — this is the fragile part.** |
| 3 | Meet removes off-screen chat messages then re-adds them (virtualization) | Observer re-scans on re-add; processed nodes tracked in a WeakSet |
| 4 | React re-render wipes our injected `<img>` | Idempotent swap keyed on a marker attribute; re-apply on mutation |
| 5 | Marker code collides with real chat text, or breaks when quoted | Distinctive delimiters; strict anchored regex; only swap exact matches |
| 6 | CDN unreachable or a sticker 404s | Cache index + images locally; per-sticker fallback to the code text or a "broken" icon |
| 7 | jsDelivr caches `@main` for hours → newly added stickers appear late | Accept the delay, or use release tags (`@v3`) and bump the version on update |
| 8 | Many GIFs on screen at once = lag | Cap display size; lazy-load; limit concurrent animations |
| 9 | Public repo → sticker image URLs are publicly reachable | Fine for memes; nothing sensitive goes in the repo |
| 10 | Non-extension teammates see codes / links, not images | Documented; everyone should install; link-fallback softens it |
| 11 | Someone joins from the Meet mobile app or Safari | Not supported; they see plain text. Nothing we can do. |

## 12. Build plan (phases)

- **P0 — Library.** Create the repo, add your 30–40 stickers, write `index.json`
  with good tags, verify the jsDelivr URLs load in a browser.
- **P1 — Skeleton.** `manifest.json` + a content script that finds the Meet chat and
  injects a **visible button** that survives panel open/close and page reloads. No
  behavior yet.
- **P2 — Picker.** Fetch + cache `index.json`; render search + pack sections +
  thumbnail grid + recently-used.
- **P3 — Send.** Click → insert `:stkr:...:` → send. Iterate until reliable across
  reloads and rejoins.
- **P4 — Receive.** MutationObserver swaps codes → images in your and others'
  messages; GIF support; unknown-sticker fallback; optional link-fallback.
- **P5 — Polish.** Offline cache, error states, settings (sticker size, link-
  fallback toggle), keyboard navigation, dark mode, "reload library" button.
- **P6 — Team test.** Real Meet: 2+ profiles with the extension + 1 without. Check
  both views, scrolling / virtualization, reload mid-call.
- **P7 — Later (v2).** In-extension uploads: local-only first, then an optional
  "share to team" push to a free host.

## 13. Open questions & assumptions to confirm

### Assumptions — all confirmed 2026-09-11

1. Maintainer has a **GitHub account**; repo lives there. ✅
2. Team is on **Chrome / Chromium desktop** (Chrome, Edge, Brave). ✅
3. Meetings are at **meet.google.com**. ✅
4. Everyone on **personal Gmail**. ✅
5. Sticker repo is **public**; images are downloadable — accepted. ✅
6. Scale: tens to a few hundred stickers. ✅
7. Picker lives **in the in-call chat**. ✅
8. Non-extension users seeing a code + link is acceptable. ✅

### Still needed to start P0

- **Maintainer's GitHub username** — used only in one config constant
  (`cdn.jsdelivr.net/gh/<username>/kasukabe-defense-stickers`). Placeholder until
  provided.
- **The sticker image files** — dropped into `stickers-source/` in the project,
  or the pipeline is scaffolded with placeholders and real files swapped in later.

## 14. Verification (how we'll know it works)

1. Load the extension unpacked in two Chrome profiles.
2. Start a Meet in profile A; join from profile B (both have the extension).
3. Send a sticker from A → it appears as an inline image in B's chat **and** in A's
   own chat view. Send a GIF → it animates on both.
4. Join from a third profile **without** the extension → it sees the code text (or a
   clickable link if fallback is on), and Meet chat still works normally with no
   console errors from us.
5. Scroll the chat up and down (force virtualization), send 30+ messages → earlier
   stickers still render.
6. Reload mid-meeting → the button and the swapper re-attach.
7. Break a selector in `meetDom.js` on purpose → the button just doesn't appear;
   Meet is untouched.
