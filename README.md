# http://open-building-management.github.io/

d3 = pour les graphiques svg

jquery = pour l'ajax

On peut requêter d3 sans jquery mais pas sûr que ce soit le bon choix. Faire du multifonction avec une seule library est un peu hasardeux. Mieux vaut partir sur des biblio expertes et spécialisées.
```
/*
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
*/
```
