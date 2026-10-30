# Portfolio design guide

## One connected scene

Use four scroll poses over a 400svh scene: sunrise at the beginning, high sun and introduction at one third, sunset at two thirds, and underwater navigation at the end. Native scrolling connects the poses continuously and reverses the journey without timed slide locks.

The initial surface viewport is split equally: 50% sky and 50% water. Keep that split through the introduction and sunset. The name is hidden at sunrise. As the sun rises, the introduction fades in from the left. Center Andre just above the horizon and Matthiessen just below it; anchor the name lines independently so the biography does not shift their placement. Hold the introduction while the sun is high, then fade it out to the left before sunset.

After sunset, a separate foreground waterline enters from below the bottom edge and rises beyond the top as the view descends underwater. Move the surface and sky upward together during this descent, keeping the sun and its reflection connected. Keep underwater world coordinates stable throughout the reveal: anchor the overhead surface and visible light source to the rising waterline, and smoothly open the ceiling's perspective span. The floor keeps a fixed scale and fades in as descent depth increases. Do not compress or translate the entire underwater scene into the revealed area. The whole viewport becomes blue depth illuminated by sun shafts and caustics; the navigation appears late in this water without a rectangular backdrop. Clip navigation below the rolling waterline during the reveal. No sky or sun disc remains visible in the final underwater pose.

Render the environment in one WebGL canvas. The page remains 2D with a 3D appearance. Composite finite curved wave fronts from far to near, with shaded turquoise shoulders and blue faces. Vary their positions and profiles, grow them in perspective, and fade newly entering fronts at the horizon. Keep small positive foam strokes attached to breaking crests; avoid full-width foam strips, inverse bubble meshes, and hard threshold noise grids. Surface crests and the transition waterline share the geometric profiles in `src/pages/home/waveProfiles.js`; retain the accepted sharper surface profile. Render the underwater ceiling as one continuous plane receding in perspective. Two rotated analytic noise-gradient layers shape its refraction, with restrained broad shading and small broken glints. Concentrate recognizable surface detail in the upper quarter and softened floor caustics in the lower quarter, leaving open depth between them. Do not mirror the above-water face silhouettes into stacked overhead bands, add decorative contour lines, or threshold broad shading into camouflage patches. Use the same atmospheric palette and sun direction for the sky, water reflections, diffuse illumination, and soft specular highlights. Fade distant detail to avoid shimmer. One widening light footprint connects visible sunlight at the surface, softly filtered light strands through the water, and the illuminated floor pool. Keep irregular floor caustics from smooth refraction focusing, vary their brightest segments rather than drawing uniform closed outlines, and preserve readable contrast behind the menu. Avoid green haze and bright regular grids.

The water, lighting, and caustics are animated procedurally; do not use static background textures, SVG scenery, grain, floating decorative shards, or a bounded header background. The header stays transparent and borderless across screen widths. Cap rendering resolution and stop idle animation when hidden or offscreen. Shade only the visible side of the crossing, use a lightweight material for the waterline edge, and skip caustics after their detail fades out. Compute the two surface noise gradients analytically and reuse the shared illumination footprint across the water volume and floor. Keep the existing rendering budgets and adaptive resolution behavior: recover gradually after sustained stable frames, and preserve animation time across context loss and visibility changes. Reduced motion freezes decorative water movement and updates scroll state directly.

Keep navigation free of instructional captions, status badges, and decorative slogans. The category tabs, numbered topic rows with their project rows, the preview card, and the personal introduction provide the interface; the highlighted row alone marks the previewed project.

Keep the existing personal introduction. The only main categories are Animation, Technical Animation, and Teaching, in that order; a category with no notes yet has no tab. Use real notes from the selected source; do not invent projects or biography.

## Interaction

