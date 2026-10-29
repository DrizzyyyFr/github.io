# Andre Matthiessen — Technical Animation Portfolio

A React portfolio with three browser-native, interactive studies: two-bone inverse kinematics, a damped spring, and an in-place procedural gait. Built for GitHub Pages with no server or runtime API keys.

## Local development

Use Node.js 22 and npm.

The checked-in `.npmrc` keeps npm's peer-dependency resolution consistent with this Create React App lockfile. Unused ReactBits and Three.js starter dependencies have been removed; install compatible versions when adding a 3D study.

```sh
npm ci
npm start
```

Open http://localhost:3000. Drag the target or focus the viewport and use arrow keys (Shift moves farther). Each study has adjustable parameters, pause/play, reset, and visual guides. Auto target drives the IK and spring studies. Reduced-motion visitors start with playback paused; off-screen and background simulations suspend their updates.

```sh
npm test -- --watchAll=false --runInBand
npm run build
```

## GitHub Pages

The repository is `DrizzyyyFr/github.io`, a **project site**. Its default Pages address is `https://drizzyyyfr.github.io/github.io/`, not the account root. To use `https://drizzyyyfr.github.io/`, the repository must instead be named `DrizzyyyFr.github.io` (or configure a custom domain).

1. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as Source.
2. Merge the portfolio branch into `main` (or push to `main`).
3. The **Build and deploy portfolio** workflow installs from the lockfile, tests, builds, and deploys. Its deployment job links to the published URL. Pull requests run tests/build only.

`homepage: "."` keeps compiled asset URLs relative, so both a project subpath and an account-root site work. Navigation uses anchors; `?demo=ik`, `?demo=spring`, and `?demo=gait` open directly into a study without requiring server-side routing.

See [GitHub's workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [publishing source settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Customize and add work

- `src/App.js`: name, introduction, GitHub links, study metadata, project cards, and notes. Current studies are illustrative examples, not production credits. Replace the introduction with your own wording and add real project breakdowns as available.
- `src/App.css`: colors, layout, responsive breakpoints, and interaction styling.
- `src/motion.js`: pure solver and simulation functions; covered by `src/motion.test.js`.
- `public/index.html`: title and search/social metadata.

To add a study, add metadata to `studies`, a matching viewport/control branch in `MotionLab`, and a note describing the method and limits. Keep reusable math separate from React. Add larger demos as separate components loaded with `React.lazy` when needed. Put images, clips, or models in `public/assets/` and reference them through `process.env.PUBLIC_URL + '/assets/filename'` so project-site paths remain valid. Avoid committing oversized source assets.

The current demos use SVG and React; WebGL / Three.js can also run entirely in the browser on GitHub Pages. Python, Maya, Unreal, or other desktop/server code must be ported to browser-compatible code, precomputed, or hosted separately. Never put secrets in frontend code.

## Model boundaries

- IK clamps to the annulus between `abs(upper-lower)` and `upper+lower`, including a deterministic folded solution at zero distance.
- Spring dynamics use a damped harmonic oscillator integrated in substeps no larger than 1/240 second; browser frame gaps are capped to avoid catch-up explosions.
- Locomotion is a flat-ground, in-place gait study, not terrain adaptation or a complete character controller.

No tracking, external fonts, or runtime network dependencies are used by the page.
