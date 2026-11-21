# CodeMirror browser bundle

This directory contains the build-time configuration for the OBM CodeMirror
bundle. It is deliberately separate from the static site runtime.

## Build

Run the **Build CodeMirror bundle** workflow manually from GitHub Actions.
It installs the pinned direct dependencies, bundles their dependencies into
one browser ES module, and publishes the result as the
`codemirror-6.0.2-yaml-6.1.3` workflow artifact.

The artifact contains:

```text
codemirror.js
```

Download and extract that artifact into the site's `vendor/codemirror/`
directory. No npm, Node.js, or CDN access is required by the deployed site.

## Browser usage

The bundle exposes the same three named exports as the current esm.sh imports:

```js
import { EditorView, basicSetup, yaml } from
  "/vendor/codemirror/codemirror.js";
```

CodeMirror injects its editor styles through its JavaScript modules, so this
bundle does not require a separate stylesheet.

## Versions

- `codemirror`: 6.0.2
- `@codemirror/lang-yaml`: 6.1.3
- `esbuild`: 0.25.11 (build tool only)

The CodeMirror packages are bundled into the output; esbuild is not included
in the browser bundle.
