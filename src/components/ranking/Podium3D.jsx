import React, { useEffect, useRef, useState } from 'react';

const PODIUMS = [
  { place: 2, x: -1.48, height: 1.24, radius: 0.88, color: 0x2f78ff },
  { place: 1, x: 0, height: 1.92, radius: 1.02, color: 0xfe0972 },
  { place: 3, x: 1.48, height: 1.08, radius: 0.84, color: 0xb05de2 },
];

const DIGIT_POLYGONS = {
  1: [
    [-0.14, -0.46], [0.14, -0.46], [0.14, 0.46], [-0.08, 0.46],
    [-0.27, 0.3], [-0.15, 0.17], [-0.04, 0.26], [-0.04, -0.46],
  ],
  2: [
    [-0.31, 0.2], [-0.28, 0.35], [-0.16, 0.45], [0.08, 0.48],
    [0.25, 0.4], [0.31, 0.26], [0.29, 0.11], [0.2, -0.02],
    [-0.08, -0.3], [0.31, -0.3], [0.31, -0.47], [-0.32, -0.47],
    [-0.32, -0.32], [0.08, 0.05], [0.15, 0.14], [0.14, 0.24],
    [0.07, 0.31], [-0.06, 0.31], [-0.14, 0.26], [-0.16, 0.17],
  ],
  3: [
    [-0.29, 0.31], [-0.18, 0.43], [0.05, 0.47], [0.23, 0.4],
    [0.31, 0.27], [0.29, 0.1], [0.18, 0], [0.29, -0.1],
    [0.31, -0.28], [0.22, -0.41], [0.03, -0.48], [-0.18, -0.43],
    [-0.3, -0.31], [-0.18, -0.19], [-0.09, -0.27], [0.05, -0.29],
    [0.13, -0.24], [0.14, -0.15], [0.07, -0.1], [-0.08, -0.09],
    [-0.08, 0.06], [0.06, 0.07], [0.13, 0.12], [0.13, 0.22],
    [0.06, 0.28], [-0.08, 0.29], [-0.17, 0.2],
  ],
};

