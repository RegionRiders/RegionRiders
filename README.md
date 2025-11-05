# RegionRiders • GPX Atlas for Cyclists 🚴‍♂️🗺️

[![npm test](https://github.com/Danrejk/RegionRiders/actions/workflows/npm_test.yml/badge.svg)](https://github.com/Danrejk/RegionRiders/actions/workflows/npm_test.yml)
[![Coverage](https://github.com/Danrejk/RegionRiders/actions/workflows/coverage.yml/badge.svg)](https://github.com/Danrejk/RegionRiders/actions/workflows/coverage.yml)
[![codecov](https://codecov.io/gh/Danrejk/RegionRiders/branch/main/graph/badge.svg)](https://codecov.io/gh/Danrejk/RegionRiders)

A GPX data visualization website to show, share, and inspire bike trips by compiling activities into sharable trip
summaries and mapping all past rides to reveal explored versus yet‑to‑see regions. ✨

---

## Overview 🧭

RegionRiders turns raw ride data into an interactive personal atlas that highlights every place visited and the regions
still waiting to be explored.  
It integrates activity ingestion, region intelligence, and performance‑aware mapping to deliver fast, insightful
exploration on desktop and mobile. ⚡

---

## Highlights 🌟

- 🗺️ Interactive map that renders all rides from GPX or Strava with smooth pan and zoom.
- 🔥 Heatmap layer to visualize activity density across visited areas.
- 🛡️ Region summary of visited administrative areas with names, flags or coats of arms, counts, and sorting.
- 🔗 Strava integration to connect an account, fetch activities, and review them in a dedicated list.
- ⚙️ Level‑of‑detail and 🗂️ caching to keep large collections responsive while preserving detail when needed.
- 📣 Shareable lists or views to showcase exploration progress with minimal setup.

---

## How it works 🧩

- 📥 Import or fetch activities, then render the polylines on a global map with optional heat mapping.
- 🧠 Detect and summarize real‑world regions visited, aggregating counts and most recent visits for profile views.
- 🎯 Default to efficient geometry and request high‑accuracy updates for activities near borders on demand.
- 🗃️ Cache selected region data and avoid redundant fetches while providing controls to manage scope. 🎛️

---

## Product scope 🎯

- 🗺️ Map: display all GPX routes with fluid navigation and a toggleable heatmap overlay.
- 🏳️ Regions: build a profile summary with names, emblems, counts, and flexible sorting modes.
- 📋 Activities: show a Strava‑fetched list for verification, filtering, and future deep dives.
- 🚀 Performance: apply level‑of‑detail, smart caching, and optional re‑fetch for precision.
- 📱 UI/UX: clear header with tabs, focused content area, and responsive layout for phones.

---

## Roadmap 🗺️

- 🧭 Mapping: non‑laggy rendering for large ride sets, heatmap controls, and route layering.
- 🧵 Regions: minimal‑gap borders after simplification and clear multi‑criteria sorting on summaries.
- 🔍 Activities: per‑activity high‑accuracy refresh and visible metadata for quick triage.
- 🗂️ Caching: selective region downloads, no resends for cached items, and scope limiting.
- 🔗 Sharing: linkable region lists and profile views for public exploration pages.
- 🤝 Community: optional donation or lightweight support features as a later enhancement.

---

## Contributing 🤝

Issues are organized as user‑facing features and stories to keep scope clear and iterative.  
Pull requests aligned with the roadmap and acceptance criteria are welcome to accelerate mapping, region logic, and
ingestion reliability.

---

## Vision 🌍

Unlock a cyclist’s long‑term picture by turning everyday rides into a living map that sparks the next route, region, and
adventure.  
Champion simple importing, fast browsing, and satisfying summaries that are easy to share and revisit. ✨

---

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0 - see the [LICENSE](LICENSE) file for details.
