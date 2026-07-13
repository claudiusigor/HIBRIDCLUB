import React, { useEffect, useRef, useState } from 'react';
import { __iconNode as awardIcon } from 'lucide-react/dist/esm/icons/award.mjs';
import { __iconNode as crownIcon } from 'lucide-react/dist/esm/icons/crown.mjs';
import { __iconNode as dumbbellIcon } from 'lucide-react/dist/esm/icons/dumbbell.mjs';
import { __iconNode as flameIcon } from 'lucide-react/dist/esm/icons/flame.mjs';
import { __iconNode as medalIcon } from 'lucide-react/dist/esm/icons/medal.mjs';
import { __iconNode as targetIcon } from 'lucide-react/dist/esm/icons/target.mjs';

const ICON_NODES = {
  target: targetIcon,
  dumbbell: dumbbellIcon,
  flame: flameIcon,
  medal: awardIcon,
  trophy: medalIcon,
  crown: crownIcon,
};

function drawIconNode(context, [tag, attributes]) {
  if (tag === 'path') {
    context.stroke(new Path2D(attributes.d));
    return;
  }
  if (tag === 'circle') {
    context.beginPath();
    context.arc(Number(attributes.cx), Number(attributes.cy), Number(attributes.r), 0, Math.PI * 2);
    context.stroke();
    return;
  }
  if (tag === 'line') {
    context.beginPath();
    context.moveTo(Number(attributes.x1), Number(attributes.y1));
    context.lineTo(Number(attributes.x2), Number(attributes.y2));
    context.stroke();
    return;
  }
  if (tag === 'polyline' || tag === 'polygon') {
    const points = String(attributes.points).trim().split(/\s+/).map((point) => point.split(',').map(Number));
    context.beginPath();
    points.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
    if (tag === 'polygon') context.closePath();
    context.stroke();
    return;
  }
  if (tag === 'rect') {
    context.strokeRect(
      Number(attributes.x),
      Number(attributes.y),
      Number(attributes.width),
      Number(attributes.height),
    );
  }
}

function createIconTexture(THREE, renderer, iconNode, unlocked) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const unit = size / 32;

  context.clearRect(0, 0, size, size);
  context.save();
  context.scale(unit, unit);
  context.translate(4, 4);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 1.9;
  context.strokeStyle = unlocked ? '#FFFFFF' : '#D2D7E0';
  context.shadowColor = unlocked ? '#FE0972' : '#778193';
  context.shadowBlur = unlocked ? 0.8 : 0.35;
  iconNode.forEach((node) => drawIconNode(context, node));
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

