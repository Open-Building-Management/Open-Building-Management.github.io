import { getLocale, setLocale, t } from "./locales.js";

class ObmSiteNav extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.render();
    document.addEventListener("obm-locale-changed", () => this.render());
  }

  render() {
    const locale = getLocale();
    this.root.innerHTML = `
      <style>
        :host { display: block; }
        nav {
          position: fixed; z-index: 1000; top: 0; left: 0; right: 0;
          min-height: 40px; padding: 0 12px; box-sizing: border-box;
          display: flex; align-items: center; gap: 16px;
          background: #000; color: #fff; font: 16px Arial, sans-serif;
        }
        a { color: #fff; text-decoration: none; }
        .logo { display: flex; align-items: center; flex: 0 0 auto; }
        .logo img { display: block; height: 40px; width: auto; }
        .toggle {
          display: none; margin-left: auto; padding: 6px 9px;
          color: #fff; background: transparent; border: 1px solid #888;
          border-radius: 4px; font-size: 20px; cursor: pointer;
        }
        .links { display: flex; align-items: center; gap: 20px; }
        .links a { padding: 10px 0; }
        .brand { margin-left: auto; white-space: nowrap; font-weight: bold; }
        .language { color: #fff; background: #222; border: 1px solid #777; padding: 4px; }
        @media (max-width: 800px) {
          nav { flex-wrap: wrap; padding-bottom: 0; }
          .toggle { display: block; }
          .links { display: none; order: 3; flex: 0 0 100%; align-items: flex-start; flex-direction: column; gap: 0; padding: 0 0 8px 56px; }
          .links.open { display: flex; }
          .brand { display: none; }
          .language { margin-left: 0; }
        }
      </style>
      <nav aria-label="${t("nav.main", locale)}">
        <a class="logo" href="/" aria-label="${t("nav.home", locale)}"><img src="/img/logoA.svg" alt="OBM"></a>
        <button class="toggle" type="button" aria-expanded="false" aria-controls="site-links" aria-label="${t("nav.menu", locale)}">☰</button>
        <div class="links" id="site-links">
          <a href="/bios.html">BIOS</a>
          <a href="/philosophy.html">${t("nav.philosophy", locale)}</a>
        </div>
        <div class="brand">Open Building Management</div>
        <label><span class="visually-hidden">${t("language", locale)}</span>
          <select class="language" aria-label="${t("language", locale)}">
            <option value="fr" ${locale === "fr" ? "selected" : ""}>Français</option>
            <option value="en" ${locale === "en" ? "selected" : ""}>English</option>
          </select>
        </label>
      </nav>
      <style>.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }</style>`;

    const button = this.root.querySelector(".toggle");
    const links = this.root.querySelector(".links");
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      links.classList.toggle("open", !expanded);
    });
    links.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        button.setAttribute("aria-expanded", "false");
        links.classList.remove("open");
      });
    });
    this.root.querySelector(".language").addEventListener("change", event => setLocale(event.target.value));
  }
}
customElements.define("obm-site-nav", ObmSiteNav);

class ObmSiteFooter extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.render();
    document.addEventListener("obm-locale-changed", () => this.render());
  }

  render() {
    this.root.innerHTML = `
      <style>
        :host { display: block; font-family: Arial, sans-serif; color: #111; }
        .spacer { display: flex; align-items: flex-end; gap: 24px; height: 300px; }
        .swatches { width: 300px; height: 300px; flex: 0 1 300px; }
        .white { width: auto; max-width: 100%; height: 300px; object-fit: contain; object-position: bottom left; }
        footer { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
        h5 { margin: 1em 0; font-size: 1.1em; }
        hr { border: 0; border-top: 1px solid #ddd; }
        p { line-height: 1.5; }
        @media (max-width: 600px) {
          .spacer { height: auto; min-height: 120px; }
          .swatches { display: none; }
          .white { height: 120px; }
          footer { grid-template-columns: 1fr; gap: 0; }
        }
      </style>
      <div class="spacer" aria-hidden="true">
        <svg class="swatches" viewBox="0 0 300 300">
          <g transform="translate(0,264)">
            <rect fill="#60EBE4" y="0" x="0" width="18" height="18"></rect>
            <rect fill="#9E62E1" y="0" x="36" width="18" height="18"></rect>
            <rect fill="#FFC000" y="0" x="72" width="18" height="18"></rect>
            <rect fill="#FC70E1" y="0" x="108" width="18" height="18"></rect>
          </g>
        </svg>
        <img class="white" src="/img/white.png" alt="">
      </div>
      <footer>
        <section>
          <h5><strong>Open Building Management SAS © 2021</strong></h5><hr>
          <p>8, rue Bardoux<br>63000 Clermont-Ferrand</p>
        </section>
        <section>
          <h5><strong>${t("footer.contact")}</strong></h5><hr>
          <p>06 62 21 74 08</p>
        </section>
      </footer>`;
  }
}
customElements.define("obm-site-footer", ObmSiteFooter);

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
        button { cursor: pointer; border: 0; background: #777; color: white; border-radius: 50%; width: 10px; height: 10px; padding: 0; }
        button[aria-current="true"] { background: #111; }
        .arrow { position: absolute; top: 45%; border: 0; border-radius: 0; width: auto; height: auto; padding: 8px; background: #fff; color: #111; opacity: .75; font-size: 24px; }
        .prev { left: 4px; } .next { right: 4px; }
      </style>
      <div class="frame"><slot></slot><button class="arrow prev" aria-label="${t("philosophy.previousImage")}">‹</button><button class="arrow next" aria-label="${t("philosophy.nextImage")}">›</button></div>
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
    [...this.shadowRoot.querySelector(".controls").children].forEach((button, i) => button.setAttribute("aria-current", String(i === this.index)));
  }
}
customElements.define("obm-carousel", ObmCarousel);
