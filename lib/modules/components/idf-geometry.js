/**
 * idf-geometry.js — transformation d'un polygone 3D (éventuellement non convexe,
 * avec trous pour les fenêtres) en THREE.BufferGeometry.
 *
 * Le module reçoit `THREE` en paramètre (injection) pour pouvoir être testé
 * dans Node avec le paquet npm et utilisé dans le navigateur avec un CDN,
 * sans dupliquer le moteur.
 */

const EPS = 1e-6;

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function length(a) {
  return Math.sqrt(dot(a, a));
}
function normalize(a) {
  const l = length(a);
  return l > EPS ? [a[0] / l, a[1] / l, a[2] / l] : null;
}

/** Supprime les sommets consécutifs identiques et le sommet de fermeture. */
export function cleanPolygon(vertices) {
  const out = [];
  for (const v of vertices) {
    const prev = out[out.length - 1];
    if (!prev || length(sub(v, prev)) > EPS) out.push(v);
  }
  if (out.length > 1 && length(sub(out[0], out[out.length - 1])) <= EPS) out.pop();
  return out;
}

/** Normale (méthode de Newell), non normalisée : sa norme vaut 2 × l'aire. */
export function newellNormal(vertices) {
  const n = [0, 0, 0];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/** Normale unitaire du polygone (ordre des sommets EnergyPlus : anti-horaire vu de l'extérieur). */
export function polygonNormal(vertices) {
  return normalize(newellNormal(cleanPolygon(vertices)));
}

/** Aire brute du polygone (m²). */
export function polygonArea(vertices) {
  return length(newellNormal(cleanPolygon(vertices))) / 2;
}

/** Base orthonormée (origine, u, v, n) du plan du polygone. */
export function polygonBasis(vertices) {
  const pts = cleanPolygon(vertices);
  if (pts.length < 3) return null;
  const n = normalize(newellNormal(pts));
  if (!n) return null;
  let u = null;
  for (let i = 1; i < pts.length && !u; i++) {
    const e = sub(pts[i], pts[0]);
    const proj = sub(e, [n[0] * dot(e, n), n[1] * dot(e, n), n[2] * dot(e, n)]);
    u = normalize(proj);
  }
  if (!u) return null;
  return { origin: pts[0], u, v: cross(n, u), n };
}

function to2D(p, basis) {
  const d = sub(p, basis.origin);
  return [dot(d, basis.u), dot(d, basis.v)];
}

/** Rétrécit un polygone 2D vers son centroïde de `inset` (m). */
function insetPolygon2D(pts, inset) {
  if (inset <= 0) return pts;
  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p[0];
    cy += p[1];
  }
  cx /= pts.length;
  cy /= pts.length;
  return pts.map(([x, y]) => {
    const dx = cx - x;
    const dy = cy - y;
    const d = Math.hypot(dx, dy);
    if (d <= inset * 2) return [x, y];
    return [x + (dx / d) * inset, y + (dy / d) * inset];
  });
}

/**
 * Construit la géométrie d'un polygone, avec trous optionnels (coplanaires).
 *
 * @param {object} THREE            module three.js
 * @param {number[][]} vertices     sommets [x,y,z]
 * @param {number[][][]} holes      liste de polygones (trous)
 * @param {object} options
 *   - offset    : [dx,dy,dz] translation appliquée aux sommets (évite le z-fighting)
 *   - holeInset : rétrécissement des trous (m) pour éviter les trous tangents au contour
 * @returns {{ geometry: THREE.BufferGeometry, normal: number[], area: number } | null}
 */
export function buildPolygonGeometry(THREE, vertices, holes = [], options = {}) {
  const { offset = null, holeInset = 0.005 } = options;
  const basis = polygonBasis(vertices);
  if (!basis) return null;

  const contour3D = cleanPolygon(vertices);
  const contour2D = contour3D.map((p) => to2D(p, basis));

  const holes3D = [];
  const holes2D = [];
  for (const h of holes) {
    const pts = cleanPolygon(h);
    if (pts.length < 3) continue;
    holes3D.push(pts);
    holes2D.push(insetPolygon2D(pts.map((p) => to2D(p, basis)), holeInset));
  }

  const toVec2 = (list) => list.map(([x, y]) => new THREE.Vector2(x, y));
  let triangles = [];
  let usedHoles3D = holes3D;
  try {
    triangles = THREE.ShapeUtils.triangulateShape(toVec2(contour2D), holes2D.map(toVec2));
  } catch (e) {
    triangles = [];
  }
  if (!triangles.length && holes2D.length) {
    // Repli : triangulation sans trous
    triangles = THREE.ShapeUtils.triangulateShape(toVec2(contour2D), []);
    usedHoles3D = [];
  }
  if (!triangles.length) return null;

  const points = [...contour3D];
  for (const h of usedHoles3D) points.push(...h);
  // Pour les trous rétrécis, on utilise les positions 3D rétrécies (reprojection 2D→3D)
  if (usedHoles3D.length) {
    let k = contour3D.length;
    for (const h2 of holes2D) {
      for (const [x, y] of h2) {
        const { origin: o, u, v } = basis;
        points[k++] = [o[0] + u[0] * x + v[0] * y, o[1] + u[1] * x + v[1] * y, o[2] + u[2] * x + v[2] * y];
      }
    }
  }

  const positions = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    positions[i * 3] = p[0] + (offset ? offset[0] : 0);
    positions[i * 3 + 1] = p[1] + (offset ? offset[1] : 0);
    positions[i * 3 + 2] = p[2] + (offset ? offset[2] : 0);
  }
  const normals = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    normals[i * 3] = basis.n[0];
    normals[i * 3 + 1] = basis.n[1];
    normals[i * 3 + 2] = basis.n[2];
  }
  const index = [];
  for (const t of triangles) index.push(t[0], t[1], t[2]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(index);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return { geometry, normal: basis.n, area: length(newellNormal(contour3D)) / 2 };
}
