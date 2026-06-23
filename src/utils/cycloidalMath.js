export function generateCycloidalGear(N, R, rp, e, tolerance = 0, numPoints = 1000) {
  const points = [];
  const effectiveRp = rp + tolerance;
  
  for (let i = 0; i <= numPoints; i++) {
    const t = (i / numPoints) * 2 * Math.PI;
    
    // Equations for contracted cycloidal disc
    const num = Math.sin((1 - N) * t);
    const den = (R / (e * N)) - Math.cos((1 - N) * t);
    const phi = Math.atan2(num, den);
    
    const x = R * Math.cos(t) - effectiveRp * Math.cos(t + phi) - e * Math.cos(N * t);
    const y = -R * Math.sin(t) + effectiveRp * Math.sin(t + phi) + e * Math.sin(N * t);
    
    points.push({ x, y });
  }
  return points;
}

export function generateOuterRingInnerProfile(N, R, rp, numPoints = 1000) {
  // Generates the inner profile of the outer ring, integrating the pins.
  // The pins are at radius R. The inner wall is also at radius R.
  const points = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI;
    
    // Find the closest pin
    const pinIndex = Math.round(theta / (2 * Math.PI / N));
    const pinAngle = pinIndex * (2 * Math.PI / N);
    
    const pinX = R * Math.cos(pinAngle);
    const pinY = R * Math.sin(pinAngle);
    
    // We are looking at a ray from the origin at angle theta.
    // It intersects the inner wall of the ring at radius R.
    // It may also intersect the pin. We want the intersection closest to the origin.
    
    // Line: x = t * cos(theta), y = t * sin(theta)
    // Pin circle: (x - pinX)^2 + (y - pinY)^2 = rp^2
    // t^2 - 2*t*(pinX*cos(theta) + pinY*sin(theta)) + pinX^2 + pinY^2 - rp^2 = 0
    // t^2 - 2*t*R*cos(theta - pinAngle) + R^2 - rp^2 = 0
    
    const a = 1;
    const b = -2 * R * Math.cos(theta - pinAngle);
    const c = R * R - rp * rp;
    
    const discriminant = b * b - 4 * a * c;
    
    let r = R; // default to ring inner wall
    if (discriminant >= 0) {
      const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
      if (t1 > 0 && t1 < R) {
        r = t1;
      }
    }
    
    points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
  }
  return points;
}
