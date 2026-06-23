import * as THREE from 'three';
import { generateCycloidalGear, generateOuterRingInnerProfile } from './src/utils/cycloidalMath.js';
import { buildGearGeometry, buildOuterRingGeometry } from './src/utils/geometryBuilder.js';

const params = {
  N: 10,
  R: 50,
  rp: 5,
  e: 2,
  thickness: 10,
  numGears: 2,
  centerHoleRadius: 10,
  outputHoleRadius: 4,
  outputHoleOffset: 25,
  numOutputHoles: 5,
  hasOutputHoles: true
};

try {
  const geo1 = buildGearGeometry(params);
  console.log("Gear geo created, vertices:", geo1.attributes.position.count);
  const geo2 = buildOuterRingGeometry(params);
  console.log("Ring geo created, vertices:", geo2.attributes.position.count);
} catch (e) {
  console.error("Error creating geometry:", e);
}
