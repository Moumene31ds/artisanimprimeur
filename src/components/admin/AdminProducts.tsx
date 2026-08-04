"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Plus, Trash2, Edit3, Save, X, Loader2, Image as ImageIcon 
} from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/catalog";

interface AdminProductsProps {
  products: any[];
  newProduct: { name: string; price: string; category: string; image: string };
  setNewProduct: (val: any) => void;
  uploadingImage: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveProduct: (e: React.FormEvent) => void;
  editingProductId: string | null;
  setEditingProductId: (val: string | null) => void;
  editingPrice: string;
  setEditingPrice: (val: string) => void;
  startEditingPrice: (id: string, price: number) => void;
  handleUpdatePrice: (id: string) => void;
  deleteProduct: (id: string) => void;
}

export default function AdminProducts({
  products,
  newProduct,
  setNewProduct,
  uploadingImage,
  handleImageUpload,
  saveProduct,
  editingProductId,
  setEditingProductId,
  editingPrice,
  setEditingPrice,
  startEditingPrice,
  handleUpdatePrice,
  deleteProduct
}: AdminProductsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-8"
    >
      <form 
        onSubmit={saveProduct} 
        className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end shadow-xl"
      >
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Image du produit</label>
          <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            {newProduct.image ? (
              <img src={newProduct.image} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="Aperçu" />
            ) : (
              <div className="text-center">
                {uploadingImage ? (
                  <Loader2 className="animate-spin mx-auto text-accent" />
                ) : (
                  <ImageIcon className="mx-auto opacity-30 dark:text-slate-400" />
                )}
                <span className="text-[10px] font-bold text-slate-400 mt-2 block">Upload</span>
                <input 
                  type="file" 
                  onChange={handleImageUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  accept="image/*" 
                />
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Nom</label>
          <input 
            required 
            placeholder="Ex: Cartes Visite" 
            value={newProduct.name} 
            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} 
            className="w-full p-4 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-slate-100 font-bold" 
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Catégorie</label>
          <select
            value={newProduct.category}
            onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
            className="w-full p-4 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
          >
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Prix (DA)</label>
          <input 
            required 
            type="number" 
            placeholder="Ex: 2500" 
            value={newProduct.price} 
            onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} 
            className="w-full p-4 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-slate-100 font-bold" 
          />
        </div>
        <button 
          type="submit" 
          disabled={uploadingImage} 
          className="bg-accent text-white p-4 rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 h-[58px] flex items-center justify-center gap-2"
        >
           {uploadingImage ? <Loader2 className="animate-spin" /> : <><Plus size={20}/> Ajouter</>}
        </button>
      </form>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map(p => (
          <div 
            key={p.id} 
            className="premium-glass p-4 rounded-2xl border border-white/60 dark:border-white/5 relative group hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <button 
                onClick={() => deleteProduct(p.id)} 
                className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 hover:text-white"
              >
                <Trash2 size={14}/>
              </button>
              <img src={p.image} loading="lazy" decoding="async" className="w-full h-28 rounded-lg object-cover mb-3" alt={p.name} />
              <h4 className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">{p.name}</h4>
            </div>
            
            <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between">
              {editingProductId === p.id ? (
                <div className="flex gap-1 items-center w-full">
                  <input 
                    type="number" 
                    value={editingPrice} 
                    onChange={e => setEditingPrice(e.target.value)}
                    className="w-full p-1 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border rounded"
                  />
                  <button onClick={() => handleUpdatePrice(p.id)} className="p-1 bg-emerald-500 text-white rounded">
                    <Save size={12}/>
                  </button>
                  <button onClick={() => setEditingProductId(null)} className="p-1 bg-slate-400 text-white rounded">
                    <X size={12}/>
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-black text-accent text-sm">{p.price} DA</p>
                  <button 
                    onClick={() => startEditingPrice(p.id, p.price)} 
                    className="text-slate-400 hover:text-accent p-1 transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
