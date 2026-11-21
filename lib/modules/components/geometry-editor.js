// geometry-yml-editor.js
import { EditorView, basicSetup } from
    "https://esm.sh/codemirror@6.0.2";

import { yaml } from
    "https://esm.sh/@codemirror/lang-yaml@6.1.3";


class GeometryYmlEditor extends HTMLElement {

    constructor() {
        super();
        this.editor = null;
        this._value = null;
    }

    connectedCallback() {
        // Évite de créer plusieurs éditeurs sur le même élément.
        if (this.editor) return;
        const container = document.createElement('div');
        container.className = 'geometry-yml-editor__container';
        const style = document.createElement('style');
        style.textContent = `
            .geometry-yml-editor__container {
                border: 1px solid #ccc;
                border-radius: 4px;
                overflow: hidden;
            }
            .geometry-yml-editor__container .cm-editor {
                min-height: 400px;
                max-height: 700px;
            }
            .geometry-yml-editor__container .cm-scroller {
                overflow: auto;
            }
        `;
        this.replaceChildren(style, container);
        this.editor = new EditorView({
            doc: this.value,
            extensions: [
                basicSetup,
                yaml(),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        this.dispatchEvent(new CustomEvent('yaml-change', {
                            detail: {
                                value: update.state.doc.toString()
                            },
                            bubbles: true
                        }));
                    }
                })
            ],
            parent: container
        });
    }

    disconnectedCallback() {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }

    get value() {
        return this.editor
            ? this.editor.state.doc.toString()
            : (this._value ?? this.getAttribute('value') ?? 'name: example\n');
    }

    // Permet de modifier le contenu depuis l'extérieur.
    set value(text) {
        this._value = text;
        if (!this.editor) return;
        this.editor.dispatch({
            changes: {
                from: 0,
                to: this.editor.state.doc.length,
                insert: text
            }
        });
    }

    // Permet de donner le focus à l'éditeur.
    focus() {
        this.editor?.focus();
    }
}

customElements.define('geometry-yml-editor', GeometryYmlEditor);
