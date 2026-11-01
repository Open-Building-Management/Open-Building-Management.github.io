# three.js

## module, controls and loaders

```
wget https://raw.githubusercontent.com/mrdoob/three.js/refs/tags/r170/build/three.module.js -O ./r170/build/three.module.js
wget https://raw.githubusercontent.com/mrdoob/three.js/refs/tags/r170/examples/jsm/controls/OrbitControls.js -O ./r170/examples/jsm/controls/OrbitControls.js
wget https://raw.githubusercontent.com/mrdoob/three.js/refs/tags/r170/examples/jsm/loaders/ColladaLoader.js -O ./r170/examples/jsm/loaders/ColladaLoader.js
wget https://raw.githubusercontent.com/mrdoob/three.js/refs/tags/r170/examples/jsm/loaders/TGALoader.js -O ./r170/examples/jsm/loaders/TGALoader.js
```

The initial way was to import `three.js`through cdn

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js/+esm';
```