function createBrushedTexture(THREE, renderer) {
  const size = 384;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  let seed = 2419;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let y = 0; y < size; y += 1) {
    const sweep = Math.sin(y * 0.08) * 1.4 + Math.sin(y * 0.021) * 0.8;
    for (let x = 0; x < size; x += 1) {
      const value = Math.max(116, Math.min(178, 148 + sweep + (random() - 0.5) * 5));
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
  texture.repeat.set(1.2, 2.8);
  texture.needsUpdate = true;
  return texture;
}

function createShadowTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 64, 4, 128, 64, 116);
  gradient.addColorStop(0, 'rgba(3, 8, 20, 0.72)');
  gradient.addColorStop(0.42, 'rgba(3, 8, 20, 0.34)');
  gradient.addColorStop(1, 'rgba(3, 8, 20, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createBodyGeometry(THREE, radius, height) {
  const profile = [
    [0, 0], [radius - 0.11, 0], [radius - 0.035, 0.018],
    [radius, 0.065], [radius, height - 0.085],
    [radius - 0.018, height - 0.035], [radius - 0.085, height], [0, height],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(profile, 96);
}

function createCollarGeometry(THREE, radius, height = 0.04) {
  const profile = [
    [radius - 0.09, 0], [radius - 0.025, 0], [radius + 0.01, 0.012],
    [radius + 0.012, height * 0.54], [radius - 0.01, height],
    [radius - 0.09, height], [radius - 0.09, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(profile, 96);
}

function createDigit(THREE, place, material, scale) {
  const polygon = DIGIT_POLYGONS[place];
  const shape = new THREE.Shape();
  shape.moveTo(...polygon[0]);
  polygon.slice(1).forEach((point) => shape.lineTo(...point));
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.012,
    bevelThickness: 0.012,
  });
  geometry.center();
  const digit = new THREE.Mesh(geometry, material);
  digit.scale.setScalar(scale);
  digit.castShadow = true;
  return digit;
}

function createPodiumScene(THREE, renderer) {
  const group = new THREE.Group();
  const baseY = -1.42;
  const brushedTexture = createBrushedTexture(THREE, renderer);
  const shadowTexture = createShadowTexture(THREE);
  const themedMaterials = [];
  const accentMaterials = [];
  const haloMaterials = [];
  const shadowMaterials = [];

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xdce2ee,
    metalness: 0.3,
    roughness: 0.46,
    roughnessMap: brushedTexture,
    bumpMap: brushedTexture,
    bumpScale: 0.0012,
    clearcoat: 0.14,
    clearcoatRoughness: 0.48,
    sheen: 0.5,
    sheenColor: new THREE.Color(0xe9f0ff),
    sheenRoughness: 0.72,
  });
  const topMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf7f8fc,
    metalness: 0.18,
    roughness: 0.36,
    roughnessMap: brushedTexture,
    bumpMap: brushedTexture,
    bumpScale: 0.0008,
    clearcoat: 0.22,
    clearcoatRoughness: 0.36,
  });
  const trimMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb8c2d2,
    metalness: 0.76,
    roughness: 0.34,
    roughnessMap: brushedTexture,
    clearcoat: 0.12,
  });
  themedMaterials.push(bodyMaterial, topMaterial, trimMaterial);

  PODIUMS.forEach(({ place, x, height, radius, color }) => {
    const accent = new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.026,
      metalness: 0.82,
      roughness: 0.29,
      roughnessMap: brushedTexture,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3,
    });
    const digitMaterial = accent.clone();
    digitMaterial.roughness = 0.25;
    digitMaterial.emissiveIntensity = 0.035;
    const halo = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x061022,
      map: shadowTexture,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      toneMapped: false,
    });
    accentMaterials.push(accent, digitMaterial);
    haloMaterials.push(halo);
    shadowMaterials.push(shadowMaterial);

    const body = new THREE.Mesh(createBodyGeometry(THREE, radius, height), bodyMaterial);
    body.position.set(x, baseY, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(radius - 0.07, radius - 0.07, 0.052, 96, 1, false),
      [trimMaterial, topMaterial, trimMaterial],
    );
    top.position.set(x, baseY + height + 0.018, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const topCollar = new THREE.Mesh(createCollarGeometry(THREE, radius), accent);
    topCollar.position.set(x, baseY + height - 0.004, 0);
    topCollar.castShadow = true;
    group.add(topCollar);

    const bottomCollar = new THREE.Mesh(createCollarGeometry(THREE, radius, 0.028), accent);
    bottomCollar.position.set(x, baseY + 0.014, 0);
    group.add(bottomCollar);

    const topHalo = new THREE.Mesh(createCollarGeometry(THREE, radius + 0.015, 0.05), halo);
    topHalo.position.set(x, baseY + height - 0.01, -0.006);
    group.add(topHalo);

    const digit = createDigit(THREE, place, digitMaterial, place === 1 ? 0.7 : 0.61);
    digit.position.set(x, baseY + height * 0.49, radius + 0.018);
    group.add(digit);

    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.75, radius * 1.35), shadowMaterial);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(x, baseY + 0.006, 0.18);
    group.add(contactShadow);
  });

  group.userData.textures = [brushedTexture, shadowTexture];
  group.userData.themedMaterials = themedMaterials;
  group.userData.accentMaterials = accentMaterials;
  group.userData.haloMaterials = haloMaterials;
  group.userData.shadowMaterials = shadowMaterials;
  return group;
}

