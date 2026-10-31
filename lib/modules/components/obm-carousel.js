import { getLocale, setLocale, t } from "../locales/locales.js";

class ObmCarousel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = `
      <style>
        :host { display: block; position: relative; }
        .frame { position: relative; width: 100%; overflow: hidden; }
        ::slotted(.carousel-slide) { display: none; width: 100%; }
        ::slotted(.carousel-slide.active) { display: block; }
        ::slotted(.carousel-slide img) { display: block; width: 100%; height: auto; }
        ::slotted(.carousel-slide .caption) {
          position: absolute; left: 10%; right: 10%; bottom: 12px;
          text-align: center; background: rgba(255,255,255,.75); color: #111;
        }
        ::slotted(.carousel-slide) { position: relative; }
        .controls { display: flex; justify-content: center; gap: 8px; padding: 8px; }
        button {
          cursor: pointer;
          border: 0;
          background: #777;
          color: white;
          border-radius: 50%;
          width: 10px;
          height: 10px;
          padding: 0;
        }
        button[aria-current="true"] { background: #111; }
        .arrow {
          position: absolute;
          top: 45%;
          border: 0;
          border-radius: 0;
          width: auto; height: auto;
          padding: 8px;
          background: #fff;
          color: #111;
          opacity: .75;
          font-size: 24px;
        }
        .prev { left: 4px; } .next { right: 4px; }
      </style>
      <div class="frame">
        <slot></slot>
        <button class="arrow prev" aria-label="${t("philosophy.previousImage")}">‹</button>
        <button class="arrow next" aria-label="${t("philosophy.nextImage")}">›</button>
      </div>
      <div class="controls" aria-label="${t("philosophy.chooseImage")}"></div>`;
    this.slides = [];
    this.index = 0;
    this.shadowRoot.querySelector(".prev").addEventListener("click", () => this.show(this.index - 1));
    this.shadowRoot.querySelector(".next").addEventListener("click", () => this.show(this.index + 1));
    this.shadowRoot.querySelector("slot").addEventListener("slotchange", () => this.refresh());
    document.addEventListener("obm-locale-changed", () => this.updateLabels());
  }
  connectedCallback() { this.refresh(); }
  refresh() {
    this.slides = [...this.children].filter(el => el.classList.contains("carousel-slide"));
    const controls = this.shadowRoot.querySelector(".controls");
    controls.replaceChildren();
    this.slides.forEach((slide, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.addEventListener("click", () => this.show(i));
      controls.append(button);
    });
    this.updateLabels();
    this.show(Math.min(this.index, this.slides.length - 1));
  }
  updateLabels() {
    this.shadowRoot.querySelector(".prev").setAttribute("aria-label", t("philosophy.previousImage"));
    this.shadowRoot.querySelector(".next").setAttribute("aria-label", t("philosophy.nextImage"));
    this.shadowRoot.querySelector(".controls").setAttribute("aria-label", t("philosophy.chooseImage"));
    [...this.shadowRoot.querySelector(".controls").children].forEach((button, i) => {
      button.setAttribute("aria-label", `${t("philosophy.showImage")} ${i + 1}`);
    });
  }
  show(index) {
    if (!this.slides.length) return;
    this.index = (index + this.slides.length) % this.slides.length;
    this.slides.forEach((slide, i) => slide.classList.toggle("active", i === this.index));
    [...this.shadowRoot.querySelector(".controls").children].forEach((button, i) => 
      button.setAttribute("aria-current", String(i === this.index))
    );
  }
}
customElements.define("obm-carousel", ObmCarousel);
