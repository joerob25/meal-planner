# Longevità — A Longevity Diet Planner

A weekly meal planner inspired by Valter Longo's *The Longevity Diet* (2018), built as a static site for GitHub Pages.

## What it does

- **Shuffle Week** — generates a 7-day meal plan from 38 Longevity-aligned recipes (plant-based, with 2–3 low-mercury fish meals)
- **Smart shopping list** — aggregates ingredients across the week, groups them by supermarket aisle, with check-off, copy, and print
- **Your daily rhythm** — configure your eating window, age group, meals per day, and fish frequency
- **Recipe detail** — tap any meal for ingredients, timing, difficulty, and method
- **Built for UK supermarkets** — ingredients named and portioned for Tesco / Sainsbury's / Waitrose

## Design principles baked in

Longo's core recommendations drive the defaults:

- 11–12 hour eating window (not the aggressive 8-hour window popular elsewhere — Longo specifically warns against this)
- Mostly plant-based, pescatarian — 2–3 fish portions per week, low-mercury only (no tuna, no swordfish)
- Legumes as main protein source
- 3 tbsp olive oil + 30g nuts daily
- No red meat, minimal dairy, minimal sugar
- Age-based protein adjustment (slightly more after 65)

## Deploying to GitHub Pages

1. Create a new repository (e.g. `longevita`) or use an existing one
2. Copy these four files into the repo root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `meals.js`
3. Commit and push
4. In your repo → **Settings → Pages** → set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`
5. Wait 30–60 seconds — your site will be at `https://<your-username>.github.io/<repo-name>/`

That's it. No build step, no dependencies, no framework — just three static files plus the data.

## Customising

- **Add meals**: edit `meals.js` — each meal has `name`, `difficulty` (1–3), `time` (mins), `ingredients` (with `cat` category), and `method`
- **Change colours / fonts**: edit the CSS variables at the top of `styles.css`
- **Add dietary filters** (e.g. gluten-free): add a `tags` field to each meal and filter in `shufflePlan()`

## A note

This is a personal planner inspired by published research, not medical advice and not affiliated with Dr. Longo or the Valter Longo Foundation. Check with your GP or a registered dietitian before making significant dietary changes — especially if you're pregnant, managing a chronic condition, or considering any fasting protocol.

For the Fasting-Mimicking Diet specifically: Longo recommends it be done under medical supervision, 2–3 times per year. This app doesn't generate an FMD plan — it's a specific clinical protocol.
