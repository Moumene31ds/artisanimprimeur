"use client";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderId: string;
}

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, orderId }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* الخلفية الضبابية */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* نافذة التأكيد */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md premium-glass p-8 rounded-[2.5rem] border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden"
          >
            {/* تأثير ضوء أحمر في الخلفية */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/20 rounded-full blur-[60px]"></div>

            <div className="relative z-10 text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-200 dark:border-red-800">
                <AlertTriangle size={40} className="animate-pulse" />
              </div>

              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">
                Action Irréversible !
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer la commande <span className="font-mono font-bold text-red-500">#{orderId.slice(-6)}</span> ? <br/>
                Cette action effacera définitivement toutes les données du serveur.
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => { onConfirm(); onClose(); }}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-600/30 hover:bg-red-500 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Supprimer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

