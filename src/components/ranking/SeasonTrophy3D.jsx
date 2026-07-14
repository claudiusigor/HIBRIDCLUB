import React, { useEffect, useRef, useState } from 'react';

const TROPHY_IMAGE_URL = `${import.meta.env.BASE_URL}materials/arena-shield-july-reference.png`;
const FACE_HEIGHT = 4.75;
const BODY_DEPTH = 0.24;

// One contour drives the image cutout, the metal body and the rear plate.
const SILHOUETTE = [
  ['M', 0.5, 0.071],
  ['C', 0.59, 0.083, 0.68, 0.105, 0.758, 0.132],
  ['C', 0.772, 0.274, 0.762, 0.446, 0.714, 0.572],
  ['C', 0.677, 0.664, 0.595, 0.739, 0.529, 0.771],
  ['L', 0.724, 0.771],
  ['L', 0.787, 0.944],
  ['C', 0.791, 0.953, 0.781, 0.959, 0.769, 0.959],
  ['L', 0.231, 0.959],
  ['C', 0.219, 0.959, 0.21, 0.953, 0.214, 0.943],
  ['L', 0.272, 0.771],
  ['L', 0.47, 0.771],
  ['C', 0.4, 0.739, 0.323, 0.663, 0.285, 0.572],
  ['C', 0.238, 0.446, 0.228, 0.274, 0.242, 0.132],
  ['C', 0.321, 0.105, 0.412, 0.083, 0.5, 0.071],
  ['Z'],
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function traceCanvasSilhouette(context, width, height) {
  context.beginPath();
  SILHOUETTE.forEach(([command, ...values]) => {
    if (command === 'M') context.moveTo(values[0] * width, values[1] * height);
    if (command === 'L') context.lineTo(values[0] * width, values[1] * height);
    if (command === 'C') {
      context.bezierCurveTo(
        values[0] * width,
        values[1] * height,
        values[2] * width,
        values[3] * height,
        values[4] * width,
        values[5] * height,
      );
    }
    if (command === 'Z') context.closePath();
  });
}

function createFaceTexture(THREE, renderer, sourceImage) {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.naturalWidth || sourceImage.width;
  canvas.height = sourceImage.naturalHeight || sourceImage.height;
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  traceCanvasSilhouette(context, canvas.width, canvas.height);
  context.clip();
  context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createBrushedTexture(THREE, renderer) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  let seed = 811;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  for (let y = 0; y < size; y += 1) {
    const band = Math.sin(y * 0.31) * 5 + Math.sin(y * 0.071) * 9;
    for (let x = 0; x < size; x += 1) {
      const value = Math.max(0, Math.min(255, 138 + band + (random() - 0.5) * 13));
      const index = (y * size + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.2, 3.4);
  return texture;
}

function createSilhouetteShape(THREE, faceWidth) {
  const shape = new THREE.Shape();
  const point = (x, y) => [(x - 0.5) * faceWidth, (0.5 - y) * FACE_HEIGHT];

  SILHOUETTE.forEach(([command, ...values]) => {
    if (command === 'M') shape.moveTo(...point(values[0], values[1]));
    if (command === 'L') shape.lineTo(...point(values[0], values[1]));
    if (command === 'C') {
      shape.bezierCurveTo(
        ...point(values[0], values[1]),
        ...point(values[2], values[3]),
        ...point(values[4], values[5]),
      );
    }
    if (command === 'Z') shape.closePath();
  });
  return shape;
}

function createContour(THREE, shape, material, z, scale = 1) {
  const points = shape.getSpacedPoints(196).map((point) => new THREE.Vector3(point.x, point.y, z));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const contour = new THREE.LineLoop(geometry, material);
  contour.scale.setScalar(scale);
  return contour;
}

function createHybridMark(THREE, material) {
  const group = new THREE.Group();
  const addBar = (x, y, rotation, length) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.065, length, 0.022), material);
    bar.position.set(x, y, 0);
    bar.rotation.z = rotation;
    group.add(bar);
  };
  addBar(-0.14, 0.03, -0.5, 0.67);
  addBar(0.07, 0.03, 0.5, 0.67);
  addBar(0.25, -0.02, 0.5, 0.54);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.055, 0.022), material);
  bridge.position.set(0.035, -0.12, 0);
  group.add(bridge);
  return group;
}

