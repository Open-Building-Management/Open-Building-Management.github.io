/** Standalone legend for an <idf-viewer> element. */
import { t } from "../locales/locales.js";

const TEMPLATE = /* html */ `
<style>
  :host {
    display: block;
    z-index: 3;
    position: static;
    max-width: 100%;
    overflow: auto;
    font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #1f2328;
  }
  :host([hidden]),
  .panel[hidden] {
    display: none;
  }
  .panel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    min-width: 300px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, .92);
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, .18);
    backdrop-filter: blur(4px);
  }
  .column {
    min-width: 0;
  }
  @media (max-width: 480px) {
    .panel {
      grid-template-columns: 1fr;
      min-width: 0;
    }
  }
  h4 {
    margin: 0 0 4px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: #57606a;
  }
  h4 + h4 {
    margin-top: 8px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 1px 0;
  }
  .sw {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, .25);
    flex: none;
  }
  .key {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 1px 0;
    color: #444;
  }
  .muted {
    color: #8b949e;
  }
</style><div class="panel" hidden></div>`;

export class IdfLegend extends HTMLElement {
  static get observedAttributes() {
    return ['viewer'];
  }
  constructor() {
    super(); this.attachShadow({ mode:'open' });
    this.shadowRoot.innerHTML = TEMPLATE;
    this._panel = this.shadowRoot.querySelector('.panel'); this._viewer = null;
    this._onData = (event) => this._render(event.detail?.data ?? null);
  }
  _onLocaleChanged = () => {
    this._render(this._viewer?.getLegendData() ?? null);
  }
  connectedCallback() {
    this._connectViewer();
    document.addEventListener("obm-locale-changed", this._onLocaleChanged);
  }
  disconnectedCallback() {
    this._disconnectViewer();
    document.removeEventListener("obm-locale-changed", this._onLocaleChanged);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) this._connectViewer();
  }
  _connectViewer() {
    this._disconnectViewer();
    const id = this.getAttribute('viewer');
    this._viewer = id ? this.ownerDocument.getElementById(id) : this.parentElement?.querySelector('idf-viewer');
    if (!this._viewer || this._viewer.localName !== 'idf-viewer') {
      this._render(null);
      return;
    }
    this._viewer.addEventListener('legend-data-changed', this._onData);
    this._render(this._viewer.getLegendData?.() ?? null);
  }
  _disconnectViewer() {
    this._viewer?.removeEventListener('legend-data-changed', this._onData);
    this._viewer = null;
  }
  _render(data) {
    if (!data || this._viewer?.hasAttribute('no-legend')) {
      this._panel.hidden = true;
      this._panel.replaceChildren();
      return;
    }

    const doc = this.ownerDocument;
    const zonesColumn = doc.createElement('section');
    zonesColumn.className = 'column';
    const zonesTitle = doc.createElement('h4');
    zonesTitle.textContent = t("legend.zones");
    zonesColumn.append(zonesTitle);

    for (const zone of data.zones) {
      const label = doc.createElement('label');
      const checkbox = doc.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = zone.visible;
      checkbox.addEventListener('change', () => {
        this._viewer?.setZoneVisible(zone.name, checkbox.checked);
      });

      const swatch = doc.createElement('span');
      swatch.className = 'sw';
      swatch.style.backgroundColor = zone.color;
      label.append(
        checkbox,
        swatch,
        doc.createTextNode(zone.name + ' ')
      );

      const count = doc.createElement('span');
      count.className = 'muted';
      count.textContent = '(' + zone.count + ')';
      label.append(count);
      zonesColumn.append(label);
    }

    const keysColumn = doc.createElement('section');
    keysColumn.className = 'column';
    const keysTitle = doc.createElement('h4');
    keysTitle.textContent = t("legend.title");
    keysColumn.append(keysTitle);

    for (const key of data.keys) {
      const row = doc.createElement('div');
      row.className = 'key';
      const swatch = doc.createElement('span');
      swatch.className = 'sw';
      swatch.style.backgroundColor = key.color;
      row.append(swatch, doc.createTextNode(key.label));
      keysColumn.append(row);
    }

    this._panel.replaceChildren(zonesColumn, keysColumn);
    this._panel.hidden = false;
  }
}
if (!customElements.get('idf-legend')) customElements.define('idf-legend', IdfLegend);
export default IdfLegend;
