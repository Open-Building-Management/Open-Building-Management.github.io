# http://open-building-management.github.io/

d3 = pour les graphiques svg

jquery = pour l'ajax

## premier essai

```
var ts = 1611845100;
//var ts = 1612039200;

var biosapi = url+"?ts="+ts+"&interval=3600";

// création d'un svg responsif
const svg = d3
    .select("#chart")
    .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", [0, 0, largeur, hauteur])

// création de 3 échelles linéaires : une pour les abscisses, 2 pour les ordonnées (gauche + droite)
var x = d3.scaleLinear()
    .domain([0, 167])
    .range([margin.left, largeur - margin.right]);
var y = d3.scaleLinear()
    .domain([min, max])
    .range([hauteur - margin.bottom, margin.top]);
var yr = d3.scaleLinear()
    .domain([-10, 100])
    .range([hauteur - margin.bottom, margin.top]);

// axe des abscisses
var x_axis = d3.axisBottom().scale(x);
var xAxisYtranslate = hauteur - margin.bottom;
svg.append("g")
    .attr("transform", "translate(0," + xAxisYtranslate + ")")
    .call(x_axis);

//axes des ordonnées
var y_axis = d3.axisLeft().scale(y);
svg.append("g")
    .attr("transform", "translate(" + margin.left + ", 0)")
    .style("stroke", "black")
    .call(y_axis);

var yr_axis = d3.axisRight().scale(yr);
var yrAxisXtranslate = largeur - margin.right;
svg.append("g")
    .attr("transform", "translate(" + yrAxisXtranslate + ", 0)")
    .attr("class", "axisRed")
    .call(yr_axis);

// Set the gradient - seulement sur y
svg.append("linearGradient")
    .attr("id", "line-gradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0)
    .attr("y1", y(min))
    .attr("x2", 0)
    .attr("y2", y(max))
    .selectAll("stop")
        .data([
          {offset: "0%", color: "blue"},
          {offset: "50%", color: "green"},
          {offset: "75%", color: "yellow"},
          {offset: "100%", color: "red"}
        ])
    .enter().append("stop")
        .attr("offset", function(d) { return d.offset; })
        .attr("stop-color", function(d) { return d.color; });

//création d'un masque
svg.append("clipPath")
        .attr("id", "cliprange")
    .append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", largeur - margin.left - margin.right)
        .attr("height", hauteur - margin.top - margin.bottom);

const div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
    
$.ajax({
    url: biosapi,
    dataType: "json",
    async: true,
    success(data) {
        $.each(data, function (circuitName, item) {
            //console.log(circuitName);
            if (!item["Tint"]){
                //console.log("pas de données, on passe à la suite");
            } else {
                //console.log("Ok");
                //on teste 2 méthodes : array ou array d'objets json
                const Tint = [];
                const agenda = [];
                const d = []
                for (let i = 0; i < 168; ++i) {
                    Tint.push([x(i), y(item["Tint"][i])]);
                    element = {};
                    element.x = x(i);
                    element.Tint = y(item["Tint"][i]);
                    element.agenda = y(20*item["agenda"][i]);
                    d.push(element);
                }
                // création d'une courbe à partir d'un array
                lineTint = d3.line()(Tint);

                //remplissage par une couleur de la zone sous la courbe
                var area = d3.area()
                    .x(d => d.x)
                    .y0(hauteur-margin.bottom)
                    .y1(d => d.agenda);

                //création d'un histogramme
                svg.selectAll()
                    .data(d)
                    .enter()
                        .append("rect")
                        .attr("x", d => d.x)
                        .attr("y", d => d.agenda)
                        .attr("width", 0.1)
                        .attr("height", hauteur - margin.bottom);

                svg.append("path")
                    .datum(d)
                    .style("fill", "orange")
                    .style("opacity", 0.1)
                    .attr("clip-path", "url(#cliprange)")
                    .attr("d", area);

                svg.append("path")
                    .attr("clip-path", "url(#cliprange)")
                    .attr("stroke", "url(#line-gradient)")
                    .attr("d", lineTint);
            }
        });
    }
});
```

## nota

On peut requêter d3 sans jquery mais pas sûr que ce soit le bon choix. Faire du multifonction avec une seule library est un peu hasardeux. Mieux vaut partir sur des biblio expertes et spécialisées.
```
// ne fonctionne pas sous d3.v6 ??
//on peut utiliser d3.json qui a l'air de fonctionner de manière asynchrone
//dans ce cas, pas besoin d'utiliser jquery
d3.json(biosapi, function(data) {
    $.each(data, function (circuitName, item) {
        if (item["Tint"]){
            const d = [];
            for (let i = 0; i < 168; ++i) {
                element = {};
                element.x = x(i);
                element.Tint = y(item["Tint"][i]);
                element.agenda = y(20*item["agenda"][i]);
                d.push(element);
            }
            // les courbes de température
            var lineTint = d3.line()
                .x(d => d.x)
                .y(d => d.Tint);

            //matérialisation des zones de présence du personnel
            var area = d3.area()
                .x(d => d.x)
                .y0(hauteur-margin.bottom)
                .y1(d => d.agenda);

            svg.append("path")
                .datum(d)
                .style("fill", "orange")
                .style("opacity", 0.1)
                .attr("clip-path", "url(#cliprange)")
                .attr("d", area);

            svg.append("path")
                .datum(d)
                .attr("id", circuitName)
                .attr("clip-path", "url(#cliprange)")
                .attr("stroke", "url(#line-gradient)")
                .attr("d", lineTint)
                .on("mouseover", function() {
                    div.transition()
                        .duration(200)
                        .style("opacity", .9);
                    div.html("circuit: "+circuitName+"<br>Hello all")
                        .style("left", (d3.event.pageX + 30) + "px")
                        .style("top", (d3.event.pageY - 60) + "px");
                })
                .on("mouseout", function(d) {
                    div.transition()
                    .duration(500)
                    .style("opacity", 0);
                });
        }
    });
});
```
## le style pour les tooltips

