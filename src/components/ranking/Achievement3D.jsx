import React, { useEffect, useRef, useState } from 'react';

function createStarShape(THREE, points = 5, outerRadius = 0.62, innerRadius = 0.28) {
  const shape = new THREE.Shape();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = (index / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createFlameShape(THREE) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.72);
  shape.bezierCurveTo(-0.7, -0.32, -0.58, 0.22, -0.16, 0.72);
  shape.bezierCurveTo(-0.12, 0.3, 0.12, 0.18, 0.2, -0.08);
  shape.bezierCurveTo(0.5, 0.22, 0.72, -0.3, 0.28, -0.72);
  shape.bezierCurveTo(0.12, -0.84, -0.12, -0.84, 0, -0.72);
  return shape;
}

function createTrophyShape(THREE) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.58, 0.58);
  shape.lineTo(0.58, 0.58);
  shape.bezierCurveTo(0.52, -0.04, 0.3, -0.2, 0.12, -0.28);
  shape.lineTo(0.12, -0.5);
  shape.lineTo(0.42, -0.6);
  shape.lineTo(0.42, -0.72);
  shape.lineTo(-0.42, -0.72);
  shape.lineTo(-0.42, -0.6);
  shape.lineTo(-0.12, -0.5);
  shape.lineTo(-0.12, -0.28);
  shape.bezierCurveTo(-0.3, -0.2, -0.52, -0.04, -0.58, 0.58);
  return shape;
}

function addEmblem(THREE, group, kind, material) {
  const front = new THREE.Group();
  front.position.z = 0.2;

  const extrude = (shape, scale = 1) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.035,
      bevelThickness: 0.025,
    });
    geometry.center();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(scale);
    front.add(mesh);
  };

  if (kind === 'target') {
    [0.62, 0.38].forEach((radius) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.075, 18, 56), material);
      front.add(ring);
    });
    front.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), material));
  } else if (kind === 'dumbbell') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.13, 0.13), material);
    front.add(bar);
    [-0.62, 0.62].forEach((x) => {
      const weight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.68, 0.18), material);
      weight.position.x = x;
      front.add(weight);
    });
    front.rotation.z = -0.35;
  } else if (kind === 'flame') {
    extrude(createFlameShape(THREE), 0.9);
  } else if (kind === 'trophy') {
    extrude(createTrophyShape(THREE), 0.88);
    [-0.7, 0.7].forEach((x, index) => {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.065, 14, 30, Math.PI), material);
      handle.position.set(x, 0.22, 0);
      handle.rotation.z = index === 0 ? -Math.PI / 2 : Math.PI / 2;
      front.add(handle);
    });
  } else {
    extrude(createStarShape(THREE), kind === 'crown' ? 1.05 : 0.88);
  }

  group.add(front);
}

export default function Achievement3D({ kind = 'medal', unlocked = false, label }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let renderer;
    let observer;
    let animationFrame;
    let cleanupPointer = () => {};

    const build = async () => {
      try {
        const THREE = await import('three');
        if (disposed || !canvasRef.current || !frameRef.current) return;

        const canvas = canvasRef.current;
        const frame = frameRef.current;
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0.05, 5.4);

        const award = new THREE.Group();
        award.rotation.x = -0.08;
        scene.add(award);

        const baseMaterial = new THREE.MeshStandardMaterial({
          color: unlocked ? 0x252c39 : 0x4f5868,
          metalness: 0.88,
          roughness: 0.2,
        });
        const edgeMaterial = new THREE.MeshStandardMaterial({
          color: unlocked ? 0xfe0972 : 0x9aa3b2,
          metalness: 0.95,
          roughness: 0.15,
        });
        const emblemMaterial = new THREE.MeshStandardMaterial({
          color: unlocked ? 0xf5f7ff : 0xc2c8d2,
          metalness: 0.72,
          roughness: 0.2,
        });

        const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.24, 64, 2), baseMaterial);
        coin.rotation.x = Math.PI / 2;
        award.add(coin);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(1.17, 0.09, 24, 80), edgeMaterial);
        rim.position.z = 0.14;
        award.add(rim);

        const inset = new THREE.Mesh(new THREE.CircleGeometry(1.02, 64), new THREE.MeshStandardMaterial({
          color: unlocked ? 0x101722 : 0x343b48,
          metalness: 0.55,
          roughness: 0.3,
        }));
        inset.position.z = 0.15;
        award.add(inset);
        addEmblem(THREE, award, kind, emblemMaterial);

        const ambient = new THREE.HemisphereLight(0xdde8ff, 0x170415, 2.2);
        const key = new THREE.DirectionalLight(0xffffff, 5.2);
        key.position.set(3, 4, 6);
        const rimLight = new THREE.PointLight(unlocked ? 0xfe0972 : 0x6e7890, 22, 12);
        rimLight.position.set(-3, -1, 3);
        scene.add(ambient, key, rimLight);

        const resize = () => {
          const { width, height } = frame.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        observer = new ResizeObserver(resize);
        observer.observe(frame);
        resize();

        let dragging = false;
        let previousX = 0;
        let targetRotation = 0;
        const onPointerDown = (event) => {
          dragging = true;
          previousX = event.clientX;
          canvas.setPointerCapture?.(event.pointerId);
        };
        const onPointerMove = (event) => {
          if (!dragging) return;
          targetRotation += (event.clientX - previousX) * 0.014;
          previousX = event.clientX;
        };
        const onPointerUp = () => { dragging = false; };
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        cleanupPointer = () => {
          canvas.removeEventListener('pointerdown', onPointerDown);
          canvas.removeEventListener('pointermove', onPointerMove);
          canvas.removeEventListener('pointerup', onPointerUp);
          canvas.removeEventListener('pointercancel', onPointerUp);
        };

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animate = (time) => {
          if (disposed) return;
          if (!dragging && !reduceMotion) targetRotation += 0.006;
          award.rotation.y += (targetRotation - award.rotation.y) * 0.08;
          award.position.y = reduceMotion ? 0 : Math.sin(time * 0.0015) * 0.045;
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(animate);
        };
        animationFrame = window.requestAnimationFrame(animate);

        cleanupPointer.disposeScene = () => {
          scene.traverse((object) => {
            object.geometry?.dispose?.();
            if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
            else object.material?.dispose?.();
          });
        };
      } catch {
        if (!disposed) setFailed(true);
      }
    };

    build();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      cleanupPointer.disposeScene?.();
      cleanupPointer();
      renderer?.dispose();
    };
  }, [kind, unlocked]);

  return (
    <div ref={frameRef} className="hc-achievement-3d" data-render-state={failed ? 'fallback' : 'canvas'}>
      {failed ? (
        <div className="hc-achievement-3d__fallback" aria-label={`Medalha ${label}`}>HC</div>
      ) : (
        <canvas ref={canvasRef} aria-label={`Medalha 3D ${label}. Arraste para girar.`} />
      )}
    </div>
  );
}
