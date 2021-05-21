function humanTime2ts(){
  /*
  convertit le temps indiqué dans la div ts en unix timestamp
  */
  let start = $("#ts").val();
  let human = new Date(start);
  // donne le même résultat que Date.parse(start)/1000
  let ts = human.getTime()/1000;
  //console.log(start);
  //console.log(ts);
  return ts
}

function wrap(text, width) {
  /*
  Affiche un texte sur plusieurs lignes dès lors qu'il dépasse une certaine largeur
  cf mike Bockstock
  cf https://bl.ocks.org/mbostock/7555321
  and https://bl.ocks.org/guypursey/f47d8cd11a8ff24854305505dbbd8c07
  More to read on : https://github.com/d3/d3/issues/1642
  */
  text.each(function () {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    //console.log(words);
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

function createCircuitUrl(root){
  /*
  construit l'url pour requêter les statistiques sur un circuit
  */
  let Tmin = $("#Tmin").val();
  let Tmax = $("#Tmax").val();
  let interval = $("#interval").val();
  let circuit = $("#circuit").val();
  let ts = humanTime2ts();
  //console.log(circuit);
  //console.log(ts);
  let circuiturl = root+"/network/"+circuit+'/'+ts+"?interval="+interval+"&Tmin="+Tmin+"&Tmax="+Tmax;
  return(circuiturl);
}

function addTitle(obj, titre) {
  /*
  ajoute un titre à un graphique d3js
  */
  obj.append("text")
    .attr("x", (largeur / 2))
    .attr("y", 3*margin.top / 4)
    .attr("text-anchor", "middle")
    .style("color", "black")
    .style("font-size", "12px")
    .text(titre);
}

function addLegend(obj, colvalues, labels) {
  /*
  ajoute une légende à un graphique d3js
  */
  let legend = obj.append('g')
    .attr('transform', 'translate(0, 20)');
  legendCellSize = 10;
  legend.selectAll()
    .data(colvalues)
    .enter().append('rect')
      .attr('height', legendCellSize+'px')
      .attr('width', legendCellSize+'px')
      .attr('y', (d,i) => i * legendCellSize)
      .style("fill", d => d);
  legend.selectAll()
    .data(labels)
    .enter().append('text')
      .attr("transform", (d,i) => "translate(" + (legendCellSize+2) + ", " + (i * legendCellSize) + ")")
      .attr("dy", legendCellSize / 1.4) // Pour centrer le texte par rapport aux carrés
      .style("font-size", "7px")
      .style("color", "black")
      .text(d => d);
}

function addVerticalLabel(obj, ylabel, x, y, size) {
  /*
  positionne sur le svg un label textuel vertical aux coordonnées x,y
  exécute autant de retour(s) chariot(s) qu'il y a de \n dans le texte
  */
  let a = ylabel.split("\n");
  a.forEach((item, i) => {
    obj.append("text")
      .style("font", size+"px arial")
      .text(item)
      .attr("transform", "translate("+(x+i*10)+","+y+") rotate(-90)")
  });
}

function addHorizontalWeekLabels(obj, x, weeks) {
  /*
  légende horizontale pour repérer les semaines
  */
  obj.append("g")
    .attr("id", "text-legend")
    .attr("transform", "translate(0," + (hauteur - margin.bottom) + ")")
    .style("font-size", "6px")
    .call(d3.axisBottom(x).tickSizeOuter(0))
  .selectAll(".tick text")
    .call(wrap, x.bandwidth());
}

function raw(url){
  /*
  permet de visualiser les données brutes
  */
  $.ajax({
    url: url,
    dataType: "json",
    async: true,
    success(data) {
      if (data["Tint"]) {
        // min et max
        let min = d3.min(data["Tint"]);
        let max = d3.max(data["Tint"]);
        let confortmin = $("#Tmin").val();
        let confortmax = $("#Tmax").val();

        // on efface le contenu de la div et on recrée le svg responsif
        d3.select("#chart").selectAll("*").remove();
        const rawchart = d3
          .select("#chart")
          .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", [0, 0, largeur, hauteur])
            .on("click",function(d) {
              d3.select("#chart").selectAll("*").remove();
            });

        // ajout du titre du graphique avec mention de la semaine concernée
        let u = new URL(url);
        let ts = u.pathname.split("/")[3] * 1000;
        // jour de la semaine avec une date longue
        let options = {weekday: "long", year: "numeric", month: "long", day: "numeric"};
        let human = new Date(ts).toLocaleDateString('fr-FR', options);
        let titre = "Données brutes pour la semaine du "+human;
        addTitle(rawchart, titre);

        // ajout d'une légende
        let occColor = "#90cef4";
        addLegend(rawchart, [occColor], ["occupation"]);
        // ligne pointillée pour chauffage On/off
        rawchart.append("line")
          .attr("x1", 0)
          .attr("x2", 10)
          .attr("y1", 35)
          .attr("y2", 35)
          .style("stroke", "red")
          .style("stroke-dasharray", ("1,1"))
        rawchart.append('text')
          .attr('transform', 'translate(12, 37)')
          .style("color", "black")
          .style("font-size", "7px")
          .text("énergie");

        // échelles
        let nbh = data["Tint"].length;
        var x = d3.scaleLinear()
          .domain([0, nbh - 1])
          .range([2*margin.left, largeur - margin.right]);
        var y = d3.scaleLinear()
          .domain([ min, max ])
          .range([hauteur - margin.bottom, margin.top]);

        // axe des abscisses
        var x_axis = d3.axisBottom().scale(x);
        var xAxisYtranslate = hauteur - margin.bottom;
        rawchart.append("g")
          .attr("transform", "translate(0," + xAxisYtranslate + ")")
          .call(x_axis);

        //axes des ordonnées
        var y_axis = d3.axisLeft().scale(y);
        rawchart.append("g")
          .attr("transform", "translate(" + 2*margin.left + ", 0)")
          .style("font", "7px arial")
          .call(y_axis);
        // ajout d'un label
        let xx = 1.4*margin.right;
        let yy = margin.top + 2*hauteur / 3;
        addVerticalLabel(rawchart,"Température intérieure (°C)", xx, yy, 7);

        const d = [];
        for (let i = 0; i < nbh; ++i) {
          element = {};
          element.x = x(i);
          element.Tint = y(data["Tint"][i]);
          element.agenda = y((max-min)*data["agenda"][i]+min);
          element.decision = y((max-min)*data["decision"][i]+min);
          d.push(element);
        }

        // la décision énergétique
        var lineDecision = d3.line()
          .x(d => d.x)
          .y(d => d.decision);
        rawchart.append("path")
          .datum(d)
          .style("stroke", "red")
          .style("stroke-dasharray", ("1,1")) // pointillés
          .attr("d", lineDecision);

        //remplissage de la zone d'occupation par une couleur
        var area = d3.area()
          .x(d => d.x)
          .y0(hauteur-margin.bottom)
          .y1(d => d.agenda);
        rawchart.append("path")
          .datum(d)
          .style("fill", occColor)
          .style("opacity", 0.5)
          .attr("d", area);

        // courbe des températures intérieures
        let lineTint = d3.line()
          .x(d => d.x)
          .y(d => d.Tint);

        // gradient de couleur sur y
        rawchart.append("linearGradient")
          .attr("id", "line-gradient")
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", 0)
          .attr("y1", y(confortmin))
          .attr("x2", 0)
          .attr("y2", y(confortmax))
          .selectAll("stop")
              .data([
                {offset: "0%", color: indoorColors["cold"]},
                {offset: "0%", color: indoorColors["confort"]},
                {offset: "100%", color: indoorColors["confort"]},
                {offset: "150%", color: indoorColors["heat"]}
              ])
          .enter().append("stop")
              .attr("offset", function(d) { return d.offset; })
              .attr("stop-color", function(d) { return d.color; });
        rawchart.append("path")
          .datum(d)
          .attr("stroke", "url(#line-gradient)")
          .attr("d", lineTint);
      }
    }
  });
}

function heatmap(root, url, divName, colors, titre = "", ylabel = "% temps", click = false) {
  /*
  construit une carte de chaleur sous la forme d'histogrammes en barre
  on utilise la fonction d3.stack pour empiler les pourcentages
  let stackGen = d3.stack()
    .keys(colkeys);
  let stackedSeries = stackGen(data["stats"]);
  stackedSeries contient ainsi 3 ensembles de données, un pour chaque "clé" de chaleur
  pour obtenir la clé de l'ensemble 0 :
  console.log(stackedSeries[0].key);
  chaque ensemble de données "stackées" est composé de tableaux de taille 2
  chaque tableau de taille 2 est associé à une clé data, qui contient toutes les données originelles
  */
  let u = new URL(url);
  let params = new URLSearchParams(u.search);
  let min = parseInt(params.get("Tmin"));
  let max = parseInt(params.get("Tmax"));
  let labels = [];
  labels.push("< "+min+"°C");
  labels.push(min+" à "+max+"°C");
  labels.push("> "+max+"°C");

  //on efface le contenu de la div
  d3.select(divName).selectAll("*").remove();

  // on extrait les clés/dénominations de couleurs et les valeurs hexa correspondantes
  let colkeys = Object.keys(colors);
  let colvalues = Object.values(colors);
  // on requête l'API
  $.ajax({
    url: url,
    dataType: "json",
    async: true,
    success(data) {
      if (data["stats"]){
        // Si on a des stats, on crée le svg responsif
        let svg = d3.select(divName).append("svg")
          .attr("preserveAspectRatio", "xMinYMin meet")
          .attr("viewBox", [0, 0, largeur, hauteur]);
        addTitle(svg, titre);
        let xx = margin.right/2;
        let yy = margin.top + 2*hauteur / 3;
        addVerticalLabel(svg, ylabel, xx, yy, 10);
        addLegend(svg, colvalues, labels);

        // axe des x pour se repérer sur semaines
        let weeks = d3.map(data["stats"], function(d){return(d.humanTimeShort)});
        let x = d3.scaleBand()
          .domain(weeks)
          .range([margin.left, largeur - margin.right])
          .padding([0.2]);
        addHorizontalWeekLabels(svg, x, weeks);

        // échelle des y - on n'affiche pas l'axe
        let y = d3.scaleLinear()
          .domain([0, 100])
          .range([ hauteur - margin.bottom,  margin.top ]);
        // palette de couleurs
        let colormap = d3.scaleOrdinal()
          .domain(colkeys)
          .range(colvalues)
        // on stacke nos données
        let stackGen = d3.stack()
          .keys(colkeys);
        let stackedSeries = stackGen(data["stats"]);
        // construit l'histogramme
        svg.append("g")
          .selectAll("g")
          // première boucle - on parcourt les données stackées
          // les 3 plages de chaleur (cold, confort et heat) sont les clés
          .data(stackedSeries)
          .enter().append("g")
            .attr("fill", function(d) { return colormap(d.key); })
            .selectAll("rect")
            // seconde boucle pour construire les rectangles
            .data(function(d) { return d; })
            .enter().append("rect")
              .attr("x", function(d) { return x(d.data.humanTimeShort); })
              .attr("y", function(d) { return y(d[1]); })
              .attr("height", function(d) { return y(d[0]) - y(d[1]); })
              .attr("width",x.bandwidth());

        if (data["costs"]) {
          var costs = d3.select(divName).append("svg")
              .attr("preserveAspectRatio", "xMinYMin meet")
              .attr("viewBox", [0, 0, largeur, hauteur]);
          addTitle(costs, "coût énergétique");
          addHorizontalWeekLabels(costs, x, weeks);
          // ajout d'un label
          let xx = margin.right / 2;
          let yy = margin.top + 2*hauteur / 3;
          addVerticalLabel(costs,"% temps\navec conso\nénergétique", xx, yy, 10);

          let nbw = data["costs"].length;
          energy = [];
          for (let i = 0; i < nbw; ++i) {
            let element = {};
            element.ts = data["stats"][i].ts
            element.x = x(data["stats"][i].humanTimeShort);
            element.y = y(data["costs"][i]);
            element.h = data["costs"][i] * (hauteur - margin.top - margin.bottom) / 100;
            energy.push(element);
          }

          costs.append("g").selectAll(".node")
            .data(energy)
            .enter()
              .append("rect")
              .style("opacity", 0.2)
              .attr("x", d => d.x)
              .attr("y", d => d.y)
              .attr("height", d => d.h)
              .attr("width",x.bandwidth());
        }

        if (click === true) {
          // on récupère le nom du circuit en parsant l'url
          let circuit = u.pathname.split("/")[3];
          // on pourrait aussi faire $("#circuit option:selected").val();
          // on récupère la valeur de l'intervalle de discrétisation

          let interval = $("#interval").val();

          if (data["costs"]) {
            costs.data(energy).selectAll("g")
              .on("click", function(d) {
                let ts = d.srcElement.__data__.ts;
                let rawurl = root + "/" + circuit + "/" + ts + "?interval=" + interval;
                raw(rawurl);
              });
          }
          svg.selectAll("g").selectAll("g")
            .data(stackedSeries)
            .on("click",function(d) {
              let ts = d.srcElement.__data__.data.ts;
              let rawurl = root + "/" + circuit + "/" + ts + "?interval=" + interval;
              //console.log(rawurl);
              raw(rawurl);
            });
        }
      }
    }
  });
}

function indoorHeatmap(url, root) {
  let titre = "température intérieure / confort thermique";
  heatmap(root, url, "#heating", indoorColors, titre = titre, ylabel = "% temps\nd'occupation\ndes locaux", click = true);
}

function outdoorHeatmap(root) {
  let ts = humanTime2ts();
  let interval = $("#interval").val();
  let titre = "température extérieure";
  let exturl = root+"/text/"+ts+"?interval="+interval+"&Tmin=0&Tmax=10";
  heatmap(root, exturl, "#out", outdoorColors, titre = titre);
}

function buildCircuitSelectAndInit(root){
  //affiche le menu déroulant permettant le choix des circuits
  //initialise la carte de chaleur avec les paramètres initiaux
  $.ajax({
    url: root+"/network",
    dataType: "json",
    async: true,
    success(data) {
      //création du tableau pour héberger le contenu du select
      let options=[];
      let allcircuits=Object.getOwnPropertyNames(data);
      allcircuits.forEach(function(circuit, indice){
        //console.log(circuit);
        //console.log(data[circuit].Tint);
        if (circuit != "common") {
          var tag ="";
          if (indice === 0) {
            tag = " selected";
          }
          options.push("<option value="+circuit+tag+">Zone "+circuit+"</option>");
        }
      });
      $("#circuit").html(options);
      let circuiturl = createCircuitUrl(root);
      indoorHeatmap(circuiturl, root);
      outdoorHeatmap(root);
    }
  });
}
