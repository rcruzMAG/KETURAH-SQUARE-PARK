# Keturah Square Park — Concept Website

A single-page concept website for **Keturah Square Park**, a destination lifestyle and
food-and-beverage park in Al Safa, Dubai, shaped by the **Three-Finger Salute** concept
("Win. Victory. Love."). Content and imagery are drawn from the Keturah Square Park
Concept deck (June 2026); the experience is modelled on the Keturah Al Safa Park
reference site.

## Structure

| Section | Anchor | Source (concept deck) |
|---|---|---|
| Hero | `#top` | Cover render |
| 01 Vision | `#vision` | Executive Summary — five headline design drivers |
| 02 Site & Regional Context | `#site` | Site identification, edge response strategy |
| 03 Climate & Outdoor Comfort | `#climate` | Climatic analysis — headline figures & key insights |
| 04 The Three-Finger Salute | `#concept` | Concept interpretation — plan anatomy |
| 05 People | `#people` | User analysis — personas & time-of-day journey |
| 06 Programme | `#programme` | Programme brief & indicative planning metrics |
| 07 Experience | `#experience` | Zone renders — Food Hub, Kids' Play, Restaurant Zone |
| 08 Why This Site Wins | `#strategy` | SWOT synthesis & key success factors |
| 09 Delivery | `#delivery` | Design principles & recommended next studies |

## Enhancements

- **Animated palm trees** — reusable SVG palm (`<template id="palmTemplate">`) cloned into
  the hero foreground, a grove divider, and the tagline section; trunk sway and per-frond
  flutter run at staggered speeds so trees never move in unison.
- **Parallax** — full-bleed media (hero, quote band, experience panels) and framed inset
  images translate on scroll via a single rAF-driven engine (`data-parallax` /
  `data-parallax-inner`).
- **Fireflies** — drifting glow particles over the night-time hero render.
- **Scroll reveals** — IntersectionObserver-driven fade/rise with staggered card grids.
- **Animated counters** — climate stats count up when scrolled into view.
- **Nav polish** — transparent-to-solid header, scroll progress bar, active-section
  highlighting, mobile slide-down menu.
- **Accessibility** — `prefers-reduced-motion` disables parallax, sway, fireflies and
  reveals; semantic landmarks and alt text throughout.

## Running

No build step — it's a static site:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Files

```
index.html        page structure & content
css/style.css     theme, layout, animations
js/main.js        parallax, trees, reveals, counters, nav
assets/img/       renders extracted from the concept deck
```
