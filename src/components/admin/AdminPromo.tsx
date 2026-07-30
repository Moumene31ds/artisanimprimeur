"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

interface AdminPromoProps {
  promoCodes: any[];
  newPromoCode: { code: string; discountType: string; discountValue: number; minAmount: number; active: boolean };
  setNewPromoCode: (val: any) => void;
  addPromoCode: (e: React.FormEvent) => void;
  deletePromoCode: (id: string) => void;
}

export default function AdminPromo({
  promoCodes,
  newPromoCode,
  setNewPromoCode,
  addPromoCode,
  deletePromoCode
}: AdminPromoProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-8"
    >
      <form 
        onSubmit={addPromoCode} 
        className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-xl"
      >
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Code Promo</label>
          <input 
            required 
            placeholder="Ex: ETE2024" 
            value={newPromoCode.code} 
            onChange={e => setNewPromoCode({ ...newPromoCode, code: e.target.value.toUpperCase() })} 
            className="w-full p-4 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl font-black outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-slate-100" 
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Type</label>
          <select 
            value={newPromoCode.discountType} 
            onChange={e => setNewPromoCode({ ...newPromoCode, discountType: e.target.value })} 
            className="w-full p-4 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-slate-100"
          >
            <option value="percent">Pourcentage (%)</option>
            <option value="fixed">Montant Fixe (DA)</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Valeur</label>
          <input 
            required 
            type="number" 
            placeholder="Valeur" 
            value={newPromoCode.discountValue || ""} 
            onChange={e => setNewPromoCode({ ...newPromoCode, discountValue: Number(e.target.value) })} 
            className="w-full p-4 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-slate-100 font-bold" 
          />
        </div>
        <button 
          type="submit" 
          className="bg-emerald-500 text-white p-4 rounded-2xl font-black hover:bg-emerald-600 transition-all h-[58px]"
        >
          Activer
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {promoCodes.length === 0 ? (
          <div className="col-span-full text-center py-10 text-slate-400 font-bold premium-glass rounded-3xl">
            Aucun code promo trouvé.
          </div>
        ) : (
          promoCodes.map(code => (
            <div 
              key={code.id} 
              className="premium-glass p-5 rounded-2xl border border-white/60 dark:border-white/5 flex justify-between items-center group hover:shadow-md transition-all"
            >
              <div>
                <h4 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-widest">{code.id}</h4>
                <p className="text-xs font-bold text-emerald-500">{code.discountValue}{code.discountType === 'percent' ? '%' : ' DA'} de réduction</p>
              </div>
              <button 
                onClick={() => deletePromoCode(code.id)} 
                className="p-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={20}/>
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
