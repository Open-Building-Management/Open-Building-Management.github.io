---
layout: default
permalink: philosophy3D.html
---
<div class="row">
    <div class="col" id="info">
      <p class="font-weight-bold" data-i18n="philosophy.title">En route vers l'internet de l'énergie</p>
      <p data-i18n="philosophy.paragraph1">Dans le monde du numérique, peu de startups se penchent sur l’expérience ressentie par les agents de terrain, qui font des actions mécaniques, dans le cambouis toute la journée, au fond des salles des machines et des chaufferies.</p>
      <p data-i18n="philosophy.paragraph2">Pourtant, s'il y a bien une population pour qui l'exploitation de la donnée peut s'avérer fondamentale, c'est bien celle-là.</p>
      <p data-i18n="philosophy.paragraph3">OBM veut créer une plateforme tech qui changerait le quotidien des agents de terrain, en remplaçant intégralement le modèle productiviste du passé par un modèle centré client.</p>
      <p data-i18n="philosophy.paragraph4">C'est pourquoi nous faisons le choix de nous intéresser de près au hardware et aux actionneurs. Nous ne voulons pas d'un nouveau produit se rajoutant verticalement aux logiciels existants, mais changer de paradigme pour révolutionner les métiers de la maintenance.</p>

        <button class="btn btn-outline-success" id="v3v" data-i18n="philosophy3d.valve">Vanne</button>
        <button class="btn btn-outline-success" id="pump" data-i18n="philosophy3d.pump">Pompe</button>
        <button class="btn btn-outline-success" id="servo" data-i18n="philosophy3d.servo">Servomoteur</button>
        <button class="btn btn-outline-success" id="burner" data-i18n="philosophy3d.burner">Brûleur</button>
    </div>
    <div class="col-sm" id="cta"></div>
</div>
<div id=choice></div>

<script type="module">
import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/controls/OrbitControls.js';
import { ColladaLoader } from './lib/loaders/ColladaLoader.js';
let container, info;
let camera, scene, renderer, hvac;

init("V3V");
document.getElementById("choice").setAttribute("value", "V3V");
animate();

document.getElementById("v3v").addEventListener("click", () => {
  document.getElementById("choice").setAttribute("value", "V3V");
  init("V3V");
});
document.getElementById("pump").addEventListener("click", () => {
  document.getElementById("choice").setAttribute("value", "pompes");
  init("pompes");
});
document.getElementById("servo").addEventListener("click", () => {
  document.getElementById("choice").setAttribute("value", "servo");
  init("servo");
});
document.getElementById("burner").addEventListener("click", () => {
  document.getElementById("choice").setAttribute("value", "bruleur");
  init("bruleur");
});

function init(element) {
    document.getElementById('cta').innerHTML = "";
    container = document.getElementById('cta');
    info = document.getElementById('info');
    container.width = info.clientWidth;
    container.height = Math.max(info.clientHeight, 320);
    camera = new THREE.PerspectiveCamera(15, container.width / container.height, 0.1, 50);
    camera.position.set(10, 10, 20);
    camera.lookAt(0, 0, 0);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const loadingManager = new THREE.LoadingManager(function () { scene.add(hvac); });
    const loader = new ColladaLoader(loadingManager);
    loader.load('/collada/' + element + '.dae', function (collada) { hvac = collada.scene; });
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0).normalize();
    scene.add(directionalLight);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.width, container.height);
    renderer.localClippingEnabled = true;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    controls.enablePan = false;
    container.appendChild(renderer.domElement);
}
function animate() {
    requestAnimationFrame(animate);
    render();
}
function render() {
    if (renderer && scene && camera) renderer.render(scene, camera);
}
</script>
