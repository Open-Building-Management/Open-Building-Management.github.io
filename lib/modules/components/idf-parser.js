/**
 * idf-parser.js — parseur minimal d'IDF EnergyPlus, géométrie uniquement.
 *
 * Aucune dépendance : utilisable dans le navigateur (ES module) ou dans Node.
 *
 *   import { parseGeometryIDF } from './idf-parser.js';
 *   const model = parseGeometryIDF(idfText);
 *
 * Objets lus :
 *   - BuildingSurface:Detailed, Wall:Detailed, RoofCeiling:Detailed, Floor:Detailed
 *   - FenestrationSurface:Detailed
 *   - Shading:Site:Detailed, Shading:Building:Detailed, Shading:Zone:Detailed
 *   - Zone (nom, origine, rotation), Building (axe nord), GlobalGeometryRules
 *
 * Les coordonnées sont retournées en mètres, en repère monde EnergyPlus (Z vers le haut).
 * Si GlobalGeometryRules indique un système "Relative", les origines/rotations
 * des zones sont appliquées (au mieux).
 */

const SIMPLE_SURFACE_CLASSES = {
  'wall:detailed': 'Wall',
  'roofceiling:detailed': 'Roof',
  'floor:detailed': 'Floor',
};

const SHADING_CLASSES = {
  'shading:site:detailed': 'site',
  'shading:building:detailed': 'building',
  'shading:zone:detailed': 'zone',
};

// ---------------------------------------------------------------------------
// Découpage bas niveau
// ---------------------------------------------------------------------------

/** Supprime les commentaires ("!" jusqu'à la fin de ligne). */
export function stripComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const i = line.indexOf('!');
      return i >= 0 ? line.slice(0, i) : line;
    })
    .join('\n');
}

/**
 * Découpe un IDF en objets bruts : [{ cls, key, fields }]
 *  - cls    : nom de classe tel qu'écrit (ex. "BuildingSurface:Detailed")
 *  - key    : nom de classe en minuscules
 *  - fields : champs (chaînes) après le nom de classe
 */
