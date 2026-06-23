import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildGearGeometry, buildOuterRingGeometry } from '../utils/geometryBuilder.js';

export default function ThreeViewer({ params, setGeometries }) {
  const mountRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    
    const width = mountRef.current.clientWidth || window.innerWidth - 360;
    const height = mountRef.current.clientHeight || window.innerHeight;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 0, 250);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    
    // Clear any existing canvases (HMR / StrictMode bug fix)
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(100, 100, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-100, -100, -100);
    scene.add(dirLight2);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(mountRef.current);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      groupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;
    
    while(groupRef.current.children.length > 0){ 
      const child = groupRef.current.children[0];
      groupRef.current.remove(child); 
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    try {
      const ringGeo = buildOuterRingGeometry(params);

      const exportedGeometries = { ring: ringGeo.clone() };

      const gearMaterial1 = new THREE.MeshPhysicalMaterial({
        color: 0x3b82f6,
        metalness: 0.2, roughness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2,
        transparent: true, opacity: 0.9, side: THREE.DoubleSide
      });

      const gearMaterial2 = new THREE.MeshPhysicalMaterial({
        color: 0x10b981,
        metalness: 0.2, roughness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2,
        transparent: true, opacity: 0.9, side: THREE.DoubleSide
      });

      const ringMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x64748b,
        metalness: 0.5, roughness: 0.5,
        transparent: true, opacity: 0.4, side: THREE.DoubleSide
      });

      const gap = 0.5;
      const totalHeight = params.numGears * params.thickness + (params.numGears - 1) * gap;
      const startZ = -totalHeight / 2 + params.thickness / 2;

      for (let i = 0; i < params.numGears; i++) {
        const gearGeo = buildGearGeometry(params, i);
        
        const mat = i % 2 === 0 ? gearMaterial1 : gearMaterial2;
        const mesh = new THREE.Mesh(gearGeo, mat);
        
        mesh.position.z = startZ + i * (params.thickness + gap);
        
        const phase = (Math.PI * 2 / params.numGears) * i;
        mesh.rotation.z = phase;
        
        groupRef.current.add(mesh);
        exportedGeometries[`gear${i+1}`] = gearGeo.clone();
      }

      const ringMesh = new THREE.Mesh(ringGeo, ringMaterial);
      groupRef.current.add(ringMesh);

      if (setGeometries) {
        setGeometries(exportedGeometries);
      }

    } catch (e) {
      console.error("Geometry generation failed", e);
      throw new Error("Geometry generation failed: " + e.message);
    }
  }, [params, setGeometries]);

  return <div ref={mountRef} className="canvas-wrapper" style={{ width: '100%', height: '100%', minHeight: '400px' }} />;
}
