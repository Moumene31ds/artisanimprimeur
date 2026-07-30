"use client";

import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { signOut, updateProfile, deleteUser } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { 
  User, Mail, LogOut, ShieldCheck, Award, Crown, Loader2, Save, Gift, 
  ChevronRight, ArrowLeft, ShoppingBag, UserMinus, Camera, Copy, Check, Users, CheckCircle 
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { GlobalLoader } from "@/components/GlobalLoader";
import Image from "next/image";
import confetti from "canvas-confetti";

export default function ProfilePage() {
  const { user, loading, isAdmin } = useAuth();
  const { language } = useAppStore();
  const router = useRouter();
  
  const [totalSpent, setTotalSpent] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Referral states
  const [friendCode, setFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [referredByCode, setReferredByCode] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRtl = language === 'ar';

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      setNewName(user.displayName || "");
      fetchUserStats(user.uid);
      fetchUserReferral(user.uid);

      // Automatically register my referral code in Firestore
      const myCode = user.uid.substring(user.uid.length - 6).toUpperCase();
      setDoc(doc(db, "referralCodes", myCode), {
        userId: user.uid,
        userName: user.displayName || user.email || "Artisan User",
        createdAt: serverTimestamp()
      }, { merge: true }).catch(err => console.error("Error registering referral code", err));
    }
  }, [user, loading, router]);

  const myReferralCode = user ? user.uid.substring(user.uid.length - 6).toUpperCase() : "";

  const fetchUserReferral = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.referredBy) {
          setReferredByCode(data.referredBy);
        }
      }
    } catch (error) {
      console.error("Error fetching user referral doc", error);
    }
  };

  const fetchUserStats = async (uid: string) => {
    try {
      const q = query(collection(db, "orders"), where("customerUserId", "==", uid));
      const snap = await getDocs(q);
      let spent = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'Annulé') {
          spent += Number(data.total) || 0;
        }
      });
      setTotalSpent(spent);
      setOrdersCount(snap.size);
    } catch (error) {
      console.error("Error fetching stats", error);
    }
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !friendCode.trim() || applying) return;
    setApplying(true);

    const inputCode = friendCode.trim().toUpperCase();
    if (inputCode === myReferralCode) {
      toast.error(isRtl ? "لا يمكنك استخدام كود الإحالة الخاص بك!" : "Vous ne pouvez pas parrainer vous-même !");
      setApplying(false);
      return;
    }

    try {
      const codeRef = doc(db, "referralCodes", inputCode);
      const codeSnap = await getDoc(codeRef);
      
      if (!codeSnap.exists()) {
        toast.error(isRtl ? "كود الإحالة هذا غير صالح" : "Code de parrainage invalide");
        setApplying(false);
        return;
      }

      const referrerData = codeSnap.data();
      const referrerId = referrerData.userId;

      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists() && userSnap.data().referredBy) {
        toast.error(isRtl ? "لقد قمت بالفعل بتطبيق كود إحالة سابق!" : "Vous avez déjà appliqué un code de parrainage !");
        setApplying(false);
        return;
      }

      // credit referrer
      await addDoc(collection(db, "pointTransactions"), {
        userId: referrerId,
        type: 'won',
        points: 50,
        title: `Referral bonus from user #${user.uid.substring(0, 6)}`,
        titleAr: `هدية إحالة من المستخدم #${user.uid.substring(0, 6)}`,
        createdAt: serverTimestamp(),
      });

      // credit referred
      await addDoc(collection(db, "pointTransactions"), {
        userId: user.uid,
        type: 'won',
        points: 50,
        title: `Applied referral code of user #${referrerId.substring(0, 6)}`,
        titleAr: `تطبيق كود إحالة المستخدم #${referrerId.substring(0, 6)}`,
        createdAt: serverTimestamp(),
      });

      // Update referrer cached points
      const referrerDocRef = doc(db, "users", referrerId);
      const referrerSnap = await getDoc(referrerDocRef);
      const referrerPoints = referrerSnap.exists() ? (referrerSnap.data().points || 0) : 0;
      await setDoc(referrerDocRef, {
        points: referrerPoints + 50
      }, { merge: true });

      // Update referred cached points
      const userPoints = userSnap.exists() ? (userSnap.data().points || 0) : 0;
      await setDoc(userDocRef, {
        referredBy: inputCode,
        referredByUserId: referrerId,
        referralApplied: true,
        points: userPoints + 50,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setReferredByCode(inputCode);
      toast.success(isRtl ? "تهانينا! تم تطبيق كود الإحالة وحصدت 50 نقطة!" : "Félicitations ! Code appliqué, +50 Points !");
      
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error("Error applying referral code", err);
      toast.error(isRtl ? "حدث خطأ أثناء تطبيق الكود" : "Erreur lors de l'application");
    } finally {
      setApplying(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: newName.trim() });
      toast.success(isRtl ? "تم تحديث الاسم بنجاح!" : "Profil mis à jour !");
      setIsEditing(false);
    } catch (error) {
      toast.error(isRtl ? "حدث خطأ أثناء التحديث" : "Erreur de mise à jour");
    } finally {
      setSaving(false);
    }
  };

  // ميزة رفع الصورة الشخصية إلى Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // التحقق من حجم الصورة (أقل من 5 ميجابايت)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRtl ? "حجم الصورة يجب أن يكون أقل من 5 ميجابايت" : "La taille de l'image doit être inférieure à 5 Mo");
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    // تأكد من إنشاء Upload Preset غير موقع (Unsigned) في Cloudinary بهذا الاسم
    formData.append("upload_preset", "artisan_profiles"); 

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.secure_url) {
        await updateProfile(user, { photoURL: data.secure_url });
        toast.success(isRtl ? "تم تحديث صورتك الشخصية بنجاح!" : "Photo de profil mise à jour !");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      toast.error(isRtl ? "فشل رفع الصورة" : "Échec du téléchargement de l'image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDelete = window.confirm(
      isRtl 
        ? "هل أنت متأكد تماماً أنك تريد حذف حسابك؟ سيتم محو جميع بياناتك ونقاط الولاء ولا يمكن التراجع عن هذا الإجراء." 
        : "Êtes-vous absolument sûr de vouloir supprimer votre compte ? Cette action est irréversible."
    );

    if (confirmDelete) {
      try {
        await deleteUser(user);
        toast.success(isRtl ? "تم حذف الحساب بنجاح." : "Compte supprimé avec succès.");
        router.push("/");
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
          toast.error(isRtl ? "لأسباب أمنية، يرجى تسجيل الخروج والدخول مرة أخرى قبل محاولة حذف الحساب." : "Veuillez vous déconnecter et vous reconnecter avant de supprimer le compte.");
        } else {
          toast.error(isRtl ? "فشل حذف الحساب." : "Échec de la suppression.");
        }
      }
    }
  };

  if (!mounted || loading || !user) return <GlobalLoader />;

  let tier = { name: isRtl ? "عادي" : "Standard", color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", icon: User };
  if (totalSpent > 50000) {
    tier = { name: "VIP Gold", color: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-500 dark:border-yellow-800", icon: Crown };
  } else if (totalSpent > 20000) {
    tier = { name: "Silver", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", icon: Award };
  }

  return (
    <div className={`max-w-5xl mx-auto pb-24 px-4 animate-fadeIn ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      <header className="flex items-center gap-4 mb-10">
        <Link href="/" className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={24} className={isRtl ? 'rotate-180' : ''} />
        </Link>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">
          {isRtl ? "حسابي الشخصي" : "Mon Profil"}
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="premium-glass p-8 md:p-10 rounded-[3rem] border border-white/60 dark:border-white/5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              
              {/* قسم تعديل الصورة الشخصية التفاعلي */}
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white dark:border-slate-800 transition-all ${user.photoURL ? 'bg-white' : 'bg-gradient-to-tr from-accent to-blue-400 text-white'}`}>
                  {uploadingImage ? (
                    <Loader2 size={32} className="animate-spin text-accent" />
                  ) : user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={48} />
                  )}
                </div>
                
                {/* تأثير الظهور عند التمرير لتغيير الصورة */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={28} className="text-white drop-shadow-md" />
                </div>
                
                {/* إدخال الملف المخفي */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              <div className="flex-1 text-center md:text-start">
                {isEditing ? (
                  <form onSubmit={handleUpdateProfile} className="flex gap-2 justify-center md:justify-start">
                    <input 
                      autoFocus value={newName} onChange={(e)=>setNewName(e.target.value)}
                      className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-accent transition-all font-bold text-slate-800 dark:text-white"
                    />
                    <button type="submit" disabled={saving} className="bg-accent text-white px-5 py-3 rounded-xl shadow-lg font-bold hover:bg-blue-600 transition-colors">
                      {saving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>}
                    </button>
                  </form>
                ) : (
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-3">
                    {user.displayName || (isRtl ? "مستخدم" : "Utilisateur")}
                    <button onClick={()=>setIsEditing(true)} className="text-xs font-bold text-accent hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1 rounded-lg transition-colors">
                      {isRtl ? "تعديل" : "Modifier"}
                    </button>
                  </h2>
                )}
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 flex items-center justify-center md:justify-start gap-2">
                  <Mail size={16} /> {user.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-slate-200 dark:border-slate-800/50">
               <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{isRtl ? "إجمالي الإنفاق" : "Total Dépensé"}</p>
                  <p className="text-3xl font-black text-accent">{totalSpent.toLocaleString()} <span className="text-sm">DA</span></p>
               </div>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{isRtl ? "عدد الطلبات" : "Commandes"}</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">{ordersCount}</p>
               </div>
            </div>
          </motion.div>

          <Link href="/rewards">
            <motion.div 
              whileHover={{ y: -5, scale: 1.01 }}
              initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}}
              className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 dark:from-accent dark:to-blue-600 p-8 rounded-[3rem] shadow-2xl text-white group cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-yellow-400/30 transition-colors"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-start">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                      <Gift className="text-yellow-400" size={24} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest opacity-90">L'Artisan Rewards</span>
                  </div>
                  <h3 className="text-2xl font-black mb-2">{isRtl ? "حول مشترياتك إلى هدايا" : "Boutique de récompenses"}</h3>
                  <p className="text-sm text-slate-300 dark:text-blue-100 max-w-sm leading-relaxed">
                    {isRtl ? "استكشف متجر المكافآت واستبدل نقاط الولاء الخاصة بك الآن بأكواد خصم." : "Échangez vos points de fidélité contre des réductions exclusives."}
                  </p>
                </div>
                <div className="w-14 h-14 bg-white text-slate-900 rounded-full flex items-center justify-center group-hover:bg-yellow-400 transition-colors shadow-lg">
                  <ChevronRight size={24} className={isRtl ? 'rotate-180' : ''} />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* --- Referral Code Card --- */}
          <motion.div 
            initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.15}}
            className="premium-glass p-8 md:p-10 rounded-[3rem] border border-white/60 dark:border-white/5 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative z-10 space-y-6">
              
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-655 rounded-xl">
                  <Users size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    {isRtl ? "شارك واكسب 50 نقطة" : "Invitez des amis & Gagnez"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    {isRtl ? "شارك كود الإحالة الخاص بك مع أصدقائك" : "Partagez votre code de parrainage"}
                  </p>
                </div>
              </div>

              {/* Display my referral code */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    {isRtl ? "كود الإحالة الخاص بك" : "Votre code"}
                  </span>
                  <span className="text-2xl font-black font-mono tracking-wider text-slate-900 dark:text-white select-all">
                    {myReferralCode}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(myReferralCode);
                    setCopied(true);
                    toast.success(isRtl ? "تم نسخ كود الإحالة!" : "Code copié !");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                </button>
              </div>

              {/* Display invite link */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex-1 overflow-hidden">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    {isRtl ? "رابط الدعوة السريع" : "Lien de parrainage"}
                  </span>
                  <span className="text-[10px] font-medium font-mono text-slate-500 dark:text-slate-400 block truncate">
                    {typeof window !== "undefined" ? `${window.location.origin}/login?ref=${myReferralCode}` : ""}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const inviteUrl = `${window.location.origin}/login?ref=${myReferralCode}`;
                    navigator.clipboard.writeText(inviteUrl);
                    toast.success(isRtl ? "تم نسخ رابط الدعوة السريع!" : "Lien de parrainage copié !");
                  }}
                  className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isRtl ? "نسخ الرابط" : "Copier le Lien"}
                </button>
              </div>

              {/* Apply referral code from a friend */}
              {referredByCode ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    {isRtl ? `تم تطبيق كود إحالة الصديق بنجاح: ${referredByCode}` : `Code de parrainage appliqué : ${referredByCode}`}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleApplyReferral} className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 block">
                    {isRtl ? "هل لديك كود إحالة من صديق؟" : "Avez-vous un code de parrainage ?"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="REF-XXXX"
                      value={friendCode}
                      onChange={(e) => setFriendCode(e.target.value)}
                      className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold w-full uppercase outline-none focus:border-purple-500 text-slate-800 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={applying || !friendCode.trim()}
                      className="px-5 bg-slate-900 dark:bg-accent text-white font-bold text-xs rounded-xl shadow hover:bg-slate-850 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {applying ? <Loader2 size={16} className="animate-spin" /> : (isRtl ? "تطبيق الكود" : "Appliquer")}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <div className={`p-8 rounded-[3rem] border shadow-lg flex flex-col items-center text-center transition-all relative overflow-hidden ${tier.color}`}>
            <div className="absolute inset-0 bg-white/40 dark:bg-black/10 backdrop-blur-sm z-0"></div>
            <div className="relative z-10 w-full flex flex-col items-center">
              <tier.icon size={64} className="mb-4 drop-shadow-md" />
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">{isRtl ? "مستوى حسابك" : "Niveau de compte"}</h3>
              <p className="text-4xl font-black">{tier.name}</p>
              <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full mt-8 overflow-hidden">
                 <motion.div 
                   initial={{width: 0}} animate={{width: `${Math.min((totalSpent/50000)*100, 100)}%`}}
                   className="h-full bg-current opacity-60"
                   transition={{ duration: 1.5, ease: "easeOut" }}
                 />
              </div>
              <p className="text-xs mt-3 font-bold opacity-70">
                {tier.name === "Standard" && (isRtl ? "أنفق المزيد لتصبح VIP!" : "Achetez plus pour devenir VIP !")}
              </p>
            </div>
          </div>

          {isAdmin && (
            <Link href="/admin" className="block group">
              <div className="p-8 bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-[3rem] shadow-2xl flex flex-col items-center text-center group-hover:border-accent dark:group-hover:border-accent transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-accent"></div>
                <ShieldCheck size={48} className="text-accent mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-black text-xl text-white">{isRtl ? "لوحة التحكم" : "Console d'Admin"}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Accès Sécurisé</p>
              </div>
            </Link>
          )}

          <div className="premium-glass p-4 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-sm space-y-2">
             <Link href="/orders" className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors group">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><ShoppingBag size={20}/></div>
                   <span className="font-bold text-slate-700 dark:text-slate-200">{isRtl ? "تتبع طلباتي" : "Mes Commandes"}</span>
                </div>
                <ChevronRight size={18} className={`text-slate-400 ${isRtl ? 'rotate-180' : ''}`}/>
             </Link>

             <button 
                onClick={async () => { await signOut(auth); router.push("/"); }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl group-hover:scale-110 transition-transform"><LogOut size={20}/></div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{isRtl ? "تسجيل الخروج" : "Déconnexion"}</span>
                </div>
             </button>
             
             <button 
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-colors group border-t border-slate-100 dark:border-slate-800 mt-2 pt-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl group-hover:scale-110 transition-transform"><UserMinus size={20}/></div>
                  <span className="font-bold text-red-500">{isRtl ? "حذف الحساب نهائياً" : "Supprimer le compte"}</span>
                </div>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
