/**
 * data.js
 * ------------------------------------------------------------------
 * Single source of truth for every product in the showroom.
 *
 * To add a new product: drop a new object into PRODUCTS below.
 * Nothing else in app.js or index.html needs to change — the carousel,
 * navigation, and product page are all generated from this array.
 *
 * Fields:
 *   id        unique slug, used as a DOM/data key
 *   name      display name shown under the center product
 *   tagline   one-line subtitle shown under the name
 *   thumbnail path to the static PNG/SVG used for side (non-active) slots
 *   video     path to the transparent-background video (.webm/.mov) used
 *             ONLY when this product is in the active center slot.
 *             NOTE: real alpha-channel video assets were not provided with
 *             this brief, so this build ships an animated-SVG stand-in
 *             (see assets/products/*-anim.svg). Swap `video` to point at a
 *             real transparent .webm and flip USE_VIDEO_CENTER to true in
 *             app.js to use actual <video> playback instead.
 *   link      destination for the product detail page (center click)
 *   accent    a hex color used for this product's glow/UI accents
 * ------------------------------------------------------------------
 */

const PRODUCTS = [
  {
    id: "aurora",
    name: "Aurora One",
    tagline: "Click to Explore",
    thumbnail: "assets/products/aurora.svg",
    video: "assets/products/aurora-anim.svg",
    link: "#/product/aurora",
    accent: "#2D7FF9",
  },
  {
    id: "ember",
    name: "Ember Drive",
    tagline: "Click to Explore",
    thumbnail: "assets/products/ember.svg",
    video: "assets/products/ember-anim.svg",
    link: "#/product/ember",
    accent: "#FF6B35",
  },
  {
    id: "glacier",
    name: "Glacier Air",
    tagline: "Click to Explore",
    thumbnail: "assets/products/glacier.svg",
    video: "assets/products/glacier-anim.svg",
    link: "#/product/glacier",
    accent: "#2D7FF9",
  },
  {
    id: "obsidian",
    name: "Obsidian Pro",
    tagline: "Click to Explore",
    thumbnail: "assets/products/obsidian.svg",
    video: "assets/products/obsidian-anim.svg",
    link: "#/product/obsidian",
    accent: "#39FF8E",
  },
  {
    id: "rosegold",
    name: "Rosegold Muse",
    tagline: "Click to Explore",
    thumbnail: "assets/products/rosegold.svg",
    video: "assets/products/rosegold-anim.svg",
    link: "#/product/rosegold",
    accent: "#F4C9C0",
  },
];

// Exposed for app.js (works for plain <script> include, no module bundler needed)
window.PRODUCTS = PRODUCTS;
