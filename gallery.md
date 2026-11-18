---
layout: collada
permalink: /gallery/
---
<collada-viewer id="scene-1" zoom="300%" zoom-mobile="150%" axes="10"
  camera-rotation="20 0 0" report-mouse-position>
  <pipe
    points="-1.21 2 0; -1.21 8 0"
    radius="0.35"
    color="#ffffff"
    style="industrial"
  ></pipe>
  <pipe
    points="-3.5 -5 0; -3.5 8 0"
    radius="0.35"
    color="#ffffff"
    style="industrial"
  ></pipe>
  <pipe
    points="-1 -2 0; -3.5 -2 0"
    radius="0.35"
    color="#ffffff"
    style="industrial"
  ></pipe>
  <collada-object
    file="pompe"
    position="-1.5 0 0"
    rotation="0 90 0" hide-lines
  ></collada-object>
  <collada-object
    file="v3v-fusion"
    position="-0.9 -1.8 0"
    rotation="0 180 180"
    hide-lines
  ></collada-object>
  <pipe
    points="-1.21 -0.5 0; -1.21 -5 0"
    radius="0.35"
    color="#ffffff"
    style="industrial"
  ></pipe>
  <collada-object
    file="Chaudiere_Guillot_LRR55-notexture"
    position="6 -5 0"
    rotation="0 0 0"
  ></collada-object>
  <pipe
    points="6 3 -5.7; 6 4.5 -5.7; -1 4.5 -5.7; -1 -3.5 -5.7"
    radius="0.35"
    color="#ff0000"
    style="industrial"
  ></pipe>
  <pipe
    points="6 3 -12.5; 6 4.5 -12.5; -3.5 4.5 -12.5; -3.5 -3.5 -12.5"
    radius="0.35"
    color="#00ccff"
    style="industrial"
  ></pipe>
  <pipe
    points="-1 -4.2 -10; -1 -4.2 10"
    radius="1"
    color="#ffffff"
    style="industrial"
    closed
  ></pipe>
  <pipe
    points="-3.5 -4.2 -15; -3.5 -4.2 5"
    radius="1"
    color="#ffffff"
    style="industrial"
    closed
  ></pipe>
  <wall
    position="-5 -5 -25"
    width="0.15"
    height="10"
    depth="40"
    opacity="0.5">
  </wall>
  <wall
    position="-5 -5 -25"
    width="20"
    height="10"
    depth="0.15"
    opacity="0.9">
  </wall>
</collada-viewer>
<collada-scene-editor target="scene-1"></collada-scene-editor>>
