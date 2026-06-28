# Virtual Tour — 360° Showroom

A premium, horizontal, infinite-loop product carousel built with vanilla HTML, CSS, and JavaScript only (no frameworks).

## Run it

Just open `index.html` in a browser, or serve the folder locally:

```
npx serve .
```

## Files

- `index.html` — page structure (header, stage, nav, info panel). No products are hardcoded here.
- `style.css` — all visual design: glass header, perspective carousel, animations, responsive rules.
- `data.js` — **the only file you need to edit to add/remove/change products.** Each entry needs `id`, `name`, `tagline`, `thumbnail`, `video`, `link`, `accent`.
- `app.js` — the carousel engine: builds slots from `data.js`, handles the infinite loop, drag/swipe, mouse-tilt, and center video/image swapping.

## About the product art (important)

The brief referenced a layout screenshot and a local file on your computer (`C:\Users\...\Headphone_rotating_on_transparen...mp4`) as example assets — neither of those files actually came through in the upload, so this build ships with **generated placeholder SVG headphone art** in `assets/products/` instead:

- `*.svg` — static art, used for the side (non-active) thumbnails, standing in for the PNGs the brief asks for.
- `*-anim.svg` — the same art with a built-in gentle rotation + light-sweep loop, used as a stand-in for the transparent alpha-channel video on the active center product.

### Swapping in your real assets

1. Drop your real transparent PNGs and your transparent `.webm`/`.mov` into `assets/products/` (or anywhere you like).
2. In `data.js`, point each product's `thumbnail` at your PNG and `video` at your real video file.
3. In `app.js`, set:
   ```js
   const USE_VIDEO_CENTER = true;
   ```
   This switches the center slot from rendering an `<img>` stand-in to a real
   `<video autoplay loop muted playsinline>` element automatically — no other
   code changes needed.

## Notes on behavior

- Center product floats continuously and tilts subtly toward the mouse.
- Side products are blurred/dimmed slightly and sharpen on hover.
- Click any side product to bring it to center; click the center product to "open" its product page (currently just updates the URL hash — wire `openProductPage()` in `app.js` into real routing if needed).
- Swipe (touch) or click-drag (mouse) on the stage to move through the carousel.
- Arrow keys (`←`/`→`) also navigate; `Enter` opens the active product.
- Responsive: 5 visible on desktop, 3 on tablet, center+2 on mobile, per the brief.
