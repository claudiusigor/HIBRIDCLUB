import React, { useEffect, useRef, useState } from 'react';
import { __iconNode as trophyIcon } from 'lucide-react/dist/esm/icons/trophy.mjs';

function createBrushedTexture(THREE, renderer) {
  const size = 384;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  let seed = 7411;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let y = 0; y < size; y += 1) {
    const sweep = Math.sin(y * 0.16) * 2.1 + Math.sin(y * 0.043) * 1.2;
    for (let x = 0; x < size; x += 1) {
      const value = Math.max(78, Math.min(196, 146 + sweep + (random() - 0.5) * 10));
      const index = (y * size + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 2.8);
  texture.needsUpdate = true;
  return texture;
}

function createPlaqueTexture(THREE, renderer, label) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 280;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#10151c');
  gradient.addColorStop(0.5, '#252c35');
  gradient.addColorStop(1, '#0d1117');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(219, 191, 126, 0.74)';
  context.lineWidth = 5;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  context.textAlign = 'center';
  context.fillStyle = '#aab5c3';
  context.font = '700 31px Inter, system-ui, sans-serif';
  context.fillText('HYBRID CLUB', canvas.width / 2, 70);
  context.fillStyle = '#f1d898';
  context.font = '800 61px Inter, system-ui, sans-serif';
  context.fillText(label.toUpperCase(), canvas.width / 2, 151);
  context.fillStyle = '#7e8998';
  context.font = '700 27px Inter, system-ui, sans-serif';
  context.fillText('ARENA  /  2026', canvas.width / 2, 216);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function createShadowTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(256, 64, 10, 256, 64, 246);
  gradient.addColorStop(0, 'rgba(1, 4, 10, 0.72)');
  gradient.addColorStop(0.48, 'rgba(1, 4, 10, 0.28)');
  gradient.addColorStop(1, 'rgba(1, 4, 10, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function roundedPolygonPath(THREE, points, PathType = THREE.Shape, radius = 0.08) {
  const path = new PathType();
  const corners = points.map(([x, y], index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(previous[0] - x, previous[1] - y);
    const nextLength = Math.hypot(next[0] - x, next[1] - y);
    return {
      corner: [x, y],
      incoming: [
        x + ((previous[0] - x) / previousLength) * Math.min(radius, previousLength * 0.25),
        y + ((previous[1] - y) / previousLength) * Math.min(radius, previousLength * 0.25),
      ],
      outgoing: [
        x + ((next[0] - x) / nextLength) * Math.min(radius, nextLength * 0.25),
        y + ((next[1] - y) / nextLength) * Math.min(radius, nextLength * 0.25),
      ],
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

function extrudedPolygon(THREE, points, depth, material, z = 0, bevel = 0.035) {
  const geometry = new THREE.ExtrudeGeometry(roundedPolygonPath(THREE, points), {
    depth,
    steps: 1,
    curveSegments: 10,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function extrudedRing(THREE, outer, inner, depth, material, z = 0, bevel = 0.03) {
  const shape = roundedPolygonPath(THREE, outer);
  shape.holes.push(roundedPolygonPath(THREE, [...inner].reverse(), THREE.Path, 0.065));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 10,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createAccentRail(THREE, points, material, z = 0.34) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, z)));
  const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 56, 0.018, 8, false), material);
  rail.castShadow = true;
  return rail;
}

function iconNodesToSvg(iconNode) {
  const allowed = new Set(['d', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'rx', 'ry', 'points']);
  const elements = iconNode.map(([tag, attributes]) => {
    const serialized = Object.entries(attributes)
      .filter(([key]) => allowed.has(key))
      .map(([key, value]) => `${key}="${String(value)}"`)
      .join(' ');
    return `<${tag} ${serialized} />`;
  }).join('');
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${elements}</svg>`;
}

function createReliefIcon(THREE, SVGLoader, materials) {
  const icon = new THREE.Group();
  const parsed = new SVGLoader().parse(iconNodesToSvg(trophyIcon));
  parsed.paths.forEach((path) => {
    path.subPaths.forEach((subPath) => {
      const sourcePoints = subPath.getPoints(16);
      if (sourcePoints.length < 2) return;
      const points = sourcePoints.map((point) => new THREE.Vector3(
        (point.x - 12) * 0.06,
        (12 - point.y) * 0.06,
        0,
      ));
      const closed = points.length > 2 && points[0].distanceTo(points[points.length - 1]) < 0.025;
      if (closed) points.pop();
      const curve = new THREE.CurvePath();
      for (let index = 0; index < points.length - 1; index += 1) {
        curve.add(new THREE.LineCurve3(points[index], points[index + 1]));
      }
      if (closed) curve.add(new THREE.LineCurve3(points[points.length - 1], points[0]));
      const segments = Math.max(20, points.length * 2);
      const backing = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, 0.052, 8, closed), materials.graphite);
      const front = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, 0.031, 8, closed), materials.gold);
      backing.position.z = 0.435;
      front.position.z = 0.47;
      icon.add(backing, front);
    });
  });
  return icon;
}

function createMaterials(THREE, brushedTexture) {
  const metal = {
    metalness: 0.95,
    roughnessMap: brushedTexture,
    bumpMap: brushedTexture,
    bumpScale: 0.0024,
    anisotropy: 0.78,
    anisotropyRotation: Math.PI / 2,
  };
  return {
    graphite: new THREE.MeshPhysicalMaterial({ ...metal, color: 0x11161d, roughness: 0.49, clearcoat: 0.1 }),
    darkMetal: new THREE.MeshPhysicalMaterial({ ...metal, color: 0x303740, roughness: 0.4, clearcoat: 0.15 }),
    titanium: new THREE.MeshPhysicalMaterial({ ...metal, color: 0xaeb9c5, roughness: 0.33, clearcoat: 0.16 }),
    gold: new THREE.MeshPhysicalMaterial({ ...metal, color: 0xd4ad54, roughness: 0.27, clearcoat: 0.25, clearcoatRoughness: 0.2 }),
    paleGold: new THREE.MeshPhysicalMaterial({ ...metal, color: 0xf0d891, roughness: 0.25, clearcoat: 0.3 }),
    pink: new THREE.MeshPhysicalMaterial({ ...metal, color: 0xfe0972, emissive: 0xfe0972, emissiveIntensity: 0.025, roughness: 0.29 }),
    blue: new THREE.MeshPhysicalMaterial({ ...metal, color: 0x2f78ff, emissive: 0x2f78ff, emissiveIntensity: 0.022, roughness: 0.29 }),
  };
}

function createHybridTrophy(THREE, SVGLoader, renderer, label) {
  const trophy = new THREE.Group();
  const brushedTexture = createBrushedTexture(THREE, renderer);
  const plaqueTexture = createPlaqueTexture(THREE, renderer, label);
  const shadowTexture = createShadowTexture(THREE);
  const materials = createMaterials(THREE, brushedTexture);

  const sculpture = new THREE.Group();
  sculpture.position.y = 0.38;

  const leftOuter = [
    [-1.2, -1.06], [-1.43, -0.2], [-1.23, 0.78], [-0.58, 1.72],
    [-0.13, 1.35], [-0.42, 0.55], [-0.28, -0.2], [-0.62, -0.92],
  ];
  const leftInner = [
    [-0.93, -0.73], [-1.08, -0.12], [-0.92, 0.63], [-0.56, 1.2],
    [-0.39, 1.03], [-0.65, 0.43], [-0.54, -0.23], [-0.7, -0.72],
  ];
  const rightOuter = leftOuter.map(([x, y]) => [-x, y]).reverse();
  const rightInner = leftInner.map(([x, y]) => [-x, y]).reverse();

  const rearCore = extrudedPolygon(THREE, [
    [-0.24, -1.48], [-0.34, -0.15], [-0.26, 0.9], [0, 1.58],
    [0.26, 0.9], [0.34, -0.15], [0.24, -1.48],
  ], 0.34, materials.gold, -0.1, 0.045);
  sculpture.add(rearCore);
  sculpture.add(extrudedPolygon(THREE, [
    [-0.14, -1.42], [-0.2, -0.12], [-0.14, 0.76], [0, 1.2],
    [0.14, 0.76], [0.2, -0.12], [0.14, -1.42],
  ], 0.22, materials.graphite, 0.1, 0.03));
  sculpture.add(extrudedRing(THREE, leftOuter, leftInner, 0.31, materials.darkMetal, 0.02, 0.045));
  sculpture.add(extrudedRing(THREE, rightOuter, rightInner, 0.27, materials.titanium, 0.09, 0.04));

  sculpture.add(
    createAccentRail(THREE, [[-1.18, -0.82], [-1.32, -0.12], [-1.09, 0.7], [-0.55, 1.48]], materials.pink, 0.24),
    createAccentRail(THREE, [[1.18, -0.82], [1.32, -0.12], [1.09, 0.7], [0.55, 1.48]], materials.blue, 0.31),
  );

  const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.24, 72), materials.graphite);
  medallion.rotation.x = Math.PI / 2;
  medallion.position.set(0, 0.32, 0.27);
  medallion.castShadow = true;
  sculpture.add(medallion);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.075, 14, 80), materials.gold);
  ring.position.set(0, 0.32, 0.42);
  ring.castShadow = true;
  sculpture.add(ring);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.018, 8, 64), materials.titanium);
  innerRing.position.set(0, 0.32, 0.415);
  sculpture.add(innerRing);
  const relief = createReliefIcon(THREE, SVGLoader, materials);
  relief.position.set(0, 0.32, 0.08);
  relief.scale.setScalar(0.76);
  sculpture.add(relief);

  const crownPoints = [
    [-0.48, 0], [-0.58, 0.43], [-0.25, 0.22], [0, 0.64],
    [0.25, 0.22], [0.58, 0.43], [0.48, 0],
  ];
  const crown = extrudedPolygon(THREE, crownPoints, 0.18, materials.gold, 0.2, 0.035);
  crown.position.y = 1.58;
  sculpture.add(crown);
  [-0.47, 0, 0.47].forEach((x, index) => {
    const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 12), index === 1 ? materials.pink : materials.blue);
    jewel.position.set(x, index === 1 ? 2.2 : 2, 0.32);
    sculpture.add(jewel);
  });
  trophy.add(sculpture);

  const base = new THREE.Group();
  base.position.y = -1.72;
  const baseOuter = [[-1.38, 0.36], [1.38, 0.36], [1.58, -0.4], [-1.58, -0.4]];
  const baseMiddle = [[-1.22, 0.25], [1.22, 0.25], [1.37, -0.27], [-1.37, -0.27]];
  base.add(extrudedPolygon(THREE, baseOuter, 0.76, materials.graphite, 0, 0.055));
  base.add(extrudedPolygon(THREE, baseMiddle, 0.11, materials.titanium, 0.425, 0.022));
  const plaqueMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: plaqueTexture,
    metalness: 0.5,
    roughness: 0.32,
    clearcoat: 0.16,
  });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.22, 0.43), plaqueMaterial);
  plaque.position.set(0, -0.015, 0.495);
  base.add(plaque);
  trophy.add(base);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.5), materials.gold);
  neck.position.set(0, -1.31, 0);
  neck.castShadow = true;
  trophy.add(neck);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 0.64),
    new THREE.MeshBasicMaterial({ color: 0x03060c, map: shadowTexture, transparent: true, opacity: 0.26, depthWrite: false, toneMapped: false }),
  );
  contactShadow.position.set(0, -2.17, -0.42);
  trophy.add(contactShadow);

  trophy.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = object !== contactShadow;
    object.receiveShadow = object !== contactShadow;
  });
  trophy.userData.textures = [brushedTexture, plaqueTexture, shadowTexture];
  trophy.userData.contactShadow = contactShadow;
  return trophy;
}

export default function SeasonTrophy3D({ label = 'Trofeu de Julho' }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const [renderState, setRenderState] = useState('loading');

  useEffect(() => {
    let disposed = false;
    let renderer;
    let trophy;
    let resizeObserver;
    let intersectionObserver;
    let themeObserver;
    let animationFrame;
    let environmentTarget;
    let pmremGenerator;
    let disposeScene = () => {};
    let removePointerEvents = () => {};

    const build = async () => {
      try {
        const [THREE, { HDRLoader }, { SVGLoader }, { RectAreaLightUniformsLib }] = await Promise.all([
          import('three'),
          import('three/addons/loaders/HDRLoader.js'),
          import('three/addons/loaders/SVGLoader.js'),
          import('three/addons/lights/RectAreaLightUniformsLib.js'),
        ]);
        if (disposed || !frameRef.current || !canvasRef.current) return;

        RectAreaLightUniformsLib.init();
        const frame = frameRef.current;
        const canvas = canvasRef.current;
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
        camera.position.set(0, 0.05, 10.4);
        camera.lookAt(0, 0.08, 0);

        pmremGenerator = new THREE.PMREMGenerator(renderer);
        try {
          const studio = await new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}materials/studio_small_05_1k.hdr`);
          environmentTarget = pmremGenerator.fromEquirectangular(studio);
          studio.dispose();
        } catch {
          const room = await import('three/addons/environments/RoomEnvironment.js');
          environmentTarget = pmremGenerator.fromScene(new room.RoomEnvironment(), 0.04);
        }
        if (disposed) return;
        scene.environment = environmentTarget.texture;
        scene.environmentRotation.set(0, 0.3, 0);

        trophy = createHybridTrophy(THREE, SVGLoader, renderer, label);
        trophy.rotation.set(-0.025, -0.12, 0.004);
        trophy.position.y = 0.04;
        scene.add(trophy);

        const ambient = new THREE.HemisphereLight(0xfff1d5, 0x111b2b, 0.94);
        const key = new THREE.RectAreaLight(0xffefd0, 4.7, 4.4, 4.7);
        key.position.set(3.5, 4.4, 5.6);
        key.lookAt(0, 0, 0);
        const fill = new THREE.RectAreaLight(0xa7caff, 2.5, 3.4, 4);
        fill.position.set(-4.1, 1.3, 3.9);
        fill.lookAt(0, -0.15, 0);
        const rim = new THREE.DirectionalLight(0xe4edff, 1.15);
        rim.position.set(-2.8, 3.6, -4.2);
        scene.add(ambient, key, fill, rim);

        const applyTheme = () => {
          const dark = document.documentElement.classList.contains('dark');
          renderer.toneMappingExposure = dark ? 0.83 : 0.9;
          scene.environmentIntensity = dark ? 0.9 : 0.77;
          ambient.intensity = dark ? 1.02 : 0.94;
          ambient.groundColor.setHex(dark ? 0x080d16 : 0x3c4655);
          key.intensity = dark ? 4.15 : 4.7;
          fill.intensity = dark ? 2.8 : 2.5;
          trophy.userData.contactShadow.material.opacity = dark ? 0.34 : 0.22;
          renderer.render(scene, camera);
        };
        applyTheme();
        themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        const resize = () => {
          const { width, height } = frame.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(frame);
        resize();
        setRenderState('ready');

        let dragging = false;
        let previousX = 0;
        let previousY = 0;
        let targetRotation = -0.12;
        let targetTilt = -0.025;
        let velocity = 0;
        let visible = false;
        let running = false;
        let introStartedAt = null;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const animate = (time) => {
          if (disposed || !visible) {
            running = false;
            return;
          }
          if (introStartedAt === null) introStartedAt = time;
          const introProgress = reduceMotion ? 1 : Math.min(1, (time - introStartedAt) / 360);
          if (!dragging && !reduceMotion) {
            targetRotation += velocity;
            velocity *= 0.9;
          }
          trophy.rotation.y += (targetRotation - trophy.rotation.y) * 0.085;
          trophy.rotation.x += (targetTilt - trophy.rotation.x) * 0.085;
          trophy.position.y = 0.04 + (1 - introProgress) * 0.055;
          renderer.render(scene, camera);
          const settled = Math.abs(targetRotation - trophy.rotation.y) < 0.0007
            && Math.abs(targetTilt - trophy.rotation.x) < 0.0007
            && Math.abs(velocity) < 0.00008;
          if (dragging || introProgress < 1 || !settled) animationFrame = window.requestAnimationFrame(animate);
          else running = false;
        };
        const startAnimation = () => {
          if (running || disposed) return;
          running = true;
          animationFrame = window.requestAnimationFrame(animate);
        };
        const onPointerDown = (event) => {
          dragging = true;
          previousX = event.clientX;
          previousY = event.clientY;
          velocity = 0;
          canvas.setPointerCapture?.(event.pointerId);
          startAnimation();
        };
        const onPointerMove = (event) => {
          if (!dragging) return;
          const deltaX = event.clientX - previousX;
          const deltaY = event.clientY - previousY;
          targetRotation += deltaX * 0.0065;
          targetTilt = Math.max(-0.18, Math.min(0.14, targetTilt + deltaY * 0.004));
          velocity = deltaX * 0.00085;
          previousX = event.clientX;
          previousY = event.clientY;
          startAnimation();
        };
        const onPointerUp = () => {
          dragging = false;
          startAnimation();
        };
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        removePointerEvents = () => {
          canvas.removeEventListener('pointerdown', onPointerDown);
          canvas.removeEventListener('pointermove', onPointerMove);
          canvas.removeEventListener('pointerup', onPointerUp);
          canvas.removeEventListener('pointercancel', onPointerUp);
        };

        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) {
            introStartedAt = null;
            startAnimation();
          } else {
            window.cancelAnimationFrame(animationFrame);
            running = false;
          }
        }, { rootMargin: '80px' });
        intersectionObserver.observe(frame);

        disposeScene = () => {
          trophy.userData.textures?.forEach((texture) => texture.dispose());
          const geometries = new Set();
          const materials = new Set();
          scene.traverse((object) => {
            if (object.geometry) geometries.add(object.geometry);
            if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
            else if (object.material) materials.add(object.material);
          });
          geometries.forEach((geometry) => geometry.dispose());
          materials.forEach((material) => material.dispose());
        };
      } catch {
        if (!disposed) setRenderState('fallback');
      }
    };

    setRenderState('loading');
    build();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      themeObserver?.disconnect();
      removePointerEvents();
      disposeScene();
      environmentTarget?.dispose();
      pmremGenerator?.dispose();
      renderer?.dispose();
    };
  }, [label]);

  return (
    <div ref={frameRef} className="hc-season-trophy-3d" data-render-state={renderState}>
      <canvas
        ref={canvasRef}
        aria-label={`${label} em 3D. Arraste horizontalmente para observar a lateral e o verso.`}
      />
      {renderState === 'fallback' && (
        <div className="hc-season-trophy-3d__fallback" role="img" aria-label={label}>HC</div>
      )}
    </div>
  );
}