function createArenaShield(THREE, renderer, sourceImage) {
  const trophy = new THREE.Group();
  const faceTexture = createFaceTexture(THREE, renderer, sourceImage);
  const brushedTexture = createBrushedTexture(THREE, renderer);
  const imageAspect = (sourceImage.naturalWidth || sourceImage.width) / (sourceImage.naturalHeight || sourceImage.height);
  const faceWidth = FACE_HEIGHT * imageAspect;
  const shape = createSilhouetteShape(THREE, faceWidth);

  const capMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x202126,
    metalness: 0.92,
    roughness: 0.31,
    roughnessMap: brushedTexture,
    bumpMap: brushedTexture,
    bumpScale: 0.003,
    clearcoat: 0.12,
  });
  const sideMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb0a58f,
    metalness: 0.84,
    roughness: 0.25,
    roughnessMap: brushedTexture,
    bumpMap: brushedTexture,
    bumpScale: 0.004,
    clearcoat: 0.22,
    clearcoatRoughness: 0.16,
    emissive: 0x17130d,
    emissiveIntensity: 0.26,
  });
  const rearMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x17191d,
    metalness: 0.93,
    roughness: 0.37,
    roughnessMap: brushedTexture,
    bumpMap: brushedTexture,
    bumpScale: 0.004,
    side: THREE.DoubleSide,
  });
  const engravingMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xa59d8e,
    metalness: 0.96,
    roughness: 0.26,
    side: THREE.DoubleSide,
  });

  const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: BODY_DEPTH,
    steps: 1,
    curveSegments: 72,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: 0.018,
    bevelThickness: 0.025,
  });
  bodyGeometry.translate(0, 0, -BODY_DEPTH);
  const body = new THREE.Mesh(bodyGeometry, [capMaterial, sideMaterial]);
  trophy.add(body);

  const grooveMaterial = new THREE.LineBasicMaterial({
    color: 0xdac9a7,
    transparent: true,
    opacity: 0.78,
  });
  [-0.045, -0.085, -0.125, -0.165, -0.205].forEach((z, index) => {
    trophy.add(createContour(THREE, shape, grooveMaterial, z, 1 - index * 0.0008));
  });

  const rearPlate = new THREE.Mesh(new THREE.ShapeGeometry(shape, 72), rearMaterial);
  rearPlate.position.z = -BODY_DEPTH - 0.027;
  rearPlate.scale.setScalar(0.968);
  trophy.add(rearPlate);

  const rearRing = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.6, 96), engravingMaterial);
  rearRing.position.set(0, 0.18, -BODY_DEPTH - 0.042);
  rearRing.rotation.y = Math.PI;
  trophy.add(rearRing);

  const rearMark = createHybridMark(THREE, engravingMaterial);
  rearMark.position.set(0, 0.18, -BODY_DEPTH - 0.05);
  rearMark.rotation.y = Math.PI;
  rearMark.scale.setScalar(1.35);
  trophy.add(rearMark);

  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(faceWidth, FACE_HEIGHT),
    new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: true,
      toneMapped: false,
    }),
  );
  front.position.z = 0.029;
  trophy.add(front);

  trophy.userData.textures = [faceTexture, brushedTexture];
  return trophy;
}

