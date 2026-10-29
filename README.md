# Andre Matthiessen - Animation and Technical Animation

A connected glass portfolio with four scroll stages: sunrise; high sun revealing the introduction; sunset; and a descent into underwater navigation. The initial surface view is 50% sky and 50% water. The centered name enters from the left, placing Andre above the horizon and Matthiessen below it, then fades out to the left. During the descent, a rolling waterline rises from below the bottom edge while the surface and sky move upward together. The underwater menu appears late in the descent. Scrolling upward reverses the journey.

A WebGL canvas gives the 2D page depth through animated overlapping wave fronts with curved profiles, shaded faces, and small broken foam strokes. Fronts grow in perspective as they move toward the viewer, entering at the horizon and leaving below the viewport. Reflections, foam, wave lighting, and the sky share the sun's position and blue, cyan, and peach palette. The transition waterline reuses the surface crest profiles. Underwater, two rotated analytic noise-gradient layers shape a continuous refractive surface with small broken glints. Detail gathers in the upper quarter, with softened moving caustics below. One widening light footprint connects visible sunlight at the surface, softly filtered light strands through the water, and illumination on the floor. During the descent, the overhead surface and its light source follow the rising waterline while the ceiling's perspective span opens smoothly. The underwater world keeps its proportions, and the floor fades into view at a fixed scale as depth increases. All scenery is procedural, with no static background texture.

Click a category to unfold topics, then a topic to reveal entries. Clicking an entry expands its shard into the original notes and media, within the same scene. The menu has no rectangular backdrop; native scrollbar chrome is hidden without disabling scrolling.

## Local preview

```powershell
cd "C:\Users\andre\Documents\Codex\2026-10-29\new-chat\technical-animation-portfolio"
$env:PORT = "3001"
npm.cmd start
```

Open the Local URL printed by the terminal. Keep the terminal running. If dependencies are missing, run `npm ci` first. Node.js 22 is the deployment version; `.npmrc` preserves this Create React App lockfile's peer-dependency resolution.

## Import the selected source

```powershell
node scripts/import-obsidian.cjs "G:\TA_Obsidian\MySite"
```

This explicitly reads `Animation/` and `Technical Animation/`, builds the categories and subcategories from the folders, and copies referenced assets from `Media/`. It leaves the original vault unchanged. No automatic watcher or access to other vault folders is configured. About me is not a navigation category; the short introduction is maintained in the landing-page component.

The imported snapshot includes the real animation interactions, technical systems, documentation, and download note. It does not import the resume, personal Mind/Hobbies content, or Obsidian configuration.

## Edit and extend

- `src/pages/home/`: sticky scroll scene and introduction
- `src/components/browser/`: three reusable 3D glass selectors and family transitions
- `src/pages/work/`: expanding entry dialog and content layout
- `src/components/content/`: Markdown/media rendering
- `src/content/portfolio.json`: generated content snapshot
- `src/config/`: profile and route configuration
- `src/styles/tokens.css`: shared sky/sunrise and glass palette, typography, spacing, motion tokens
- [Design guide](docs/design-guide.md): structure, palette, interaction, accessibility rules

Each scroller supports the mouse wheel, clicking, arrow keys, Home/End, previous/next buttons, and horizontal touch swipes. Enter and Space activate the selected shard. Vertical touch gestures scroll the page. Scroll-wheel gestures are released to the page at list boundaries. On mobile, navigation advances through horizontal stages with a back trail. The browser stays mounted when an entry opens. Escape, Back to shards, and browser back close the content. Reduced-motion preferences disable animated movement.

The glass geometry takes its cue from the fractured-glass UI Lab reference in `G:\GanglifeBevy\game\src\ui_lab\shards.rs` and its `fractured.wesl` shader. Entry expansion follows `shards/transition.rs`: a reversible 720ms timeline changes the pane's actual bounds and outline, moves the title independently, sends neighboring panes away, and reveals the content only near the end. The page is not enlarged with a whole-dialog scale transform.

Native page scrolling drives one continuous four-stage timeline with a brief smoothing response; it does not intercept the wheel or snap between slides. The opening arrow targets the introduction and the header Work link targets the underwater menu. Rendering resolution is capped, background animation pauses when hidden or offscreen, and reduced motion renders a static water state that still follows scrolling. Picker gestures have no animation-length lockout: mouse notches and reversals respond promptly while decaying trackpad inertia is suppressed. The 3D spring preserves velocity while settling faster.

## Validation

```sh
npm test -- --watchAll=false --runInBand
npm run build
```

## GitHub Pages

Hash routes and relative assets work under `/github.io/` or `/technical-animation/`. Select **Settings > Pages > Source > GitHub Actions** before publishing. The workflow tests and builds PRs, then deploys merged changes on `main`.

The feature branch contains the portfolio source and its referenced media. Publishing remains separate: the GitHub Pages workflow deploys after changes are merged into `main`.
