import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Car3DViewerProps {
  speed?: number;
  heading?: number;
  isMoving?: boolean;
  deviceId?: string;
}

export const Car3DViewer: React.FC<Car3DViewerProps> = ({
  speed = 0,
  heading: _heading = 0,
  isMoving = false,
  deviceId = 'MAHINDRA',
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
    camera.position.set(3.5, 2.5, 4.5);
    camera.lookAt(0, 0.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 1.5, 10);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // ── 3D Realistic Tractor Model Construction ──────────────────────
    const vehicleGroup = new THREE.Group();
    vehicleGroupRef.current = vehicleGroup;

    // Brand-specific colors
    let brandColor = 0xdc2626; // default Mahindra red
    if (deviceId === 'MAHINDRA') brandColor = 0xdc2626; // red
    else if (deviceId === 'JOHN_DEERE') brandColor = 0x15803d; // green
    else if (deviceId === 'SWARAJ') brandColor = 0x2563eb; // blue
    else if (deviceId === 'SONALIKA') brandColor = 0x1d4ed8; // dark blue
    else if (deviceId === 'FARMTRAC') brandColor = 0x0284c7; // sky blue / teal

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: brandColor,
      metalness: 0.55,
      roughness: 0.25,
    });

    const mechanicalMaterial = new THREE.MeshStandardMaterial({
      color: 0x374151, // dark slate
      metalness: 0.8,
      roughness: 0.4,
    });

    // 1. Engine Hood (Tractor Front Body)
    const engineGeo = new THREE.BoxGeometry(0.7, 0.75, 1.35);
    const engineMesh = new THREE.Mesh(engineGeo, bodyMaterial);
    engineMesh.position.set(0, 0.65, 0.35);
    vehicleGroup.add(engineMesh);

    // 2. Rear Fender / Platform
    const platformGeo = new THREE.BoxGeometry(1.15, 0.2, 0.95);
    const platform = new THREE.Mesh(platformGeo, bodyMaterial);
    platform.position.set(0, 0.5, -0.65);
    vehicleGroup.add(platform);

    // Left Rear Fender Mudguard
    const fenderGeo = new THREE.BoxGeometry(0.24, 0.55, 1.05);
    const fenderL = new THREE.Mesh(fenderGeo, bodyMaterial);
    fenderL.position.set(-0.55, 0.78, -0.65);
    vehicleGroup.add(fenderL);

    // Right Rear Fender Mudguard
    const fenderR = fenderL.clone();
    fenderR.position.x = 0.55;
    vehicleGroup.add(fenderR);

    // 3. Cabin Canopy
    // Support posts (black)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 });
    const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.95, 8);

    const postFL = new THREE.Mesh(postGeo, postMat);
    postFL.position.set(-0.35, 1.1, -0.25);
    vehicleGroup.add(postFL);

    const postFR = postFL.clone();
    postFR.position.x = 0.35;
    vehicleGroup.add(postFR);

    const postRL = postFL.clone();
    postRL.position.z = -1.0;
    vehicleGroup.add(postRL);

    const postRR = postFR.clone();
    postRR.position.z = -1.0;
    vehicleGroup.add(postRR);

    // White Canopy Roof
    const roofGeo = new THREE.BoxGeometry(0.95, 0.06, 1.05);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.58, -0.62);
    vehicleGroup.add(roof);

    // Driver Seat (dark grey)
    const seatGeo = new THREE.BoxGeometry(0.42, 0.26, 0.42);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.7, -0.58);
    vehicleGroup.add(seat);

    // 4. Steering Wheel & Dash console
    const consoleGeo = new THREE.BoxGeometry(0.68, 0.32, 0.26);
    const consoleMesh = new THREE.Mesh(consoleGeo, mechanicalMaterial);
    consoleMesh.position.set(0, 0.88, -0.15);
    vehicleGroup.add(consoleMesh);

    // Steering post
    const steeringColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), postMat);
    steeringColumn.position.set(0, 1.1, -0.22);
    steeringColumn.rotation.x = -Math.PI / 6;
    vehicleGroup.add(steeringColumn);

    // Wheel Ring
    const steeringWheelGeo = new THREE.TorusGeometry(0.16, 0.02, 6, 18);
    const steeringWheel = new THREE.Mesh(steeringWheelGeo, postMat);
    steeringWheel.position.set(0, 1.28, -0.32);
    steeringWheel.rotation.x = Math.PI / 3;
    vehicleGroup.add(steeringWheel);

    // 5. Front Grill & Headlights
    const grillGeo = new THREE.BoxGeometry(0.66, 0.6, 0.04);
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const grill = new THREE.Mesh(grillGeo, grillMat);
    grill.position.set(0, 0.65, 1.03);
    vehicleGroup.add(grill);

    const lightGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // yellow glow
    const headlightL = new THREE.Mesh(lightGeo, lightMat);
    headlightL.rotation.x = Math.PI / 2;
    headlightL.position.set(-0.2, 0.72, 1.05);
    vehicleGroup.add(headlightL);

    const headlightR = headlightL.clone();
    headlightR.position.x = 0.2;
    vehicleGroup.add(headlightR);

    // 6. Exhaust Pipe (Silencer)
    const pipeGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.95, 8);
    const pipe = new THREE.Mesh(pipeGeo, postMat);
    pipe.position.set(0.22, 1.25, 0.55);
    vehicleGroup.add(pipe);

    const bendGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8);
    const bend = new THREE.Mesh(bendGeo, postMat);
    bend.position.set(0.25, 1.73, 0.55);
    bend.rotation.z = Math.PI / 4;
    vehicleGroup.add(bend);

    // 7. Wheels & Rims
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b, // black tires
      roughness: 0.85,
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // bright white rims
      metalness: 0.4,
      roughness: 0.3,
    });

    // Rear Wheels (Large)
    const rearWheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 24);
    const rearRimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.32, 16);

    // Front Wheels (Small)
    const frontWheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 20);
    const frontRimGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.2, 12);

    const wheels: THREE.Mesh[] = [];

    const wheelConfigs = [
      { x: -0.66, y: 0.48, z: -0.65, size: 'large' }, // Rear Left
      { x: 0.66, y: 0.48, z: -0.65, size: 'large' },  // Rear Right
      { x: -0.48, y: 0.28, z: 0.62, size: 'small' },   // Front Left
      { x: 0.48, y: 0.28, z: 0.62, size: 'small' },    // Front Right
    ];

    wheelConfigs.forEach((config) => {
      const wheelContainer = new THREE.Group();
      wheelContainer.position.set(config.x, config.y, config.z);

      const tire = new THREE.Mesh(config.size === 'large' ? rearWheelGeo : frontWheelGeo, wheelMaterial);
      tire.rotation.z = Math.PI / 2;
      wheelContainer.add(tire);

      const rim = new THREE.Mesh(config.size === 'large' ? rearRimGeo : frontRimGeo, rimMaterial);
      rim.rotation.z = Math.PI / 2;
      wheelContainer.add(rim);

      vehicleGroup.add(wheelContainer);
      wheels.push(tire);
    });

    wheelsRef.current = wheels;

    // Ground Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(2.0, 3.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.25,
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
        // Continuous slow showcase orbit spin
        vehicleGroupRef.current.rotation.y += 0.008;

        // Spin wheels if vehicle is moving
        if (isMoving || speed > 0) {
          wheelsRef.current.forEach((w) => {
            w.rotation.x += delta * (speed > 0 ? speed * 0.15 : 6);
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
  }, [deviceId, isMoving, speed]);

  return (
    <div className="relative w-full h-40 bg-gradient-to-b from-slate-100 to-slate-200/80 rounded-xl overflow-hidden border border-slate-200/80 shadow-inner flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/80 backdrop-blur-md rounded text-[10px] font-mono text-blue-700 font-semibold border border-slate-200">
        3D Tractor Render
      </div>
    </div>
  );
};
