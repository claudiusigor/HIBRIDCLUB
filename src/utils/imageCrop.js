const OUTPUT_SIZE = 1024;

const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

const getRotatedSize = (width, height, rotation) => {
  const radians = degreesToRadians(rotation);
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  };
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
  image.src = src;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, type, quality);
});

export async function createCroppedAvatarFile(imageSrc, croppedAreaPixels, rotation = 0) {
  if (!imageSrc || !croppedAreaPixels) {
    throw new Error('Ajuste o enquadramento antes de continuar.');
  }

  const image = await loadImage(imageSrc);
  const rotatedSize = getRotatedSize(image.naturalWidth, image.naturalHeight, rotation);
  const rotationCanvas = document.createElement('canvas');
  const rotationContext = rotationCanvas.getContext('2d');

  if (!rotationContext) {
    throw new Error('Seu dispositivo não conseguiu preparar o recorte.');
  }

  rotationCanvas.width = Math.ceil(rotatedSize.width);
  rotationCanvas.height = Math.ceil(rotatedSize.height);
  rotationContext.translate(rotationCanvas.width / 2, rotationCanvas.height / 2);
  rotationContext.rotate(degreesToRadians(rotation));
  rotationContext.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  rotationContext.drawImage(image, 0, 0);

  const outputCanvas = document.createElement('canvas');
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) {
    throw new Error('Seu dispositivo não conseguiu gerar a foto final.');
  }

  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = 'high';
  outputContext.drawImage(
    rotationCanvas,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  let blob = await canvasToBlob(outputCanvas, 'image/webp', 0.9);
  let extension = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await canvasToBlob(outputCanvas, 'image/jpeg', 0.9);
    extension = 'jpg';
  }

  if (!blob) {
    throw new Error('Não foi possível gerar a foto final.');
  }

  return new File([blob], `avatar-${Date.now()}.${extension}`, {
    type: blob.type || (extension === 'webp' ? 'image/webp' : 'image/jpeg'),
  });
}
