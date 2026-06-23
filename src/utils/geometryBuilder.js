import * as THREE from 'three';
import { generateCycloidalGear, generateOuterRingInnerProfile } from './cycloidalMath.js';

export function buildGearGeometry(params, gearIndex = 0) {
  const { N, R, rp, e, thickness, centerHoleRadius, hasOutputHoles, outputHoleRadius, outputHoleOffset, numOutputHoles, numGears, tolerance } = params;
  
  const phase = (Math.PI * 2 / numGears) * gearIndex;
  
  const outerPoints = generateCycloidalGear(N, R, rp, e, tolerance || 0);
  const gearShape = new THREE.Shape();
  
  // Ensure counter-clockwise for outer shape
  if (THREE.ShapeUtils.isClockWise(outerPoints)) {
    outerPoints.reverse();
  }
  
  if (outerPoints.length > 0) {
    gearShape.moveTo(outerPoints[0].x, outerPoints[0].y);
    for (let i = 1; i < outerPoints.length; i++) {
      gearShape.lineTo(outerPoints[i].x, outerPoints[i].y);
    }
  }

  // Center hole (clockwise for holes)
  if (centerHoleRadius > 0) {
    const centerHolePath = new THREE.Path();
    centerHolePath.absarc(0, 0, centerHoleRadius, 0, Math.PI * 2, true);
    gearShape.holes.push(centerHolePath);
  }

  // Output holes (clockwise for holes)
  if (hasOutputHoles && numOutputHoles > 0 && outputHoleRadius > 0) {
    for (let i = 0; i < numOutputHoles; i++) {
      const shaftAngle = (i / numOutputHoles) * 2 * Math.PI;
      const holeAngle = shaftAngle - phase;
      const hx = outputHoleOffset * Math.cos(holeAngle);
      const hy = outputHoleOffset * Math.sin(holeAngle);
      const outputHolePath = new THREE.Path();
      outputHolePath.absarc(hx, hy, outputHoleRadius, 0, Math.PI * 2, true);
      gearShape.holes.push(outputHolePath);
    }
  }

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 128,
    steps: 1
  };

  const geometry = new THREE.ExtrudeGeometry(gearShape, extrudeSettings);
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

export function buildOuterRingGeometry(params) {
  const { N, R, rp, outerRingThickness, outerRingDiameter } = params;
  
  // Outer radius is half the diameter, ensuring a minimum wall thickness
  const minOuterRadius = R + rp + 2;
  const outerRadius = Math.max(minOuterRadius, (outerRingDiameter || 130) / 2); 
  
  const ringShape = new THREE.Shape();
  // Outer shape counter-clockwise
  ringShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

  const innerPoints = generateOuterRingInnerProfile(N, R, rp);
  
  // Inner hole clockwise
  if (!THREE.ShapeUtils.isClockWise(innerPoints)) {
    innerPoints.reverse();
  }
  
  if (innerPoints.length > 0) {
    const innerHolePath = new THREE.Path();
    innerHolePath.moveTo(innerPoints[0].x, innerPoints[0].y);
    for (let i = 1; i < innerPoints.length; i++) {
      innerHolePath.lineTo(innerPoints[i].x, innerPoints[i].y);
    }
    ringShape.holes.push(innerHolePath);
  }

  const extrudeSettings = {
    depth: outerRingThickness,
    bevelEnabled: false,
    curveSegments: 128,
    steps: 1
  };

  const geometry = new THREE.ExtrudeGeometry(ringShape, extrudeSettings);
  geometry.translate(0, 0, -outerRingThickness / 2);
  return geometry;
}
