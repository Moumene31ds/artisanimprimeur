"use client";

import { useState, useEffect, useRef, KeyboardEvent, DragEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { useAppStore } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { 
  Sparkles, X, Send, MessageSquareCode, 
  Trash2, ArrowLeftRight, Truck, HelpCircle,
  Square, Copy, Check, RefreshCw, WifiOff, ArrowDown, Mic, MicOff,
  Volume2, ThumbsUp, ThumbsDown, Paperclip, UploadCloud, ExternalLink
} from "lucide-react";

const CHAT_STORAGE_KEY = "lartisan_chat_history";

export default function AntigravityChat() {
  const language = useAppStore((state) => state.language);
  const pathname = usePathname();
  const router = useRouter(); // <-- لإدارة التنقل
  const shouldReduceMotion = useReducedMotion();
  
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ file: File; preview: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false); // لحالة السحب والإفلات

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isRtl = language === "ar";

  const defaultWelcome: any = {
    id: "welcome",
    role: "assistant" as const,
    parts: [{
      type: "text" as const,
      text: isRtl 
        ? "مرحباً بك! أنا **L'Artisan AI**، مساعدك الذكي في مطبعة الحرفي. كيف يمكنني مساعدتك في تصميم وطباعة مشاريعك اليوم؟ 🎨✨" 
        : "Bonjour ! Je suis **L'Artisan AI**, votre assistant intelligent chez L'Artisan Imprimeur. Comment puis-je vous aider dans vos projets de conception et d'impression aujourd'hui ? 🎨✨"
    }],
    createdAt: new Date()
  };

  const getMessageTextContent = (msg: any): string => {
    if (!msg) return "";
    if (typeof msg.content === "string" && msg.content) return msg.content;
    if (!msg.parts || !Array.isArray(msg.parts)) return "";
    return msg.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("");
  };

  const { 
    messages, 
    status, 
    stop, 
    reload, 
    setMessages,
    append,
    error 
  } = useChat({
    api: "/api/chat",
    initialMessages: [defaultWelcome],
    onFinish: () => {
      scrollToBottom("smooth");
    }
  });

  const isLoading = status === "submitted" || status === "streaming";

  // إعدادات البداية وحفظ المحادثات
  useEffect(() => {
    setMounted(true);
    setIsOnline(typeof window !== "undefined" ? navigator.onLine : true);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.speechSynthesis?.cancel();
    };
  }, [setMessages]);

  useEffect(() => {
    if (mounted && messages.length > 1) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, mounted]);

  // --- جديد: مراقبة أدوات التوجيه (Navigation Tools) ---
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    
    // فحص ما إذا كان هناك استدعاء لأداة في الرسالة الأخيرة
    if (lastMessage.role === 'assistant' && lastMessage.toolInvocations) {
      lastMessage.toolInvocations.forEach((invocation: any) => {
        // التحقق من أن الأداة هي navigateToPage وأنها أكملت الرد (state: 'result')
        if (invocation.toolName === 'navigateToPage' && invocation.state === 'result') {
          const route = invocation.result.route;
          if (route && pathname !== route) {
             // الانتظار قليلاً لضمان قراءة المستخدم للرسالة ثم توجيهه
             setTimeout(() => {
                router.push(route);
                setIsOpen(false); // إغلاق الشات عند الانتقال (اختياري)
             }, 1500);
          }
        }
      });
    }
  }, [messages, router, pathname]);
  // -----------------------------------------------------

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom("auto");
      document.body.style.overflow = "hidden";
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  useEffect(() => {
    if (isLoading) {
      scrollToBottom("smooth");
    }
  }, [messages, isLoading]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [textInput]);

  // --- دوال السحب والإفلات ---
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processSelectedFile(file);
  };

  const processSelectedFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert(isRtl ? "يرجى اختيار ملف صورة فقط" : "Veuillez sélectionner uniquement une image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert(isRtl ? "حجم الصورة كبير جداً (الأقصى 4 ميغابايت)" : "L'image est trop volumineuse (max 4 Mo).");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedFile({ file, preview: previewUrl });
  };
  // -------------------------

  useEffect(() => {
    return () => {
      if (selectedFile) URL.revokeObjectURL(selectedFile.preview);
    };
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFile(e.target.files?.[0]);
  };

  const handleRemoveFile = () => {
    if (selectedFile) URL.revokeObjectURL(selectedFile.preview);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCustomSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!textInput.trim() && !selectedFile) || !isOnline || isLoading) return;

    const userMessage = textInput.trim();
    const fileToUpload = selectedFile;

    setTextInput("");
    handleRemoveFile();
    
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const contextPrefix = messages.length <= 1 ? `[Context: Page ${pathname}]. ` : "";

    try {
      if (fileToUpload) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Url = reader.result as string;
          await append({
            role: 'user',
            content: contextPrefix + (userMessage || (isRtl ? "صورة مرفقة" : "Image jointe")) + `\n![${fileToUpload.file.name}](${base64Url})`
          });
        };
        reader.readAsDataURL(fileToUpload.file);
      } else {
        await append({ role: 'user', content: contextPrefix + userMessage });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const toggleVoiceInput = () => {
    if (typeof window !== "undefined" && !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert(isRtl ? "المتصفح لا يدعم الإدخال الصوتي" : "Votre navigateur ne supporte pas la dictée vocale.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = isRtl ? "ar-DZ" : "fr-FR";
    recognition.interimResults = false;

    if (!isListening) {
      setIsListening(true);
      recognition.start();
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTextInput((prev) => (prev ? prev + " " + transcript : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  const speakMessage = (text: string, id: string) => {
    if (!window.speechSynthesis) return;

    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\[Context:.*?\]\.\s*/g, "").replace(/[*`_]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isRtl ? "ar-SA" : "fr-FR"; 
    
    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);
    
    setPlayingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleQuickPromptClick = async (promptText: string) => {
    if (!isOnline || isLoading) return;
    const contextPrefix = messages.length <= 1 ? `[Context: Page ${pathname}]. ` : "";
    await append({ role: 'user', content: contextPrefix + promptText });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  const handleClearChat = () => {
    if (window.confirm(isRtl ? "هل أنت متأكد من مسح المحادثة؟" : "Êtes-vous sûr de vouloir effacer la discussion ?")) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      setMessages([defaultWelcome]);
      setTextInput("");
      setFeedback({});
      if (isLoading) stop();
    }
  };

  const handleCopy = (text: string, id: string) => {
    const cleanText = text.replace(/\[Context:.*?\]\.\s*/g, "");
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedback(prev => ({ ...prev, [id]: prev[id] === type ? undefined : type } as any));
  };

  const cleanMessageContext = (text: string) => {
    return text.replace(/\[Context:.*?\]\.?\s*/g, "").trim();
  };

  // --- دالة تنسيق الرسائل ودعم الـ Tools UI ---
  const formatMessageContent = (message: any) => {
    const text = getMessageTextContent(message);
    const cleanText = cleanMessageContext(text);
    
    let contentElements = [];

    // عرض النص إذا وجد
    if (cleanText) {
      const textLines = cleanText.split('\n').map((line, i) => {
        const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const content = isListItem ? line.substring(line.indexOf(' ') + 1) : line;
        
        const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
        
        const formattedLine = parts.map((part, index) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index} className="font-extrabold text-indigo-600 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
          } else if (part.startsWith("*") && part.endsWith("*")) {
            return <em key={index} className="italic text-slate-600 dark:text-slate-400">{part.slice(1, -1)}</em>;
          } else if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={index} className="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded-md text-[11px] font-mono border border-slate-200 dark:border-slate-700">{part.slice(1, -1)}</code>;
          }
          return <span key={index}>{part}</span>;
        });

        if (isListItem) {
          return (
            <div key={`text-${i}`} className="flex gap-2 my-1 items-start">
              <span className="text-indigo-500 mt-1 shrink-0 text-lg leading-none">•</span>
              <span className="flex-1">{formattedLine}</span>
            </div>
          );
        }
        return <span key={`text-${i}`} className="block min-h-[1.2rem]">{formattedLine}</span>;
      });
      contentElements.push(<div key="main-text" className="whitespace-pre-wrap break-words">{textLines}</div>);
    } else if (message.role === 'user') {
      contentElements.push(<em key="context" className="text-slate-400 opacity-50">Context provided</em>);
    }

    // عرض التنبيهات المرئية للأدوات (Tools UI)
    if (message.toolInvocations) {
      message.toolInvocations.forEach((invocation: any, index: number) => {
        if (invocation.toolName === 'calculatePrice' && invocation.state === 'result') {
          contentElements.push(
            <div key={`tool-${index}`} className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">💰 {isRtl ? "تفاصيل التسعير:" : "Détails du prix:"}</span>
              <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                <li>{isRtl ? "المنتج:" : "Produit:"} {invocation.result.product}</li>
                <li>{isRtl ? "الكمية:" : "Quantité:"} {invocation.result.quantity}</li>
                <li className="font-bold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-200 dark:border-slate-700 mt-1">
                  {isRtl ? "السعر الإجمالي:" : "Prix total:"} {invocation.result.totalPriceDZD} DZD
                </li>
              </ul>
            </div>
          );
        } else if (invocation.toolName === 'navigateToPage') {
          // يمكن أن تكون الأداة في حالة 'call' (جاري العمل) أو 'result' (تم الانتهاء)
          const stateText = invocation.state === 'result' ? (isRtl ? "جاري التوجيه..." : "Redirection en cours...") : (isRtl ? "يتم التحضير للانتقال..." : "Préparation...");
          contentElements.push(
             <div key={`tool-${index}`} className="mt-2 flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold animate-pulse">
                <ExternalLink size={14} />
                <span>{stateText}</span>
             </div>
          );
        }
      });
    }

    return contentElements;
  };

  if (!mounted) return null;

  const animationProps = shouldReduceMotion ? {
    initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }
  } : {
    initial: { opacity: 0, y: "100%", scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: "100%", scale: 0.95 },
    transition: { type: "spring" as const, stiffness: 380, damping: 30 }
  };

  const quickPrompts = isRtl ? [
    { text: "السلة الخاصة بي", icon: <ArrowLeftRight size={13} />, prompt: "خذني إلى سلة المشتريات الخاصة بي." },
    { text: "الأسعار", icon: <HelpCircle size={13} />, prompt: "احسب لي سعر طباعة 100 كارت فيزيت بجودة premium." },
    { text: "تتبع التوصيل", icon: <Truck size={13} />, prompt: "هل تشحنون لـ 58 ولاية وكم يستغرق التوصيل لوهران؟" },
  ] : [
    { text: "Mon Panier", icon: <ArrowLeftRight size={13} />, prompt: "Amène-moi à mon panier." },
    { text: "Tarifs", icon: <HelpCircle size={13} />, prompt: "Calcule le prix pour 100 cartes de visite premium." },
    { text: "Livraison", icon: <Truck size={13} />, prompt: "Livrez-vous dans toutes les 58 wilayas d'Algérie ?" },
  ];

  return (
    <div className={`fixed bottom-24 md:bottom-8 font-sans ${isRtl ? 'right-4 md:right-6' : 'left-4 md:left-6'} ${isOpen ? 'z-[100000]' : 'z-[999]'}`} dir={isRtl ? "rtl" : "ltr"}>
      
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Chat"
        whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 dark:from-indigo-600 dark:to-indigo-800 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(79,70,229,0.3)] relative border border-white/20 cursor-pointer group transition-shadow"
      >
        {isOpen ? <X size={24} /> : <MessageSquareCode size={24} className={shouldReduceMotion ? "" : "group-hover:animate-pulse"} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...animationProps}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="fixed inset-0 md:absolute md:inset-auto md:bottom-18 md:left-0 w-full h-[100dvh] md:w-[420px] md:h-[650px] max-h-full md:max-h-[85vh] flex flex-col rounded-none md:rounded-[2rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border-0 md:border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950 md:bg-white/95 md:dark:bg-slate-950/95 backdrop-blur-3xl"
          >
            {/* واجهة السحب والإفلات */}
            <AnimatePresence>
              {isDragging && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[10000] bg-indigo-500/90 backdrop-blur-sm flex flex-col items-center justify-center text-white border-4 border-dashed border-white/50 m-4 rounded-[1.5rem]"
                >
                  <UploadCloud size={64} className="animate-bounce mb-4" />
                  <h3 className="text-xl font-bold">{isRtl ? "أفلت التصميم هنا" : "Déposez votre design ici"}</h3>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 p-4 pt-10 md:pt-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 animate-pulse mix-blend-overlay"></div>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    L'Artisan AI
                    <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${!isOnline ? 'bg-red-500 text-red-500' : isLoading ? 'bg-amber-500 text-amber-500 animate-pulse' : 'bg-emerald-500 text-emerald-500'}`} />
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">L'Artisan Imprimeur</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 1 && (
                  <button onClick={handleClearChat} className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer" title={isRtl ? "مسح المحادثة" : "Effacer"}>
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </div>

            {!isOnline && (
              <div className="bg-red-500 text-white text-[11px] font-bold py-1.5 px-4 flex items-center justify-center gap-2 animate-fade-in shadow-inner">
                <WifiOff size={14} />
                <span>{isRtl ? "لا يوجد اتصال بالإنترنت حالياً" : "Aucune connexion Internet"}</span>
              </div>
            )}
            
            {error && (
               <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs p-2 text-center border-b border-red-100 dark:border-red-800">
                 {isRtl ? "حدث خطأ في الاتصال، يرجى المحاولة لاحقاً." : "Erreur de connexion, veuillez réessayer."}
               </div>
            )}

            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 scrollbar-none bg-slate-50/50 dark:bg-slate-950/50 relative">
              {messages.map((message, index) => {
                const isAssistant = message.role === "assistant";
                const isLast = index === messages.length - 1;
                const messageText = getMessageTextContent(message);
                
                if (message.role === "user" && cleanMessageContext(messageText) === "" && !message.parts?.some((p:any) => p.type === 'file')) return null;

                return (
                  <motion.div 
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    key={message.id || index} 
                    className={`flex flex-col ${isAssistant ? "items-start" : "items-end"} group`}
                  >
                    <div className={`max-w-[88%] p-3.5 text-[13px] leading-relaxed relative ${
                      isAssistant 
                        ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl rounded-tl-sm shadow-sm" 
                        : "bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md rounded-2xl rounded-tr-sm"
                    }`}>
                      {formatMessageContent(message)}

                      {message.parts && Array.isArray(message.parts) && (
                        <div className="flex flex-col gap-2 mt-2">
                          {message.parts.map((part: any, partIdx: number) => {
                            if (part.type === 'file' && part.mediaType?.startsWith('image/')) {
                              return (
                                <div key={partIdx} className="rounded-lg overflow-hidden border border-white/10 max-w-full">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={part.url} alt={part.filename || "Uploaded Image"} className="max-h-60 object-contain w-full rounded-lg" />
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}

                      {isAssistant && messageText && (
                        <div className={`absolute ${isRtl ? '-left-12' : '-right-12'} top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <button onClick={() => handleCopy(messageText, message.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200" title="نسخ">
                            {copiedId === message.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                          <button onClick={() => speakMessage(messageText, message.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200" title="استماع">
                            <Volume2 size={14} className={playingId === message.id ? "text-indigo-500 animate-pulse" : ""} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={`flex items-center gap-3 mt-1.5 px-1 ${isAssistant ? "justify-start" : "justify-end"}`}>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {(message as any).createdAt ? new Date((message as any).createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "الآن"}
                      </span>
                      
                      {isAssistant && message.id !== 'welcome' && (
                        <div className="flex items-center gap-1">
                           <button onClick={() => handleFeedback(message.id, 'up')} className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${feedback[message.id] === 'up' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'}`}>
                             <ThumbsUp size={10} />
                           </button>
                           <button onClick={() => handleFeedback(message.id, 'down')} className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${feedback[message.id] === 'down' ? 'text-red-500' : 'text-slate-300 dark:text-slate-600 hover:text-red-500'}`}>
                             <ThumbsDown size={10} />
                           </button>
                        </div>
                      )}

                      {isAssistant && isLast && !isLoading && isOnline && (
                        <button onClick={() => reload()} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer ml-2">
                          <RefreshCw size={10} />
                          {isRtl ? "إعادة توليد" : "Regénérer"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start items-center gap-2 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 w-fit rounded-2xl rounded-tl-sm shadow-sm">
                  <div className="flex gap-1.5 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />

              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 10 }}
                    onClick={() => scrollToBottom("smooth")}
                    className={`absolute bottom-4 ${isRtl ? 'left-4' : 'right-4'} z-50 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-900 backdrop-blur-md text-white shadow-lg transition-transform active:scale-95 cursor-pointer`}
                  >
                    <ArrowDown size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {messages.length === 1 && !isLoading && (
              <div className="px-4 py-3 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                  {isRtl ? "اقتراحات شائعة :" : "Suggestions communes :"}
                </p>
                <div className="flex flex-wrap gap-2 max-h-[110px] overflow-y-auto scrollbar-none pb-1">
                  {quickPrompts.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPromptClick(item.prompt)}
                      disabled={!isOnline}
                      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {item.icon}
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCustomSubmit} className="p-4 pb-safe md:pb-4 bg-white dark:bg-slate-950 relative z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] border-t border-slate-100 dark:border-slate-800">
              
              <AnimatePresence>
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="mb-3 flex items-center gap-3 p-2 rounded-xl bg-slate-50/85 dark:bg-slate-900/85 backdrop-blur-sm border border-slate-200 dark:border-slate-800 w-fit relative group shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedFile.preview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col pr-1 text-left ltr:pr-0 rtl:pl-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{selectedFile.file.name}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{(selectedFile.file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md hover:scale-105 transition-all cursor-pointer"
                      title={isRtl ? "إزالة" : "Supprimer"}
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-1.5 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
                
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl mb-1 shrink-0 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all" 
                  title={isRtl ? "إرفاق ملف" : "Joindre un fichier"}
                >
                  <Paperclip size={16} />
                </button>

                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={isLoading || !isOnline}
                  className={`p-2 rounded-xl mb-1 transition-all shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'} cursor-pointer`}
                  title={isRtl ? "تحدث الآن" : "Dictée vocale"}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <textarea 
                  ref={textareaRef}
                  value={textInput} 
                  onChange={(e) => setTextInput(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={!isOnline ? (isRtl ? "أنت غير متصل..." : "Hors ligne...") : isLoading ? (isRtl ? "جاري التفكير..." : "Veuillez patienter...") : (isRtl ? "اسأل عن الأسعار، أو قل 'خذني إلى السلة'..." : "Demandez un prix, ou dites 'Aller au panier'...")} 
                  className="flex-1 bg-transparent px-2 py-3 text-[13px] font-medium outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50 resize-none max-h-32 min-h-[44px] scrollbar-none" 
                  disabled={isLoading || !isOnline} 
                />
                
                {isLoading ? (
                   <button type="button" onClick={() => stop()} title={isRtl ? "إيقاف التوليد" : "Arrêter"} className="w-10 h-10 mb-0.5 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all hover:bg-red-100 hover:text-red-600 cursor-pointer">
                     <Square size={14} fill="currentColor" />
                   </button>
                ) : (
                  <button type="submit" disabled={(!textInput.trim() && !selectedFile) || !isOnline} className="w-10 h-10 mb-0.5 shrink-0 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 dark:from-indigo-600 dark:to-indigo-500 text-white flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:from-slate-400 disabled:to-slate-400 cursor-pointer">
                    <Send size={16} className={isRtl ? "rotate-180" : ""} />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
