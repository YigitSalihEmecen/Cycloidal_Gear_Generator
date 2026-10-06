/**
 * Generates the SVG artwork used by the README and the favicon from the same maths as the app.
 * Run with `npm run art`. Output goes to docs/ and public/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildModel, holeCenter, poseAt, type Model } from '../src/core/model';
import { DEFAULT_PARAMS } from '../src/core/params';
import { circlePoints, discProfile, ringBoreProfile, type Pt } from '../src/core/profile';

mkdirSync('docs', { recursive: true });
mkdirSync('public', { recursive: true });

const f = (v: number) => (Math.abs(v) < 1e-6 ? '0' : v.toFixed(2).replace(/\.?0+$/, ''));
const path = (pts: readonly Pt[]) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(-y)}`).join('L') + 'Z';
const deg = (r: number) => (r * 180) / Math.PI;

interface Palette {
  bg: string; bg2: string; panel: string; line: string; text: string; muted: string; faint: string;
  ring: string; ringStroke: string; pin: string; accent: string; accent2: string; teal: string; dot: string; hot: string;
}
const LIGHT: Palette = {
  bg: '#f4f6f7', bg2: '#e3e8ec', panel: '#ffffff', line: '#cdd5db', text: '#131a20', muted: '#55626e', faint: '#8794a0',
  ring: '#c9d3dc', ringStroke: '#6f8296', pin: '#f5f7f9', accent: '#e9a23b', accent2: '#b45f00', teal: '#2aa592', dot: 'rgba(19,26,32,0.10)', hot: '#1d8a58',
};
const DARK: Palette = {
  bg: '#12181d', bg2: '#0a0e11', panel: '#171d22', line: '#2b353e', text: '#e9eef2', muted: '#93a0ac', faint: '#66737f',
  ring: '#2a3641', ringStroke: '#5d7185', pin: '#aeb9c4', accent: '#f2a63e', accent2: '#ffc26b', teal: '#35b9a5', dot: 'rgba(233,238,242,0.08)', hot: '#46c789',
};

const UI = `font-family="'Instrument Sans','Inter','Segoe UI',system-ui,-apple-system,Helvetica,Arial,sans-serif"`;
const MONO = `font-family="'Geist Mono','SF Mono',Menlo,Consolas,monospace"`;

const m: Model = buildModel(DEFAULT_PARAMS, 72);
const bore = ringBoreProfile({ pins: m.N, R: m.R, rp: m.rp, wallRadius: m.wallRadius, style: 'integrated', socketFit: 0 }, 2400);
const ringD = path(circlePoints(0, 0, m.ringOuterRadius, 200)) + path(bore);
const pinAt = (k: number): Pt => [m.R * Math.cos((2 * Math.PI * k) / m.N), m.R * Math.sin((2 * Math.PI * k) / m.N)];

function discPath(k: number): string {
  const holes = [path(circlePoints(0, 0, m.boreRadius, 64))];
  for (let j = 0; j < m.p.outputPins; j++) {
    const [hx, hy] = holeCenter(m, k, j);
    holes.push(path(circlePoints(hx, hy, m.holeRadius, 40)));
  }
  return path(m.outline) + holes.join('');
}

function background(c: Palette, w: number, h: number, id: string) {
  return `<defs>
  <radialGradient id="${id}" cx="30%" cy="50%" r="85%"><stop offset="0" stop-color="${c.bg}"/><stop offset="1" stop-color="${c.bg2}"/></radialGradient>
  <pattern id="${id}d" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${c.dot}"/></pattern>
</defs>
<rect width="${w}" height="${h}" fill="url(#${id})"/><rect width="${w}" height="${h}" fill="url(#${id}d)"/>`;
}

/* ───────── hero (animated) ───────── */