export function parseIDFObjects(text) {
  const objects = [];
  for (const chunk of stripComments(text).split(';')) {
    const fields = chunk.split(',').map((f) => f.trim());
    const cls = fields.shift();
    if (!cls) continue;
    objects.push({ cls, key: cls.toLowerCase(), fields });
  }
  return objects;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function num(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function isNumeric(v) {
  return v !== '' && v !== undefined && Number.isFinite(Number(v));
}

function toVertices(flat) {
  const out = [];
  for (let i = 0; i + 2 < flat.length; i += 3) {
    const x = Number(flat[i]);
    const y = Number(flat[i + 1]);
    const z = Number(flat[i + 2]);
    if ([x, y, z].every(Number.isFinite)) out.push([x, y, z]);
  }
  return out;
}

/**
 * Trouve la liste de sommets dans les champs d'un objet.
 * Cherche à partir de l'index `from` un champ "Number of Vertices" entier n
 * suivi d'exactement 3n valeurs ; sinon (champ vide / autocalculate), prend
 * la série numérique finale.
 */
export function extractVertices(fields, from = 0) {
  const f = fields.slice();
  while (f.length && f[f.length - 1] === '') f.pop();

  for (let i = from; i < Math.min(f.length, from + 6); i++) {
    const v = (f[i] || '').toLowerCase();
    if (v === '' || v.startsWith('auto')) break; // champ "Number of Vertices" vide → repli
    const n = Number(v);
    if (Number.isInteger(n) && n >= 3 && f.length - i - 1 === 3 * n) {
      return toVertices(f.slice(i + 1));
    }
  }
  let start = f.length;
  while (start > 0 && isNumeric(f[start - 1])) start--;
  const run = f.slice(start);
  const usable = run.length - (run.length % 3);
  return usable >= 9 ? toVertices(run.slice(run.length - usable)) : [];
}

/** Index du champ "Sun Exposure" (SunExposed / NoSun), ou -1. */
function findSunIndex(f, from = 3) {
  for (let i = from; i < Math.min(f.length, 12); i++) {
    const v = (f[i] || '').toLowerCase();
    if (v === 'sunexposed' || v === 'nosun') return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Objets géométriques
// ---------------------------------------------------------------------------

function parseBuildingSurface(obj) {
  const f = obj.fields;
  const simpleType = SIMPLE_SURFACE_CLASSES[obj.key];
  // BuildingSurface:Detailed : Name, Type, Construction, Zone, [Space], BC, BC Object, Sun, Wind, VF, N, ...
  // Wall:Detailed etc.      : Name, Construction, Zone, [Space], BC, BC Object, Sun, Wind, VF, N, ...
  const base = simpleType ? 0 : 1;
  const sun = findSunIndex(f, base + 3);
  const surface = {
    kind: 'surface',
    name: f[0] || '',
    type: simpleType || f[1] || 'Wall',
    construction: f[base + 1] || '',
    zone: f[base + 2] || '',
    space: '',
    outsideBC: '',
    outsideBCObject: '',
    sunExposure: '',
    windExposure: '',
    vertices: [],
  };
  if (sun >= 0) {
    surface.outsideBC = f[sun - 2] || '';
    surface.outsideBCObject = f[sun - 1] || '';
    surface.sunExposure = f[sun] || '';
    surface.windExposure = f[sun + 1] || '';
    if (sun - 2 > base + 3) surface.space = f[base + 3] || '';
    surface.vertices = extractVertices(f, sun + 2);
  } else {
    surface.outsideBC = f[base + 3] || '';
    surface.outsideBCObject = f[base + 4] || '';
    surface.vertices = extractVertices(f, base + 5);
  }
  return surface;
}

function parseFenestration(obj) {
  const f = obj.fields;
  // Name, Type, Construction, Building Surface, BC Object, VF, [Shading Control (anciennes versions)],
  // Frame/Divider, Multiplier, N, vertices...
  return {
    kind: 'fenestration',
    name: f[0] || '',
    type: f[1] || 'Window',
    construction: f[2] || '',
    baseSurface: f[3] || '',
    outsideBCObject: f[4] || '',
    zone: '', // résolu ensuite à partir de la surface support
    vertices: extractVertices(f, 5),
  };
}

function parseShading(obj) {
  const f = obj.fields;
  const scope = SHADING_CLASSES[obj.key];
  const s = {
    kind: 'shading',
    name: f[0] || '',
    type: 'Shading',
    scope,
    baseSurface: scope === 'zone' ? f[1] || '' : '',
    zone: '',
    vertices: extractVertices(f, scope === 'zone' ? 3 : 2),
  };
  return s;
}

function parseZone(obj) {
  const f = obj.fields;
  return {
    name: f[0] || '',
    relativeNorth: num(f[1]),
    origin: [num(f[2]), num(f[3]), num(f[4])],
    multiplier: num(f[6], 1),
    ceilingHeight: f[7] || '',
    volume: f[8] || '',
    floorArea: f[9] || '',
  };
}

// ---------------------------------------------------------------------------
// Transformations (coordonnées relatives)
// ---------------------------------------------------------------------------

/** Rotation horaire (sens EnergyPlus) de `deg` degrés autour de Z, puis translation. */
function transformVertices(vertices, deg, origin) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return vertices.map(([x, y, z]) => [
    x * c + y * s + origin[0],
    -x * s + y * c + origin[1],
    z + origin[2],
  ]);
}

function computeBounds(items) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const item of items) {
    for (const v of item.vertices) {
      for (let i = 0; i < 3; i++) {
        if (v[i] < min[i]) min[i] = v[i];
        if (v[i] > max[i]) max[i] = v[i];
      }
    }
  }
  if (!Number.isFinite(min[0])) return null;
  return {
    min,
    max,
    center: [0, 1, 2].map((i) => (min[i] + max[i]) / 2),
    size: [0, 1, 2].map((i) => max[i] - min[i]),
  };
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

/**
 * Parse un IDF et retourne le modèle géométrique :
 * {
 *   building: { name, northAxis },
 *   coordinateSystem: 'World' | 'Relative',
 *   vertexEntryDirection: 'counterclockwise' | 'clockwise',
 *   zones: [{ name, relativeNorth, origin, ... }],
 *   surfaces: [{ name, type, construction, zone, outsideBC, outsideBCObject, vertices: [[x,y,z],...] }],
 *   fenestrations: [{ name, type, construction, baseSurface, zone, vertices }],
 *   shading: [{ name, scope, baseSurface, vertices }],
 *   bounds: { min, max, center, size } | null,
 *   stats: { zones, surfaces, fenestrations, shading, vertices }
 * }
 */
export function parseGeometryIDF(text) {
  const objects = parseIDFObjects(String(text));

  const model = {
    building: { name: '', northAxis: 0 },
    coordinateSystem: 'World',
    vertexEntryDirection: 'counterclockwise',
    zones: [],
    surfaces: [],
    fenestrations: [],
    shading: [],
    bounds: null,
    stats: null,
  };

  for (const obj of objects) {
    const key = obj.key;
    const f = obj.fields;
    if (key === 'buildingsurface:detailed' || SIMPLE_SURFACE_CLASSES[key]) {
      const s = parseBuildingSurface(obj);
      if (s.vertices.length >= 3) model.surfaces.push(s);
    } else if (key === 'fenestrationsurface:detailed') {
      const s = parseFenestration(obj);
      if (s.vertices.length >= 3) model.fenestrations.push(s);
    } else if (SHADING_CLASSES[key]) {
      const s = parseShading(obj);
      if (s.vertices.length >= 3) model.shading.push(s);
    } else if (key === 'zone') {
      model.zones.push(parseZone(obj));
    } else if (key === 'building') {
      model.building.name = f[0] || '';
      model.building.northAxis = num(f[1]);
    } else if (key === 'globalgeometryrules') {
      const dir = (f[1] || '').toLowerCase();
      if (dir.startsWith('clock')) model.vertexEntryDirection = 'clockwise';
      const cs = (f[2] || '').toLowerCase();
      if (cs.startsWith('rel')) model.coordinateSystem = 'Relative';
    }
  }

  // Zones référencées par des surfaces mais non déclarées
  const zoneIndex = new Map(model.zones.map((z) => [z.name.toLowerCase(), z]));
  for (const s of model.surfaces) {
    const k = s.zone.toLowerCase();
    if (s.zone && !zoneIndex.has(k)) {
      const z = { name: s.zone, relativeNorth: 0, origin: [0, 0, 0], multiplier: 1 };
      model.zones.push(z);
      zoneIndex.set(k, z);
    }
  }

  // Zone des fenêtres / masques de zone = zone de la surface support
  const surfaceIndex = new Map(model.surfaces.map((s) => [s.name.toLowerCase(), s]));
  for (const fen of model.fenestrations) {
    const base = surfaceIndex.get(fen.baseSurface.toLowerCase());
    if (base) fen.zone = base.zone;
  }
  for (const sh of model.shading) {
    if (sh.scope === 'zone') {
      const base = surfaceIndex.get(sh.baseSurface.toLowerCase());
      if (base) sh.zone = base.zone;
    }
  }

  // Coordonnées relatives → monde
  if (model.coordinateSystem === 'Relative') {
    const north = model.building.northAxis;
    const apply = (item) => {
      const z = zoneIndex.get((item.zone || '').toLowerCase());
      const deg = north + (z ? z.relativeNorth : 0);
      const origin = z ? z.origin : [0, 0, 0];
      item.vertices = transformVertices(item.vertices, deg, origin);
    };
    model.surfaces.forEach(apply);
    model.fenestrations.forEach(apply);
    for (const sh of model.shading) {
      if (sh.scope === 'zone') apply(sh);
      else if (sh.scope === 'building') sh.vertices = transformVertices(sh.vertices, north, [0, 0, 0]);
    }
  }

  const all = [...model.surfaces, ...model.fenestrations, ...model.shading];
  model.bounds = computeBounds(all);
  model.stats = {
    zones: model.zones.length,
    surfaces: model.surfaces.length,
    fenestrations: model.fenestrations.length,
    shading: model.shading.length,
    vertices: all.reduce((n, s) => n + s.vertices.length, 0),
  };
  return model;
}

export default parseGeometryIDF;
