/** 
 * Live editor for declarative Collada viewer scenes.
 *
 * Usage:
 * <collada-scene-editor>
 *   <collada-viewer>...</collada-viewer>
 * </collada-scene-editor>
 */
class ColladaSceneEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.viewer = null;
        this.editor = null;
        this.status = null;
        this.initialMarkup = '';
        this.updateTimer = null;
        this.initialized = false;
    }

    connectedCallback() {
        if (this.shadowRoot.childElementCount) return;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }
                .editor-layout {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                    gap: 16px;
                    align-items: start;
                }
                .editor-panel,
                .preview-panel {
                    min-width: 0;
                }
                .toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 8px;
                }
                .toolbar label {
                    font-weight: 600;
                }
                button {
                    padding: 6px 12px;
                    border: 1px solid #aaa;
                    border-radius: 4px;
                    background: #f5f5f5;
                    color: #222;
                    cursor: pointer;
                }
                button:hover {
                    background: #e8e8e8;
                }
                textarea {
                    display: block;
                    box-sizing: border-box;
                    width: 100%;
                    min-height: 320px;
                    resize: vertical;
                    padding: 10px;
                    border: 1px solid #aaa;
                    border-radius: 4px;
                    font: 13px/1.5 monospace;
                    tab-size: 2;
                    white-space: pre;
                }
                .status {
                    min-height: 1.5em;
                    margin-top: 6px;
                    color: #555;
                    font-size: 0.9em;
                }
                .status[data-error] {
                    color: #b42318;
                }
                .preview-panel collada-viewer {
                    display: block;
                    width: 100%;
                    height: 320px;
                }
                @media (max-width: 800px) {
                    .editor-layout {
                        grid-template-columns: minmax(0, 1fr);
                    }
                }
            </style>
            <div class="editor-layout">
                <section class="editor-panel">
                    <div class="toolbar">
                        <label for="scene-source">Scene declaration</label>
                        <button type="button" id="reset">Reset</button>
                    </div>
                    <textarea id="scene-source" spellcheck="false"
                        aria-label="Collada scene HTML declarations"></textarea>
                    <div class="status" role="status" aria-live="polite"></div>
                </section>
                <section class="preview-panel">
                    <div class="toolbar">
                        <label>Live preview</label>
                    </div>
                    <slot></slot>
                </section>
            </div>
        `;

        this.editor = this.shadowRoot.querySelector('#scene-source');
        this.status = this.shadowRoot.querySelector('.status');
        this.shadowRoot.querySelector('slot').addEventListener(
            'slotchange',
            () => this.initializeViewer()
        );
        this.initializeViewer();
    }

    initializeViewer() {
        if (this.initialized) return;

        this.viewer = Array.from(this.children).find(
            child => child.tagName.toLowerCase() === 'collada-viewer'
        );

        if (!this.viewer) {
            this.setStatus('Waiting for a direct child <collada-viewer>…');
            return;
        }

        this.initialized = true;
        // Remove trailing whitespace from each line before displaying the markup.
        this.initialMarkup = this.viewer.innerHTML
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n')
            .trim();
        this.editor.value = this.initialMarkup;

        this.editor.addEventListener('input', () => this.scheduleUpdate());
        this.shadowRoot.querySelector('#reset').addEventListener(
            'click',
            () => this.reset()
        );

        this.setStatus('Ready');
    }

    disconnectedCallback() {
        clearTimeout(this.updateTimer);
        this.updateTimer = null;
    }

    scheduleUpdate() {
        clearTimeout(this.updateTimer);
        this.setStatus('Updating…');
        this.updateTimer = setTimeout(() => {
            this.updateTimer = null;
            this.applyMarkup(this.editor.value);
        }, 350);
    }

    reset() {
        clearTimeout(this.updateTimer);
        this.updateTimer = null;
        this.editor.value = this.initialMarkup;
        this.applyMarkup(this.initialMarkup);
    }

    setStatus(message, isError = false) {
        if (!this.status) return;
        this.status.textContent = message;
        this.status.toggleAttribute('data-error', isError);
    }

    applyMarkup(markup) {
        if (!this.viewer) return;

        const template = document.createElement('template');
        template.innerHTML = markup;

        const declarations = Array.from(template.content.childNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE);

        const hasUnexpectedText = Array.from(template.content.childNodes).some(
            node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );

        if (hasUnexpectedText) {
            this.setStatus('Only scene elements are allowed at the top level.', true);
            return;
        }

        const allowedAttributes = {
            'collada-object': ['file', 'position', 'rotation', 'scale', 'hide-lines'],
            'wall': ['position', 'width', 'height', 'depth', 'opacity'],
            'pipe': ['points', 'radius', 'color', 'style', 'closed']
        };

        try {
            declarations.forEach(element => this.validateDeclaration(
                element,
                allowedAttributes
            ));
        } catch (error) {
            this.setStatus(error.message, true);
            return;
        }

        this.reconcileDeclarations(declarations);
        this.setStatus('Scene updated');
    }

    validateDeclaration(element, allowedAttributes) {
        const tag = element.tagName.toLowerCase();
        const allowed = allowedAttributes[tag];

        if (!allowed) {
            throw new Error(`Unsupported element: <${tag}>.`);
        }
        if (element.children.length) {
            throw new Error(`Nested elements are not allowed inside <${tag}>.`);
        }

        for (const attribute of element.attributes) {
            if (!allowed.includes(attribute.name)) {
                throw new Error(`Unknown attribute "${attribute.name}" on <${tag}>.`);
            }
        }

        const number = (name, fallback = null) => {
            const value = element.getAttribute(name);
            if (value === null && fallback !== null) return fallback;
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) {
                throw new Error(`Invalid numeric attribute "${name}" on <${tag}>.`);
            }
            return parsed;
        };

        const vector = (name, fallback = [0, 0, 0], scalar = false) => {
            const value = element.getAttribute(name);
            if (value === null) return fallback;
            const values = value.trim().split(/[\s,]+/).map(Number);
            const validLength = values.length === 3 || (scalar && values.length === 1);
            if (!validLength || !values.every(Number.isFinite)) {
                throw new Error(`"${name}" must contain three numbers on <${tag}>.`);
            }
        };

        if (tag === 'collada-object') {
            if (!element.getAttribute('file')) {
                throw new Error('<collada-object> requires a file attribute.');
            }
            vector('position');
            vector('rotation');
            vector('scale', [1, 1, 1], true);
        }

        if (tag === 'wall') {
            vector('position');
            for (const name of ['width', 'height', 'depth']) {
                if (number(name) <= 0) {
                    throw new Error(`"${name}" must be greater than zero on <wall>.`);
                }
            }
            const opacity = number('opacity', 1);
            if (opacity < 0 || opacity > 1) {
                throw new Error('"opacity" must be between 0 and 1 on <wall>.');
            }
        }

        if (tag === 'pipe') {
            const points = element.getAttribute('points');
            if (!points) throw new Error('<pipe> requires a points attribute.');
            const parsedPoints = points.split(';').map(point =>
                point.trim().split(/[\s,]+/).map(Number)
            );
            if (
                parsedPoints.length < 2 ||
                parsedPoints.some(point =>
                    point.length !== 3 || !point.every(Number.isFinite)
                )
            ) {
                throw new Error('"points" must contain at least two valid 3D points.');
            }
            if (number('radius', 0.1) <= 0) {
                throw new Error('"radius" must be greater than zero on <pipe>.');
            }
            const color = element.getAttribute('color') || '#808080';
            if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
                throw new Error('"color" must be a 3- or 6-digit hexadecimal value.');
            }
            const style = element.getAttribute('style') || 'smooth';
            if (!['smooth', 'industrial'].includes(style)) {
                throw new Error('"style" must be "smooth" or "industrial".');
            }
        }
    }

    reconcileDeclarations(declarations) {
        const existing = Array.from(this.viewer.children);
        const unused = new Set(existing);
        const result = [];

        // First preserve byte-for-byte equivalent declarations, then reuse
        // a remaining element of the same type for edited declarations.
        for (const declaration of declarations) {
            const tag = declaration.tagName.toLowerCase();
            const exact = existing.find(element =>
                unused.has(element) &&
                element.tagName.toLowerCase() === tag &&
                element.outerHTML === declaration.outerHTML
            );
            const reusable = exact || existing.find(element =>
                unused.has(element) &&
                element.tagName.toLowerCase() === tag
            );

            const target = reusable || declaration.cloneNode(true);
            if (reusable) unused.delete(reusable);
            this.syncAttributes(target, declaration);
            result.push(target);
        }

        for (const element of unused) {
            element.remove();
        }

        // Moving an existing node does not change its identity, so the
        // Collada viewer can retain the associated Three.js object/state.
        result.forEach(element => this.viewer.appendChild(element));
    }

    syncAttributes(target, source) {
        for (const attribute of Array.from(target.attributes)) {
            if (!source.hasAttribute(attribute.name)) {
                target.removeAttribute(attribute.name);
            }
        }
        for (const attribute of Array.from(source.attributes)) {
            if (target.getAttribute(attribute.name) !== attribute.value) {
                target.setAttribute(attribute.name, attribute.value);
            }
        }
    }
}

if (!customElements.get('collada-scene-editor')) {
    customElements.define('collada-scene-editor', ColladaSceneEditor);
}

export default ColladaSceneEditor;