function hero(c: Palette): string {
  const cycles = 3;
  const dur = 18;
  const pins = Array.from({ length: m.N }, (_, k) => pinAt(k));
  const discs = m.discPhase.map((d, k) => {
    // SVG's y axis points down, so every math angle is negated.
    const outerFrom = -deg(d);
    const innerFrom = deg(d) * (m.N / m.lobes);
    const color = k === 0 ? c.accent : '#d9774a';
    return `<g><animateTransform attributeName="transform" type="rotate" from="${f(outerFrom)}" to="${f(outerFrom - 360 * cycles)}" dur="${dur}s" repeatCount="indefinite"/>
      <g transform="translate(${m.e} 0)"><g><animateTransform attributeName="transform" type="rotate" from="${f(innerFrom)}" to="${f(innerFrom + 360 * cycles * (m.N / m.lobes))}" dur="${dur}s" repeatCount="indefinite"/>
        <path d="${discPath(k)}" fill="${color}" fill-opacity="${k === 0 ? 0.62 : 0.5}" stroke="${color}" stroke-width="0.7" fill-rule="evenodd"/>
      </g></g></g>`;
  });
  const out = Array.from({ length: m.p.outputPins }, (_, j) => {
    const a = (2 * Math.PI * j) / m.p.outputPins;
    return `<circle cx="${f((m.p.outputPitchDiameter / 2) * Math.cos(a))}" cy="${f(-(m.p.outputPitchDiameter / 2) * Math.sin(a))}" r="${m.p.outputPinDiameter / 2}" fill="${c.teal}" stroke="${c.text}" stroke-opacity="0.5" stroke-width="0.3"/>`;
  }).join('');
  const chip = (x: number, y: number, label: string) =>
    `<g transform="translate(${x} ${y})"><rect width="${label.length * 8.2 + 26}" height="30" rx="15" fill="${c.panel}" stroke="${c.line}"/><circle cx="15" cy="15" r="3.5" fill="${c.accent}"/><text x="26" y="19.5" font-size="13" font-weight="600" fill="${c.muted}" ${UI}>${label}</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 440" width="1280" height="440" role="img" aria-label="Animated cycloidal drive with a lobed disc rolling on a ring of pins">
${background(c, 1280, 440, 'h')}
<g transform="translate(250 220) scale(2.9)">
  <path d="${ringD}" fill="${c.ring}" stroke="${c.ringStroke}" stroke-width="0.4" fill-rule="evenodd"/>
  <circle r="${m.R}" fill="none" stroke="${c.faint}" stroke-width="0.3" stroke-dasharray="2 2.2"/>
  ${pins.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(-y)}" r="${m.rp}" fill="${c.pin}" stroke="${c.ringStroke}" stroke-width="0.4"/>`).join('')}
  ${discs.join('')}
  <g><animateTransform attributeName="transform" type="rotate" from="0" to="${f((360 * cycles) / m.lobes)}" dur="${dur}s" repeatCount="indefinite"/>${out}</g>
  <g><animateTransform attributeName="transform" type="rotate" from="0" to="${f(-360 * cycles)}" dur="${dur}s" repeatCount="indefinite"/>${m.discPhase.map((d) => `<circle cx="${f(m.e * Math.cos(d))}" cy="${f(-m.e * Math.sin(d))}" r="${f(m.camLobeRadius)}" fill="none" stroke="${c.text}" stroke-opacity="0.55" stroke-width="0.35" stroke-dasharray="1.6 1.4"/>`).join('')}</g>
  <circle r="1.1" fill="${c.text}"/>
</g>
<g transform="translate(560 112)">
  <text ${UI} font-size="15" font-weight="700" letter-spacing="2.2" fill="${c.accent2}">PARAMETRIC DRIVE DESIGNER</text>
  <text y="58" ${UI} font-size="52" font-weight="700" letter-spacing="-1.6" fill="${c.text}">Cycloidal Gear</text>
  <text y="112" ${UI} font-size="52" font-weight="700" letter-spacing="-1.6" fill="${c.text}">Generator</text>
  <text y="154" ${UI} font-size="18" fill="${c.muted}">Design a cycloidal reducer, watch it run in 3D and in profile,</text>
  <text y="180" ${UI} font-size="18" fill="${c.muted}">then export print-ready STL or flat SVG and DXF.</text>
  ${chip(0, 214, 'Live 3D and 2D')}${chip(176, 214, 'STL · SVG · DXF')}${chip(358, 214, 'Print tolerances')}
  <text y="284" ${MONO} font-size="14" fill="${c.faint}">${m.ratio}:1 reduction · ${m.N} pins · ${m.lobes} lobes · e = ${m.e} mm</text>
