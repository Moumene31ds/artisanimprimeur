"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";

// -----------------------------------------------
// BottomSheet — Sheet mobile / Modale desktop responsive
// -----------------------------------------------
// Sur mobile : une feuille qui glisse depuis le bas (pattern iOS/Android),
// avec une poignée de glissement, une ombre drag, un scroll interne et la
// zone de sécurité (safe-area) du bas du téléphone.
// Sur desktop (sm+) : une modale centrée élégante.

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  isRtl?: boolean;
  /** Largeur max sur desktop. */
  maxWidth?: string;
  /** Fermeture par swipe vers le bas (mobile uniquement). */
  dismissible?: boolean;
  /** Masquer le bouton de fermeture de l'en-tête (ex: header personnalisé). */
  hideClose?: boolean;
}

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
  isRtl = false,
  maxWidth = "max-w-4xl",
  dismissible = true,
  hideClose = false,
}: BottomSheetProps) {
  const dragStartY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Verrouille le scroll de la page derrière la feuille (overlay-scroll lock).
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Fermeture au clavier (Escape) — accessibilité.
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismissible, onClose]);

  const handleDragStart = (_: unknown, info: PanInfo) => {
    dragStartY.current = info.point.y;
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const distance = info.offset.y;
    const velocity = info.velocity.y;
    if (dismissible && (distance > 120 || (velocity > 700 && distance > 30))) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/75 backdrop-blur-sm"
          />

          {/* Sheet / Modal */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            dir={isRtl ? "rtl" : "ltr"}
            initial={{ y: 60, opacity: 0.6, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            drag={dismissible ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.25 }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`relative z-10 w-full ${maxWidth} max-h-[92dvh] sm:max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 shadow-2xl flex flex-col
              rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-slate-200/60 dark:border-slate-800`}
          >
            {/* Poignée de glissement (mobile uniquement) */}
            <div className="sm:hidden absolute top-3 left-1/2 -translate-x-1/2 z-20 w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0 relative">
              <div className="flex-1 min-w-0 pr-2">
                {title && (
                  <div className="text-lg font-black text-slate-900 dark:text-white truncate">{title}</div>
                )}
              </div>
              {!hideClose && (
                <button
                  onClick={onClose}
                  aria-label={isRtl ? "إغلاق" : "Fermer"}
                  className="shrink-0 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Contenu défilable + safe-area bas */}
            <div className="overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex-1 -webkit-overflow-scrolling-touch">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
