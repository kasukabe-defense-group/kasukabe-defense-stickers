# Kasukabe Defense Stickers

A Chrome/Edge/Brave extension that adds a sticker picker to **Google Meet's in-call
chat**. Pick a sticker → it posts to chat → everyone who also has the extension sees
it as an inline image. People without the extension see a short code and a link to
a small explainer page showing the sticker plus how to get the extension - not the
bare image.

---

## Download

**[⬇ Download the extension](https://github.com/kasukabe-defense-group/kasukabe-defense-stickers/releases/download/v1.0.8/kasukabe-defense-stickers-v1.0.8.zip)**
— click it, unzip, then follow Install below.

Don't use GitHub's own "Source code (zip)" link if you see it on the Releases
page — that one bundles the whole repo (docs included) with the extension nested
a folder deeper. The link above is pre-packaged to unzip straight to a ready
`Load unpacked` folder.

## Install (Chrome / Edge / Brave)

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → select the unzipped folder.
4. Open `https://meet.google.com`, start/join a meeting, open the chat panel.
5. Click the **🩹** button next to the message box.

**Prefer pictures over these bullet points?** Open `START-HERE.html` inside the
unzipped folder — a friendlier, visual version of the same steps.

Keep the unzipped folder where it is after installing — your browser keeps
reading the extension straight from it. You won't need to repeat this unless
you delete the folder.

## If the button doesn't appear or stickers don't send

Refresh the Meet tab and make sure the chat panel is actually open. Still stuck?
Open the sticker tray, press F12 for DevTools, click the Console tab, look for
lines starting with `[KDS]`, and share what you see.

---

Maintaining or contributing to this repo? See [MAINTAINERS.md](MAINTAINERS.md).