</g>
</svg>
`;
}

/* ───────── anatomy ───────── */

function anatomy(c: Palette): string {
  const S = 4.1;
  const cx = 520;
  const cy = 330;
  const P = (a: number, r: number): [number, number] => [cx + r * S * Math.cos(a), cy - r * S * Math.sin(a)];
  const callout = (a: number, r: number, tx: number, ty: number, title: string, sub: string, anchor: 'start' | 'end') => {
    const [px, py] = P(a, r);
    const lx = anchor === 'start' ? tx - 10 : tx + 10;
    return `<g>
      <path d="M${f(px)} ${f(py)}L${f(lx)} ${f(ty)}" stroke="${c.faint}" stroke-width="1" fill="none"/>
      <circle cx="${f(px)}" cy="${f(py)}" r="3.2" fill="${c.panel}" stroke="${c.accent2}" stroke-width="1.6"/>
      <text x="${tx}" y="${ty - 4}" text-anchor="${anchor}" ${UI} font-size="15" font-weight="650" fill="${c.text}">${title}</text>
      <text x="${tx}" y="${ty + 14}" text-anchor="${anchor}" ${MONO} font-size="12.5" fill="${c.muted}">${sub}</text>
    </g>`;
  };
  const pose = poseAt(m, 0).discs[0];
  const pins = Array.from({ length: m.N }, (_, k) => pinAt(k));
  const hole0 = holeCenter(m, 0, 4);
  const hc: Pt = [pose.x + hole0[0], pose.y + hole0[1]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 660" width="1040" height="660" role="img" aria-label="Annotated cycloidal drive showing ring, pins, disc, eccentricity and output holes">
${background(c, 1040, 660, 'a')}
<g transform="translate(${cx} ${cy}) scale(${S})">
  <path d="${ringD}" fill="${c.ring}" stroke="${c.ringStroke}" stroke-width="0.25" fill-rule="evenodd"/>
  <circle r="${m.R}" fill="none" stroke="${c.faint}" stroke-width="0.22" stroke-dasharray="1.6 1.6"/>
  <circle r="${m.p.outputPitchDiameter / 2}" fill="none" stroke="${c.faint}" stroke-width="0.22" stroke-dasharray="1.6 1.6"/>
  ${pins.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(-y)}" r="${m.rp}" fill="${c.pin}" stroke="${c.ringStroke}" stroke-width="0.25"/>`).join('')}
  <g transform="translate(${f(pose.x)} 0)"><path d="${discPath(0)}" fill="${c.accent}" fill-opacity="0.6" stroke="${c.accent}" stroke-width="0.4" fill-rule="evenodd"/></g>
  <path d="M-70 0H70M0 -70V70" stroke="${c.faint}" stroke-width="0.15" opacity="0.7"/>
  <circle cx="${f(pose.x)}" r="0.9" fill="${c.accent2}"/><circle r="0.9" fill="${c.text}"/>
</g>
${callout(Math.PI * 0.08, m.ringOuterRadius, 840, 70, 'Ring outer Ø', `${m.ringOuterRadius * 2} mm`, 'start')}
${callout(0, m.R, 840, 160, `Ring pins × ${m.N}`, `Ø${m.p.pinDiameter} mm on Ø${m.R * 2}`, 'start')}
${callout(-0.12, m.tipRadius + 0.1, 840, 250, `Disc, ${m.lobes} lobes`, `tip Ø${f(m.tipRadius * 2)} mm`, 'start')}
${callout(-Math.PI * 0.55, m.boreRadius + 1.2, 840, 590, 'Cam bore', `Ø${m.p.boreDiameter} mm`, 'start')}
${callout(Math.PI * 0.62, m.R, 200, 90, 'Pin circle', `Ø${m.R * 2} mm`, 'end')}
${callout(Math.PI * 0.95, m.e + 0.5, 200, 250, 'Eccentricity e', `${m.e} mm cam offset`, 'end')}
<g>
  <path d="M${f(cx + hc[0] * S)} ${f(cy - hc[1] * S)}L200 ${f(430)}" stroke="${c.faint}" stroke-width="1" fill="none"/>
  <circle cx="${f(cx + hc[0] * S)}" cy="${f(cy - hc[1] * S)}" r="3.2" fill="${c.panel}" stroke="${c.accent2}" stroke-width="1.6"/>
  <text x="190" y="426" text-anchor="end" ${UI} font-size="15" font-weight="650" fill="${c.text}">Output holes × ${m.p.outputPins}</text>
  <text x="190" y="444" text-anchor="end" ${MONO} font-size="12.5" fill="${c.muted}">Ø${f(m.holeRadius * 2)} = pin Ø${m.p.outputPinDiameter} + 2e + clr</text>