async function createBrandTexture(THREE, renderer) {
  const size = 512;
  const image = new Image();
  image.decoding = 'async';
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = `${import.meta.env.BASE_URL}HYBRIDCLUBBANNER.png`;
  });

  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (pixels[(y * source.width + x) * 4 + 3] > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, size, size);
  const sourceWidth = Math.max(1, maxX - minX + 1);
  const sourceHeight = Math.max(1, maxY - minY + 1);
  const targetWidth = 440;
  const targetHeight = targetWidth * (sourceHeight / sourceWidth);
  context.drawImage(
    source,
    minX,
    minY,
    sourceWidth,
    sourceHeight,
    (size - targetWidth) / 2,
    (size - targetHeight) / 2,
    targetWidth,
    targetHeight,
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

async function createAward(THREE, renderer, kind, unlocked) {
  const award = new THREE.Group();
  const accent = unlocked ? 0xfe0972 : 0x8d97a7;
  const accentGlow = unlocked ? 0xfe0972 : 0x687386;

  const sideMaterial = new THREE.MeshPhysicalMaterial({
    color: unlocked ? 0x303745 : 0x555f70,
    metalness: 1,
    roughness: 0.2,
    clearcoat: 0.8,
    clearcoatRoughness: 0.18,
  });
  const faceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1a202b,
    metalness: 0.78,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const accentMaterial = new THREE.MeshPhysicalMaterial({
    color: accent,
    emissive: accentGlow,
    emissiveIntensity: unlocked ? 0.2 : 0.035,
    metalness: unlocked ? 0.72 : 0.92,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const enamelMaterial = new THREE.MeshPhysicalMaterial({
    color: unlocked ? 0x0d1420 : 0x2b3341,
    metalness: 0.08,
    roughness: 0.3,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  });
  const detailMaterial = new THREE.MeshStandardMaterial({
    color: unlocked ? 0xc9d0dc : 0xa7b0bf,
    metalness: 0.94,
    roughness: 0.24,
  });

  const bodyGeometry = new THREE.CylinderGeometry(1.39, 1.39, 0.32, 96, 3);
  const body = new THREE.Mesh(bodyGeometry, [sideMaterial, faceMaterial, faceMaterial]);
  body.rotation.x = Math.PI / 2;
  award.add(body);

  [-0.17, 0.17].forEach((z) => {
    const outerRim = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.105, 28, 112), accentMaterial);
    outerRim.position.z = z;
    award.add(outerRim);

    const innerBezel = new THREE.Mesh(new THREE.TorusGeometry(0.965, 0.025, 16, 96), detailMaterial);
    innerBezel.position.z = z > 0 ? z + 0.037 : z - 0.037;
    award.add(innerBezel);
  });

  const frontEnamel = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.03, 0.07, 96), enamelMaterial);
  frontEnamel.rotation.x = Math.PI / 2;
  frontEnamel.position.z = 0.175;
  award.add(frontEnamel);

  const backEnamel = frontEnamel.clone();
  backEnamel.position.z = -0.175;
  award.add(backEnamel);

  const sideBand = new THREE.Mesh(new THREE.TorusGeometry(1.385, 0.032, 14, 112), detailMaterial);
  sideBand.position.z = 0;
  award.add(sideBand);

  const iconTexture = createIconTexture(THREE, renderer, ICON_NODES[kind] || awardIcon, unlocked);
  const iconMaterial = new THREE.MeshBasicMaterial({
    map: iconTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const icon = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.72), iconMaterial);
  icon.position.z = 0.225;
  award.add(icon);

  const brandTexture = await createBrandTexture(THREE, renderer);
  const brand = new THREE.Mesh(
    new THREE.PlaneGeometry(1.82, 1.82),
    new THREE.MeshBasicMaterial({
      map: brandTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  brand.position.z = -0.225;
  brand.rotation.y = Math.PI;
  award.add(brand);

  award.userData.textures = [iconTexture, brandTexture];
  return award;
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
    let award;
    let environmentTarget;
    let pmremGenerator;
    let cleanupPointer = () => {};

    setFailed(false);

    const build = async () => {
      try {
        const [THREE, { RoomEnvironment }] = await Promise.all([
          import('three'),
          import('three/addons/environments/RoomEnvironment.js'),
        ]);
        if (disposed || !canvasRef.current || !frameRef.current) return;

        const canvas = canvasRef.current;
        const frame = frameRef.current;
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.04;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0, 0.05, 5.95);

        pmremGenerator = new THREE.PMREMGenerator(renderer);
        environmentTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
        scene.environment = environmentTarget.texture;

        award = await createAward(THREE, renderer, kind, unlocked);
        if (disposed) {
          award.userData.textures?.forEach((texture) => texture.dispose());
          return;
        }
        award.rotation.set(-0.08, -0.28, 0.025);
        award.position.y = 0.13;
        scene.add(award);

        const ambient = new THREE.HemisphereLight(0xe8efff, 0x120611, 1.8);
        const key = new THREE.DirectionalLight(0xffffff, 4.8);
        key.position.set(3.2, 4.5, 6);
        const edge = new THREE.DirectionalLight(unlocked ? 0xfe0972 : 0xaab3c2, 1.9);
        edge.position.set(-4, 0.5, 2.5);
        const lower = new THREE.PointLight(0x0a3cff, 3.5, 10);
        lower.position.set(1.5, -3, 2);
        scene.add(ambient, key, edge, lower);

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
        let previousY = 0;
        let targetRotation = -0.28;
        let targetTilt = -0.08;
        let velocity = 0;

        const onPointerDown = (event) => {
          dragging = true;
          previousX = event.clientX;
          previousY = event.clientY;
          velocity = 0;
          canvas.setPointerCapture?.(event.pointerId);
        };
        const onPointerMove = (event) => {
          if (!dragging) return;
          const deltaX = event.clientX - previousX;
          const deltaY = event.clientY - previousY;
          targetRotation += deltaX * 0.014;
          targetTilt = Math.max(-0.42, Math.min(0.34, targetTilt + deltaY * 0.008));
          velocity = deltaX * 0.0018;
          previousX = event.clientX;
          previousY = event.clientY;
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
        let previousTime = 0;
        const animate = (time) => {
          if (disposed) return;
          const delta = Math.min(32, time - previousTime || 16);
          previousTime = time;
          if (!dragging && !reduceMotion) {
            targetRotation += delta * 0.00024 + velocity;
            velocity *= 0.94;
          }
          award.rotation.y += (targetRotation - award.rotation.y) * 0.085;
          award.rotation.x += (targetTilt - award.rotation.x) * 0.085;
          award.position.y = 0.13 + (reduceMotion ? 0 : Math.sin(time * 0.00135) * 0.035);
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(animate);
        };
        animationFrame = window.requestAnimationFrame(animate);

        cleanupPointer.disposeScene = () => {
          award.userData.textures?.forEach((texture) => texture.dispose());
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
      environmentTarget?.dispose();
      pmremGenerator?.dispose();
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