export default function SeasonTrophy3D({ label = 'Troféu de Julho' }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const [renderState, setRenderState] = useState('loading');

  useEffect(() => {
    let disposed = false;
    let renderer;
    let trophy;
    let observer;
    let animationFrame;
    let environmentTarget;
    let pmremGenerator;
    let disposeScene = () => {};
    let removePointerEvents = () => {};

    const build = async () => {
      try {
        const [THREE, { HDRLoader }, sourceImage] = await Promise.all([
          import('three'),
          import('three/addons/loaders/HDRLoader.js'),
          loadImage(TROPHY_IMAGE_URL),
        ]);
        if (disposed || !frameRef.current || !canvasRef.current) return;

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
        renderer.toneMappingExposure = 0.92;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 30);
        camera.position.set(0, 0, 8);

        pmremGenerator = new THREE.PMREMGenerator(renderer);
        const studio = await new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}materials/studio_small_05_1k.hdr`);
        environmentTarget = pmremGenerator.fromEquirectangular(studio);
        studio.dispose();
        if (disposed) return;
        scene.environment = environmentTarget.texture;
        scene.environmentIntensity = 0.72;
        scene.environmentRotation.set(0, 0.34, 0);

        trophy = createArenaShield(THREE, renderer, sourceImage);
        trophy.rotation.set(-0.018, -0.09, 0);
        trophy.position.y = 0.14;
        scene.add(trophy);

        const contactShadow = new THREE.Mesh(
          new THREE.CircleGeometry(1, 96),
          new THREE.MeshBasicMaterial({ color: 0x050608, transparent: true, opacity: 0.28, depthWrite: false }),
        );
        contactShadow.position.set(0, -2.11, -0.4);
        contactShadow.scale.set(1.32, 0.12, 1);
        scene.add(contactShadow);

        const ambient = new THREE.HemisphereLight(0xf5ead8, 0x080b10, 0.94);
        const key = new THREE.DirectionalLight(0xfff0d0, 2.1);
        key.position.set(3.6, 4.2, 5.4);
        const coolRim = new THREE.DirectionalLight(0x8fc9ff, 0.72);
        coolRim.position.set(-4.4, 0.6, 3.2);
        const lowerFill = new THREE.DirectionalLight(0xffd5a2, 0.42);
        lowerFill.position.set(2.2, -3.4, 3);
        const rearLight = new THREE.DirectionalLight(0xd7e2ef, 1.25);
        rearLight.position.set(-1.8, 2.5, -4.5);
        scene.add(ambient, key, coolRim, lowerFill, rearLight);

        const resize = () => {
          const { width, height } = frame.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          const viewHeight = 5.55;
          const viewWidth = viewHeight * (width / height);
          camera.left = -viewWidth / 2;
          camera.right = viewWidth / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
          camera.updateProjectionMatrix();
        };
        observer = new ResizeObserver(resize);
        observer.observe(frame);
        resize();

        let dragging = false;
        let hasInteracted = false;
        let previousX = 0;
        let previousY = 0;
        let targetRotation = -0.09;
        let targetTilt = -0.018;

        const onPointerDown = (event) => {
          dragging = true;
          hasInteracted = true;
          previousX = event.clientX;
          previousY = event.clientY;
          canvas.setPointerCapture?.(event.pointerId);
        };
        const onPointerMove = (event) => {
          if (!dragging) return;
          const deltaX = event.clientX - previousX;
          const deltaY = event.clientY - previousY;
          targetRotation += deltaX * 0.0045;
          targetTilt = Math.max(-0.15, Math.min(0.12, targetTilt + deltaY * 0.004));
          previousX = event.clientX;
          previousY = event.clientY;
        };
        const onPointerUp = () => { dragging = false; };
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

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let firstFrameRendered = false;
        const animate = (time) => {
          if (disposed) return;
          if (!dragging && !reduceMotion) {
            if (!hasInteracted) {
              targetRotation = -0.09 + Math.sin(time * 0.00038) * 0.055;
            }
          }
          trophy.rotation.y += (targetRotation - trophy.rotation.y) * 0.085;
          trophy.rotation.x += (targetTilt - trophy.rotation.x) * 0.085;
          trophy.position.y = 0.14 + (reduceMotion ? 0 : Math.sin(time * 0.0009) * 0.008);
          renderer.render(scene, camera);
          if (!firstFrameRendered && !disposed) {
            firstFrameRendered = true;
            setRenderState('ready');
          }
          animationFrame = window.requestAnimationFrame(animate);
        };
        animationFrame = window.requestAnimationFrame(animate);

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
      observer?.disconnect();
      removePointerEvents();
      disposeScene();
      environmentTarget?.dispose();
      pmremGenerator?.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <div ref={frameRef} className="hc-season-trophy-3d" data-render-state={renderState}>
      <canvas
        ref={canvasRef}
        aria-label={`${label} em 3D. Arraste horizontalmente para observar a lateral e o verso.`}
      />
      {renderState === 'fallback' && (
        <img className="hc-season-trophy-3d__fallback" src={TROPHY_IMAGE_URL} alt={label} />
      )}
    </div>
  );
}
