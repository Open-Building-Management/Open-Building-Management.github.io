/**
 * <idf-viewer> — visionneuse 3D (three.js) de la géométrie d'un IDF EnergyPlus.
 *
 *   <script type="module" src="./idf-viewer.js"></script>
 *
 *   <idf-viewer src="./model.idf"></idf-viewer>     IDF servi par un backend
 *   <idf-viewer></idf-viewer>                       l'utilisateur choisit son fichier
 *
 *   const viewer = document.querySelector('idf-viewer');
 *   await viewer.loadIDF(idfText);                  chargement programmatique
 *   await viewer.loadURL('./autre.idf');
 *   viewer.model                                    modèle parsé (voir idf-parser.js)
 *   viewer.colorMode = 'type' | 'zone' | 'boundary'
 *   viewer.fitView()
 *   viewer.three                                    { scene, camera, renderer, controls, group }
 *
 * Attributs : src, color-mode, no-toolbar, no-legend, no-grid
 * Événements : "idf-loaded" (detail: { model }), "idf-error" (detail: { error })
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js/+esm';
import { parseGeometryIDF } from './idf-parser.js';
import { buildPolygonGeometry, polygonNormal } from './idf-geometry.js';

export { parseGeometryIDF };

// ---------------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------------

const TYPE_COLORS = {
  wall: 0xd8c7a4,
  wallInterior: 0xe9e2d3,
  wallGround: 0x8f8372,
  roof: 0xa8503d,
  ceiling: 0xf1ece2,
  floor: 0x8a8d93,
  floorGround: 0x6b6e73,
  window: 0x63a9dc,
  glassdoor: 0x8cccf0,
  door: 0x7b4b2a,
  shading: 0x6e6e6e,
  other: 0xc9a0dc,
};

const BOUNDARY_COLORS = {
  outdoors: 0x7fb3d5,
  ground: 0x8d6e4c,
  surface: 0xd6d6d6,
  zone: 0xd6d6d6,
  adiabatic: 0xc5b2d9,
  other: 0xf0b45c,
};

const ZONE_PALETTE = [
  0x4e79a7, 0xf28e2b, 0x59a14f, 0xe15759, 0x76b7b2, 0xedc948,
  0xb07aa1, 0xff9da7, 0x9c755f, 0xbab0ac, 0x1f77b4, 0x2ca02c,
];

const INTERIOR_BC = new Set(['surface', 'zone', 'adiabatic', 'otherzone', 'othersidecoefficients', 'othersideconditionsmodel']);
const GLAZED_TYPES = new Set(['window', 'glassdoor', 'tubulardaylightdome', 'tubulardaylightdiffuser']);

function isInteriorBC(bc) {
  return INTERIOR_BC.has((bc || '').toLowerCase());
}
function isGroundBC(bc) {
  return (bc || '').toLowerCase().startsWith('ground') || (bc || '').toLowerCase().startsWith('foundation');
}

function colorByType(item) {
  const t = (item.type || '').toLowerCase();
  if (item.kind === 'shading') return TYPE_COLORS.shading;
  if (item.kind === 'fenestration') {
    if (t === 'door') return TYPE_COLORS.door;
    if (t === 'glassdoor') return TYPE_COLORS.glassdoor;
    return TYPE_COLORS.window;
  }
  if (t === 'wall') {
    if (isGroundBC(item.outsideBC)) return TYPE_COLORS.wallGround;
    if (isInteriorBC(item.outsideBC)) return TYPE_COLORS.wallInterior;
    return TYPE_COLORS.wall;
  }
  if (t === 'roof') return TYPE_COLORS.roof;
  if (t === 'ceiling') return TYPE_COLORS.ceiling;
  if (t === 'floor') return isGroundBC(item.outsideBC) ? TYPE_COLORS.floorGround : TYPE_COLORS.floor;
  return TYPE_COLORS.other;
}

function colorByBoundary(item) {
  if (item.kind === 'shading') return TYPE_COLORS.shading;
  if (item.kind === 'fenestration') return colorByType(item);
  const bc = (item.outsideBC || '').toLowerCase();
  if (bc === 'outdoors') return BOUNDARY_COLORS.outdoors;
  if (isGroundBC(bc)) return BOUNDARY_COLORS.ground;
  if (bc === 'surface' || bc === 'zone') return BOUNDARY_COLORS.surface;
  if (bc === 'adiabatic') return BOUNDARY_COLORS.adiabatic;
  return BOUNDARY_COLORS.other;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

const TEMPLATE = /* html */ `
<style>
  :host {
    display: block;
    position: relative;
    min-height: 320px;
    overflow: hidden;
    font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #1f2328;
    background: var(--idf-viewer-bg, #eef1f5);
    border-radius: var(--idf-viewer-radius, 0);
  }
  :host([hidden]) { display: none; }
  .canvas-host { position: absolute; inset: 0; }
  .canvas-host canvas { display: block; width: 100%; height: 100%; outline: none; touch-action: none; }
  .panel {
    position: absolute;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    padding: 6px 8px;
    backdrop-filter: blur(4px);
  }
  .toolbar { top: 8px; left: 8px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .toolbar label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; white-space: nowrap; }
  .toolbar select, .toolbar button, .toolbar .file-btn {
    font: inherit; padding: 3px 8px; border: 1px solid #c8ccd2; border-radius: 4px; background: #fff; cursor: pointer;
  }
  .toolbar button:hover, .toolbar .file-btn:hover { background: #f3f5f8; }
  .toolbar .file-btn { font-weight: 600; }
  .toolbar .file-btn[hidden] { display: none; }
  .tooltip {
    position: absolute; pointer-events: none; z-index: 2;
    background: rgba(31, 35, 40, 0.92); color: #fff; padding: 6px 8px; border-radius: 5px;
    font-size: 12px; max-width: 280px; white-space: nowrap;
  }
  .tooltip b { font-size: 13px; }
  .tooltip .dim { color: #c6cbd1; }
  .status {
    position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%);
    background: rgba(31, 35, 40, 0.85); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 12px;
    max-width: 90%; white-space: pre-wrap;
  }
  .status.error { background: rgba(176, 32, 32, 0.92); }
  .empty {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    text-align: center; color: #57606a; pointer-events: none; font-size: 15px;
  }
  .empty[hidden], .tooltip[hidden], .status[hidden], .toolbar[hidden] { display: none; }
  :host(.dragover) { outline: 3px dashed #4e79a7; outline-offset: -3px; }
</style>
<div class="canvas-host"></div>
<div class="panel toolbar">
  <label class="file-btn"><input type="file" accept=".idf,.txt" hidden>Ouvrir un IDF…</label>
  <select name="mode" title="Mode de coloration">
    <option value="type">Couleur : type</option>
    <option value="zone">Couleur : zone</option>
    <option value="boundary">Couleur : condition limite</option>
  </select>
  <label><input type="checkbox" name="edges" checked> Arêtes</label>
  <label><input type="checkbox" name="interior" checked> Intérieur</label>
  <label><input type="checkbox" name="windows" checked> Vitrages</label>
  <button type="button" name="fit" title="Recentrer la vue">Recentrer</button>
</div>
<div class="tooltip" hidden></div>
<div class="empty">Déposez un fichier .idf ici<br>ou utilisez « Ouvrir un IDF… »</div>
<div class="status" hidden></div>
`;

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export class IdfViewer extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'color-mode', 'no-toolbar', 'no-legend', 'no-grid'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;

    this._model = null;
    this._group = null;
    this._pickables = [];
    this._zoneColors = new Map();
    this._zoneVisible = new Map();
    this._colorMode = 'type';
    this._showEdges = true;
    this._showInterior = true;
    this._showWindows = true;
    this._raf = 0;
    this._hovered = null;
    this._loadToken = 0;

    this._els = {
      host: this.shadowRoot.querySelector('.canvas-host'),
      toolbar: this.shadowRoot.querySelector('.toolbar'),
      fileBtn: this.shadowRoot.querySelector('.file-btn'),
      fileInput: this.shadowRoot.querySelector('input[type=file]'),
      mode: this.shadowRoot.querySelector('select[name=mode]'),
      edges: this.shadowRoot.querySelector('input[name=edges]'),
      interior: this.shadowRoot.querySelector('input[name=interior]'),
      windows: this.shadowRoot.querySelector('input[name=windows]'),
      fit: this.shadowRoot.querySelector('button[name=fit]'),
      tooltip: this.shadowRoot.querySelector('.tooltip'),
      empty: this.shadowRoot.querySelector('.empty'),
      status: this.shadowRoot.querySelector('.status'),
    };

    this._initThree();
    this._bindUI();
  }

  // ----- Cycle de vie ------------------------------------------------------

  connectedCallback() {
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this);
    this._resize();
    this._startLoop();
    this._syncAttributes();
    if (this.hasAttribute('src') && !this._model) this.loadURL(this.getAttribute('src'));
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'src') {
      if (this.isConnected && newValue) this.loadURL(newValue);
      this._els.fileBtn.hidden = !!newValue;
    } else if (name === 'color-mode') {
      this.colorMode = newValue || 'type';
    } else {
      this._syncAttributes();
    }
  }

  _syncAttributes() {
    this._els.toolbar.hidden = this.hasAttribute('no-toolbar');
    this._els.fileBtn.hidden = this.hasAttribute('src');
    this._grid.visible = !this.hasAttribute('no-grid');
    this._emitLegendData();
  }

  // ----- API publique ------------------------------------------------------

  /** Charge un IDF à partir de son texte. Retourne le modèle parsé. */
  async loadIDF(text) {
    return this._load(String(text), ++this._loadToken);
  }

  /** Télécharge puis charge un IDF. Retourne le modèle parsé (ou null si remplacé par un autre chargement). */
  async loadURL(url) {
    const token = ++this._loadToken;
    this._setStatus(`Téléchargement de ${url}…`);
    let text;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} (${url})`);
      text = await res.text();
    } catch (error) {
      this._fail(error);
      throw error;
    }
    if (token !== this._loadToken) return null; // un autre chargement a pris le relais
    return this._load(text, token);
  }

  _load(text, token) {
    this._setStatus('Analyse de l’IDF…');
    try {
      const model = parseGeometryIDF(text);
      if (token !== this._loadToken) return model;
      if (!model.surfaces.length && !model.shading.length) {
        throw new Error('Aucune surface géométrique (BuildingSurface:Detailed…) trouvée dans ce fichier.');
      }
      this._renderGeometry(model);
      this._setStatus(null);
      this.dispatchEvent(new CustomEvent('idf-loaded', { detail: { model }, bubbles: true, composed: true }));
      return model;
    } catch (error) {
      this._fail(error);
      throw error;
    }
  }

  _fail(error) {
    this._setStatus(`Erreur : ${error.message}`, true);
    this.dispatchEvent(new CustomEvent('idf-error', { detail: { error }, bubbles: true, composed: true }));
  }

  /** Charge un objet File (input type=file, drag & drop). */
  async loadFile(file) {
    return this.loadIDF(await file.text());
  }

  /** Supprime le modèle affiché. */
  clear() {
    this._disposeGroup();
    this._model = null;
    this._els.empty.hidden = false;
    this._emitLegendData();
  }

  /** Recentre la caméra sur le modèle. */
  fitView() {
    if (!this._group) return;
    const box = new THREE.Box3().setFromObject(this._group);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dir = new THREE.Vector3(1, -1.2, 0.8).normalize();

    // Distance minimale pour que les 8 coins de la boîte tiennent dans le champ (vertical et horizontal)
    const vfov = (this._camera.fov * Math.PI) / 180;
    const tanV = Math.tan(vfov / 2);
    const tanH = tanV * this._camera.aspect;
    const forward = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(forward, this._camera.up).normalize();
    const upv = new THREE.Vector3().crossVectors(right, forward).normalize();
    let dist = 0;
    const corner = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(sphere.center);
      const depth = corner.dot(forward); // > 0 : plus loin que le centre
      dist = Math.max(dist, Math.abs(corner.dot(right)) / tanH - depth, Math.abs(corner.dot(upv)) / tanV - depth);
    }
    dist = Math.max(dist * 1.08, sphere.radius * 0.5);
    this._camera.position.copy(sphere.center).addScaledVector(dir, dist);
    this._camera.near = Math.max(0.05, dist / 1000);
    this._camera.far = dist * 20 + sphere.radius * 4;
    this._camera.updateProjectionMatrix();
    this._controls.target.copy(sphere.center);
    this._controls.minDistance = sphere.radius * 0.05;
    this._controls.maxDistance = dist * 10;
    this._controls.update();
  }

  get model() {
    return this._model;
  }

  get src() {
    return this.getAttribute('src');
  }
  set src(value) {
    if (value == null) this.removeAttribute('src');
    else if (value === this.getAttribute('src')) this.loadURL(value).catch(() => {}); // même URL → recharge
    else this.setAttribute('src', value);
  }

  get colorMode() {
    return this._colorMode;
  }
  set colorMode(mode) {
    const m = ['type', 'zone', 'boundary'].includes(mode) ? mode : 'type';
    this._colorMode = m;
    this._els.mode.value = m;
    if (this.getAttribute('color-mode') !== m) this.setAttribute('color-mode', m);
    this._applyColors();
    this._emitLegendData();
  }

  get showEdges() {
    return this._showEdges;
  }
  set showEdges(v) {
    this._showEdges = !!v;
    this._els.edges.checked = this._showEdges;
    this._applyVisibility();
  }

  get showInterior() {
    return this._showInterior;
  }
  set showInterior(v) {
    this._showInterior = !!v;
    this._els.interior.checked = this._showInterior;
    this._applyVisibility();
  }

  get showWindows() {
    return this._showWindows;
  }
  set showWindows(v) {
    this._showWindows = !!v;
    this._els.windows.checked = this._showWindows;
    this._applyVisibility();
  }

  /** Affiche / masque une zone. */
  setZoneVisible(zoneName, visible) {
    this._zoneVisible.set(zoneName, !!visible);
    this._applyVisibility();
    this._emitLegendData();
  }

  /** Accès aux objets three.js pour les usages avancés. */
  get three() {
    return { scene: this._scene, camera: this._camera, renderer: this._renderer, controls: this._controls, group: this._group };
  }

  // ----- three.js ----------------------------------------------------------

  _initThree() {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this._renderer.setClearColor(0x000000, 0);
    this._els.host.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();

    this._camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    this._camera.up.set(0, 0, 1); // repère EnergyPlus : Z vers le haut
    this._camera.position.set(30, -30, 20);

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = 0.1;
    this._controls.screenSpacePanning = true;

    this._scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 0.8);
    hemi.position.set(0, 0, 1);
    this._scene.add(hemi);
    this._sun = new THREE.DirectionalLight(0xffffff, 1.1);
    this._sun.position.set(40, -30, 60);
    this._scene.add(this._sun);
    this._scene.add(this._sun.target);

    this._grid = new THREE.GridHelper(100, 50, 0xb0b6be, 0xd5d9df);
    this._grid.rotation.x = Math.PI / 2; // plan XY (sol)
    this._scene.add(this._grid);

    this._edgeMaterial = new THREE.LineBasicMaterial({ color: 0x2b2f33, transparent: true, opacity: 0.75 });
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
  }

  _resize() {
    const w = Math.max(1, this.clientWidth);
    const h = Math.max(1, this.clientHeight);
    this._renderer.setSize(w, h, false);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  }

  _startLoop() {
    if (this._raf) return;
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this._controls.update();
      this._renderer.render(this._scene, this._camera);
    };
    loop();
  }

  _disposeGroup() {
    if (!this._group) return;
    this._group.traverse((obj) => {
      obj.geometry?.dispose();
      if (obj.material && obj.material !== this._edgeMaterial) obj.material.dispose();
    });
    this._scene.remove(this._group);
    this._group = null;
    this._pickables = [];
    this._hovered = null;
    this._els.tooltip.hidden = true;
  }

  _renderGeometry(model) {
    this._disposeGroup();
    this._model = model;
    this._els.empty.hidden = true;

    // Couleurs de zones
    this._zoneColors.clear();
    model.zones.forEach((z, i) => this._zoneColors.set(z.name, ZONE_PALETTE[i % ZONE_PALETTE.length]));
    const previousVisibility = this._zoneVisible;
    this._zoneVisible = new Map(model.zones.map((z) => [z.name, previousVisibility.get(z.name) ?? true]));

    const group = new THREE.Group();
    const flipNormals = model.vertexEntryDirection === 'clockwise';

    const fenByBase = new Map();
    for (const f of model.fenestrations) {
      const key = f.baseSurface.toLowerCase();
      if (!fenByBase.has(key)) fenByBase.set(key, []);
      fenByBase.get(key).push(f);
    }

    const addMesh = (item, built, { interior = false, offset = null }) => {
      const glazed = item.kind === 'fenestration' && GLAZED_TYPES.has((item.type || '').toLowerCase());
      const material = new THREE.MeshLambertMaterial({
        side: THREE.DoubleSide,
        transparent: glazed || item.kind === 'shading',
        opacity: glazed ? 0.45 : item.kind === 'shading' ? 0.85 : 1,
        depthWrite: !glazed,
        polygonOffset: item.kind === 'fenestration',
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const mesh = new THREE.Mesh(built.geometry, material);
      mesh.userData = { item, interior, glazed, area: built.area, normal: built.normal, offset };
      mesh.renderOrder = glazed ? 2 : 0;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(built.geometry, 1), this._edgeMaterial);
      edges.userData.isEdges = true;
      edges.raycast = () => {};
      mesh.add(edges);
      group.add(mesh);
      this._pickables.push(mesh);
      return mesh;
    };

    const placed = new Set();
    for (const s of model.surfaces) {
      let n = polygonNormal(s.vertices);
      if (!n) continue;
      if (flipNormals) n = n.map((v) => -v);
      const interior = isInteriorBC(s.outsideBC);
      // Surfaces intérieures : léger décalage vers l'intérieur de la zone pour
      // séparer les paires de surfaces coïncidentes (évite le scintillement).
      const offset = interior ? n.map((v) => -v * 0.01) : null;
      const fens = fenByBase.get(s.name.toLowerCase()) || [];
      const built = buildPolygonGeometry(THREE, s.vertices, fens.map((f) => f.vertices), { offset });
      if (!built) {
        console.warn(`[idf-viewer] surface ignorée (dégénérée) : ${s.name}`);
        continue;
      }
      addMesh(s, built, { interior, offset });
      for (const f of fens) {
        const fb = buildPolygonGeometry(THREE, f.vertices, [], { offset });
        if (fb) addMesh(f, fb, { interior, offset });
        placed.add(f);
      }
    }
    for (const f of model.fenestrations) {
      if (placed.has(f)) continue;
      const fb = buildPolygonGeometry(THREE, f.vertices);
      if (fb) addMesh(f, fb, {});
    }
    for (const sh of model.shading) {
      const b = buildPolygonGeometry(THREE, sh.vertices);
      if (b) addMesh(sh, b, {});
    }

    this._group = group;
    this._scene.add(group);

    // Grille sous le modèle (à sa base, pour ne pas masquer les niveaux enterrés)
    const bounds = model.bounds;
    const size = Math.max(bounds.size[0], bounds.size[1], 10);
    const gridSize = Math.ceil(size * 1.6 / 10) * 10;
    this._scene.remove(this._grid);
    const cell = size > 80 ? 10 : size > 30 ? 5 : size > 12 ? 2 : 1; // maille de la grille (m)
    this._grid = new THREE.GridHelper(gridSize, Math.max(2, Math.round(gridSize / cell)), 0xb0b6be, 0xd5d9df);
    this._grid.rotation.x = Math.PI / 2;
    this._grid.position.set(bounds.center[0], bounds.center[1], bounds.min[2] - 0.02);
    this._grid.visible = !this.hasAttribute('no-grid');
    this._scene.add(this._grid);

    this._sun.position.set(bounds.center[0] + size, bounds.center[1] - size * 0.8, bounds.max[2] + size * 1.2);
    this._sun.target.position.set(bounds.center[0], bounds.center[1], bounds.center[2]);

    this._applyColors();
    this._applyVisibility();
    this._emitLegendData();
    this.fitView();
  }

  _colorFor(item) {
    if (this._colorMode === 'zone') {
      if (item.kind === 'fenestration') return colorByType(item);
      return this._zoneColors.get(item.zone) ?? (item.kind === 'shading' ? TYPE_COLORS.shading : 0xbbbbbb);
    }
    if (this._colorMode === 'boundary') return colorByBoundary(item);
    return colorByType(item);
  }

  _applyColors() {
    for (const mesh of this._pickables) {
      mesh.material.color.setHex(this._colorFor(mesh.userData.item));
      mesh.material.emissive?.setHex(0x000000);
    }
  }

  _applyVisibility() {
    for (const mesh of this._pickables) {
      const { item, interior, glazed } = mesh.userData;
      let visible = true;
      if (item.zone && this._zoneVisible.has(item.zone)) visible = this._zoneVisible.get(item.zone);
      if (interior && !this._showInterior) visible = false;
      if (glazed && !this._showWindows) visible = false;
      mesh.visible = visible;
      for (const child of mesh.children) if (child.userData.isEdges) child.visible = this._showEdges;
    }
  }

  // ----- Interface ---------------------------------------------------------

  _bindUI() {
    const e = this._els;
    e.fileInput.addEventListener('change', () => {
      const file = e.fileInput.files?.[0];
      if (file) this.loadFile(file).catch(() => {});
      e.fileInput.value = '';
    });
    e.mode.addEventListener('change', () => (this.colorMode = e.mode.value));
    e.edges.addEventListener('change', () => (this.showEdges = e.edges.checked));
    e.interior.addEventListener('change', () => (this.showInterior = e.interior.checked));
    e.windows.addEventListener('change', () => (this.showWindows = e.windows.checked));
    e.fit.addEventListener('click', () => this.fitView());

    // Glisser-déposer
    this.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      this.classList.add('dragover');
    });
    this.addEventListener('dragleave', () => this.classList.remove('dragover'));
    this.addEventListener('drop', (ev) => {
      ev.preventDefault();
      this.classList.remove('dragover');
      const file = ev.dataTransfer?.files?.[0];
      if (file) this.loadFile(file).catch(() => {});
    });

    // Survol → info-bulle
    const canvas = this._renderer.domElement;
    canvas.addEventListener('pointermove', (ev) => this._onPointerMove(ev));
    canvas.addEventListener('pointerleave', () => this._setHovered(null));
    canvas.addEventListener('dblclick', () => this.fitView());
  }

  _onPointerMove(ev) {
    if (!this._pickables.length) return;
    const rect = this._renderer.domElement.getBoundingClientRect();
    this._pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    this._raycaster.setFromCamera(this._pointer, this._camera);
    const hits = this._raycaster.intersectObjects(this._pickables.filter((m) => m.visible), false);
    const mesh = hits[0]?.object || null;
    this._setHovered(mesh);
    if (mesh) {
      const t = this._els.tooltip;
      const x = ev.clientX - rect.left + 14;
      const y = ev.clientY - rect.top + 14;
      t.style.left = `${Math.min(x, rect.width - t.offsetWidth - 8)}px`;
      t.style.top = `${Math.min(y, rect.height - t.offsetHeight - 8)}px`;
    }
  }

  _setHovered(mesh) {
    if (this._hovered === mesh) return;
    if (this._hovered) this._hovered.material.emissive.setHex(0x000000);
    this._hovered = mesh;
    const t = this._els.tooltip;
    if (!mesh) {
      t.hidden = true;
      return;
    }
    mesh.material.emissive.setHex(0x333333);
    const { item, area } = mesh.userData;
    const rows = [];
    rows.push(`<b>${escapeHTML(item.name)}</b>`);
    rows.push(`<span class="dim">Type</span> ${escapeHTML(item.type)}${item.kind === 'shading' ? ` (${item.scope})` : ''}`);
    if (item.construction) rows.push(`<span class="dim">Construction</span> ${escapeHTML(item.construction)}`);
    if (item.zone) rows.push(`<span class="dim">Zone</span> ${escapeHTML(item.zone)}`);
    if (item.kind === 'surface') {
      rows.push(`<span class="dim">Limite</span> ${escapeHTML(item.outsideBC)}${item.outsideBCObject ? ` → ${escapeHTML(item.outsideBCObject)}` : ''}`);
    }
    if (item.kind === 'fenestration') rows.push(`<span class="dim">Support</span> ${escapeHTML(item.baseSurface)}`);
    rows.push(`<span class="dim">Aire brute</span> ${area.toFixed(2)} m² · ${item.vertices.length} sommets`);
    t.innerHTML = rows.join('<br>');
    t.hidden = false;
  }

  /** Return legend data without exposing Three.js internals. */
  getLegendData() {
    if (!this._model || this.hasAttribute('no-legend')) return null;
    const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    const zones = this._model.zones.map((z) => ({
      name: z.name,
      count: this._model.surfaces.filter((s) => s.zone === z.name).length,
      color: this._colorMode === 'zone' ? hex(this._zoneColors.get(z.name)) : '#c9ced6',
      visible: this._zoneVisible.get(z.name) !== false,
    }));
    let keys = [];
    if (this._colorMode === 'boundary') keys = [['Extérieur', BOUNDARY_COLORS.outdoors], ['Sol', BOUNDARY_COLORS.ground], ['Surface / zone', BOUNDARY_COLORS.surface], ['Adiabatique', BOUNDARY_COLORS.adiabatic], ['Autre', BOUNDARY_COLORS.other]];
    if (this._colorMode === 'type') keys = [['Mur extérieur', TYPE_COLORS.wall], ['Mur intérieur', TYPE_COLORS.wallInterior], ['Mur enterré', TYPE_COLORS.wallGround], ['Toiture', TYPE_COLORS.roof], ['Plafond', TYPE_COLORS.ceiling], ['Plancher', TYPE_COLORS.floor], ['Plancher sur sol', TYPE_COLORS.floorGround]];
    if (this._model.fenestrations.length) keys.push(['Fenêtre', TYPE_COLORS.window], ['Porte vitrée', TYPE_COLORS.glassdoor], ['Porte', TYPE_COLORS.door]);
    if (this._model.shading.length) keys.push(['Masque', TYPE_COLORS.shading]);
    return { colorMode: this._colorMode, zones, keys: keys.map(([label, color]) => ({ label, color: hex(color) })) };
  }

  _emitLegendData() {
    this.dispatchEvent(new CustomEvent('legend-data-changed', { detail: { data: this.getLegendData() }, bubbles: true, composed: true }));
  }

  _setStatus(message, isError = false) {
    const s = this._els.status;
    if (!message) {
      s.hidden = true;
      return;
    }
    s.textContent = message;
    s.classList.toggle('error', isError);
    s.hidden = false;
  }
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

if (!customElements.get('idf-viewer')) customElements.define('idf-viewer', IdfViewer);

export default IdfViewer;
