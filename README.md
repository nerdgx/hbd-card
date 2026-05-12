# 🎂 Animated Birthday Gift Card — Web App

A premium, cinematic interactive birthday greeting card built with **HTML5 · Tailwind CSS · Vanilla JS · CSS Animations**.

---

## 📁 Folder Structure

```
birthday-card/
├── index.html              ← Main entry point
├── style.css               ← All custom styles, keyframes, CSS vars
├── script.js               ← All interaction, animation & audio logic
└── README.md
```

---

## 🎵 Adding Music

To add a birthday song, you can either:

1. **Host externally** — Update `CFG.audioSrc` in `script.js` line 17 with an external MP3 URL
2. **Use the fallback** — If no audio file is found, the app **automatically falls back** to a synthesised "Happy Birthday" melody via the WebAudio API — so it works even without an audio file.

> **Tip:** Use a royalty-free MP3 from sites like [pixabay.com/music](https://pixabay.com/music/?q=happy+birthday) or [freemusicarchive.org](https://freemusicarchive.org).

---

## ✨ Features

| Feature | Details |
|---|---|
| 3D card flip | CSS `perspective` + `rotateY` transform |
| Starfield background | Canvas-drawn animated stars |
| Confetti burst | Custom canvas particle system |
| Floating balloons | SVG balloons with CSS rise animation |
| Heart particles | Emoji floaters on open & hover |
| Typewriter effect | Character-by-character JS reveal |
| Glow effects | CSS `text-shadow` + `drop-shadow` |
| Audio | HTML5 `<audio>` with WebAudio fallback |
| Mute / unmute | `M` key or on-screen button |
| Click-outside close | Reverse animation sequence |
| Keyboard support | `Enter`/`Space` = open, `Esc` = close |
| Reduced motion | Respects `prefers-reduced-motion` |
| Responsive | Works on mobile (88 vw) and desktop |

---

## 🚀 Running Locally

Open `index.html` directly in any modern browser — no build step needed.

For audio to work properly (browser autoplay policies), serve via a local server:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080`.

---

## ♿ Accessibility

- Card stage has `role="button"`, `tabindex="0"`, `aria-expanded`, `aria-label`
- Keyboard: `Enter`/`Space` open · `Escape` close · `M` toggle mute
- `aria-live` regions for the typewriter message
- Full `prefers-reduced-motion` support

---

## 🎨 Customisation

| What | Where |
|---|---|
| Birthday message | `js/script.js` → `fullMessage` constant |
| "From" name | `index.html` → `.inside-from` element |
| Colour palette | `css/style.css` → `:root` CSS variables |
| Balloon count | `js/script.js` → `CFG.balloonCount` |
| Confetti colours | `js/script.js` → `CFG.confettiColors` |
| Card dimensions | `css/style.css` → `--card-w` variable |
