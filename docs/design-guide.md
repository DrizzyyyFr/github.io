# Portfolio design guide

## One connected scene

Use four scroll poses over a 400svh scene: sunrise at the beginning, high sun and introduction at one third, sunset at two thirds, and underwater navigation at the end. Native scrolling connects the poses continuously and reverses the journey without timed slide locks.

The initial surface viewport is split equally: 50% sky and 50% water. Keep that split through the introduction and sunset. The name is hidden at sunrise. As the sun rises, the introduction fades in from the left. Center Andre just above the horizon and Matthiessen just below it; anchor the name lines independently so the biography does not shift their placement. Hold the introduction while the sun is high, then fade it out to the left before sunset.

After sunset, a separate foreground waterline enters from below the bottom edge and rises beyond the top as the view descends underwater. Move the surface and sky upward together during this descent, keeping the sun and its reflection connected. Keep underwater world coordinates stable throughout the reveal: anchor the overhead surface and visible light source to the rising waterline, and smoothly open the ceiling's perspective span. The floor keeps a fixed scale and fades in as descent depth increases. Do not compress or translate the entire underwater scene into the revealed area. The whole viewport becomes blue depth illuminated by sun shafts and caustics; the navigation appears late in this water without a rectangular backdrop. Clip navigation below the rolling waterline during the reveal. No sky or sun disc remains visible in the final underwater pose.

Render the environment in one WebGL canvas. The page remains 2D with a 3D appearance. Composite finite curved wave fronts from far to near, with shaded turquoise shoulders and blue faces. Vary their positions and profiles, grow them in perspective, and fade newly entering fronts at the horizon. Keep small positive foam strokes attached to breaking crests; avoid full-width foam strips, inverse bubble meshes, and hard threshold noise grids. Surface crests and the transition waterline share the geometric profiles in `src/pages/home/waveProfiles.js`; retain the accepted sharper surface profile. Render the underwater ceiling as one continuous plane receding in perspective. Two rotated analytic noise-gradient layers shape its refraction, with restrained broad shading and small broken glints. Concentrate recognizable surface detail in the upper quarter and softened floor caustics in the lower quarter, leaving open depth between them. Do not mirror the above-water face silhouettes into stacked overhead bands, add decorative contour lines, or threshold broad shading into camouflage patches. Use the same atmospheric palette and sun direction for the sky, water reflections, diffuse illumination, and soft specular highlights. Fade distant detail to avoid shimmer. One widening light footprint connects visible sunlight at the surface, softly filtered light strands through the water, and the illuminated floor pool. Keep irregular floor caustics from smooth refraction focusing, vary their brightest segments rather than drawing uniform closed outlines, and preserve readable contrast behind the menu. Avoid green haze and bright regular grids.

The water, lighting, and caustics are animated procedurally; do not use static background textures, SVG scenery, grain, floating decorative shards, or a bounded header background. The header stays transparent and borderless across screen widths. Cap rendering resolution and stop idle animation when hidden or offscreen. Shade only the visible side of the crossing, use a lightweight material for the waterline edge, and skip caustics after their detail fades out. Compute the two surface noise gradients analytically and reuse the shared illumination footprint across the water volume and floor. Keep the existing rendering budgets and adaptive resolution behavior: recover gradually after sustained stable frames, and preserve animation time across context loss and visibility changes. Reduced motion freezes decorative water movement and updates scroll state directly.

Keep navigation free of instructional captions and decorative slogans. Category/topic names, the mobile back trail, arrow controls, and the personal introduction provide the interface.

Keep the existing personal introduction. The only main categories are Animation and Technical Animation. Use real notes from the selected source; do not invent projects or biography.

## Interaction

1. Initially show the main categories. Clicking a category unfolds its topics on the right.
2. Clicking a topic unfolds its entries on the right. Changing a parent clears the deeper branch.
3. Clicking an entry expands that exact pane into a reading surface with the original content inside. There is no separate Explore entry button or destination row.
4. Back to shards, Escape, and browser back return to navigation. The browser remains mounted, preserving selection and scroll position.

Mouse wheel and arrow keys browse each column. Enter or Space activates the selected pane. Mouse notches and direction changes respond immediately; reject declining trackpad inertia without locking input throughout an animation. Page scrolling resumes at list boundaries. Horizontal touch swipes browse; vertical gestures scroll the page.

## Material and palette

