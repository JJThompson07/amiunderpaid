## 1. UI Layout & Implementation

- [x] 1.1 In `app/pages/about.vue`, upgrade the Hero section. Increase the `<h1>` styling to `text-5xl md:text-7xl font-black tracking-tight`. Extract the `about.body.bold` (or `about.benchmark.body.bold`) string from the article block and place it in a new `<p>` directly below the `<h1>` with classes `text-xl md:text-2xl text-slate-500 font-medium max-w-3xl mx-auto mt-6`. Verify visually on desktop (`pnpm dev`).
- [x] 1.2 Refactor the main article block into a Bento Box grid. Replace the `<article>` wrapper with `<div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">`. Create a left card (`col-span-2 bg-white rounded-3xl p-10 border border-slate-200 shadow-xl shadow-slate-200/50`) containing the `about.body.intro` and `about.body.middle` text. Create a right card (`col-span-1 bg-slate-900 text-white rounded-3xl p-8 shadow-xl`) containing the `about.body.outro` text. **Crucial:** Preserve all `$siteBrand` ternary logic during the move. Verify visually.
- [x] 1.3 Upgrade the 3-column Highlights Grid. Increase the padding on the cards to `p-8` and round the corners to `rounded-3xl`. Import three icons from `lucide-vue-next` (e.g., `Target`, `Shield`, `TrendingUp`). Render the appropriate icon above the `<h2>` in each highlight card, wrapped in a `div` with `p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-6 inline-block` to make it pop. Verify visually on both desktop and mobile viewports.

## 2. Testing & Verification

- [x] 2.1 Run local verification suite: `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e` to ensure no build, type, or e2e regressions were introduced by the layout changes. Ensure the dual-brand logic wasn't broken.
