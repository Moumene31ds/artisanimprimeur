"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";

interface AvatarCropModalProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (dataUrl: string, file: File) => void;
}

// حجم مربع القص في الشاشة
const VP = 272;
// حجم الصورة النهائية المصدّرة (canvas)
const EXPORT_SIZE = 512;

export default function AvatarCropModal({ open, file, onClose, onConfirm }: AvatarCropModalProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [draggingStart, setDraggingStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // تحميل الصورة عند اختيار ملف جديد
  useEffect(() => {
    if (!open || !file) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImage(null);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // القياس الأساسي: تغطية المربع بالكامل (cover)
      const base = Math.max(VP / img.width, VP / img.height);
      setZoom(base);
      setImage(img);
    };
    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [open, file]);

  const clampOffset = useCallback(
    (x: number, y: number, z: number) => {
      const w = image ? image.width * z : VP;
      const h = image ? image.height * z : VP;
      const maxX = Math.max(0, (w - VP) / 2);
      const maxY = Math.max(0, (h - VP) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
    },
    [image]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!image) return;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const base = Math.max(VP / image.width, VP / image.height);
      const next = Math.min(Math.max(base, zoom * delta), base * 3);
      setOffset((o) => clampOffset(o.x, o.y, next));
      setZoom(next);
    },
    [image, zoom, clampOffset]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDraggingStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset((o) => clampOffset(e.clientX - draggingStart.x, e.clientY - draggingStart.y, zoom));
  };

  const onPointerUp = () => setDragging(false);

  const handleZoom = (dir: 1 | -1) => {
    if (!image) return;
    const base = Math.max(VP / image.width, VP / image.height);
    const next = Math.min(Math.max(base, zoom * (dir === 1 ? 1.15 : 0.85)), base * 3);
    setOffset((o) => clampOffset(o.x, o.y, next));
    setZoom(next);
  };

  const exportImage = () => {
    if (!image) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const ratio = EXPORT_SIZE / VP;
      const w = image.width * zoom * ratio;
      const h = image.height * zoom * ratio;
      const dx = EXPORT_SIZE / 2 - w / 2 + offset.x * ratio;
      const dy = EXPORT_SIZE / 2 - h / 2 + offset.y * ratio;

      ctx.save();
      ctx.beginPath();
      ctx.arc(EXPORT_SIZE / 2, EXPORT_SIZE / 2, EXPORT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, dx, dy, w, h);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onConfirm(dataUrl, file!);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
            dir="ltr"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Photo de profil</h3>
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} className="text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* منطقة المعاينة والقص */}
            <div
              ref={containerRef}
              onWheel={handleWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className="relative w-[272px] h-[272px] mx-auto rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-inner touch-none select-none cursor-grab active:cursor-grabbing"
              style={{ width: VP, height: VP }}
            >
              {image ? (
                <img
                  src={image.src}
                  alt="Preview"
                  draggable={false}
                  className="absolute max-w-none pointer-events-none"
                  style={{
                    width: image.width * zoom,
                    height: image.height * zoom,
                    left: VP / 2 - (image.width * zoom) / 2 + offset.x,
                    top: VP / 2 - (image.height * zoom) / 2 + offset.y,
                    userSelect: "none",
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-slate-400" />
                </div>
              )}
              {/* حلقة ترشيح ناعمة */}
              <div className="absolute inset-0 rounded-full ring-2 ring-white/60 dark:ring-slate-500/60 pointer-events-none"></div>
            </div>

            {/* التحكم بالتكبير */}
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                type="button"
                onClick={() => handleZoom(-1)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Zoom out"
              >
                −
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={image ? Math.round(((zoom - Math.max(VP / image.width, VP / image.height)) / (Math.max(VP / image.width, VP / image.height) * 2)) * 100) : 50}
                onChange={(e) => {
                  if (!image) return;
                  const base = Math.max(VP / image.width, VP / image.height);
                  const next = base + (Number(e.target.value) / 100) * base * 2;
                  setOffset((o) => clampOffset(o.x, o.y, next));
                  setZoom(next);
                }}
                className="w-32 accent-blue-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleZoom(1)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 font-bold mt-2">
              اسحب الصورة لضبطها وحرّك التكبير للحصول على أفضل قص
            </p>

            <button
              onClick={exportImage}
              disabled={!image || saving}
              className="w-full mt-5 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              حفظ الصورة
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