1. The Work panel opens on the Animation tab; there is no All work tab. The tabs switch category and route to `#/category`. On small screens they keep to one line, without gaps between them.
2. A category lists its topics as numbered rows. One topic is open at a time and unfolds its projects beneath it as smaller, unnumbered rows. A project is a folder of notes within a topic (LookAt's four notes are one project, named by its folder), or a note on its own; a folder holding a single note is named by that note. Rows show their title alone; neither the rows nor the preview card show a category or topic path.
3. The topic holding the routed page is open with that page's project previewed; otherwise the category's remembered topic and project, else the routed topic, else the first topic, each previewing its first project unless one was remembered.
4. Clicking or tapping a topic opens it and previews its first project; clicking the open topic leaves it as it is. Clicking, tapping, or arrowing to a project previews it. None of these change the route. Arrows move through topic and project rows alike but only select projects, so the list does not unfold under the keys. Hovering only lights a row and never moves the selection, so rows do not grow or shrink under a moving pointer.
5. View expands the preview card into the reading surface, opening the project on its first page and routing to `#/category/topic/entry`. A project of several pages shows them in a bar under its title, the current page lit; turning a page swaps only the note, from its top, and the end of each page links to the next. The tab title names the page and its project.
6. Back, Escape, and browser back return to the panel. The browser remains mounted, preserving the open topic, the previewed project, and list scroll.

The preview shows a project's first video across its pages as a muted loop, otherwise a YouTube video its note embeds or links (the youtube-nocookie player, muted, looping, chromeless, taking no pointer or focus), otherwise its first image, otherwise no media at all; it never shows note text. The media area spans the card at the media's own proportions, measured as it loads and remembered, and eases between shapes, so a wide strip makes a slim card; YouTube is 16:9. Media sits on the glass with no frame, lifted by a soft shadow, and an image that must fit a shorter area casts its own shadow instead of sitting between bars. Left and right arrows move between tabs; up and down arrows move between rows; topic rows are disclosure buttons whose expanded state marks the open topic, and project rows are toggle buttons whose pressed state marks the preview. The list scrolls inside its column, fades its lower edge only while rows remain below, and hands scrolling back to the page at its end.

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
| `--glass-edge` | Sunlit rim: warm toward the top-right sun, a faint cool line in shade |
| `--shard-outline` | The preview card and expanded pane: a plain rectangle with square corners and straight sides, written as six points for the morph |

The geometry takes its cue from the fractured-glass UI Lab reference, adapted to clear text and direct interaction. Topic rows are numbered glass panes with a pointed right edge and a chevron that turns down when open. An open topic's projects sit under it a size smaller as plain glass boxes, indented under its number and ending where its point begins, with no connecting line; the tab highlight is a glass parallelogram. Both share one CSS glass (`.work-glass`), lit by the scene's sun at the top right: the 1px rim is warm where it faces the sun and cool in shade, light pools in the top-right corner, the bottom left falls into shade, each pane casts a soft shadow down and to the left, faint diagonal facets mark the glass, and a mouse carries a small sun highlight across it. The selected project is the lit `--glass-fill` pane with a cyan edge; an open topic is half lit, without the edge. The expanded pane's page bar uses plain labels with the current page on a pane of lit glass. Every painted glass layer carries its own clip-path: a layer that relies on its parent's clip can render as its full rectangle. Every button on the site uses the shared `.glass-button` in `src/styles/global.css`, cut from the same sunlit glass: label buttons (View, Back) are a slanted pane with a cyan arrow, `.is-round` makes icon buttons (play, the scroll cue), a reflection crosses the glass on hover, a press sinks it slightly, and focus shows as a cyan glow rather than a rectangle. Do not give a button a style of its own.

## Motion

- Native scroll progress drives the shared scene timeline with a brief smoothing response. The name enters and exits to the left; the introduction remains readable during the high-sun hold. Reveal navigation only after the descent begins. Do not trap the page in timed slides or intercept page wheel gestures.
- Every visit starts at sunrise and glides over 4s with ease-in-out to where its link points: the introduction for the home page and `#about`, the work panel for `#work` and any category or project link. A linked project opens from its preview card once the glide arrives. Any wheel, touch, key, press, or navigation stops the glide at once and counts as arriving; reduced motion goes straight there.
- A topic unfolds and folds its projects by height over 560ms, clipping them only while it moves so their shadows show and they can retreat; its chevron turns as it opens, and a reflection crosses its glass. Once a chosen project has opened, the list scrolls it fully into view.
- Selecting a project grows it taller and slightly wider over 560ms, lights its glass over 420ms, raises the cyan edge, and sweeps a reflection across it over 1.2s. Its number and text only scale, so nothing re-wraps while it moves. Selection, hover, and the sweep transition registered custom properties that every glass layer inherits. The tab highlight glides to a newly chosen tab over 560ms.
- Switching category lets the old list and card leave over 160ms, then unfolds the new ones from the left over 720ms; a new preview fades its media in over 420ms.
- Changing project keeps one preview card: the incoming media settles in over the outgoing one, which fades beneath it (520ms); the outgoing title lifts away as the incoming one rises into its place; the media area folds away for a project without media; the title keeps room for two lines so the card edge never jumps; and a reflection crosses the card. On phones the inline preview opens under its row and folds away when another row is chosen.
- Follow `G:\GanglifeBevy\game\src\ui_lab\shards\transition.rs`: one reversible 720ms timeline. Between progress .12 and .84, interpolate the preview card's actual bounds toward the expanded frame; both are plain rectangles, so the outline does not change. Reposition its title independently; never scale a whole prelaid-out page.
- Over progress 0 to .3 the card fades out while the pane's glass fades in over it. Rows retreat left by a full screen width and shrink with staggered smoothstep timing; the tabs, heading, header, and footer fade. The card's title stays hidden until return. Reveal the content by clipping its height only during progress .77 to 1. Show the return control near the end; Escape remains available throughout. Closing reverses the same timeline, including mid-transition interruptions.
- Reduced-motion preferences disable the animated morph, decorative movement, and transitions. Keep all navigation and content usable.
- Keep motion off the main thread where it can be. Interface transitions fade and move layers (opacity, transform, background-position) with `--ease-soft`, an even ease in and out; `--ease-glide` stays for the scene and the entry morph. Never write a per-frame value as an inherited custom property on the page's root or scene: it restyles every element on every frame. The entry morph writes its retreat onto the few elements that read it, moves rows by their own transform, skips writes whose value has not changed, and lays the note out once at the pane's final width. Rows cast their shadow from one blurred box, not a `filter`.
- Preview media loads on demand: nothing until the work panel comes into view, then only the shown project's media, unloaded again when the panel leaves the screen. Incoming media waits unseen, with the outgoing media held in full, until it can actually show (or 2.5s pass), then crossfades.

## Responsive layout and accessibility

Wide and landscape screens place the tabs and project list beside the preview card, using the available width up to 2200px. Portrait screens at or below 850px wide use one column: the selected project row opens in place to show its preview and View, and the list scrolls that row fully into view without moving the page. Every layout keeps bottom clearance for the fixed music player.

Compact-height screens keep the four-stage sticky scene, use smaller navigation spacing, and let the work area scroll rather than shrink the panel below 300px (220px at 500px tall or less). At 500px tall or less the header slims and the fixed footer line is hidden, since it could only sit on content. Size the two name lines against both viewport width and height. The expanded pane fits within the dynamic viewport, with its own content scroll area. Larger screens receive a broader reading surface.

Hide native page and entry-content scrollbar chrome without reserving a gutter or disabling scrolling. Mouse wheel, touch, keyboard navigation, and visible focus still work.

Use a native modal dialog for expanded content: trap focus, label it with the project title, support Escape, restore focus, and lock background scrolling while open. Keep visible focus outlines; the categories are a tab list and the project list is its tab panel. Note videos have controls and preload none; images load lazily. The preview video is muted and decorative, and stays still under reduced motion.

## Source and folders

| Location | Responsibility |
| --- | --- |
| `src/pages/home/` | Shared scene and scroll progress |
| `src/components/browser/` | Category tabs, topic and project list, preview card and its media choice |
| `src/pages/work/EntryOverlay.js` | Entry expansion, dialog lifecycle, page bar, reading content |
| `src/components/content/` | Limited Markdown and media rendering |
| `src/components/layout/` | Shared header and footer |
| `src/styles/` | Shared tokens and global styling |
| `src/config/` | Profile, hash routes, and how notes group into projects |
| `src/content/portfolio.json` | Imported note hierarchy |
| `scripts/import-obsidian.cjs` | Explicit selected-vault import |

The importer reads the Animation, Technical Animation, and Teaching folders plus referenced Media, and leaves out a category whose folder is missing or holds no notes. Within a category, each subfolder is a topic; a note at a category's top level goes into a Downloads topic, listed after the others. Notes render numbered steps as numbered lists, and a slide deck's `--` vertical breaks draw nothing. It does not import Welcome.md, personal folders, a resume, or Obsidian settings. The source vault remains unchanged. Routes use `#/category/topic/entry` and relative assets for GitHub Pages compatibility; opening an entry URL directly opens its content within the same scene.

This revision is local for review. Automated tests cover the interaction contracts; browser rendering and timing still require visual review when a local preview is accessible.
