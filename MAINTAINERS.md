# Maintaining this repo

This doc is for whoever maintains the extension and its sticker library. If
you just want to install and use it, see [README.md](README.md) instead.

## Repo layout

```
extension/               <- the browser extension (load this folder unpacked)
  manifest.json
  config.js              <- the one file you edit: GitHub username, options
  content/               <- injected into meet.google.com
    marker.js   library.js   meetDom.js   sender.js   replacer.js   picker.js   index.js
    content.css
  popup/                 <- toolbar popup (status + reload)
  stickers/             <- the sticker library (also served via jsDelivr)
    index.json
    packs/<pack>/<id>.<ext>
stickers-source/          <- drop your original sticker files here; not shipped
s.html                    <- landing page for the link-fallback (served via GitHub Pages)
.nojekyll                 <- tells GitHub Pages to serve files as-is, no processing
```

## GitHub Pages (one-time setup, for the fallback link's landing page)

The link-fallback shown to non-extension users points at `s.html`, hosted for
free on the same repo via GitHub Pages. This needs enabling once, manually
(requires repo admin access, not something a git push can do):

1. `github.com/kasukabe-defense-group/kasukabe-defense-stickers/settings/pages`
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Save

After a minute or two it's live at
`https://kasukabe-defense-group.github.io/kasukabe-defense-stickers/s.html`.

## Local mode vs CDN mode

This repo currently runs in **CDN mode** — `extension/config.js` has `GH_USER`
set, so every install fetches the sticker list + images live from this repo via
jsDelivr. Adding a sticker means editing this repo and pushing - no re-download
needed for anyone already using it. Code changes (not sticker changes) still
need a new release, since CDN mode only covers the sticker *data*, not the
extension's logic.

| | Local mode | CDN mode (current) |
|---|---|---|
| Stickers come from | the `extension/stickers/` folder shipped in the extension | this GitHub repo via jsDelivr |
| Add a sticker | edit the folder + re-share the extension | commit to the repo, everyone gets it automatically |
| Needs internet | no | yes (cached for 6h after first load) |
| Link fallback for non-extension users | off (would leak a `chrome-extension://` URL) | on |

## Test it properly

1. Load the extension in **two** Chrome profiles (or Chrome + Edge).
2. Start a Meet in profile A, join from profile B. Both open the chat.
3. Send a sticker from A → it should appear as an image in B's chat **and** in A's
   own chat view.
4. Join from a **third** profile with **no** extension → it should see the code
   text `:stkr:reactions/yes:` and Meet should work normally.

## How a sticker travels

The chat message is just text: `:stkr:<pack>/<id>:` (plus a fallback link in CDN
mode). Every client that has the extension swaps that code for the real image.
That's the whole trick - and the reason both sides need the extension. There's no
way around that on personal Gmail: Meet chat only ever carries text, and only code
running in your own browser can turn that text back into a picture.

## Adding stickers to the library

1. Put the image in `extension/stickers/packs/<pack>/<id>.<ext>`
   (`svg`, `png`, `gif`, or `webp`; keep it ~256 px, GIFs under ~3 MB).
2. Add an entry to `extension/stickers/index.json`:
   ```json
   {
     "id": "kebab-case-id",
     "pack": "reactions",
     "name": "Human Name",
     "file": "packs/reactions/kebab-case-id.png",
     "type": "png",
     "tags": ["who is in it", "the caption", "what it means", "mood", "hindi", "synonyms"],
     "added": "2026-09-11"
   }
   ```
3. Local mode: re-share the extension. CDN mode: `git push` (allow up to a few
   hours for jsDelivr's cache, or force a refresh via
   `https://purge.jsdelivr.net/gh/<user>/<repo>@main/<path>`).

Tag well - 5 to 12 keywords - that's what the search box matches.

## Shipping a CODE change (not just a sticker)

Sticker data auto-updates for everyone already using the extension. Actual code
changes (picker, sender, replacer, meetDom, manifest) do **not** - Chrome has no
update mechanism for unpacked extensions, so everyone has to remove the old one
and load a fresh download. Checklist for every code release:

1. Bump `"version"` in `extension/manifest.json`.
2. Bump `"latest"` (and `"notes"`) in `extension/version.json` to match - **this
   is what makes the in-tray "a new version is out" banner appear** for people
   still on the old code. Forgetting this step means nobody gets told.
3. Commit, push, tag, build the release zip, publish it, update the README
   download link.

## Not done yet (v2)

- In-extension "upload your own sticker" (local first, then optional share).
- Firefox package.
- Real PNG toolbar icons.
