import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Smartphone,
  SwitchCamera,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { PRODUCT_ASSET_FALLBACKS } from '../config/seed';

interface ImageAttachmentFieldProps {
  value: string;
  onChange: (newValue: string) => void;
  label?: string;
}

const STUDIO_PRESETS = [
  { label: 'Monitor', url: PRODUCT_ASSET_FALLBACKS.monitor },
  { label: 'Defibrillator', url: PRODUCT_ASSET_FALLBACKS.defibrillator },
  { label: 'Ventilator', url: PRODUCT_ASSET_FALLBACKS.ventilator },
  { label: 'Analyzer', url: PRODUCT_ASSET_FALLBACKS.analyzer },
];

async function compressImageFileToDataUrl(file: File, maxDim = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file could not be decoded as an image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable for image optimization.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageAttachmentField({
  value,
  onChange,
  label = 'Product Image Attachment',
}: ImageAttachmentFieldProps) {
  const browseInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Live Camera Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [capturedPreview, setCapturedPreview] = useState<string>('');
  const [cameraStarting, setCameraStarting] = useState(false);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startLiveCamera = async (requestedFacing: 'environment' | 'user') => {
    setCameraError('');
    setCameraStarting(true);
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStarting(false);
      setCameraError(
        'Live webcam API is unavailable in this browser context. Use "Take Photo (Device)" or "Browse" instead.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: requestedFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access or use "Take Photo (Device)" / "Browse".'
          : 'Unable to access live camera device. Try "Take Photo (Device)" or "Browse".'
      );
    } finally {
      setCameraStarting(false);
    }
  };

  const handleOpenCameraModal = () => {
    setErrorMsg('');
    setCapturedPreview('');
    setCameraModalOpen(true);
    setTimeout(() => {
      startLiveCamera(facingMode);
    }, 60);
  };

  const handleCloseCameraModal = () => {
    stopCameraStream();
    setCameraModalOpen(false);
    setCapturedPreview('');
    setCameraError('');
  };

  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    setCapturedPreview('');
    startLiveCamera(next);
  };

  const handleSnapFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    setCapturedPreview(dataUrl);
  };

  const handleConfirmCaptured = () => {
    if (!capturedPreview) return;
    onChange(capturedPreview);
    handleCloseCameraModal();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg('');
    setIsProcessing(true);
    try {
      const optimizedDataUrl = await compressImageFileToDataUrl(file);
      onChange(optimizedDataUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Image processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-[10px] font-mono uppercase text-gray-300 font-bold">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Preview Box */}
      <div className="bg-[#10101e] border border-orange-500/20 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-20 h-16 rounded-lg bg-navy border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
            {value ? (
              <img src={value} alt="Equipment preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-500" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-xs font-semibold text-white truncate">
              {value
                ? value.startsWith('data:image/')
                  ? 'Captured / Uploaded Photo Attached'
                  : 'Image Asset Attached'
                : 'No image attached yet'}
            </div>
            <p className="text-[11px] text-gray-400 leading-snug">
              Browse files, snap directly from device camera, or capture from webcam.
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => browseInputRef.current?.click()}
            className="px-2.5 py-2 rounded-lg bg-navy hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber" /> : <FolderOpen className="w-3.5 h-3.5 text-amber" />}
            <span>Browse</span>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => mobileCameraInputRef.current?.click()}
            className="px-2.5 py-2 rounded-lg bg-navy hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber" />
            <span>Take Photo</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCameraModal}
            className="px-2.5 py-2 rounded-lg bg-amber/15 hover:bg-amber hover:text-navy border border-amber/30 text-amber text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>From Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUrlInput((prev) => !prev)}
            className={`px-2.5 py-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              showUrlInput
                ? 'bg-white/15 border-amber/40 text-amber'
                : 'bg-navy hover:bg-white/10 border-white/10 text-gray-300'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Paste URL</span>
          </button>
        </div>

        {/* Hidden native file & mobile capture inputs */}
        <input
          ref={browseInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />
        <input
          ref={mobileCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Quick Studio Asset Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-mono text-gray-400 mr-1">Studio Presets:</span>
          {STUDIO_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.url)}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber/20 hover:text-amber border border-white/10 text-[10px] text-gray-300 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Optional URL Input */}
        {showUrlInput && (
          <input
            type="text"
            placeholder="https://... or /assets/..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-navy border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber"
          />
        )}

        {errorMsg && <p className="text-[11px] text-red-400">{errorMsg}</p>}
      </div>

      {/* Live Webcam Capture Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-[3200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy w-full max-w-lg rounded-2xl border border-amber/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber" />
                <h4 className="font-syne font-bold text-sm text-white uppercase">Capture Equipment Photo</h4>
              </div>
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {cameraError ? (
                <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-3 text-center">
                  <p>{cameraError}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseCameraModal();
                        mobileCameraInputRef.current?.click();
                      }}
                      className="px-3.5 py-2 rounded-lg bg-amber text-navy font-bold text-xs"
                    >
                      Take Photo (Device)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseCameraModal();
                        browseInputRef.current?.click();
                      }}
                      className="px-3.5 py-2 rounded-lg bg-white/10 text-white font-semibold text-xs"
                    >
                      Browse Files
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                    {capturedPreview ? (
                      <img src={capturedPreview} alt="Captured frame" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          autoPlay
                          className="w-full h-full object-cover"
                        />
                        {cameraStarting && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-mono text-amber gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Starting camera...</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {capturedPreview ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setCapturedPreview('')}
                          className="flex-1 py-2.5 px-4 rounded-xl border border-white/15 text-gray-200 hover:bg-white/5 text-xs font-bold"
                        >
                          Retake Photo
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmCaptured}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Use Photo</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleFlipCamera}
                          className="py-2.5 px-3.5 rounded-xl border border-white/15 text-gray-200 hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <SwitchCamera className="w-4 h-4 text-amber" />
                          <span>Flip Camera</span>
                        </button>
                        <button
                          type="button"
                          disabled={cameraStarting}
                          onClick={handleSnapFrame}
                          className="flex-1 py-2.5 px-5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Capture Photo</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
