---
layout: default
permalink: gallery.html
---
<div class="row">
    <div class="col" id="info">
      <button class="btn btn-outline-success" id="v3v" data-i18n="philosophy3d.valve">Vanne</button>
      <button class="btn btn-outline-success" id="pump" data-i18n="philosophy3d.pump">Pompe</button>
      <button class="btn btn-outline-success" id="servo" data-i18n="philosophy3d.servo">Servomoteur</button>
      <button class="btn btn-outline-success" id="burner" data-i18n="philosophy3d.burner">Brûleur</button>
    </div>
    <div class="col-sm" id="cta"></div>
</div>
<div id=choice></div>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
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
