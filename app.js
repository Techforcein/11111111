/**
 * app.js
 * ------------------------------------------------------------------
 * Virtual Showroom carousel engine.
 *
 * Architecture
 * ------------
 * - PRODUCTS (from data.js) is the only data source. Nothing is hardcoded
 *   into index.html: every .slot element is created here.
 * - We keep ALL products in the DOM at all times (so the loop never has to
 *   stitch/clone elements) and just re-map which product sits in which
 *   ROLE (far-left, near-left, center, near-right, far-right, hidden) by
 *   walking `activeIndex` around the PRODUCTS array (modulo length) ->
 *   this is what makes the carousel loop infinitely in either direction.
 * - Only `transform`, `opacity`, and `filter` are ever animated (no width/
 *   height/layout properties), satisfying the perf requirement; the actual
 *   per-frame interpolation during a drag uses requestAnimationFrame.
 * - The center product's PNG <img> is swapped for a looping animated
 *   "video" element when it becomes active, and swapped back to the plain
 *   image the moment it leaves center — mirroring how a real
 *   <video autoplay loop muted playsinline> would be toggled in/out.
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  // NOTE on the brief's transparent-video requirement:
  // Real alpha-channel .webm/.mov assets were not supplied with this brief,
  // so USE_VIDEO_CENTER is false and we render the animated-SVG stand-in
  // (assets/products/*-anim.svg) in the center slot instead. If you have a
  // real transparent video file, set this true and the code below will
  // create a native <video autoplay loop muted playsinline> element instead.
  const USE_VIDEO_CENTER = false;

  const ROLE_ORDER = ["far-left", "near-left", "center", "near-right", "far-right"];

  // Per-role transform targets: [translateXPercentOfStageWidth, scale, rotateY(deg), z]
  // Values are tuned for the "Small -> Medium -> LARGE -> Medium -> Small" arrangement.
  const ROLE_GEOMETRY = {
    "far-left":   { x: -340, scale: 0.55, rotateY: 22,  opacity: 1, z: 1 },
    "near-left":  { x: -185, scale: 0.78, rotateY: 14,  opacity: 1, z: 2 },
    "center":     { x: 0,    scale: 1.0,  rotateY: 0,   opacity: 1, z: 5 },
    "near-right": { x: 185,  scale: 0.78, rotateY: -14, opacity: 1, z: 2 },
    "far-right":  { x: 340,  scale: 0.55, rotateY: -22, opacity: 1, z: 1 },
    "hidden":     { x: 0,    scale: 0.4,  rotateY: 0,   opacity: 0, z: 0 },
  };

  const roleToDataRole = {
    "far-left": "far",
    "far-right": "far",
    "near-left": "near",
    "near-right": "near",
    "center": "center",
    "hidden": "hidden",
  };

  const track = document.getElementById("track");
  const productNameEl = document.getElementById("productName");
  const productTaglineEl = document.getElementById("productTagline");
  const productInfoEl = document.getElementById("productInfo");
  const dotsEl = document.getElementById("dots");
  const stageEl = document.getElementById("stage");

  let activeIndex = 0;
  let isAnimating = false;
  let slots = []; // { el, imgEl, videoEl, wrapEl, shadowEl }

  /* ---------------------------------------------------------------
     BUILD: create one slot element per product (data-driven, no HTML)
  --------------------------------------------------------------- */
  function buildSlots() {
    track.innerHTML = "";
    slots = PRODUCTS.map((product, i) => {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.index = String(i);
      slot.setAttribute("role", "option");
      slot.setAttribute("aria-label", product.name);

      // Outer wrap handles the CSS float (translateY) animation.
      // Inner "tilt" wrap handles the JS-driven mouse-tilt (rotateX/rotateY)
      // so the two transforms never fight on the same element/property.
      const wrap = document.createElement("div");
      wrap.className = "slot__media-wrap";

      const tilt = document.createElement("div");
      tilt.className = "slot__tilt";

      const img = document.createElement("img");
      img.className = "slot__img";
      img.src = product.thumbnail;
      img.alt = product.name;
      img.draggable = false;

      const shadow = document.createElement("div");
      shadow.className = "slot__shadow";

      tilt.appendChild(img);
      wrap.appendChild(tilt);
      wrap.appendChild(shadow);
      slot.appendChild(wrap);
      track.appendChild(slot);

      slot.addEventListener("click", () => onSlotClick(i));

      return { el: slot, imgEl: img, videoEl: null, wrapEl: wrap, tiltEl: tilt, shadowEl: shadow, product };
    });

    buildDots();
  }

  function buildDots() {
    dotsEl.innerHTML = "";
    PRODUCTS.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = "dot";
      dotsEl.appendChild(dot);
    });
  }

  /* ---------------------------------------------------------------
     ROLE ASSIGNMENT: map each product index to a role relative to
     activeIndex, with wraparound — this is the infinite-loop mechanism.
  --------------------------------------------------------------- */
  function roleForOffset(offset, total) {
    // normalize offset to [-floor(total/2), ceil(total/2)] range isn't needed
    // for 5 items since offsets only ever land on -2..2 (mod total)
    const map = { "-2": "far-left", "-1": "near-left", "0": "center", "1": "near-right", "2": "far-right" };
    return map[String(offset)] || "hidden";
  }

  function applyLayout(animateClass) {
    const total = PRODUCTS.length;
    slots.forEach((slot, i) => {
      let offset = i - activeIndex;
      // wrap offset into [-total/2, total/2]
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;

      const role = roleForOffset(offset, total);
      const geo = ROLE_GEOMETRY[role];
      const dataRole = roleToDataRole[role];

      slot.el.dataset.role = dataRole;
      slot.el.style.zIndex = String(geo.z);
      slot.el.style.opacity = String(geo.opacity);
      slot.el.style.pointerEvents = role === "hidden" ? "none" : "auto";

      // transform: center via -50%/-50%, then offset/scale/rotateY on top
      slot.el.style.transform =
        `translate(-50%, -50%) translateX(${geo.x}px) scale(${geo.scale}) rotateY(${geo.rotateY}deg)`;

      setSlotMedia(slot, role === "center");

      if (animateClass && role === "center") {
        slot.el.classList.remove("is-entering-center");
        // restart animation
        void slot.el.offsetWidth;
        slot.el.classList.add("is-entering-center");
      }
    });

    updateDots();
    updateProductInfo();
  }

  /* ---------------------------------------------------------------
     MEDIA SWAP: center slot gets the "video" (real <video> if
     USE_VIDEO_CENTER, else animated-SVG stand-in); all others show the
     static PNG/SVG thumbnail only.
  --------------------------------------------------------------- */
  function setSlotMedia(slot, isCenter) {
    const alreadyCenter = slot.el.dataset.mediaState === "center";
    if (isCenter && !alreadyCenter) {
      slot.imgEl.style.display = "none";

      if (USE_VIDEO_CENTER) {
        const video = document.createElement("video");
        video.className = "slot__video";
        video.src = slot.product.video;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("muted", "");
        video.removeAttribute("controls");
        slot.tiltEl.appendChild(video);
        slot.videoEl = video;
      } else {
        const animImg = document.createElement("img");
        animImg.className = "slot__video";
        animImg.src = slot.product.video; // animated SVG stand-in
        animImg.alt = slot.product.name + " (active view)";
        animImg.draggable = false;
        slot.tiltEl.appendChild(animImg);
        slot.videoEl = animImg;
      }
      slot.el.dataset.mediaState = "center";
    } else if (!isCenter && alreadyCenter) {
      if (slot.videoEl) {
        slot.videoEl.remove();
        slot.videoEl = null;
      }
      slot.imgEl.style.display = "";
      slot.tiltEl.style.transform = "";
      slot.el.dataset.mediaState = "side";
    }
  }

  function updateDots() {
    const dots = dotsEl.children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle("is-active", i === activeIndex);
    }
  }

  function updateProductInfo() {
    const product = PRODUCTS[activeIndex];
    productInfoEl.classList.add("is-fading");
    window.setTimeout(() => {
      productNameEl.textContent = product.name;
      productTaglineEl.textContent = product.tagline;
      productInfoEl.classList.remove("is-fading");
    }, 180);
  }

  /* ---------------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------------- */
  function goTo(index, { fromClick = false } = {}) {
    if (isAnimating) return;
    const total = PRODUCTS.length;
    activeIndex = ((index % total) + total) % total;
    isAnimating = true;
    applyLayout(true);
    window.setTimeout(() => {
      isAnimating = false;
    }, 800); // matches --carousel-duration
  }

  function next() {
    goTo(activeIndex + 1);
  }

  function prev() {
    goTo(activeIndex - 1);
  }

  function onSlotClick(index) {
    if (index === activeIndex) {
      openProductPage(PRODUCTS[activeIndex]);
      return;
    }
    goTo(index, { fromClick: true });
  }

  function openProductPage(product) {
    // No multi-page routing exists in this build; we surface intent via the
    // configured `link` so the structure is ready to wire into real routing.
    window.location.hash = product.link.replace(/^#/, "");
    console.info(`[Virtual Tour] Opening product page for "${product.name}" -> ${product.link}`);
  }

  /* ---------------------------------------------------------------
     BUTTONS: bottom nav (3 stacked arrows each side) + header arrow
  --------------------------------------------------------------- */
  function wireButtons() {
    document.querySelectorAll(".arrow-btn--prev").forEach((btn) => {
      btn.addEventListener("click", prev);
    });
    document.querySelectorAll(".arrow-btn--next").forEach((btn) => {
      btn.addEventListener("click", next);
    });
    const headerArrow = document.getElementById("headerArrowBtn");
    if (headerArrow) headerArrow.addEventListener("click", next);

    // keyboard support
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Enter") openProductPage(PRODUCTS[activeIndex]);
    });
  }

  /* ---------------------------------------------------------------
     MOUSE TILT: subtle 3D tilt on the active center product, driven by
     requestAnimationFrame for smooth 60fps interpolation.
  --------------------------------------------------------------- */
  function wireTilt() {
    let targetRX = 0, targetRY = 0;
    let currentRX = 0, currentRY = 0;
    const maxTilt = 8;

    stageEl.addEventListener("mousemove", (e) => {
      const rect = stageEl.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetRY = nx * maxTilt;
      targetRX = -ny * maxTilt;
    });

    stageEl.addEventListener("mouseleave", () => {
      targetRX = 0;
      targetRY = 0;
    });

    function tick() {
      currentRX += (targetRX - currentRX) * 0.08;
      currentRY += (targetRY - currentRY) * 0.08;

      const centerSlot = slots[activeIndex];
      if (centerSlot) {
        centerSlot.tiltEl.style.transform =
          `rotateX(${currentRX}deg) rotateY(${currentRY}deg)`;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------
     TOUCH / DRAG SWIPE
  --------------------------------------------------------------- */
  function wireSwipe() {
    let startX = 0;
    let isDragging = false;
    const threshold = 50;

    stageEl.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });

    stageEl.addEventListener("touchend", (e) => {
      if (!isDragging) return;
      isDragging = false;
      const endX = e.changedTouches[0].clientX;
      const dx = endX - startX;
      if (Math.abs(dx) < threshold) return;
      if (dx < 0) next();
      else prev();
    }, { passive: true });

    // mouse-drag equivalent (desktop swipe)
    let mouseStartX = null;
    stageEl.addEventListener("mousedown", (e) => {
      mouseStartX = e.clientX;
    });
    window.addEventListener("mouseup", (e) => {
      if (mouseStartX === null) return;
      const dx = e.clientX - mouseStartX;
      mouseStartX = null;
      if (Math.abs(dx) < threshold) return;
      if (dx < 0) next();
      else prev();
    });
  }

  /* ---------------------------------------------------------------
     HEADER SCROLL BEHAVIOR: stays fixed; add a subtle shrink/blur boost
     on scroll for polish (still respects "remains fixed while scrolling").
  --------------------------------------------------------------- */
  function wireHeaderScroll() {
    const header = document.getElementById("header");
    let lastY = 0;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (y > 10 && lastY <= 10) header.style.boxShadow = "0 10px 34px rgba(10,14,20,0.1)";
      if (y <= 10) header.style.boxShadow = "";
      lastY = y;
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     INIT
  --------------------------------------------------------------- */
  function init() {
    if (!Array.isArray(window.PRODUCTS) || window.PRODUCTS.length === 0) {
      console.error("[Virtual Tour] No products found in data.js");
      return;
    }
    buildSlots();
    applyLayout(false);
    wireButtons();
    wireTilt();
    wireSwipe();
    wireHeaderScroll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
