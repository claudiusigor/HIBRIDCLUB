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
  const sourceImage = sourceContext.getImageData(0, 0, source.width, source.height);
  const pixels = sourceImage.data;
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const pixelIndex = (y * source.width + x) * 4;
      const intensity = Math.max(pixels[pixelIndex], pixels[pixelIndex + 1], pixels[pixelIndex + 2]);
      const visibleColor = Math.max(0, Math.min(1, (intensity - 18) / 72));
      pixels[pixelIndex + 3] = Math.round(pixels[pixelIndex + 3] * visibleColor);

      if (pixels[pixelIndex + 3] > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  sourceContext.putImageData(sourceImage, 0, 0);

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

function createBrushedTexture(THREE, renderer) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  let seed = 1977;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let y = 0; y < size; y += 1) {
    const sweep = Math.sin(y * 0.18) * 2.2 + Math.sin(y * 0.047) * 1.4;
    for (let x = 0; x < size; x += 1) {
      const value = Math.max(72, Math.min(206, 154 + sweep + (random() - 0.5) * 12));
      const index = (y * size + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  context.globalAlpha = 0.07;
  for (let index = 0; index < 28; index += 1) {
    const y = random() * size;
    context.strokeStyle = index % 3 === 0 ? '#ffffff' : '#101820';
    context.lineWidth = 0.35 + random() * 0.65;
    context.beginPath();
    context.moveTo(-24, y);
    context.lineTo(size + 24, y + (random() - 0.5) * 5);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 2.4);
  texture.needsUpdate = true;
  return texture;
}

function roundedPolygonPath(THREE, points, PathType = THREE.Shape, radius = 0.09) {
  const path = new PathType();
  const corners = points.map(([x, y], index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(previous[0] - x, previous[1] - y);
    const nextLength = Math.hypot(next[0] - x, next[1] - y);
    const previousInset = Math.min(radius, previousLength * 0.28);
    const nextInset = Math.min(radius, nextLength * 0.28);
    return {
      corner: [x, y],
      incoming: [x + ((previous[0] - x) / previousLength) * previousInset, y + ((previous[1] - y) / previousLength) * previousInset],
      outgoing: [x + ((next[0] - x) / nextLength) * nextInset, y + ((next[1] - y) / nextLength) * nextInset],
    };
  });

  path.moveTo(...corners[0].incoming);
  corners.forEach(({ incoming, corner, outgoing }) => {
    path.lineTo(...incoming);
    path.quadraticCurveTo(...corner, ...outgoing);
  });
  path.closePath();
  return path;
}

function scaledPolygon(points, scaleX, scaleY = scaleX, offsetX = 0, offsetY = 0) {
  return points.map(([x, y]) => [x * scaleX + offsetX, y * scaleY + offsetY]);
}

function extrudedPolygon(THREE, points, depth, material, z = 0, bevel = 0.035) {
  const geometry = new THREE.ExtrudeGeometry(roundedPolygonPath(THREE, points), {
    depth,
    steps: 1,
    curveSegments: 8,
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  return mesh;
}

function extrudedRing(THREE, outer, inner, depth, material, z = 0, bevel = 0.025) {
  const shape = roundedPolygonPath(THREE, outer);
  shape.holes.push(roundedPolygonPath(THREE, [...inner].reverse(), THREE.Path, 0.07));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 8,
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  return mesh;
}

function routeBar(THREE, start, end, width, depth, material, z) {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const length = Math.hypot(deltaX, deltaY);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, width, depth, 1, 1, 1),
    material,
  );
  mesh.position.set((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, z);
  mesh.rotation.z = Math.atan2(deltaY, deltaX);
  return mesh;
}

function iconNodesToSvg(iconNode) {
  const allowedAttributes = new Set(['d', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'rx', 'ry', 'points']);
  const elements = iconNode.map(([tag, attributes]) => {
    const serialized = Object.entries(attributes)
      .filter(([key]) => allowedAttributes.has(key))
      .map(([key, value]) => `${key}="${String(value)}"`)
      .join(' ');
    return `<${tag} ${serialized} />`;
  }).join('');
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${elements}</svg>`;
}

function createReliefIcon(THREE, SVGLoader, iconNode, materials) {
  const icon = new THREE.Group();
  const parsed = new SVGLoader().parse(iconNodesToSvg(iconNode));
  const frontGroup = new THREE.Group();
  const backingGroup = new THREE.Group();

  parsed.paths.forEach((path) => {
    path.subPaths.forEach((subPath) => {
      const sourcePoints = subPath.getPoints(18);
      if (sourcePoints.length < 2) return;
      const points = sourcePoints.map((point) => new THREE.Vector3(
        (point.x - 12) * 0.058,
        (12 - point.y) * 0.058,
        0,
      ));
      const closed = points.length > 2 && points[0].distanceTo(points[points.length - 1]) < 0.025;
      if (closed) points.pop();
      if (points.length < 2) return;

      const curve = new THREE.CurvePath();
      for (let index = 0; index < points.length - 1; index += 1) {
        curve.add(new THREE.LineCurve3(points[index], points[index + 1]));
      }
      if (closed) curve.add(new THREE.LineCurve3(points[points.length - 1], points[0]));

      const tubularSegments = Math.max(24, points.length * 3);
      const backing = new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubularSegments, 0.052, 10, closed),
        materials.graphite,
      );
      const front = new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubularSegments, 0.034, 10, closed),
        materials.titanium,
      );
      backingGroup.add(backing);
      frontGroup.add(front);
    });
  });

  backingGroup.position.z = 0.285;
  frontGroup.position.z = 0.32;
  icon.add(backingGroup, frontGroup);
  return icon;
}

function createMaterialSet(THREE, brushedTexture, kind, unlocked) {
  const accents = {
    target: [0x655cff, 0x12d6f4],
    dumbbell: [0x12d6f4, 0x68f3c3],
    flame: [0xff5d5a, 0xff9b57],
    medal: [0x2f78ff, 0xa8b8d4],
    trophy: [0xfe0972, 0xff715b],
    crown: [0xf6c953, 0xfe0972],
  };
  const [primaryColor, secondaryColor] = accents[kind] || accents.medal;
  const activePrimary = unlocked ? primaryColor : 0x748092;
  const activeSecondary = unlocked ? secondaryColor : 0xa5adba;
  const commonMetal = {
    metalness: 1,
    roughness: 0.38,
    roughnessMap: brushedTexture,
    bumpMap: brushedTexture,
    bumpScale: 0.0025,
    anisotropy: 0.88,
    anisotropyRotation: Math.PI / 2,
    clearcoat: 0.12,
    clearcoatRoughness: 0.38,
  };

  return {
    graphite: new THREE.MeshPhysicalMaterial({
      ...commonMetal,
      color: unlocked ? 0x101316 : 0x2d3238,
      roughness: 0.58,
      clearcoat: 0.08,
    }),
    darkMetal: new THREE.MeshPhysicalMaterial({
      ...commonMetal,
      color: unlocked ? 0x2f3439 : 0x515860,
      roughness: 0.44,
    }),
    titanium: new THREE.MeshPhysicalMaterial({
      ...commonMetal,
      color: unlocked ? 0xaeb5ba : 0x8d949b,
      metalness: 0.92,
      roughness: 0.36,
    }),
    primary: new THREE.MeshPhysicalMaterial({
      ...commonMetal,
      color: activePrimary,
      emissive: activePrimary,
      emissiveIntensity: unlocked ? 0.018 : 0,
      roughness: 0.3,
      clearcoat: 0.28,
      clearcoatRoughness: 0.25,
    }),
    secondary: new THREE.MeshPhysicalMaterial({
      ...commonMetal,
      color: activeSecondary,
      emissive: activeSecondary,
      emissiveIntensity: unlocked ? 0.01 : 0,
      roughness: 0.31,
      clearcoat: 0.25,
      clearcoatRoughness: 0.26,
    }),
  };
}

function buildRouteAward(THREE, award, materials) {
  const outer = [
    [-1.12, 0.98], [-0.34, 1.42], [0.68, 1.2], [1.22, 0.42],
    [1.08, -0.78], [0.34, -1.38], [-0.68, -1.27], [-1.25, -0.35],
  ];
  const inner = scaledPolygon(outer, 0.865, 0.85, 0, 0.01);
  const face = scaledPolygon(outer, 0.81, 0.79, 0, 0.015);

  award.add(extrudedPolygon(THREE, outer, 0.28, materials.darkMetal));
  award.add(extrudedPolygon(THREE, face, 0.1, materials.graphite, 0.145, 0.02));
  award.add(extrudedRing(THREE, outer, inner, 0.11, materials.titanium, 0.17));

  const route = [[-0.83, -0.54], [-0.76, 0.33], [-0.48, 0.82]];
  for (let index = 0; index < route.length - 1; index += 1) {
    award.add(routeBar(
      THREE,
      route[index],
      route[index + 1],
      0.027,
      0.045,
      index === route.length - 2 ? materials.primary : materials.titanium,
      0.252,
    ));
  }
  route.forEach(([x, y], index) => {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(index === route.length - 1 ? 0.062 : 0.038, index === route.length - 1 ? 0.062 : 0.038, 0.055, 20),
      index === route.length - 1 ? materials.primary : materials.darkMetal,
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.set(x, y, 0.25);
    award.add(marker);
  });
}

function buildSplitAward(THREE, award, materials) {
  const outer = [
    [-1.08, 0.92], [-0.42, 1.38], [0.42, 1.38], [1.08, 0.92],
    [1.13, -0.74], [0.56, -1.2], [0, -1.46], [-0.56, -1.2], [-1.13, -0.74],
  ];
  const inner = scaledPolygon(outer, 0.87, 0.86, 0, 0.01);
  const leftPlate = [
    [-0.91, 0.74], [-0.25, 1.08], [-0.08, 0.72], [-0.28, 0.2],
    [-0.08, -0.1], [-0.12, -0.82], [-0.55, -0.98], [-0.96, -0.4],
  ];
  const rightPlate = [
    [[0.91, 0.74], [0.25, 1.08], [0.08, 0.72], [0.28, 0.2],
      [0.08, -0.1], [0.12, -0.82], [0.55, -0.98], [0.96, -0.4]],
  ][0];

  award.add(extrudedPolygon(THREE, outer, 0.29, materials.darkMetal));
  award.add(extrudedRing(THREE, outer, inner, 0.105, materials.titanium, 0.17));
  award.add(extrudedPolygon(THREE, leftPlate, 0.1, materials.graphite, 0.16, 0.018));
  award.add(extrudedPolygon(THREE, rightPlate, 0.1, materials.titanium, 0.16, 0.018));

  award.add(routeBar(THREE, [-0.07, 0.72], [0.15, 0.25], 0.025, 0.05, materials.primary, 0.255));
  award.add(routeBar(THREE, [-0.14, -0.13], [0.06, -0.65], 0.025, 0.05, materials.secondary, 0.255));
}

function buildKnotAward(THREE, award, materials) {
  const base = [
    [-1.16, 0.96], [-0.35, 1.42], [0.76, 1.11], [1.23, 0.26],
    [0.98, -0.9], [0.18, -1.42], [-0.77, -1.2], [-1.26, -0.28],
  ];
  const leftOuter = [
    [-1.22, 0.8], [-0.45, 1.34], [0.18, 0.84], [-0.18, 0.15],
    [0.25, -0.56], [-0.42, -1.28], [-1.08, -0.72],
  ];
  const rightOuter = leftOuter.map(([x, y]) => [-x, y]).reverse();
  const leftInner = scaledPolygon(leftOuter, 0.84, 0.85, -0.015, 0);
  const rightInner = scaledPolygon(rightOuter, 0.84, 0.85, 0.015, 0);

  award.add(extrudedPolygon(THREE, scaledPolygon(base, 0.74, 0.72), 0.18, materials.graphite, 0.025));
  award.add(extrudedRing(THREE, leftOuter, leftInner, 0.11, materials.titanium, 0.17));
  award.add(extrudedRing(THREE, rightOuter, rightInner, 0.11, materials.darkMetal, 0.19));

  award.add(routeBar(THREE, [-1.02, -0.66], [-0.55, -1.08], 0.035, 0.045, materials.primary, 0.25));
  award.add(routeBar(THREE, [0.62, 1.02], [1.01, 0.64], 0.035, 0.045, materials.secondary, 0.255));

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.11, 0.09), materials.titanium);
  bridge.position.set(0, 0.03, 0.26);
  bridge.rotation.z = -0.48;
  award.add(bridge);
}

async function createAward(THREE, SVGLoader, renderer, kind, geometry, unlocked) {
  const award = new THREE.Group();
  const brushedTexture = createBrushedTexture(THREE, renderer);
  const materials = createMaterialSet(THREE, brushedTexture, kind, unlocked);

  if (geometry === 'knot') buildKnotAward(THREE, award, materials);
  else if (geometry === 'split') buildSplitAward(THREE, award, materials);
  else buildRouteAward(THREE, award, materials);

  award.add(createReliefIcon(THREE, SVGLoader, ICON_NODES[kind] || awardIcon, materials));

  const brandTexture = await createBrandTexture(THREE, renderer);
  const brand = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 1.65),
    new THREE.MeshBasicMaterial({
      map: brandTexture,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  brand.position.z = -0.19;
  brand.rotation.y = Math.PI;
  award.add(brand);

  award.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  brand.castShadow = false;
  brand.receiveShadow = false;
  award.userData.textures = [brushedTexture, brandTexture];
  award.userData.geometryFamily = geometry;
  return award;
}

export default function Achievement3D({ kind = 'medal', geometry = 'route', unlocked = false, label }) {
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
        const [THREE, { RoomEnvironment }, { SVGLoader }, { HDRLoader }] = await Promise.all([
          import('three'),
          import('three/addons/environments/RoomEnvironment.js'),
          import('three/addons/loaders/SVGLoader.js'),
          import('three/addons/loaders/HDRLoader.js'),
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
        renderer.toneMappingExposure = 0.76;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0.04, 5.55);

        pmremGenerator = new THREE.PMREMGenerator(renderer);
        try {
          const studioEnvironment = await new HDRLoader().loadAsync(
            `${import.meta.env.BASE_URL}materials/studio_small_05_1k.hdr`,
          );
          environmentTarget = pmremGenerator.fromEquirectangular(studioEnvironment);
          studioEnvironment.dispose();
        } catch {
          environmentTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
        }
        if (disposed) return;
        scene.environment = environmentTarget.texture;
        scene.environmentIntensity = 1.22;
        scene.environmentRotation.set(0, 0.24, 0);

        award = await createAward(THREE, SVGLoader, renderer, kind, geometry, unlocked);
        if (disposed) {
          award.userData.textures?.forEach((texture) => texture.dispose());
          return;
        }
        award.rotation.set(-0.055, -0.16, 0.018);
        award.position.y = 0.13;
        scene.add(award);

        const shadowSurface = new THREE.Mesh(
          new THREE.PlaneGeometry(4.5, 4.5),
          new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.26, depthWrite: false }),
        );
        shadowSurface.position.z = -0.52;
        shadowSurface.receiveShadow = true;
        scene.add(shadowSurface);

        const ambient = new THREE.HemisphereLight(0xd9e0e8, 0x090b0e, 1.05);
        const key = new THREE.DirectionalLight(0xffffff, 2.8);
        key.position.set(3.4, 4.7, 5.8);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.near = 0.1;
        key.shadow.camera.far = 12;
        key.shadow.camera.left = -3;
        key.shadow.camera.right = 3;
        key.shadow.camera.top = 3;
        key.shadow.camera.bottom = -3;
        key.shadow.bias = -0.0003;
        const edge = new THREE.DirectionalLight(0x9eb5c4, 0.92);
        edge.position.set(-4.5, 0.8, 3);
        const lower = new THREE.PointLight(0x536b7c, 1.05, 9);
        lower.position.set(1.2, -3.2, 2.4);
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
        let targetRotation = -0.16;
        let targetTilt = -0.055;
        let velocity = 0;
        let hasInteracted = false;

        const onPointerDown = (event) => {
          dragging = true;
          hasInteracted = true;
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
        const animate = (time) => {
          if (disposed) return;
          if (!dragging && !reduceMotion) {
            if (hasInteracted) {
              targetRotation += velocity;
              velocity *= 0.94;
            } else {
              targetRotation = -0.12 + Math.sin(time * 0.00042) * 0.12;
            }
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
  }, [geometry, kind, unlocked]);

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