export default function Podium3D() {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const [renderState, setRenderState] = useState('loading');

  useEffect(() => {
    let disposed = false;
    let renderer;
    let resizeObserver;
    let intersectionObserver;
    let themeObserver;
    let animationFrame;
    let environmentTarget;
    let pmremGenerator;
    let podium;
    let disposeScene = () => {};

    const build = async () => {
      try {
        const [THREE, { RoomEnvironment }, { HDRLoader }, { RectAreaLightUniformsLib }] = await Promise.all([
          import('three'),
          import('three/addons/environments/RoomEnvironment.js'),
          import('three/addons/loaders/HDRLoader.js'),
          import('three/addons/lights/RectAreaLightUniformsLib.js'),
        ]);
        if (disposed || !frameRef.current || !canvasRef.current) return;

        RectAreaLightUniformsLib.init();
        const frame = frameRef.current;
        renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
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
        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
        camera.position.set(0, 1.42, 9.15);
        camera.lookAt(0, -0.3, 0);

        pmremGenerator = new THREE.PMREMGenerator(renderer);
        try {
          const studio = await new HDRLoader().loadAsync(
            `${import.meta.env.BASE_URL}materials/studio_small_05_1k.hdr`,
          );
          environmentTarget = pmremGenerator.fromEquirectangular(studio);
          studio.dispose();
        } catch {
          environmentTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
        }
        if (disposed) return;
        scene.environment = environmentTarget.texture;
        scene.environmentRotation.set(0, 0.08, 0);

        podium = createPodiumScene(THREE, renderer);
        scene.add(podium);

        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(8, 4.8),
          new THREE.ShadowMaterial({ color: 0x071022, opacity: 0.08, depthWrite: false }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -1.425, 0.12);
        ground.receiveShadow = true;
        scene.add(ground);

        const ambient = new THREE.HemisphereLight(0xf7f9ff, 0x33415a, 1.15);
        const studioKey = new THREE.RectAreaLight(0xffffff, 5.4, 5.2, 4.4);
        studioKey.position.set(-2.6, 4.5, 5.8);
        studioKey.lookAt(0, -0.2, 0);
        const softFill = new THREE.RectAreaLight(0xbcd2ff, 2.35, 4.2, 3.6);
        softFill.position.set(3.8, 1.4, 4.2);
        softFill.lookAt(0, -0.35, 0);
        const edge = new THREE.DirectionalLight(0xdce8ff, 0.82);
        edge.position.set(-4.2, 1.8, -1.8);
        const shadowKey = new THREE.DirectionalLight(0xffffff, 1.05);
        shadowKey.position.set(2.8, 5.2, 4.8);
        shadowKey.castShadow = true;
        shadowKey.shadow.mapSize.set(1024, 1024);
        shadowKey.shadow.camera.near = 0.1;
        shadowKey.shadow.camera.far = 16;
        shadowKey.shadow.camera.left = -4;
        shadowKey.shadow.camera.right = 4;
        shadowKey.shadow.camera.top = 4;
        shadowKey.shadow.camera.bottom = -4;
        shadowKey.shadow.bias = -0.00025;
        scene.add(ambient, studioKey, softFill, edge, shadowKey);

        let hasRendered = false;
        const render = () => {
          if (disposed) return;
          renderer.render(scene, camera);
          if (!hasRendered) {
            hasRendered = true;
            setRenderState('ready');
          }
        };

        const applyTheme = () => {
          const dark = document.documentElement.classList.contains('dark');
          renderer.toneMappingExposure = dark ? 0.84 : 0.9;
          scene.environmentIntensity = dark ? 0.68 : 0.54;
          ground.material.opacity = dark ? 0.14 : 0.055;
          ambient.color.setHex(dark ? 0xd9e4f5 : 0xf7f9ff);
          ambient.groundColor.setHex(dark ? 0x111827 : 0x56657a);
          ambient.intensity = dark ? 1.08 : 1.15;
          studioKey.intensity = dark ? 4.35 : 5.4;
          softFill.intensity = dark ? 2.8 : 2.35;

          const [body, top, trim] = podium.userData.themedMaterials;
          body.color.setHex(dark ? 0x384354 : 0xdce2ee);
          body.roughness = dark ? 0.5 : 0.46;
          body.sheenColor.setHex(dark ? 0x65728a : 0xe9f0ff);
          top.color.setHex(dark ? 0x566279 : 0xf7f8fc);
          top.roughness = dark ? 0.43 : 0.36;
          trim.color.setHex(dark ? 0x8995aa : 0xb8c2d2);
          podium.userData.accentMaterials.forEach((material, index) => {
            material.emissiveIntensity = dark ? (index % 2 ? 0.06 : 0.045) : (index % 2 ? 0.035 : 0.026);
          });
          podium.userData.haloMaterials.forEach((material) => {
            material.opacity = dark ? 0.065 : 0.045;
          });
          podium.userData.shadowMaterials.forEach((material) => {
            material.opacity = dark ? 0.18 : 0.1;
          });
          render();
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
          render();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(frame);
        resize();

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let revealed = false;
        const reveal = () => {
          if (revealed || disposed) return;
          revealed = true;
          if (reduceMotion) {
            podium.position.y = 0;
            podium.scale.setScalar(1);
            render();
            return;
          }
          const startedAt = performance.now();
          const animate = (time) => {
            if (disposed) return;
            const progress = Math.min(1, (time - startedAt) / 360);
            const eased = 1 - ((1 - progress) ** 4);
            podium.position.y = -0.08 + eased * 0.08;
            podium.scale.setScalar(0.986 + eased * 0.014);
            render();
            if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
          };
          animationFrame = window.requestAnimationFrame(animate);
        };
        intersectionObserver = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) reveal();
        }, { rootMargin: '80px' });
        intersectionObserver.observe(frame);

        disposeScene = () => {
          podium.userData.textures?.forEach((texture) => texture.dispose());
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
      disposeScene();
      environmentTarget?.dispose();
      pmremGenerator?.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <div ref={frameRef} className="hc-podium-3d" data-render-state={renderState} aria-hidden="true">
      <canvas ref={canvasRef} />
      {renderState === 'fallback' && (
        <div className="hc-podium-3d__fallback">
          {[2, 1, 3].map((place) => <span key={place} className={`is-place-${place}`}><i>{place}</i></span>)}
        </div>
      )}
    </div>
  );
}