```
div.tooltip {
  position: absolute;
  text-align: center;
  color: white;
  padding: 2px;
  font: 12px sans-serif;
  background: grey;
  border: 0px;
  border-radius: 8px;
  pointer-events: none;
}
```

## premier code pour les histogrammes de chaleur dynamique

```
function indoorHeatmap(url, root) {
  /*
  construit la carte de chaleur des températures intérieures pour le circuit
  sous forme d'histogramme en barre
  chaque barre de l'histogramme représente une semaine
  les barres de l'histogramme sont cliquables et permettent d'afficher les données brutes correspondantes
  */
  // on commence par effacer la div
  $("#heating").html("");
  const u = new URL(url);
  // on récupère le nom du circuit en parsant l'url
  const circuit = u.pathname.split("/")[3];
  // on pourrait aussi faire $("#circuit option:selected").val();
  // on récupère la valeur de l'intervalle de discrétisation
  const interval = $("#interval").val();

  // on requête l'API
  $.ajax({
    url: url,
    dataType: "json",
    async: true,
    success(data) {
      if (data["stats"]){
        // Si on a des stats, on initialise un svg responsif
        let heating = d3
          .select("#heating").append("svg")
              .attr("preserveAspectRatio", "xMinYMin meet")
              .attr("viewBox", [0, 0, largeur, hauteur])
        let weeks = d3.map(data["stats"], function(d){return(d.humanTimeShort)});
        //console.log(weeks);
        // axe des x pour se repérer sur semaines
        let x = d3.scaleBand()
           .domain(weeks)
           .range([margin.left, largeur - margin.right])
           .padding([0.2]);
        heating.append("g")
           .attr("id", "text-legend")
           .attr("transform", "translate(0," + (hauteur - margin.bottom) + ")")
           .style("font-size", "6px")
           .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll(".tick text")
           .call(wrap, x.bandwidth());

        // échelle des y - on n'affiche pas l'axe
        let y = d3.scaleLinear()
           .domain([0, 100])
           .range([ hauteur - margin.bottom,  margin.top ]);
        // palette de couleurs
        let color = d3.scaleOrdinal()
           .domain(["cold","confort","heat"])
           .range(['#377eb8','#4daf4a','#e49f1a'])
        // on stacke nos données
        let stackGen = d3.stack()
           .keys(["cold","confort","heat"]);
        let stackedSeries = stackGen(data["stats"]);
        // stackedSeries contient 3 ensembles de données, un pour chaque "clé" de chaleur
        // on peut afficher la clé de l'ensemble 0
        // console.log(stackedSeries[0].key);
        // chaque ensemble de données est composé de tableaux de taille 2
        // chaque tableau de taille 2 est associé à une clé data, qui contient toutes les données originelles
        // construit l'histogramme
        heating.append("g")
           .selectAll("g")
           // première boucle - on parcourt les données stackées
           // les 3 plages de chaleur (cold, confort et heat) sont les clés
           .data(stackedSeries)
           .enter().append("g")
               .attr("fill", function(d) {
                 //console.log(d);
                 return color(d.key); })
               .selectAll("rect")
               // seconde boucle pour construire les rectangles
               .data(function(d) { return d; })
               .enter().append("rect")
                   .attr("x", function(d) {
                     //console.log(d);
                     return x(d.data.humanTimeShort); })
                   .attr("y", function(d) { return y(d[1]); })
                   .attr("height", function(d) { return y(d[0]) - y(d[1]); })
                   .attr("width",x.bandwidth())
                   .on("click",function(d) {
                     let ts = d.srcElement.__data__.data.ts;
                     let rawurl = root + "/" + circuit + "/" + ts + "?interval=" + interval;
                     console.log(rawurl);
                     raw(rawurl);
                   });

      }
    }
  });
}
```
# équivalences pour construire des histogrammes

on dispose de x et y qui permettent de se projeter sur le svg
```
for (let i = 0; i < nbw; ++i) {
  let element = {};
  element.x = x(data["stats"][i].humanTimeShort);
  element.y = y(data["costs"][i]);
  element.h = data["costs"][i] * (hauteur - margin.top - margin.bottom) / 100;
  d.push(element);
}
```
## solution 1 
```
d.forEach(function(item){
  costs.append("rect")
    .style("opacity", 0.2)
    .attr("x", item.x)
    .attr("y", item.y)
    .attr("height", item.h)
    .attr("width", x.bandwidth())
});
```
## solution 2
```
costs.append("g").selectAll(".node")
  .data(d)
  .enter()
    .append("rect")
    .style("opacity", 0.2)
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("height", d => d.h)
    .attr("width",x.bandwidth());
```
