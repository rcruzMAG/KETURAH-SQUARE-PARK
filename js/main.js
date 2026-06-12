/* Keturah Square Park — interactions
   Parallax media, swaying palm trees, fireflies, scroll reveals,
   animated counters, and nav state. All vanilla, no dependencies. */

(function () {
  "use strict";

  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- animated palm trees ---------------- */
  // Clone the SVG template into every [data-tree] slot; per-slot sway speed
  // comes from the data-sway attribute so the grove never moves in unison.
  const palmTemplate = document.getElementById("palmTemplate");

  function plantTree(slot) {
    const palm = palmTemplate.content.firstElementChild.cloneNode(true);
    palm.style.setProperty("--sway", slot.dataset.sway || "6s");
    slot.appendChild(palm);
  }

  document.querySelectorAll("[data-tree]").forEach(plantTree);

  const grove = document.getElementById("grove");
  if (grove) {
    const speeds = ["7s", "5.6s", "6.6s", "8.2s", "6.1s"];
    speeds.forEach((sway) => {
      const slot = document.createElement("div");
      slot.className = "tree-slot";
      slot.dataset.sway = sway;
      grove.appendChild(slot);
      plantTree(slot);
    });
  }

  /* ---------------- hero fireflies ---------------- */
  const fireflies = document.getElementById("fireflies");
  if (fireflies && !prefersReducedMotion) {
    const COUNT = 18;
    for (let i = 0; i < COUNT; i++) {
      const f = document.createElement("span");
      f.className = "firefly";
      f.style.left = Math.random() * 100 + "%";
      f.style.top = 35 + Math.random() * 60 + "%";
      f.style.setProperty("--dx", (Math.random() * 120 - 60).toFixed(0) + "px");
      f.style.setProperty("--dy", (-40 - Math.random() * 90).toFixed(0) + "px");
      f.style.setProperty("--dur", (8 + Math.random() * 9).toFixed(1) + "s");
      f.style.setProperty("--delay", (Math.random() * 9).toFixed(1) + "s");
      f.style.setProperty("--peak", (0.35 + Math.random() * 0.5).toFixed(2));
      fireflies.appendChild(f);
    }
  }

  /* ---------------- parallax ---------------- */
  // Two flavours:
  //  [data-parallax]        — full-bleed background media (hero, bands, gallery)
  //  [data-parallax-inner]  — image inside a clipped .parallax-window frame
  const parallaxItems = [];

  document.querySelectorAll("[data-parallax]").forEach((wrap) => {
    const img = wrap.querySelector("img");
    if (img) parallaxItems.push({ el: wrap, img, depth: parseFloat(wrap.dataset.parallax) || 0.25 });
  });
  document.querySelectorAll("[data-parallax-inner]").forEach((img) => {
    parallaxItems.push({ el: img.closest(".parallax-window") || img, img, depth: parseFloat(img.dataset.parallaxInner) || 0.15 });
  });

  let ticking = false;

  function updateParallax() {
    ticking = false;
    const vh = window.innerHeight;
    for (const item of parallaxItems) {
      const rect = item.el.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) continue;
      // -1 .. 1 as the element travels through the viewport
      const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      const range = rect.height * item.depth * 0.5;
      item.img.style.transform = "translate3d(0," + (-progress * range).toFixed(1) + "px,0)";
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateParallax);
    }
    updateProgressAndNav();
  }

  /* ---------------- scroll progress + nav state ---------------- */
  const nav = document.getElementById("siteNav");
  const progressBar = document.getElementById("scrollProgressBar");

  function updateProgressAndNav() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    if (progressBar) progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    nav.classList.toggle("solid", y > window.innerHeight * 0.7);
  }

  /* ---------------- mobile menu ---------------- */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  navToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      document.body.classList.remove("menu-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------------- active nav link ---------------- */
  const sectionIds = [...navLinks.querySelectorAll("a")]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h.startsWith("#"))
    .map((h) => h.slice(1));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.querySelectorAll("a").forEach((a) => {
          a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  /* ---------------- reveal on scroll ---------------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------------- animated counters ---------------- */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || "";
    const duration = 1600;
    const start = performance.now();

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(frame);
    }
    if (prefersReducedMotion) {
      el.textContent = prefix + target.toLocaleString("en-US");
    } else {
      requestAnimationFrame(frame);
    }
  }

  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".count").forEach((el) => countObserver.observe(el));

  /* ---------------- boot ---------------- */
  if (!prefersReducedMotion) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateParallax();
  } else {
    window.addEventListener("scroll", updateProgressAndNav, { passive: true });
  }
  updateProgressAndNav();
})();
