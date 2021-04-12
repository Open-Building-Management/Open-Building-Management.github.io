---
layout: default
permalink: bios.html
---
<div class="row">
  <div class="col">
    <p class="font-weight-bold">
      BIOS cherche en permanence à produire des données signifiantes.
    </p>
    <p>
      Nos automates ne se contentent pas de recueillir les données brutes pour les envoyer vers un serveur de cloud de plus...
    </p>
    <p>
      Ils embarquent une API produisant de l'information compréhensible par les humains.
    </p>
    <div id="filter">
      <p>Confort intérieur de <input type=text id=Tmin value=19 size=2> à <input type=text id=Tmax value=21 size=2>°C</p>
      <p><select id=circuit></select><input type=text size=15 id=ts value="2021-01-29 00:00:00" placeholder="AAAA-MM-DD HH:MM:SS"></p>
      <p>Précision : <input type=text id=interval value=3600 size=4> secondes</p>
    </div>
    <div id="chart"></div>
  </div>
  <div class="col-sm">
    <div id="heating"></div>
    <div id="out"></div>
  </div>
</div>



<style>
path {
  stroke-width: 1;
  fill: none;
}
</style>

<script src="/lib/bios.js"></script>
<script>
// var root = 'http://127.0.0.1/bios';
var root = 'http://allierhab.ddns.net/bios';

// tailles en pixel
var largeur = 600;
var hauteur = 160;
// all the margins
var margin = ({top: 20, right: 50, bottom: 20, left: 50})

var outdoorColors = { froze: '#00006F', cold: '#6a70fe', heat: '#defe85' }
var indoorColors = { cold: '#377eb8', confort: '#4daf4a', heat: '#e49f1a' }

buildSelectAndInit(root);

$("#filter").on("change", function(){
  d3.select("#chart").selectAll("*").remove();
  let circuiturl = createCircuitUrl(root);
  indoorHeatmap(circuiturl, root);
});

/*
un changement de date induit un appel à outdoorHeatmap
pour mettre à jour les histogrammes de température extérieure
*/
$("#ts").on("change", function(){
  outdoorHeatmap();
});
</script>