</g>
<text x="520" y="636" text-anchor="middle" ${MONO} font-size="13" fill="${c.faint}">ratio = N − 1 = ${m.ratio} · output turns opposite to the input</text>
</svg>
`;
}

/* ───────── motion frames ───────── */

function frames(c: Palette): string {
  const W = 1200;
  const H = 400;
  const S = 1.6;
  const inputs = [0, 90, 180, 270];
  const panels = inputs.map((a, i) => {
    const pose = poseAt(m, (a * Math.PI) / 180);
    const d = pose.discs[0];
    const x = 150 + i * 300;
    const mark = discProfile(m.geom, 1)[0];
    const outAngle = -a / m.lobes;
    return `<g transform="translate(${x} 185)">
  <g transform="scale(${S})">
    <path d="${ringD}" fill="${c.ring}" stroke="${c.ringStroke}" stroke-width="0.4" fill-rule="evenodd"/>
    ${Array.from({ length: m.N }, (_, k) => pinAt(k)).map(([px, py]) => `<circle cx="${f(px)}" cy="${f(-py)}" r="${m.rp}" fill="${c.pin}" stroke="${c.ringStroke}" stroke-width="0.4"/>`).join('')}
    <g transform="translate(${f(d.x)} ${f(-d.y)}) rotate(${f(-deg(d.rot))})">
      <path d="${path(m.outline)}${path(circlePoints(0, 0, m.boreRadius, 48))}" fill="${c.accent}" fill-opacity="0.62" stroke="${c.accent}" stroke-width="0.7" fill-rule="evenodd"/>
      <circle cx="${f(mark[0] * 0.93)}" cy="${f(-mark[1] * 0.93)}" r="2.4" fill="${c.text}"/>
    </g>
    <circle cx="${f(d.x)}" cy="${f(-d.y)}" r="1.4" fill="${c.text}"/>
  </g>
  <text y="${Math.round(m.ringOuterRadius * S + 30)}" text-anchor="middle" ${MONO} font-size="13.5" fill="${c.muted}">input ${a}°</text>
  <text y="${Math.round(m.ringOuterRadius * S + 50)}" text-anchor="middle" ${UI} font-size="14.5" font-weight="650" fill="${c.text}">disc turns ${f(outAngle)}°</text>
</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Four frames showing the cam turning a quarter turn at a time while the disc barely rotates in the opposite direction">
${background(c, W, H, 'f')}
${panels.join('\n')}
</svg>
`;
}

/* ───────── parts ───────── */

function parts(c: Palette): string {
  const W = 1200;
  const H = 300;
  const tile = (i: number, title: string, sub: string, body: string) => {
    const x = 20 + i * 232;
    return `<g transform="translate(${x} 20)">
  <rect width="216" height="260" rx="14" fill="${c.panel}" stroke="${c.line}"/>
  <g transform="translate(108 108)">${body}</g>
  <text x="108" y="212" text-anchor="middle" ${UI} font-size="15" font-weight="650" fill="${c.text}">${title}</text>
  <text x="108" y="233" text-anchor="middle" ${MONO} font-size="11.5" fill="${c.muted}">${sub}</text>
