// geometry-yml-editor.js

import {
    EditorView,
    basicSetup,
    syntaxTree,
    yaml,
    autocompletion
} from "/vendor/codemirror/cm-6.0.2-yaml-6.1.3-base-autocomplete-6.0.0_language-6.0.0.js";


const basicCompletions = (context) => {
    const word = context.matchBefore(/\w*/);

    if (!word || (word.from === word.to && !context.explicit)) {
        return null;
    }
    
    const tree = syntaxTree(context.state);
    const node = tree.resolveInner(context.pos, -1);

    console.log("Position :", context.pos);
    console.log("Mot saisi :", word?.text);

    let current = node;
    let depth = 0;

    while (current) {
        console.log({
            depth,
            name: current.type.name,
            from: current.from,
            to: current.to,
            text: context.state.doc.sliceString(current.from, current.to)
        });

        current = current.parent;
        depth++;
    }

    return {
        from: word.from,
        options: [
            { label: 'name', type: 'keyword' },
            { label: 'blocks', type: 'keyword' },
            { label: 'height', type: 'property' },
            { label: 'use_blocks_vars', type: 'property' },
            { label: 'constructions', type: 'property' },
            { label: 'floors', type: 'property', apply: 'floors: []'},
            { label: 'roofs', type: 'property' },
            { label: 'walls', type: 'property' },
            { label: 'apertures', type: 'property' },
            { label: 'doors', type: 'property' }
        ]
    };
};


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
                autocompletion({
                    override: [basicCompletions]
                }),
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
