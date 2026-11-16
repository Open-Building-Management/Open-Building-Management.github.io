/**
 * Collada viewer component
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

const COLLADA_FOLDER = '/collada';

class ColladaViewer extends HTMLElement {

    static get observedAttributes() {
        return ['file', 'zoom', 'camera-rotation', 'report-mouse-position'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container = null;
        // Map of source elements to their loading states
        this.objects = new Map();
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.animationFrame = null;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.positionDisplay = null;
    }

    connectedCallback() {
        // Avoid initializing twice
        if (this.renderer) return;
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 320px;
                }
                #viewer {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                #mouse-position {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    z-index: 1;
                    padding: 5px 8px;
                    border-radius: 3px;
                    background: rgba(255, 255, 255, 0.9);
                    color: #222;
                    font: 12px/1.4 monospace;
                    pointer-events: none;
                }
                #mouse-position[hidden] {
                    display: none;
                }
                canvas {
                    display: block;
                }
            </style>
            <div id="viewer">
                <output id="mouse-position" hidden>X: — &nbsp; Y: — &nbsp; Z: —</output>
            </div>
        `;

        this.container = this.shadowRoot.querySelector('#viewer');
        this.positionDisplay = this.shadowRoot.querySelector('#mouse-position');
        this.init();
        this.updateMousePositionDisplay();
        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
        });
        this.resizeObserver.observe(this.container);

        // Watch for changes to child objects and their attributes
        this.mutationObserver = new MutationObserver(() => {
            this.syncObjects();
        });
        this.mutationObserver.observe(this, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                'file',
                'position',
                'rotation',
                'scale',
                'hide-lines',
                'width',
                'height',
                'depth',
                'opacity'
            ]
        });

        this.syncObjects();
        this.animate();
    }

    disconnectedCallback() {
        this.resizeObserver?.disconnect();
        this.mutationObserver?.disconnect();

        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        for (const state of this.objects.values()) {
            this.disposeState(state);
        }
        this.objects.clear();

        this.controls?.dispose();
        this.renderer?.dispose();
        this.renderer?.domElement.remove();

        this.resizeObserver = null;
        this.mutationObserver = null;
        this.renderer = null;
        this.controls = null;
        this.scene = null;
        this.camera = null;
        this.container = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (!this.isConnected) return;

        if (name === 'file') {
            this.syncObjects();
        }

        if (name === 'zoom' && this.camera) {
            this.applyZoom();
        }

        if (name === 'camera-rotation' && this.camera) {
            this.fitToObjects();
            this.render();
        }

        if (name === 'report-mouse-position') {
            this.updateMousePositionDisplay();
        }
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        if (this.hasAttribute('axes')) {
            const axes = Number(this.getAttribute('axes'));
            this.axes = new THREE.AxesHelper(axes);
            this.scene.add(this.axes);
        }
        this.camera = new THREE.PerspectiveCamera(
            15, 1, 0.1, 50
        );
        this.camera.position.set(10, 10, 20);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(
            new THREE.AmbientLight(0xffffff, 0.4)
        );
        const directionalLight = new THREE.DirectionalLight(
            0xffffff, 0.8
        );
        directionalLight.position.set(1, 1, 0).normalize();
        this.scene.add(directionalLight);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.localClippingEnabled = true;
        this.container.appendChild(this.renderer.domElement);
        this.renderer.domElement.addEventListener(
            'pointermove',
            event => this.reportMousePosition(event)
        );
        this.renderer.domElement.addEventListener(
            'pointerleave',
            () => this.resetMousePosition()
        );
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enablePan = false;
        this.resize();
    }

    updateMousePositionDisplay() {
        if (!this.positionDisplay) return;

        const enabled = this.hasAttribute('report-mouse-position');
        this.positionDisplay.hidden = !enabled;
        if (enabled) this.resetMousePosition();
    }

    resetMousePosition() {
        if (this.positionDisplay) {
            this.positionDisplay.textContent = 'X: —   Y: —   Z: —';
        }
    }

    reportMousePosition(event) {
        if (!this.hasAttribute('report-mouse-position')) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const targets = [...this.objects.values()]
            .map(state => state.group)
            .filter(Boolean);

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersections = this.raycaster.intersectObjects(targets, true);
        const hit = intersections.find(item => item.object.isMesh);

        if (!hit) {
            this.resetMousePosition();
            return;
        }

        const { x, y, z } = hit.point;
        this.positionDisplay.textContent =
            `X: ${x.toFixed(2)}   Y: ${y.toFixed(2)}   Z: ${z.toFixed(2)}`;
    }

    /**
     * Synchronize the Three.js scene with the HTML declaration.
     *
     * If collada-object children exist, they take precedence
     * over the legacy file attribute.
     */
    syncObjects() {
        if (!this.scene) return;

        const children = Array.from(this.children);
        const colladaObjects = children.filter(
            child => child.tagName.toLowerCase() === 'collada-object'
        );
        const walls = children.filter(
            child => child.tagName.toLowerCase() === 'collada-wall'
        );

        // Explicit collada-object children replace the legacy viewer file.
        // Walls can coexist with either declaration style.
        const sources = [
            ...(colladaObjects.length
                ? colladaObjects
                : (this.hasAttribute('file') ? [this] : [])),
            ...walls
        ];

        const desired = new Map();

        for (const source of sources) {
            const kind = source.tagName.toLowerCase() === 'collada-wall'
                ? 'wall'
                : 'collada';

            const position = this.parseVector(
                source.getAttribute('position'),
                [0, 0, 0]
            );

            if (kind === 'wall') {
                const width = Number(source.getAttribute('width'));
                const height = Number(source.getAttribute('height'));
                const depth = Number(source.getAttribute('depth'));
                const opacityValue = source.getAttribute('opacity');
                const opacity = opacityValue === null
                    ? 1
                    : Number(opacityValue);

                if (
                    ![width, height, depth].every(
                        value => Number.isFinite(value) && value > 0
                    ) ||
                    !Number.isFinite(opacity) ||
                    opacity < 0 ||
                    opacity > 1
                ) {
                    console.warn('Invalid collada-wall dimensions or opacity:', source);
                    continue;
                }

                const signature = JSON.stringify({
                    kind,
                    position,
                    width,
                    height,
                    depth,
                    opacity
                });

                desired.set(source, {
                    kind,
                    position,
                    width,
                    height,
                    depth,
                    opacity,
                    signature
                });
                continue;
            }

            const file = source.getAttribute('file');
            if (!file) continue;

            const rotation = this.parseVector(
                source.getAttribute('rotation'),
                [0, 0, 0]
            );

            const scale = this.parseVector(
                source.getAttribute('scale'),
                [1, 1, 1],
                true
            );

            const signature = JSON.stringify({
                kind,
                file,
                position,
                rotation,
                scale,
                hideLines: source.hasAttribute('hide-lines')
            });

            desired.set(source, {
                kind,
                file,
                position,
                rotation,
                scale,
                signature
            });
        }

        let sceneChanged = false;

        // Remove objects that are no longer declared
        for (const [source, state] of this.objects) {
            const spec = desired.get(source);

            if (!spec || spec.signature !== state.signature) {
                this.disposeState(state);
                this.objects.delete(source);
                sceneChanged = true;
            }
        }

        // Load new objects or changed declarations
        for (const [source, spec] of desired) {
            if (this.objects.has(source)) continue;

            const state = {
                signature: spec.signature,
                token: {},
                group: null
            };

            this.objects.set(source, state);

            if (spec.kind === 'wall') {
                this.loadWall(spec, state);
            } else {
                this.loadObject(source, spec, state);
            }
        }

        if (sceneChanged) {
            this.fitToObjects();
            this.render();
        }
    }

    /**
     * Parse a vector from "x y z".
     * Scale also accepts a single value, e.g. "0.8".
     */
    parseVector(value, fallback, allowScalar = false) {
        if (!value) return [...fallback];

        const values = value.trim().split(/[\s,]+/).map(Number);

        if (
            allowScalar &&
            values.length === 1 &&
            Number.isFinite(values[0])
        ) {
            return [values[0], values[0], values[0]];
        }

        if (
            values.length !== 3 ||
            !values.every(Number.isFinite)
        ) {
            console.warn('Invalid Collada vector:', value);
            return [...fallback];
        }

        return values;
    }

    /**
     * Create a declarative wall from a box geometry.
     * Position is the wall origin (the minimum X/Y/Z corner).
     */
    loadWall(spec, state) {
        const geometry = new THREE.BoxGeometry(
            spec.width,
            spec.height,
            spec.depth
        );
        // BoxGeometry is centred on its origin; move it so the wall origin
        // is at the minimum X/Y/Z corner, like a COLLADA object's origin.
        geometry.translate(
            spec.width / 2,
            spec.height / 2,
            spec.depth / 2
        );
        const material = new THREE.MeshStandardMaterial({
            color: 0xb8b8b8,
            transparent: spec.opacity < 1,
            opacity: spec.opacity,
            depthWrite: spec.opacity === 1
        });
        const wall = new THREE.Mesh(geometry, material);

        wall.position.set(...spec.position);
        state.group = wall;
        this.scene.add(wall);

        this.fitToObjects();
        this.applyZoom();
        this.render();
    }

    loadObject(source, spec, state) {
        const loader = new ColladaLoader();

        loader.load(
            `${COLLADA_FOLDER}/${spec.file}.dae`,
            (collada) => {
                // Ignore results from removed or modified objects
                if (
                    !this.isConnected ||
                    this.objects.get(source) !== state
                ) {
                    this.disposeModel(collada.scene);
                    return;
                }

                const model = collada.scene;
                if (source.hasAttribute('hide-lines')) {
                    model.traverse((child) => {
                        if (child.isLine || child.isLineSegments || child.isPoints) {
                            child.visible = false;
                        }
                    });
                }

                const group = new THREE.Group();

                group.add(collada.scene);
                group.position.set(...spec.position);

                group.rotation.set(
                    THREE.MathUtils.degToRad(spec.rotation[0]),
                    THREE.MathUtils.degToRad(spec.rotation[1]),
                    THREE.MathUtils.degToRad(spec.rotation[2])
                );

                group.scale.set(...spec.scale);

                state.group = group;
                this.scene.add(group);

                this.fitToObjects();
                this.applyZoom()
                this.render();
            },
            undefined,
            (error) => {
                if (
                    this.isConnected &&
                    this.objects.get(source) === state
                ) {
                    console.error(
                        `Erreur de chargement Collada : ${spec.file}`,
                        error
                    );
                }
            }
        );
    }

    disposeState(state) {
        // Invalidate any pending asynchronous load
        state.token = {};

        if (state.group) {
            this.scene?.remove(state.group);
            this.disposeModel(state.group);
            state.group = null;
        }
    }

    applyZoom() {
        // global scene zoom
        const isMobile = window.matchMedia('(max-width: 700px)').matches;

        const value = isMobile
            ? this.getAttribute('zoom-mobile') || '100%'
            : this.getAttribute('zoom') || '100%';

        const match = value.match(/^(\d+(?:\.\d+)?)%$/);
        if (!match) return;

        this.camera.zoom = Number(match[1]) / 100;
        this.camera.updateProjectionMatrix();
        this.controls.update();
    }

    /**
     * Automatically frame all loaded objects.
     */
    fitToObjects() {
        if (!this.scene || !this.camera) return;

        const box = new THREE.Box3().setFromObject(this.scene);

        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const sphere = box.getBoundingSphere(new THREE.Sphere());

        const radius = Math.max(sphere.radius, 0.01);
        const direction = new THREE.Vector3(1, 1, 2).normalize();
        const cameraRotation = this.parseVector(
            this.getAttribute('camera-rotation'),
            [0, 0, 0]
        );
        direction.applyEuler(new THREE.Euler(
            THREE.MathUtils.degToRad(cameraRotation[0]),
            THREE.MathUtils.degToRad(cameraRotation[1]),
            THREE.MathUtils.degToRad(cameraRotation[2])
        )).normalize();

        const distance = radius * 1.2 /
            Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2));

        this.camera.position.copy(
            center.clone().add(direction.multiplyScalar(distance))
        );

        this.camera.near = Math.max(distance / 1000, 0.01);
        this.camera.far = distance * 100 + radius;
        this.camera.lookAt(center);
        this.camera.updateProjectionMatrix();

        this.controls.target.copy(center);
        this.controls.update();
    }

    resize() {
        if (!this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (!width || !height) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.render();
    }

    animate() {
        this.animationFrame = requestAnimationFrame(
            () => this.animate()
        );
        this.render();
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    disposeModel(model) {
        const geometries = new Set();
        const materials = new Set();
        const textures = new Set();

        model.traverse((child) => {
            if (!child.isMesh) return;

            if (child.geometry) {
                geometries.add(child.geometry);
            }

            const list = Array.isArray(child.material)
                ? child.material
                : [child.material];

            list.forEach(material => {
                if (!material) return;

                materials.add(material);

                // Dispose textures referenced by material properties
                Object.values(material).forEach(value => {
                    if (value?.isTexture) {
                        textures.add(value);
                    }
                });
            });
        });

        geometries.forEach(item => item.dispose());
        materials.forEach(item => item.dispose());
        textures.forEach(item => item.dispose());
    }
}

if (!customElements.get('collada-viewer')) {
    customElements.define('collada-viewer', ColladaViewer);
}

export default ColladaViewer;