Edit shared interface values in `src/styles/tokens.css` and environmental lighting in `src/pages/home/oceanShaders.js`. The background is a saturated blue scene with cyan and peach light. Text is pale and readable against darker glass. Angular cuts are restrained to preserve a clear label area; avoid stretched triangular slabs, milky white fill, and thick stacked edges.

| Token | Value / purpose |
| --- | --- |
| `--color-background` | `#132c47`, blue scene |
| `--color-surface` | `#182c46`, expanded reading surface |
| `--color-text` | `#edf5fa`, primary text |
| `--color-muted` | `#adc4d5`, secondary text |
| `--color-accent` | `#8ddff7`, cyan interaction cues |
| `--color-sunrise-accent` | `#f3b591`, warm highlights |
| `--glass-fill` | Blue-to-muted-peach material gradient |
| `--glass-edge` | Fine cyan/warm edge highlights |
| `--shard-outline` | Shared six-point cut-glass silhouette |

The geometry takes its cue from the fractured-glass UI Lab reference, adapted to clear text and direct interaction. Selected panes come forward; neighbors recede through perspective, translation, tilt, scale, and opacity. Subcategory panes are narrower and 82px high versus 128px for main categories.

## Motion

- Native scroll progress drives the shared scene timeline with a brief smoothing response. The name enters and exits to the left; the introduction remains readable during the high-sun hold. Reveal navigation only after the descent begins. Do not trap the page in timed slides or intercept page wheel gestures.
- A critically damped shared position drives each picker. Preserve velocity during reversals and stable item identity during navigation.
- Branches leave over 160ms and unfold from the left over 720ms. Cancel stale replacements on rapid changes.
- Follow `G:\GanglifeBevy\game\src\ui_lab\shards\transition.rs`: one reversible 720ms timeline. Between progress .12 and .84, interpolate the selected pane's actual bounds and six-point outline toward the expanded frame. Reposition its title independently; never scale a whole prelaid-out page.
- Other panes retreat left and shrink with staggered smoothstep timing. The selected pane keeps its material and its original is hidden until return. Reveal the content by clipping its height only during progress .77 to 1. Show the return control near the end; Escape remains available throughout. Closing reverses the same timeline, including mid-transition interruptions.
- Reduced-motion preferences disable the animated morph, decorative movement, and transitions. Keep all navigation and content usable.

## Responsive layout and accessibility

Desktop columns use the available width up to 2200px. On screens at or below 850px, use a horizontal stage for Category, Topic, and Entry. Clicking advances the stage; the trail returns to parents. Inactive mobile stages are inert, and focus moves to the revealed selector after the transition. Do not squeeze three columns onto a phone.

Compact-height screens keep the four-stage sticky scene, use smaller navigation spacing, and allow the revealed work area to scroll internally when needed. Size the two name lines against both viewport width and height. The expanded pane fits within the dynamic viewport, with its own content scroll area. Larger screens receive a broader reading surface.

Hide native page and entry-content scrollbar chrome without reserving a gutter or disabling scrolling. Mouse wheel, touch, keyboard navigation, and visible focus still work.

Use a native modal dialog for expanded content: trap focus, label it with the entry title, support Escape, restore focus, and lock background scrolling while open. Keep visible focus outlines and semantic listboxes with selected options. Videos have controls and preload none; images load lazily.

## Source and folders

| Location | Responsibility |
| --- | --- |
| `src/pages/home/` | Shared scene and scroll progress |
| `src/components/browser/` | Stable 3D pickers, branch reveals, mobile stages |
| `src/pages/work/EntryOverlay.js` | Entry expansion, dialog lifecycle, reading content |
| `src/components/content/` | Limited Markdown and media rendering |
| `src/components/layout/` | Shared header and footer |
| `src/styles/` | Shared tokens and global styling |
| `src/config/` | Profile and hash routes |
| `src/content/portfolio.json` | Imported note hierarchy |
| `scripts/import-obsidian.cjs` | Explicit selected-vault import |

The importer reads Animation and Technical Animation plus referenced Media. It does not import Welcome.md, personal folders, a resume, or Obsidian settings. The source vault remains unchanged. Routes use `#/category/topic/entry` and relative assets for GitHub Pages compatibility; opening an entry URL directly opens its content within the same scene.

This revision is local for review. Automated tests cover the interaction contracts; browser rendering and timing still require visual review when a local preview is accessible.
