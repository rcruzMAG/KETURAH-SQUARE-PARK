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

  /* ---------------- interactive masterplan ---------------- */
  const ZONES = {
    "hub-north": {
      kicker: "Food Truck Court · North Loop",
      title: "Food Hub — Food Trucks",
      desc: "Clustered casual F&B on the arrival loop — the park's variety and footfall engine. Linear bars form braided breeze-streets wrapped in planting and lantern light, a shaded first touchpoint where parking meets the park.",
      features: [
        "Flexible tenancies with shared garden seating",
        "Consolidated services and easy servicing access",
        "Fully shaded grab-and-go at the car-park interface",
      ],
      images: [
        { src: "assets/img/food-hub-parking.jpg", alt: "Food truck court with landscaped islands and warm evening lighting" },
        { src: "assets/img/arrival-dusk.jpg", alt: "Aerial dusk view of the arrival loop and parking" },
      ],
    },
    kiosk: {
      kicker: "Kiosk Promenade · Green Fingers",
      title: "Food Hub — Kiosks & Pavilions",
      desc: "Braided breeze-streets of kiosks and pavilions along palm-lined lawns on the green fingers — everyday park life with skyline outlook, generous lawns and welcoming edges for strolls.",
      features: [
        "Linear kiosk bars oriented to the prevailing breeze",
        "Shared seating set in gardens and lawn edges",
        "Flexible, low-committed tenancies for variety",
      ],
      images: [
        { src: "assets/img/food-hub-kiosk.jpg", alt: "Palm-lined kiosk promenade with lawns and outdoor seating" },
        { src: "assets/img/green-fingers-aerial.jpg", alt: "Aerial view across the green finger promenades" },
      ],
    },
    play: {
      kicker: "Family Heart · Civic Core",
      title: "Kid's Play Zone",
      desc: "The family draw and dwell-time driver at the centre of the plan — central, shaded, safe, and overlooked by café and restaurant seating so every swing and slide stays in easy sight.",
      features: [
        "Age-graded adventure play under sail canopies",
        "Soft-fall surfacing and accessible routes",
        "Toilets and nursing rooms within a short walk",
      ],
      images: [
        { src: "assets/img/kids-play.jpg", alt: "Children climbing timber play structures under sail canopies" },
      ],
    },
    restaurant: {
      kicker: "Destination Dining · Plaza",
      title: "Restaurant Zone",
      desc: "Premium destination dining under sculptural tensile canopies — the park's anchor. Best skyline orientation, shaded west exposure, indoor plus shaded-terrace dining with full back-of-house service.",
      features: [
        "Skyline-facing terraces shaded for evening dining",
        "Sculptural canopies marking the civic heart",
        "Full back-of-house and screened servicing",
      ],
      images: [
        { src: "assets/img/restaurant-zone.jpg", alt: "Bustling restaurant terraces under tensile canopies at golden hour" },
        { src: "assets/img/restaurant-aerial.jpg", alt: "Aerial dusk view over the restaurant plaza" },
        { src: "assets/img/canopy-aerial.jpg", alt: "Aerial view of the sculptural canopy structures" },
      ],
    },
    "hub-south": {
      kicker: "Food Truck Court · South Loop",
      title: "Food Hub — Food Trucks",
      desc: "The southern food-truck court mirrors the northern one — a convenient, fully shaded stop on the quiet community edge, with low-scale built form buffering the villa neighbours.",
      features: [
        "First-and-last touchpoint on the southern approach",
        "Landscape buffers toward the villa edge",
        "Shared seating shaded through the afternoon",
      ],
      images: [
        { src: "assets/img/food-hub-parking.jpg", alt: "Food truck court with landscaped islands and warm evening lighting" },
        { src: "assets/img/arrival-dusk.jpg", alt: "Aerial dusk view of the arrival loop and parking" },
      ],
    },
    parking: {
      kicker: "Arrival & Access",
      title: "Parking",
      desc: "Intuitive entry with ample parking and convenient drop-off — the arrival sequence is shaded end-to-end, with visitor and service flows kept separate for safety and efficiency.",
      features: [
        "Shaded walk from the first bay to the park",
        "Separate visitor and back-of-house routes",
        "Drop-off, taxi and ride-hailing pick-up points",
      ],
      images: [
        { src: "assets/img/arrival-dusk.jpg", alt: "Aerial dusk view of the parking and arrival loop" },
      ],
    },
  };

  const planStage = document.getElementById("planStage");
  const zoneModal = document.getElementById("zoneModal");

  if (planStage && zoneModal) {
    // tags pop from their map locations once the plan scrolls into view
    new IntersectionObserver(
      (entries, obs) => {
        if (entries[0].isIntersecting) {
          planStage.classList.add("tags-in");
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    ).observe(planStage);

    const zoneImg = document.getElementById("zoneImg");
    const zoneThumbs = document.getElementById("zoneThumbs");
    const zoneKicker = document.getElementById("zoneKicker");
    const zoneTitle = document.getElementById("zoneTitle");
    const zoneDesc = document.getElementById("zoneDesc");
    const zoneFeatures = document.getElementById("zoneFeatures");
    let lastTag = null;

    function showImage(zone, idx) {
      zoneImg.src = zone.images[idx].src;
      zoneImg.alt = zone.images[idx].alt;
      [...zoneThumbs.children].forEach((b, i) => b.classList.toggle("active", i === idx));
    }

    function openZone(id, tag) {
      const zone = ZONES[id];
      if (!zone) return;
      lastTag = tag;
      zoneKicker.textContent = zone.kicker;
      zoneTitle.textContent = zone.title;
      zoneDesc.textContent = zone.desc;
      zoneFeatures.innerHTML = "";
      for (const f of zone.features) {
        const li = document.createElement("li");
        li.textContent = f;
        zoneFeatures.appendChild(li);
      }
      zoneThumbs.innerHTML = "";
      zone.images.forEach((img, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Show image " + (i + 1) + " of " + zone.images.length);
        const t = document.createElement("img");
        t.src = img.src;
        t.alt = "";
        t.loading = "lazy";
        b.appendChild(t);
        b.addEventListener("click", () => showImage(zone, i));
        zoneThumbs.appendChild(b);
      });
      showImage(zone, 0);

      zoneModal.hidden = false;
      document.body.classList.add("modal-open");
      requestAnimationFrame(() => zoneModal.classList.add("open"));
      zoneModal.querySelector(".zone-close").focus();
    }

    function closeZone() {
      zoneModal.classList.remove("open");
      document.body.classList.remove("modal-open");
      setTimeout(() => { zoneModal.hidden = true; }, 320);
      if (lastTag) lastTag.focus();
    }

    planStage.querySelectorAll(".plan-tag").forEach((tag) => {
      tag.addEventListener("click", () => openZone(tag.dataset.zone, tag));
    });
    zoneModal.querySelectorAll("[data-close]").forEach((el) =>
      el.addEventListener("click", closeZone)
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !zoneModal.hidden) closeZone();
    });
  }

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
