---
layout: default
permalink: bios.html
---
<div class="row">
  <div class="col">
    <p class="font-weight-bold">
      BIOS cherche en permanence à produire des données signifiantes et embarque une API statistique.
    </p>
    <div id="filter">
      <p>Choisissez le site : <select id=machine></select></p>
      <p>Confort intérieur de <input type=text id=Tmin value=19 size=2> à <input type=text id=Tmax value=21 size=2>°C</p>
      <p><select id=circuit></select><input type=text size=15 id=ts value="2021-01-29T00:00:00" placeholder="AAAA-MM-DDTHH:MM:SS"></p>
      <p>numéro de flux énergie : <input type=text size=4 id=energy></p>
      <p>numéro de flux Tint : <input type=text size=4 id=tint></p>
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
//var root = 'http://127.0.0.1/bios';
var root = 'http://allierhab.ddns.net:8080/bios';
allbios = {"allierhab.ddns.net:8080":"labo", "127.0.0.1":"local"};
let options=[];
for (let key in allbios) {
  options.push("<option value="+key+">"+allbios[key]+"</option>");
}
$("#machine").html(options);
// tailles en pixel
var largeur = 600;
var hauteur = 160;
// all the margins
var margin = ({top: 20, right: 50, bottom: 20, left: 50})

var outdoorColors = { froze: '#00006F', cold: '#6a70fe', heat: '#defe85' }
var indoorColors = { cold: '#377eb8', confort: '#4daf4a', heat: '#e49f1a' }
buildCircuitSelectAndInit(root);

// si on change de site/machine
// on efface la div chart contenant les données brutes
// on reconstruit tout : menu des circuits, graphes indoor et outdoor
$("#machine").on("change", function(){
  d3.select("#chart").selectAll("*").remove();
  let machine = $("#machine").val();
  root = 'http://'+machine+'/bios';
  buildCircuitSelectAndInit(root);
});

// si on change autre chose que le paramètre site/machine
// dans tous les cas, on met à jour les graphes indoor
$("#filter").on("change", function(){
  let machine = $("#machine").val();
  root = 'http://'+machine+'/bios';
  d3.select("#chart").selectAll("*").remove();
  let circuiturl = createCircuitUrl(root);
  indoorHeatmap(circuiturl, root);
});

//un changement de date implique aussi qu'on mette à jour les graphes outdoor
$("#ts").on("change", function(){
  let machine = $("#machine").val();
  root = 'http://'+machine+'/bios';
  outdoorHeatmap(root);
});
</script>
