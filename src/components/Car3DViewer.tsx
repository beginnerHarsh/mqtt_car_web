import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Car3DViewerProps {
  speed?: number;
  heading?: number;
  isMoving?: boolean;
}

export const Car3DViewer: React.FC<Car3DViewerProps> = ({
  speed = 0,
  heading = 0,
  isMoving = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const vehicleGroupRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 180;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(4, 2.5, 5);
    camera.lookAt(0, 0.4, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const bluePointLight = new THREE.PointLight(0x2170e4, 2, 10);
    bluePointLight.position.set(0, 2, 0);
    scene.add(bluePointLight);

    // ── 3D Realistic Vehicle Model Construction ──────────────────────
    const vehicleGroup = new THREE.Group();
    vehicleGroupRef.current = vehicleGroup;

    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x0058be,
      metalness: 0.6,
      roughness: 0.2,
    });

    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.8,
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      metalness: 0.8,
      roughness: 0.2,
    });

    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Lower Main Chassis Body (SUV / Innova shape)
    const chassisGeo = new THREE.BoxGeometry(1.6, 0.55, 3.4);
    const chassis = new THREE.Mesh(chassisGeo, bodyMaterial);
    chassis.position.y = 0.5;
    vehicleGroup.add(chassis);

    // Upper Roof / Cabin
    const cabinGeo = new THREE.BoxGeometry(1.4, 0.5, 1.9);
    const cabin = new THREE.Mesh(cabinGeo, cabinMaterial);
    cabin.position.set(0, 0.95, -0.2);
    vehicleGroup.add(cabin);

    // Bonnet Slope Accent
    const bonnetGeo = new THREE.BoxGeometry(1.45, 0.15, 0.9);
    const bonnet = new THREE.Mesh(bonnetGeo, bodyMaterial);
    bonnet.position.set(0, 0.7, 1.0);
    vehicleGroup.add(bonnet);

    // Headlights (Front)
    const headLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), headlightMaterial);
    headLeft.position.set(-0.55, 0.55, 1.71);
    vehicleGroup.add(headLeft);

    const headRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), headlightMaterial);
    headRight.position.set(0.55, 0.55, 1.71);
    vehicleGroup.add(headRight);

    // Taillights (Rear)
    const tailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), taillightMaterial);
    tailLeft.position.set(-0.55, 0.6, -1.71);
    vehicleGroup.add(tailLeft);

    const tailRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), taillightMaterial);
    tailRight.position.set(0.55, 0.6, -1.71);
    vehicleGroup.add(tailRight);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 24);
    const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.24, 16);

    const wheelPositions = [
      { x: -0.85, y: 0.32, z: 1.0 },
      { x: 0.85, y: 0.32, z: 1.0 },
      { x: -0.85, y: 0.32, z: -1.0 },
      { x: 0.85, y: 0.32, z: -1.0 },
    ];

    const wheels: THREE.Mesh[] = [];

    wheelPositions.forEach((pos) => {
      const wheelContainer = new THREE.Group();
      wheelContainer.position.set(pos.x, pos.y, pos.z);

      const tire = new THREE.Mesh(wheelGeo, wheelMaterial);
      tire.rotation.z = Math.PI / 2;
      wheelContainer.add(tire);

      const rim = new THREE.Mesh(rimGeo, rimMaterial);
      rim.rotation.z = Math.PI / 2;
      wheelContainer.add(rim);

      vehicleGroup.add(wheelContainer);
      wheels.push(tire);
    });

    wheelsRef.current = wheels;

    // Ground Shadow Disc
    const shadowGeo = new THREE.PlaneGeometry(2.4, 4.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = Math.PI / 2;
    shadowPlane.position.y = 0.01;
    vehicleGroup.add(shadowPlane);

    scene.add(vehicleGroup);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (vehicleGroupRef.current) {
        // Continuous slow orbit for showcase
        vehicleGroupRef.current.rotation.y += 0.008;

        // Spin wheels if vehicle is moving
        if (isMoving || speed > 0) {
          wheelsRef.current.forEach((w) => {
            w.rotation.x += delta * (speed > 0 ? speed * 0.1 : 5);
          });
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-40 bg-gradient-to-b from-slate-100 to-slate-200/80 rounded-xl overflow-hidden border border-slate-200/80 shadow-inner flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/80 backdrop-blur-md rounded text-[10px] font-mono text-blue-700 font-semibold border border-slate-200">
        3D Vehicle Render
      </div>
    </div>
  );
};
