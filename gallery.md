---
layout: collada
permalink: /gallery/
---
<collada-viewer zoom="300%" zoom-mobile="150%" axes=10 camera-rotation="20 0 0">
  <collada-object
    file="v3v"
    position="-1 -1.8 0"
    rotation="0 180 180" hide-lines
  ></collada-object>
  <collada-object
    file="pompe"
    position="-1.5 0 0"
    rotation="0 90 0" hide-lines
  ></collada-object>
  <collada-object
    file="Chaudiere_Guillot_LRR55-notexture"
    position="6 -5 0"
    rotation="0 0 0"
  ></collada-object>
  <pipe
    points="0 0 0; 2 0 0; 2 2 0; 2 2 3"
    radius="0.1"
    color="#ff0000"
  ></pipe>
  <wall
    position="-5 -5 -25"
    width="0.15"
    height="10"
    depth="40"
    opacity="0.9">
  </wall>
  <wall
    position="-5 -5 -25"
    width="20"
    height="10"
    depth="0.15"
    opacity="0.9">
  </wall>
</collada-viewer>
