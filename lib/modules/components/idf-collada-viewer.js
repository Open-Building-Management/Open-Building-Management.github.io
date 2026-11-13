/**
 * collada viewer component
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

const COLLADA_FOLDER = "/collada"

class ColladaViewer extends HTMLElement {

    static get observedAttributes() {
        return ['file'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.resizeObserver = null;
        this.animationFrame = null;
        this.loadId = 0;
    }

    connectedCallback() {
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
                }
                canvas {
                    display: block;
                }
            </style>
            <div id="viewer"></div>
        `;

        this.container = this.shadowRoot.querySelector('#viewer');
        this.init();
        this.loadModel(this.getAttribute('file'));
        this.animate();
        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
        });
        this.resizeObserver.observe(this.container);
    }

    disconnectedCallback() {
        this.resizeObserver?.disconnect();
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.loadId++;
        this.controls?.dispose();
        if (this.model) {
            this.scene.remove(this.model);
            this.disposeModel(this.model);
            this.model = null;
        }
        this.renderer?.dispose();
        this.renderer?.domElement.remove();
        this.renderer = null;
        this.controls = null;
        this.scene = null;
        this.camera = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (
            name === 'file' &&
            oldValue !== newValue &&
            this.isConnected
        ) {
            this.loadModel(newValue);
        }
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
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
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enablePan = false;
        this.resize();
    }

    loadModel(file) {
        const loadId = ++this.loadId;
        if (this.model) {
            this.scene.remove(this.model);
            this.disposeModel(this.model);
            this.model = null;
        }
        if (!file) {
            this.render();
            return;
        }
        const loader = new ColladaLoader();
        loader.load(
            `${COLLADA_FOLDER}/${file}.dae`,
            (collada) => {
                if (
                    !this.isConnected ||
                    loadId !== this.loadId
                ) {
                    this.disposeModel(collada.scene);
                    return;
                }
                this.model = collada.scene;
                this.scene.add(this.model);
                this.render();
            },
            undefined,
            (error) => {
                if (loadId === this.loadId) {
                    console.error(
                        `Erreur de chargement Collada : ${file}`,
                        error
                    );
                }
            }
        );
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
        model.traverse((child) => {
            if (!child.isMesh) return;
            child.geometry?.dispose();
            const materials = Array.isArray(child.material)
                ? child.material
                : [child.material];
            materials.forEach((material) => {
                material?.dispose();
            });
        });
    }
}
    
if (!customElements.get('collada-viewer')) {
    customElements.define('collada-viewer', ColladaViewer);
}

export default ColladaViewer;
