import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  ArrowLeft,
  Check,
  Circle,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Square,
  ZoomIn,
} from 'lucide-react';
import { createCroppedAvatarFile } from '../../utils/imageCrop';

export default function AvatarEditor({ file, onCancel, onApply }) {
  const dialogRef = useRef(null);
  const [imageUrl, setImageUrl] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropShape, setCropShape] = useState('round');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!file) return undefined;
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const handleCropComplete = useCallback((_croppedArea, nextPixels) => {
    setCroppedAreaPixels(nextPixels);
  }, []);

  const resetCrop = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setErrorMessage('');
  };

  const buildPreview = async () => {
    setIsGenerating(true);
    setErrorMessage('');
    try {
      const nextFile = await createCroppedAvatarFile(imageUrl, croppedAreaPixels, rotation);
      const nextUrl = URL.createObjectURL(nextFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewFile(nextFile);
      setPreviewUrl(nextUrl);
      setIsPreviewing(true);
      return nextFile;
    } catch (error) {
      setErrorMessage(error.message || 'Não foi possível preparar a prévia.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    const finalFile = previewFile || await buildPreview();
    if (!finalFile) return;

    setIsApplying(true);
    setErrorMessage('');
    try {
      await onApply(finalFile);
    } catch (error) {
      setErrorMessage(error.message || 'Não foi possível salvar a foto.');
    } finally {
      setIsApplying(false);
    }
  };

  const isBusy = isGenerating || isApplying;

  if (!file || typeof document === 'undefined') return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="hc-avatar-editor"
      aria-labelledby="hc-avatar-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isBusy) onCancel();
      }}
    >
      <div className="hc-avatar-editor__shell">
        <header className="hc-avatar-editor__header">
          <button type="button" onClick={isPreviewing ? () => setIsPreviewing(false) : onCancel} disabled={isBusy} aria-label={isPreviewing ? 'Voltar ao recorte' : 'Cancelar edição'}>
            <ArrowLeft size={19} />
          </button>
          <div>
            <h2 id="hc-avatar-editor-title">{isPreviewing ? 'Prévia da foto' : 'Ajustar foto'}</h2>
            <p>{isPreviewing ? 'Confira antes de publicar.' : 'Arraste e amplie para enquadrar.'}</p>
          </div>
          <span aria-hidden="true" />
        </header>

        {!isPreviewing ? (
          <>
            <div className="hc-avatar-editor__stage">
              {imageUrl && (
                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  minZoom={1}
                  maxZoom={3}
                  cropShape={cropShape}
                  showGrid={cropShape === 'rect'}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
              )}
            </div>

            <div className="hc-avatar-editor__controls">
              <div className="hc-avatar-editor__shape" role="group" aria-label="Formato da prévia">
                <button type="button" className={cropShape === 'round' ? 'is-active' : ''} onClick={() => setCropShape('round')} aria-pressed={cropShape === 'round'}>
                  <Circle size={16} /> Circular
                </button>
                <button type="button" className={cropShape === 'rect' ? 'is-active' : ''} onClick={() => setCropShape('rect')} aria-pressed={cropShape === 'rect'}>
                  <Square size={16} /> Quadrada
                </button>
              </div>

              <label className="hc-avatar-editor__slider">
                <span><ZoomIn size={16} /> Zoom <b>{zoom.toFixed(1)}x</b></span>
                <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
              </label>

              <div className="hc-avatar-editor__tools" role="group" aria-label="Rotação da foto">
                <button type="button" onClick={() => setRotation((value) => value - 90)} aria-label="Girar para a esquerda"><RotateCcw size={18} /></button>
                <button type="button" onClick={resetCrop} aria-label="Restaurar enquadramento"><RefreshCcw size={18} /></button>
                <button type="button" onClick={() => setRotation((value) => value + 90)} aria-label="Girar para a direita"><RotateCw size={18} /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="hc-avatar-editor__preview">
            <div className="hc-avatar-editor__preview-main">
              <img src={previewUrl} alt="Prévia circular da foto" />
            </div>
            <div className="hc-avatar-editor__preview-contexts" aria-label="Prévia em diferentes tamanhos">
              <div><img src={previewUrl} alt="" /><span>Perfil</span></div>
              <div><img src={previewUrl} alt="" /><span>Cabeçalho</span></div>
              <div><img src={previewUrl} alt="" /><span>Ranking</span></div>
              <div className="is-square"><img src={previewUrl} alt="" /><span>Quadrada</span></div>
            </div>
          </div>
        )}

        <div className="hc-avatar-editor__status" aria-live="polite">
          {errorMessage && <p role="alert">{errorMessage}</p>}
        </div>

        <footer className="hc-avatar-editor__footer">
          {!isPreviewing ? (
            <button type="button" className="hc-avatar-editor__primary" onClick={buildPreview} disabled={isBusy || !croppedAreaPixels}>
              {isGenerating ? 'Gerando prévia...' : 'Ver prévia'}
            </button>
          ) : (
            <button type="button" className="hc-avatar-editor__primary" onClick={handleApply} disabled={isBusy}>
              <Check size={17} /> {isApplying ? 'Salvando...' : 'Usar foto'}
            </button>
          )}
        </footer>
      </div>
    </dialog>,
    document.body
  );
}
