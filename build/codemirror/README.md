# CodeMirror browser bundle

This directory contains the build-time entry point for the OBM CodeMirror
bundle. It is deliberately separate from the static site runtime.

## Build

Run the **Build CodeMirror bundle** workflow manually from GitHub Actions.
The workflow exposes some version inputs of components to bundle

The selected packages are installed for that workflow run only. The output
filename and artifact name include the selected versions. The artifact also
records the esbuild version in its name, although esbuild is only a build tool
and is not included in the browser bundle.

Download and extract the JavaScript file into the site's
`vendor/codemirror/` directory. No npm, Node.js, or CDN access is required
by the deployed site.

## Browser usage

```js
import { EditorView, basicSetup, autocompletion, yaml } from
  "/vendor/codemirror/xxxxxxxxx.js";
```

Replace the versioned filename with the one produced by the workflow run.

CodeMirror injects its editor styles through its JavaScript modules, so this
bundle does not require a separate stylesheet.

## Entry point

`src/index.js` defines the public exports included in the browser bundle.
