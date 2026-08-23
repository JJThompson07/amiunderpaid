## Context

See proposal.md for motivation. The current `/about` page (located at `app/pages/about.vue`) uses a single, constrained `<article class="max-w-2xl">` block for the main text, followed by a basic 3-column grid. This layout is flat, reads like a wall of text, and fails to capture the user's attention. We must transform this into a dynamic, multi-sectioned landing page experience while maintaining the formal tone required of a career tool.

## Goals / Non-Goals

**Goals:**

- Provide a highly prescriptive, section-by-section layout for `app/pages/about.vue`.
- Utilize Lucide Vue Next icons to break up text visually.
- Restructure the existing i18n text blocks into an engaging asymmetrical grid (Bento Box style) to eliminate the "wall of text."
- Ensure dual-brand (`$siteBrand`) logic is preserved perfectly.

**Non-Goals:**

- No new illustrations or animations that would break the formal tone.
- No changes to the actual backend logic or data structures.

## Decisions

**1. Hero Section (Full Width, High Impact)**

- _Implementation_: Keep `SectionSharedBackdrop`. Increase the `<h1>` to a massive `text-5xl md:text-7xl font-black text-slate-900 tracking-tight`. Extract the first bolded intro sentence (`about.body.bold`) and place it as a `text-xl md:text-2xl text-slate-500 font-medium max-w-3xl mx-auto mt-6` subtitle below the H1. This immediately sells the mission without making the user read a paragraph.

**2. The Mission Block (Asymmetrical Bento Grid)**

- _Implementation_: Replace the single `max-w-2xl` `<article>` with a `max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-16`.
- _Left Side (Col-Span-2)_: A large, luxurious card (`bg-white rounded-3xl p-10 border border-slate-200 shadow-xl shadow-slate-200/50`) housing the `about.body.intro` and `about.body.middle` text. Use large, readable typography (`text-lg leading-relaxed text-slate-600`).
- _Right Side (Col-Span-1)_: A contrasting accent card (`bg-slate-900 text-white rounded-3xl p-8 shadow-xl`) housing the `about.body.outro` text. This breaks the monotony and gives the outro a sense of finality/importance.

**3. Highlights Grid (Visual Enhancement)**

- _Implementation_: The current 3-column loop for highlights is structurally fine but visually weak.
- Upgrade the cards: `bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow`.
- Add Lucide icons: Map a specific `lucide-vue-next` icon to each of the 3 highlights (e.g., `Target`, `Shield`, `TrendingUp`) placed above the `<h2>`. Render them with a subtle background pill (e.g., `p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-6 inline-block`).

## Risks / Trade-offs

- **Risk: Dual-brand logic complexity** → The current template relies heavily on `$siteBrand === 'amiunderpaid'`.
  - _Mitigation_: The implementer MUST meticulously preserve every ternary operator for `$siteBrand` when moving the text into the new grid structure. No translation paths can be dropped.
