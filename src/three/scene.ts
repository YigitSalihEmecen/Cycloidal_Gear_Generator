import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { poseAt, type Model } from '../core/model';
import type { PartKind, PartSet } from './parts';

export type Visibility = Record<PartKind, boolean>;

export interface ViewOptions {
  visible: Visibility;
  explode: number; // 0..1
  outlines: boolean;
  ghostRing: boolean;
  dark: boolean;
}

export const PART_COLORS: Record<PartKind, string> = {
  ring: '#8aa1b8',
  pins: '#d3dae2',
  discs: '#e9a23b',
  cam: '#e7edf3',
  carrier: '#35b9a5',
};
const DISC_TONES = ['#e9a23b', '#d9774a', '#f2c25f', '#c98743'];

export type ViewPreset = 'iso' | 'top' | 'front' | 'side';

/** Owns the WebGL scene. React only tells it what to show; it renders on demand. */
export class SceneController {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 1, 4000);
  private controls: OrbitControls;
  private root = new THREE.Group();
  private ro: ResizeObserver;
  private dirty = true;
  private disposed = false;
  private pmrem: THREE.PMREMGenerator;
  private env: THREE.Texture;

  private model: Model | null = null;
  private opts: ViewOptions;
  private angle = 0;
  private hasFitted = false;

  private discGroups: THREE.Object3D[] = [];
  private camMesh: THREE.Object3D | null = null;
  private carrierMesh: THREE.Object3D | null = null;
  private ringMesh: THREE.Object3D | null = null;
  private pinGroup: THREE.Object3D | null = null;
  private materials: THREE.MeshStandardMaterial[] = [];
  private lineMaterials: THREE.LineBasicMaterial[] = [];
  private edgeObjects: THREE.LineSegments[] = [];
  private ringMaterial: THREE.MeshStandardMaterial | null = null;

  constructor(private host: HTMLElement, opts: ViewOptions) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    host.appendChild(this.renderer.domElement);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.7;

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(120, -160, 260);
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.15), this.root);

    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('change', () => (this.dirty = true));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  private frame() {
    if (this.disposed) return;
    const moved = this.controls.update();
    if (moved || this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  }

  setParts(model: Model, parts: PartSet) {
    this.clear();
    this.model = model;
    const std = (color: string, metal: number, rough: number) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, envMapIntensity: 1 });
      this.materials.push(m);
      return m;
    };
    const edges = (mesh: THREE.Mesh) => {
      const lm = this.lineMaterials[0] ?? this.makeLineMaterial();
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 28), lm);
      e.visible = this.opts.outlines;
      mesh.add(e);
      this.edgeObjects.push(e);
    };

    if (parts.ring) {
      this.ringMaterial = std(PART_COLORS.ring, 0.55, 0.42);
      const mesh = new THREE.Mesh(parts.ring.geometry, this.ringMaterial);
      edges(mesh);
      const g = new THREE.Group();
      g.add(mesh);
      this.ringMesh = g;
      this.root.add(g);
    }
    if (parts.pin) {
      const mat = std(PART_COLORS.pins, 0.85, 0.28);
      const g = new THREE.Group();
      for (let k = 0; k < model.N; k++) {
        const a = (k / model.N) * Math.PI * 2;
        const m = new THREE.Mesh(parts.pin.geometry, mat);
        m.position.set(model.R * Math.cos(a), model.R * Math.sin(a), 0);
        g.add(m);
      }
      this.pinGroup = g;
      this.root.add(g);
    }
    parts.discs.forEach((d, k) => {
      const mat = std(DISC_TONES[k % DISC_TONES.length], 0.45, 0.38);
      const mesh = new THREE.Mesh(d.geometry, mat);
      edges(mesh);
      const g = new THREE.Group();
      g.add(mesh);
      this.discGroups.push(g);
      this.root.add(g);
    });
    if (parts.cam) {
      const mesh = new THREE.Mesh(parts.cam.geometry, std(PART_COLORS.cam, 0.7, 0.3));
      edges(mesh);
      const g = new THREE.Group();
      g.add(mesh);
      this.camMesh = g;
      this.root.add(g);
    }
    if (parts.carrier) {
      const mesh = new THREE.Mesh(parts.carrier.geometry, std(PART_COLORS.carrier, 0.35, 0.4));
      edges(mesh);
      const g = new THREE.Group();
      g.add(mesh);
      this.carrierMesh = g;
      this.root.add(g);
    }
    this.applyOptions(this.opts);
    this.setAngle(this.angle);
    if (!this.hasFitted) {
      this.fit('iso');
      this.hasFitted = true;
    }
    this.dirty = true;
  }

  private makeLineMaterial() {
    const m = new THREE.LineBasicMaterial({ color: this.opts.dark ? 0x0b0e11 : 0x24303b, transparent: true, opacity: this.opts.dark ? 0.55 : 0.4 });
    this.lineMaterials.push(m);
    return m;
  }

  private clear() {
    this.root.clear();
    this.edgeObjects.forEach((e) => e.geometry.dispose());
    this.edgeObjects = [];
    this.materials.forEach((m) => m.dispose());
    this.materials = [];
    this.lineMaterials.forEach((m) => m.dispose());
    this.lineMaterials = [];
    this.discGroups = [];
    this.camMesh = this.carrierMesh = this.ringMesh = this.pinGroup = null;
    this.ringMaterial = null;
  }

  applyOptions(o: ViewOptions) {
    this.opts = o;
    const v = o.visible;
    if (this.ringMesh) this.ringMesh.visible = v.ring;
    if (this.pinGroup) this.pinGroup.visible = v.pins;
    this.discGroups.forEach((g) => (g.visible = v.discs));
    if (this.camMesh) this.camMesh.visible = v.cam;
    if (this.carrierMesh) this.carrierMesh.visible = v.carrier;
    if (this.ringMaterial) {
      this.ringMaterial.transparent = o.ghostRing;
      this.ringMaterial.opacity = o.ghostRing ? 0.22 : 1;
      this.ringMaterial.depthWrite = !o.ghostRing;
      this.ringMaterial.needsUpdate = true;
    }
    this.edgeObjects.forEach((e) => (e.visible = o.outlines));
    this.lineMaterials.forEach((m) => {
      m.color.set(o.dark ? 0x0b0e11 : 0x24303b);
      m.opacity = o.dark ? 0.55 : 0.4;
    });
    this.scene.environmentIntensity = o.dark ? 0.85 : 0.6;
    this.layoutExplode();
    this.dirty = true;
  }

  private layoutExplode() {
    const m = this.model;
    if (!m) return;
    const s = this.opts.explode;
    const n = m.discZ.length;
    this.discGroups.forEach((g, k) => {
      g.position.z = m.discZ[k] + (k - (n - 1) / 2) * s * (m.p.discThickness + 18);
    });
    if (this.carrierMesh) this.carrierMesh.position.z = s * (m.stackHeight / 2 + 55);
    if (this.camMesh) this.camMesh.position.z = -s * 38;
    if (this.pinGroup) this.pinGroup.position.z = 0;
    if (this.ringMesh) this.ringMesh.position.z = 0;
  }

  setAngle(input: number) {
    this.angle = input;
    const m = this.model;
    if (!m) return;
    const pose = poseAt(m, input);
    this.discGroups.forEach((g, k) => {
      const d = pose.discs[k];
      g.position.x = d.x;
      g.position.y = d.y;
      g.rotation.z = d.rot;
    });
    if (this.camMesh) this.camMesh.rotation.z = pose.camRot;
    if (this.carrierMesh) this.carrierMesh.rotation.z = pose.carrierRot;
    this.dirty = true;
  }

  fit(view: ViewPreset = 'iso') {
    const m = this.model;
    const radius = m ? Math.max(m.ringOuterRadius, 20) : 70;
    const zMin = m ? Math.min(m.camBottom, -m.ringThickness / 2) : -10;
    const zMax = m ? Math.max(m.camTop, m.ringThickness / 2) : 10;
    const cz = (zMin + zMax) / 2;
    const sphere = Math.hypot(radius, (zMax - zMin) / 2);
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const flat = view === 'top';
    // Top view only needs the disc to fit; the other views need the whole bounding sphere.
    const fitR = flat ? radius * 1.05 : sphere * 0.92;
    const dist = (fitR / Math.sin(Math.min(vfov, hfov) / 2)) * 1.08;
    const dir: Record<ViewPreset, [number, number, number]> = {
      iso: [0.62, -0.78, 0.6],
      top: [0, -0.0001, 1],
      front: [0, -1, 0.0001],
      side: [1, 0, 0.0001],
    };
    const v = new THREE.Vector3(...dir[view]).normalize().multiplyScalar(dist);
    this.controls.target.set(0, 0, flat ? 0 : cz);
    this.camera.position.copy(this.controls.target).add(v);
    this.camera.near = Math.max(1, dist / 100);
    this.camera.far = dist * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.dirty = true;
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.controls.dispose();
    this.clear();
    this.env.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
