`<collada-object>`

attribut | description
--|--
file | nom du fichier sans extension .dae
position | coordonnées X,Y,Z de l'origine du modèle COLLADA
rotation | angles en degrés autour des axes X Y Z
scale | un facteur unique ou trois facteurs X Y Z, tous entre 0 et 1  ("0.8" pour mettre à 80%)
hide-lines | masque les arêtes si attribut présent (pas de valeur à spécifier)

`<collada-viewer>`

attribut | description
--|--
zoom | facteur de zoom sur desktop (par exemple "150%)
zoom-mobile | facteur de zoom sur mobile
axes | longueur des axes. Si cet attribut n'est pas présent, les axes ne sont pas affichés

![](images/axes.jpg)


`<collada-wall>`

attribut | description
--|--
position | coordonnées du point de coordonnées X,Y,Z minimales
width | largeur (suivant X)
height | hauteur (suivant Y)
depth | profondeur (suivant Z)
opacity | entre 0 et 1 (default: 1)