</g>`;
  };
  const s = 0.78;
  const pinsC = (r: number) => Array.from({ length: m.N }, (_, k) => pinAt(k)).map(([px, py]) => `<circle cx="${f(px)}" cy="${f(-py)}" r="${m.rp}" fill="${c.pin}" stroke="${c.ringStroke}" stroke-width="0.5"/>`).join('') + (r ? '' : '');
  const ring = `<g transform="scale(${s})"><path d="${ringD}" fill="${c.ring}" stroke="${c.ringStroke}" stroke-width="0.5" fill-rule="evenodd"/>${pinsC(0)}</g>`;
  const disc = (k: number) => `<g transform="scale(${s * 1.25})"><path d="${discPath(k)}" fill="${c.accent}" fill-opacity="0.7" stroke="${c.accent2}" stroke-width="0.6" fill-rule="evenodd"/></g>`;
  const camR = m.camLobeRadius;
  const cam = `<g transform="scale(${s * 6})">${[0, 1].map((k) => `<circle cx="${f(m.e * Math.cos(m.discPhase[k]))}" cy="${f(-m.e * Math.sin(m.discPhase[k]))}" r="${f(camR)}" fill="${k ? '#d9774a' : c.accent}" fill-opacity="0.35" stroke="${c.text}" stroke-width="0.25"/>`).join('')}<circle r="${m.camCoreRadius}" fill="${c.panel}" stroke="${c.text}" stroke-width="0.25"/><circle r="${m.p.shaftDiameter / 2}" fill="${c.bg2}" stroke="${c.text}" stroke-width="0.25"/></g>`;
  const pitch = m.p.outputPitchDiameter / 2;
  const car = `<g transform="scale(${s * 2.3})"><circle r="${pitch + m.p.outputPinDiameter / 2 + 3}" fill="${c.teal}" fill-opacity="0.28" stroke="${c.teal}" stroke-width="0.5"/><circle r="${m.camCoreRadius + 0.4}" fill="${c.bg2}" stroke="${c.teal}" stroke-width="0.4"/>${Array.from({ length: m.p.outputPins }, (_, j) => { const a = (2 * Math.PI * j) / m.p.outputPins; return `<circle cx="${f(pitch * Math.cos(a))}" cy="${f(-pitch * Math.sin(a))}" r="${m.p.outputPinDiameter / 2}" fill="${c.teal}" stroke="${c.text}" stroke-width="0.25"/>`; }).join('')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="The parts the generator exports: outer ring, discs, eccentric cam and output carrier">
${background(c, W, H, 'p')}
${tile(0, 'Outer ring', 'Ø130 · fused pins', ring)}
${tile(1, 'Disc 1', `${m.lobes} lobes · 8 mm`, disc(0))}
${tile(2, 'Disc 2', 'holes at its own phase', disc(1))}
${tile(3, 'Eccentric cam', 'D-flat shaft hole', cam)}
${tile(4, 'Output carrier', `${m.p.outputPins} pins on Ø${m.p.outputPitchDiameter}`, car)}
</svg>
`;
}

for (const [name, c] of [['light', LIGHT], ['dark', DARK]] as const) {
  writeFileSync(`docs/hero-${name}.svg`, hero(c));
  writeFileSync(`docs/anatomy-${name}.svg`, anatomy(c));
  writeFileSync(`docs/frames-${name}.svg`, frames(c));
  writeFileSync(`docs/parts-${name}.svg`, parts(c));
}

// Favicon: a small disc in a ring of pins, in the brand amber.
const fav = buildModel({ ...DEFAULT_PARAMS, pins: 8, pinCircleDiameter: 40, pinDiameter: 6, eccentricity: 1.6, discClearance: 0 }, 14);
const favPins = Array.from({ length: 8 }, (_, k) => [20 * Math.cos((k / 8) * Math.PI * 2), 20 * Math.sin((k / 8) * Math.PI * 2)] as Pt);
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-27 -27 54 54"><rect x="-27" y="-27" width="54" height="54" rx="12" fill="#12181d"/>
${favPins.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(-y)}" r="3.2" fill="#8794a0"/>`).join('')}
<g transform="translate(1.6 0)"><path d="${path(fav.outline)}" fill="#f2a63e" stroke="#ffc26b" stroke-width="0.8"/></g><circle cx="1.6" r="4" fill="#12181d"/></svg>
`,
);
console.log('art written');
