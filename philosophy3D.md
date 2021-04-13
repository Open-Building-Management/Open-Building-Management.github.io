---
layout: default
permalink: philosophy3D.html
---
<div class="row">
    <div class="col" id="info">
      <p class="font-weight-bold">En route vers l'internet de l'énergie</p>
      <p>Dans le monde du numérique, peu de startups se penchent sur l’expérience ressentie par les agents de terrain,
        qui font des actions mécaniques, dans le cambouis toute la journée, au fond des salles des machines et des chaufferies.</p>
      <p>Pourtant, s'il y a bien une population pour qui l'exploitation de la donnée peut s'avérer fondamentale, c'est bien celle là.
        Pourquoi toujours focaliser sur les personnels de bureau qui remplissent des tableaux à n'en plus finir,
        envoyant des mels en continu et qui vont finir par prendre en grippe le software en général.</p>
      <p>OBM veut créer une plateforme tech qui changerait le quotidien des agents de terrain, en remplaçant intégralement
        le modèle productiviste du passé par un modèle centré client.</p>
      <p>C'est pourquoi nous faisons le choix de nous intéresser de près au hardware et aux actionneurs, alors que la concurrence
         se limite à travailler sur l'interopérabilité entre les marques, confortablement confinée dans un univers virtuel.</p>
      <p>Nous ne voulons pas d'un nouveau produit se rajoutant verticalement aux logiciels existants mais changer de paradigme pour révolutionner les métiers de la maintenance.</p>

        <button class="btn btn-outline-success" id="v3v">Vanne</button>
        <button class="btn btn-outline-success" id="pump">Pompe</button>
        <button class="btn btn-outline-success" id="servo">Servomoteur</button>
        <button class="btn btn-outline-success" id="burner">Bruleur</button>
    </div>
    <div class="col-sm" id="cta">
    </div>
</div>
<div id=choice></div>

<script type="module">

import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/controls/OrbitControls.js';
import { ColladaLoader } from './lib/loaders/ColladaLoader.js';
let container, info;
let camera, scene, renderer, hvac;

init("V3V");
$("#choice").attr("value","V3V");
animate();

$("#v3v").click(function(){
  $("#choice").attr("value","V3V");
  init("V3V");
});

$("#pump").click(function(){
  $("#choice").attr("value","pompes");
  init("pompes");
});

$("#servo").click(function(){
  $("#choice").attr("value","servo");
  init("servo");
});

$("#burner").click(function(){
  $("#choice").attr("value","bruleur");
  init("bruleur");
});

function init(element) {
    document.getElementById( 'cta' ).innerHTML = "";
    container = document.getElementById( 'cta' );
    info = document.getElementById( 'info' );

    container.width = $(info).width();
    container.height = $(info).height();

    camera = new THREE.PerspectiveCamera( 15, container.width / container.height, 0.1, 50 );
    camera.position.set( 10, 10, 20 );
    camera.lookAt( 0, 0, 0 );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xffffff );
    //grid helper
    /*
    const size = 10;
    const divisions = 10;
    const gridHelper = new THREE.GridHelper( size, divisions );
    scene.add( gridHelper );
    */

    // loading the collada file produced with sketchup
    const loadingManager = new THREE.LoadingManager( function () {
        scene.add( hvac );
    } );
    const loader = new ColladaLoader( loadingManager );
    loader.load( '/collada/'+element+'.dae', function ( collada ) {
        hvac = collada.scene;
    } );

    const ambientLight = new THREE.AmbientLight( 0xffffff, 0.4 );
    scene.add( ambientLight );
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
    directionalLight.position.set( 1, 1, 0 ).normalize();
    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( container.width, container.height);
    renderer.localClippingEnabled = true;

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render ); // use only if there is no animation loop
    controls.enablePan = false;

    container.appendChild( renderer.domElement );

    //window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {
    info = $("#choice").attr("value");
    init(info);

}

function animate() {

    requestAnimationFrame( animate );
    render();

}

function render() {
    renderer.render( scene, camera );

}

</script>
