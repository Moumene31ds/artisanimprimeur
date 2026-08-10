"use client";

import { useState, useEffect, useRef, useMemo, KeyboardEvent, DragEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAppStore } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles, X, Send, MessageSquareCode,
  Trash2, ArrowLeftRight, Truck, HelpCircle,
  Square, Copy, Check, RefreshCw, WifiOff, ArrowDown, Mic, MicOff,
  Volume2, ThumbsUp, ThumbsDown, Paperclip, UploadCloud, ExternalLink,
  ShoppingCart, Cpu, BadgePercent, Settings2, Search, Download, HardDrive
} from "lucide-react";
import { nativeHaptic, nativeHapticSuccess, nativeSpeechRecognize, isNative } from "@/lib/native";
import { CHAT_STORAGE_KEY, OPEN_CHAT_EVENT, CHAT_CLEARED_EVENT, buildChatExportText } from "@/lib/chat-storage";

interface ProductResult {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

interface MetaInfo {
  available: boolean;
  provider?: string;
  model?: string;
  label?: { fr: string; ar: string };
  message?: string;
}

function MiniToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-300 shrink-0 ${
        checked
          ? "bg-gradient-to-r from-indigo-500 to-blue-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
          : "bg-slate-200 dark:bg-slate-700"
      } disabled:opacity-50`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md ${
          checked ? "right-1" : "left-1"
        }`}
      />
    </button>
  );
}

export default function AntigravityChat() {
  const language = useAppStore((state) => state.language);
  const addToCart = useAppStore((state) => state.addToCart);
  const chatAutoRead = useAppStore((state) => state.chatAutoRead);
  const setChatAutoRead = useAppStore((state) => state.setChatAutoRead);
  const chatSoundOnMessage = useAppStore((state) => state.chatSoundOnMessage);
  const setChatSoundOnMessage = useAppStore((state) => state.setChatSoundOnMessage);
  const chatAutoScroll = useAppStore((state) => state.chatAutoScroll);
  const setChatAutoScroll = useAppStore((state) => state.setChatAutoScroll);
  const chatPersistHistory = useAppStore((state) => state.chatPersistHistory);
  const setChatPersistHistory = useAppStore((state) => state.setChatPersistHistory);
  const chatShowSuggestions = useAppStore((state) => state.chatShowSuggestions);
  const setChatShowSuggestions = useAppStore((state) => state.setChatShowSuggestions);
  const pathname = usePathname();
  const router = useRouter();
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
  const [isDragging, setIsDragging] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOpenRef = useRef(isOpen);

  const isRtl = language === "ar";

  const welcomeText = isRtl
    ? "مرحباً بك! أنا **L'Artisan AI**، مساعدك الذكي في مطبعة الحرفي. أعرف كل شيء عن أسعارنا وخدماتنا 🖨️، مثل **100 بطاقة زيارة = 2500 دج**. اسألني عن أي شيء! 🎨✨"
    : "Bonjour ! Je suis **L'Artisan AI**, votre assistant intelligent chez L'Artisan Imprimeur. Je connais nos prix et services 🖨️, par exemple **100 cartes de visite = 2500 DA**. Demandez-moi n'importe quoi ! 🎨✨";

  const defaultWelcome = useMemo<any>(() => ({
    id: "welcome",
    role: "assistant" as const,
    content: welcomeText,
    createdAt: new Date()
  }), [welcomeText]);

  const getMessageTextContent = (msg: any): string => {
    if (!msg) return "";
    if (typeof msg.content === "string" && msg.content) return msg.content;
    if (msg.parts && Array.isArray(msg.parts)) {
      const text = msg.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
      if (text) return text;
    }
    return "";
  };

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  };

  const { messages, status, stop, setMessages, sendMessage, error, regenerate, clearError } =
    useChat({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
      messages: [defaultWelcome],
      onFinish: () => {
        if (chatAutoScroll) scrollToBottom("smooth");
        if (chatSoundOnMessage) playMessageSound();
        if (chatAutoRead) {
          const last = messages[messages.length - 1];
          if (last && last.role === "assistant" && last.id !== "welcome") {
            const text = getMessageTextContent(last);
            if (text) {
              setTimeout(() => speakMessage(text, last.id), 350);
            }
          }
        }
        if (!isOpenRef.current) setUnreadCount((c) => c + 1);
      }
    });

  const isLoading = status === "submitted" || status === "streaming";
  const hasError = status === "error" || !!error;

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Fetch provider/model meta when the panel opens.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch("/api/chat/meta")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setMeta(d); })
      .catch(() => { if (!cancelled) setMeta(null); });
    return () => { cancelled = true; };
  }, [isOpen]);

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
          const normalized = parsed.map((m: any) => {
            if (!m.content && m.parts?.length > 0) {
              const text = m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
              return { ...m, content: text };
            }
            return m;
          });
          setMessages(normalized);
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
    if (mounted && messages.length > 1 && chatPersistHistory) {
      const clean = messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: getMessageTextContent(m),
        createdAt: m.createdAt,
      }));
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(clean));
    }
  }, [messages, mounted, chatPersistHistory]);

  // فتح الشات أو مسحه من خارج المكوّن (صفحة الإعدادات...)
  useEffect(() => {
    const openChat = () => {
      setIsOpen(true);
      setShowSettings(false);
      setShowSearch(false);
      setShowExport(false);
    };
    const onCleared = () => {
      setMessages([defaultWelcome]);
      setFeedback({});
      setTextInput("");
      setSearchQuery("");
      setUnreadCount(0);
      if (isLoading) stop();
    };
    window.addEventListener(OPEN_CHAT_EVENT, openChat);
    window.addEventListener(CHAT_CLEARED_EVENT, onCleared);
    return () => {
      window.removeEventListener(OPEN_CHAT_EVENT, openChat);
      window.removeEventListener(CHAT_CLEARED_EVENT, onCleared);
    };
  }, [setMessages, defaultWelcome, isLoading, stop]);

  // مراقبة أدوات التوجيه (Navigation Tools)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant' && Array.isArray(lastMessage.parts)) {
      const navigations = lastMessage.parts.filter(
        (part: any) => part.toolName === 'navigateToPage' && part.state === 'output-available'
      ) as any[];
      const route = navigations[navigations.length - 1]?.output?.route;
      if (route && pathname !== route) {
        setTimeout(() => {
          router.push(route);
          setIsOpen(false);
        }, 1500);
      }
    }
  }, [messages, router, pathname]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom("auto");
      document.body.style.overflow = "hidden";
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  useEffect(() => {
    if (isLoading && chatAutoScroll) {
      scrollToBottom("smooth");
    }
  }, [messages, isLoading, chatAutoScroll]);

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

  // دوال السحب والإفلات
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
    if (typeof sendMessage !== 'function') {
      console.error("Chat API not ready yet");
      return;
    }

    if (hasError) clearError?.();

    const userMessage = textInput.trim();
    const fileToUpload = selectedFile;

    setTextInput("");
    handleRemoveFile();

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const contextPrefix = messages.length <= 1 ? `[Context: Page ${pathname}, Lang ${language}]. ` : "";

    try {
      if (fileToUpload) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Url = reader.result as string;
          await sendMessage({
            text: contextPrefix + (userMessage || (isRtl ? "صورة مرفقة" : "Image jointe")) + `\n![${fileToUpload.file.name}](${base64Url})`
          });
        };
        reader.readAsDataURL(fileToUpload.file);
      } else {
        await sendMessage({ text: contextPrefix + userMessage });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const recognitionRef = useRef<any>(null);

  const toggleVoiceInput = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    // داخل التطبيق الأصلي: الإملاء عبر التعرف الأصلي للكلام (Web Speech غير متوفر في WebView)
    if (isNative()) {
      setIsListening(true);
      nativeHaptic("medium");
      const res = await nativeSpeechRecognize(isRtl ? "ar" : "fr-FR");
      setIsListening(false);
      if (res.supported && res.transcript) {
        nativeHapticSuccess();
        const transcript = res.transcript;
        setTextInput((prev) => (prev ? prev + " " + transcript : transcript));
      } else if (res.supported) {
        toast.error(isRtl ? "لم يُلتقط أي صوت، حاول مجدداً" : "Aucune voix captée, réessayez");
      } else {
        toast.error(
          isRtl
            ? "الإدخال الصوتي غير متوفر على هذا الجهاز"
            : "La dictée vocale est indisponible sur cet appareil"
        );
      }
      return;
    }

    if (typeof window !== "undefined" && !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error(isRtl ? "المتصفح لا يدعم الإدخال الصوتي" : "Votre navigateur ne supporte pas la dictée vocale.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = isRtl ? "ar-DZ" : "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const finish = (transcript?: string) => {
      if (transcript) {
        setTextInput((prev) => (prev ? prev + " " + transcript : transcript));
        nativeHapticSuccess();
      }
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      finish(event.results?.[0]?.[0]?.transcript ?? "");
    };
    recognition.onerror = (event: any) => {
      if (event?.error !== "aborted") {
        toast.error(isRtl ? "تعذّر التقاط الصوت، حاول مجدداً" : "Impossible de capturer votre voix, réessayez");
        nativeHaptic("heavy");
      }
      finish();
    };
    recognition.onend = () => finish();

    nativeHaptic("medium");
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }

    setTimeout(() => {
      if (recognitionRef.current === recognition) recognition.stop();
    }, 15000);
  };

  const speakMessage = (text: string, id: string) => {
    if (!window.speechSynthesis) return;

    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\[Context:.*?\]\.\s*/g, "").replace(/[*`_#]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isRtl ? "ar-SA" : "fr-FR";

    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    setPlayingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // نغمة خفيفة عند وصول رسالة جديدة (Web Audio).
  const playMessageSound = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => ctx.close();
    } catch { /* ignore */ }
  };

  const handleExportCopy = async () => {
    const text = buildChatExportText(messages as any, language);
    if (!text) {
      toast.error(isRtl ? "لا توجد رسائل لتصديرها" : "Aucun message à exporter");
      return;
    }
    await navigator.clipboard.writeText(text);
    setShowExport(false);
    toast.success(isRtl ? "تم نسخ المحادثة كاملة ✓" : "Discussion copiée intégralement ✓");
  };

  const handleExportDownload = () => {
    const text = buildChatExportText(messages as any, language);
    if (!text) {
      toast.error(isRtl ? "لا توجد رسائل لتصديرها" : "Aucun message à exporter");
      return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lartisan-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setShowExport(false);
    nativeHapticSuccess();
    toast.success(isRtl ? "تم تنزيل المحادثة ✓" : "Discussion téléchargée ✓");
  };

  // تسمية اليوم للفواصل الزمنية بين الرسائل.
  const formatDayLabel = (ts?: string | number | Date): string | null => {
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startToday - startDay) / 86400000);
    if (diffDays === 0) return isRtl ? "اليوم" : "Aujourd'hui";
    if (diffDays === 1) return isRtl ? "الأمس" : "Hier";
    return d.toLocaleDateString(isRtl ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short" });
  };

  const handleQuickPromptClick = async (promptText: string) => {
    if (!isOnline || isLoading) return;
    const contextPrefix = messages.length <= 1 ? `[Context: Page ${pathname}, Lang ${language}]. ` : "";
    await sendMessage({ text: contextPrefix + promptText });
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
      if (clearError) clearError();
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

  const addProductToCart = (p: ProductResult) => {
    try {
      addToCart({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, quantity: 1 });
      toast.success(isRtl ? `تمت إضافة ${p.name} إلى السلة` : `${p.name} ajouté au panier`);
    } catch {
      toast.error(isRtl ? "تعذر الإضافة إلى السلة" : "Impossible d'ajouter au panier");
    }
  };

  // ---------- Markdown inline renderer ----------
  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-extrabold text-indigo-600 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={index} className="italic text-slate-600 dark:text-slate-400">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index} className="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded-md text-[11px] font-mono border border-slate-200 dark:border-slate-700">{part.slice(1, -1)}</code>;
      }
      const urlMatch = part.match(/(https?:\/\/[^\s)\]]+)/);
      if (urlMatch && typeof urlMatch.index === "number") {
        const before = part.slice(0, urlMatch.index);
        const url = urlMatch[1];
        const after = part.slice(urlMatch.index + url.length);
        return (
          <span key={index}>
            {before}
            <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline break-all">{url}</a>
            {renderInline(after)}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // ---------- Markdown block renderer ----------
  const renderBlocks = (text: string): React.ReactNode => {
    const lines = text.split("\n");
    const blocks: React.ReactNode[] = [];
    lines.forEach((line, i) => {
      const trim = line.trim();
      if (!trim) return;
      if (/^#{1,3}\s/.test(trim)) {
        const isH1 = /^#\s/.test(trim);
        const content = trim.replace(/^#+\s*/, "");
        blocks.push(
          <p key={`b${i}`} className={`block font-extrabold mt-2 ${isH1 ? "text-base" : "text-sm"} text-slate-900 dark:text-white`}>
            {renderInline(content)}
          </p>
        );
      } else if (/^[-*]\s/.test(trim)) {
        blocks.push(
          <div key={`b${i}`} className="flex gap-2 my-1 items-start">
            <span className="text-indigo-500 mt-1 shrink-0 text-lg leading-none">•</span>
            <span className="flex-1">{renderInline(trim.slice(2))}</span>
          </div>
        );
      } else if (/^\d+[.)]\s/.test(trim)) {
        const num = trim.match(/^\d+/)?.[0] ?? "1";
        blocks.push(
          <div key={`b${i}`} className="flex gap-2 my-1 items-start">
            <span className="text-indigo-500 mt-0.5 shrink-0 font-bold text-sm min-w-[1.3rem] text-right">{num}.</span>
            <span className="flex-1">{renderInline(trim.replace(/^\d+[.)]\s*/, ""))}</span>
          </div>
        );
      } else {
        blocks.push(<p key={`b${i}`} className="block min-h-[1.2rem]">{renderInline(trim)}</p>);
      }
    });
    return blocks;
  };

  // ---------- Tool result cards ----------
  const renderToolPart = (part: any, index: number): React.ReactNode => {
    if (part.state !== "output-available") {
      if (part.toolName === 'navigateToPage') {
        return (
          <div key={`tool-${index}`} className="mt-2 flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold animate-pulse">
            <ExternalLink size={14} />
            <span>{isRtl ? "جاري التوجيه..." : "Redirection en cours..."}</span>
          </div>
        );
      }
      return null;
    }

    const out = part.output ?? {};

    if (part.toolName === 'calculatePrice') {
      const label = (fr: string, ar: string) => (isRtl ? ar : fr);
      return (
        <div key={`tool-${index}`} className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">💰 {label("Détails du prix :", "تفاصيل السعر :")}</span>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>{label("Quantité", "الكمية")} :</span>
            <span className="font-bold">{out.quantity}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>{label("Finition", "التشطيب")} :</span>
            <span className="font-bold capitalize">{out.finish}</span>
          </div>
          {out.discountPercent > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>{label("Remise", "الخصم")} ({out.discountPercent}%) :</span>
              <span className="font-bold">-{out.discountDZD} DZD</span>
            </div>
          )}
          <div className="flex justify-between font-black text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span>{label("TOTAL", "الإجمالي")} :</span>
            <span>{out.totalDZD} DZD</span>
          </div>
          {out.nextTier && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
              {label(
                `Astuce : ajoutez ${out.nextTier.neededQty} unités pour obtenir -${out.nextTier.discountPercent}% !`,
                `نصيحة : أضف ${out.nextTier.neededQty} وحدة لتحصل على خصم ${out.nextTier.discountPercent}%!`
              )}
            </p>
          )}
        </div>
      );
    }

    if (part.toolName === 'deliveryStatus') {
      return (
        <div key={`tool-${index}`} className="mt-2 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
          📦 {isRtl ? "التوصيل إلى المنزل قريباً جداً! حالياً تُستلم الطلبات من مقر المطبعة (حيّ العقيد لطفي، وهران)." : "La livraison à domicile arrive très bientôt ! Pour l'instant, les commandes se retirent à l'atelier (Cité Akid Lotfi, Oran)."}
        </div>
      );
    }

    if (part.toolName === 'searchProducts') {
      const results: ProductResult[] = Array.isArray(out.results) ? out.results : [];
      if (!out.success || results.length === 0) {
        return (
          <div key={`tool-${index}`} className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            {isRtl ? "لم يتم العثور على منتجات مطابقة" : "Aucun produit trouvé"}
          </div>
        );
      }
      return (
        <div key={`tool-${index}`} className="mt-2">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            {isRtl ? "🛍️ منتجات من كتالوجنا:" : "🛍️ Produits du catalogue :"}
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
            {results.map((p) => (
              <div key={p.id} className="shrink-0 w-[132px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="h-20 w-full bg-slate-100 dark:bg-slate-800 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-black text-slate-800 dark:text-white leading-tight line-clamp-2 h-7">{p.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{p.category}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">{p.price} DZD</span>
                    <button
                      onClick={() => addProductToCart(p)}
                      className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
                      title={isRtl ? "أضف للسلة" : "Ajouter au panier"}
                    >
                      <ShoppingCart size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (part.toolName === 'checkPromoCode') {
      if (!out.success) {
        return (
          <div key={`tool-${index}`} className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            🎟️ {out.message}
          </div>
        );
      }
      return (
        <div key={`tool-${index}`} className="mt-2 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-3">
          <BadgePercent size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="font-black text-emerald-700 dark:text-emerald-400">{out.code}</p>
            <p className="text-emerald-600/80 dark:text-emerald-500/80 font-semibold">
              {isRtl ? out.descriptionAr : out.descriptionFr}
            </p>
          </div>
        </div>
      );
    }

    if (part.toolName === 'createOrder') {
      return (
        <div key={`tool-${index}`} className={`mt-2 p-2.5 rounded-xl border text-xs font-semibold ${out.success ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"}`}>
          {out.success
            ? (isRtl ? `✅ تم تسجيل طلبك (${out.orderId || ""})` : `✅ Commande enregistrée (${out.orderId || ""})`)
            : `❌ ${out.message}`}
        </div>
      );
    }

    return null;
  };

  const formatMessageContent = (message: any) => {
    const text = getMessageTextContent(message);
    const cleanText = cleanMessageContext(text);

    const contentElements: React.ReactNode[] = [];

    if (cleanText) {
      contentElements.push(
        <div key="main-text" className="whitespace-pre-wrap break-words">{renderBlocks(cleanText)}</div>
      );
    } else if (message.role === 'user') {
      contentElements.push(<em key="context" className="text-slate-400 opacity-50">Context provided</em>);
    }

    if (Array.isArray(message.parts)) {
      message.parts.forEach((part: any, index: number) => {
        if (part.type === 'tool' || part.toolName) {
          const node = renderToolPart(part, index);
          if (node) contentElements.push(node);
        }
      });
    }

    return contentElements;
  };

  // ---------- Contextual quick replies ----------
  const getContextualPrompts = (): Array<{ text: string; icon: React.ReactNode; prompt: string }> => {
    const last = messages[messages.length - 1];
    const t = (getMessageTextContent(last) || "").toLowerCase();
    const out: Array<{ text: string; icon: React.ReactNode; prompt: string }> = [];
    if (!t) return out;

    if (/carte|بطاق|cart|visite/.test(t)) {
      out.push({ text: isRtl ? "أسعار البطاقات" : "Prix cartes", icon: <HelpCircle size={13} />, prompt: isRtl ? "كم سعر 100 بطاقة زيارة ؟" : "Combien coûtent 100 cartes de visite ?" });
    }
    if (/flyer|منشور|affiche|أفيس/.test(t)) {
      out.push({ text: isRtl ? "سعر 500 منشور" : "Prix 500 flyers", icon: <HelpCircle size={13} />, prompt: isRtl ? "احسب سعر 500 فلاير A5" : "Calcule le prix de 500 flyers A5" });
    }
    if (/livr|شحن|توصيل|wilaya|ولاية|colis|استلام/.test(t)) {
      out.push({ text: isRtl ? "الاستلام من المطبعة" : "Retrait atelier", icon: <Truck size={13} />, prompt: isRtl ? "أين أستلم طلبي وهل يوجد توصيل ؟" : "Où retirer ma commande et y a-t-il une livraison ?" });
    }
    if (/pay|دفع|baridi|بريدي|paiement/.test(t)) {
      out.push({ text: isRtl ? "طرق الدفع" : "Moyens de paiement", icon: <HelpCircle size={13} />, prompt: isRtl ? "ما هي طرق الدفع المتاحة ؟" : "Quels sont les moyens de paiement disponibles ?" });
    }
    if (/promo|خصم|code|كود/.test(t)) {
      out.push({ text: isRtl ? "تفعيل كود" : "Vérifier un code", icon: <BadgePercent size={13} />, prompt: isRtl ? "تحقق من كود خصم PROMO10" : "Vérifie le code promo PROMO10" });
    }
    if (/order|طلب|commande|شراء/.test(t)) {
      out.push({ text: isRtl ? "أريد طلباً" : "Commander", icon: <ShoppingCart size={13} />, prompt: isRtl ? "أريد طلب 200 بطاقة زيارة" : "Je veux commander 200 cartes de visite" });
    }
    return out.slice(0, 3);
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
    { text: "السلة", icon: <ArrowLeftRight size={13} />, prompt: "خذني إلى سلة المشتريات الخاصة بي." },
    { text: "سعر البطاقات", icon: <HelpCircle size={13} />, prompt: "كم سعر 100 بطاقة زيارة ؟" },
    { text: "الاستلام", icon: <Truck size={13} />, prompt: "كيف أستلم طلبي وهل التوصيل متاح ؟" },
    { text: "طرق الدفع", icon: <BadgePercent size={13} />, prompt: "ما هي طرق الدفع المتاحة ؟" },
  ] : [
    { text: "Mon Panier", icon: <ArrowLeftRight size={13} />, prompt: "Amène-moi à mon panier." },
    { text: "Prix cartes", icon: <HelpCircle size={13} />, prompt: "Combien coûtent 100 cartes de visite ?" },
    { text: "Retrait", icon: <Truck size={13} />, prompt: "Où retirer ma commande ? La livraison est-elle disponible ?" },
    { text: "Paiement", icon: <BadgePercent size={13} />, prompt: "Quels sont les moyens de paiement disponibles ?" },
  ];

  const contextualPrompts = getContextualPrompts();
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.id !== "welcome");
  const showContextual = !!lastAssistant && contextualPrompts.length > 0 && !isLoading && chatShowSuggestions;

  // رسائل العرض: مع بحث، نعرض فقط المطابقات.
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const displayMessages = trimmedQuery
    ? messages.filter((m) => {
        const text = getMessageTextContent(m).toLowerCase();
        if (text.includes(trimmedQuery)) return true;
        return m.parts?.some((p: any) => p.type === 'file' && (p.filename || '').toLowerCase().includes(trimmedQuery));
      })
    : messages;
  const searchMatchCount = displayMessages.length;

  return (
    <div className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-8 font-sans ${isRtl ? 'right-4 md:right-6' : 'left-4 md:left-6'} ${isOpen ? 'z-[100000]' : 'z-[999]'}`} dir={isRtl ? "rtl" : "ltr"}>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Chat"
        whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 dark:from-indigo-600 dark:to-indigo-800 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(79,70,229,0.3)] relative border border-white/20 cursor-pointer group transition-shadow"
      >
        {isOpen ? <X size={24} /> : <MessageSquareCode size={24} className={shouldReduceMotion ? "" : "group-hover:animate-pulse"} />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
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
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    L'Artisan Imprimeur
                    {meta?.available && (
                      <span
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 normal-case tracking-normal"
                        title={isRtl ? "المزود الحالي" : "Fournisseur actuel"}
                      >
                        <Cpu size={9} />
                        <span className="truncate max-w-[110px]">{meta.provider === 'ollama' ? 'Ollama' : 'OpenRouter'}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${showSettings ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  title={isRtl ? "إعدادات الشات" : "Paramètres du chat"}
                >
                  <Settings2 size={16} />
                </button>
                <button
                  onClick={() => { setShowSearch(!showSearch); setShowExport(false); setShowSettings(false); }}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${showSearch ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  title={isRtl ? "بحث في المحادثة" : "Rechercher dans la discussion"}
                >
                  <Search size={16} />
                </button>
                <button
                  onClick={() => { setShowExport(!showExport); setShowSearch(false); setShowSettings(false); }}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${showExport ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  title={isRtl ? "تصدير المحادثة" : "Exporter la discussion"}
                >
                  <Download size={16} />
                </button>
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

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden border-b border-slate-100 dark:border-slate-800/60 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md"
                >
                  <div className="px-4 py-3 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                      <Settings2 size={11} />
                      {isRtl ? "إعدادات الشات" : "Paramètres du chat"}
                    </p>
                    {[
                      { icon: <Volume2 size={15} />, label: isRtl ? "قراءة الردود تلقائياً" : "Lire les réponses à voix haute", desc: isRtl ? "تشغيل النطق بعد كل رد" : "Lecture vocale après chaque réponse", checked: chatAutoRead, onChange: setChatAutoRead },
                      { icon: <BadgePercent size={15} />, label: isRtl ? "صوت عند وصول الرد" : "Son à la réception", desc: isRtl ? "نغمة خفيفة لكل رسالة جديدة" : "Un son léger pour chaque nouveau message", checked: chatSoundOnMessage, onChange: setChatSoundOnMessage },
                      { icon: <ArrowDown size={15} />, label: isRtl ? "التمرير التلقائي" : "Défilement automatique", desc: isRtl ? "النزول تلقائياً لأحدث رسالة" : "Descendre vers les nouveaux messages", checked: chatAutoScroll, onChange: setChatAutoScroll },
                      { icon: <HardDrive size={15} />, label: isRtl ? "حفظ المحادثة" : "Enregistrer la discussion", desc: isRtl ? "استرجاع الرسائل عند إعادة الفتح" : "Retrouver vos messages à la réouverture", checked: chatPersistHistory, onChange: setChatPersistHistory },
                      { icon: <Sparkles size={15} />, label: isRtl ? "اقتراحات سريعة" : "Suggestions rapides", desc: isRtl ? "أزرار اقتراحات تحت الرسائل" : "Boutons de suggestions sous les messages", checked: chatShowSuggestions, onChange: setChatShowSuggestions },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-indigo-500 dark:text-indigo-400 shrink-0">{item.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-slate-700 dark:text-slate-200 truncate">{item.label}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate">{item.desc}</p>
                          </div>
                        </div>
                        <MiniToggle checked={item.checked} onChange={item.onChange} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden border-b border-slate-100 dark:border-slate-800/60 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md"
                >
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                      <Search size={14} className="text-slate-400 shrink-0" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isRtl ? "ابحث في الرسائل..." : "Rechercher dans les messages..."}
                        className="flex-1 bg-transparent text-[12px] font-medium outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-red-500 cursor-pointer">
                          <X size={13} />
                        </button>
                      )}
                      {searchQuery.trim() && (
                        <span className="shrink-0 text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md">
                          {searchMatchCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showExport && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-[76px] right-4 z-[1001] w-[210px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.3)] p-1.5"
                >
                  <button
                    onClick={handleExportCopy}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-black text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <Copy size={14} />
                    {isRtl ? "نسخ المحادثة كاملة" : "Copier la discussion"}
                  </button>
                  <button
                    onClick={handleExportDownload}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-black text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    {isRtl ? "تنزيل كملف نصي" : "Télécharger (.txt)"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {!isOnline && (
              <div className="bg-red-500 text-white text-[11px] font-bold py-1.5 px-4 flex items-center justify-center gap-2 animate-fade-in shadow-inner">
                <WifiOff size={14} />
                <span>{isRtl ? "لا يوجد اتصال بالإنترنت حالياً" : "Aucune connexion Internet"}</span>
              </div>
            )}

            {hasError && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs p-2 px-4 border-b border-red-100 dark:border-red-800 flex items-center justify-between gap-2 flex-wrap">
                <span className="flex-1 min-w-0">
                  {error?.message || (isRtl ? "حدث خطأ في الاتصال، يرجى المحاولة لاحقاً." : "Erreur de connexion, veuillez réessayer.")}
                </span>
                <button onClick={() => { clearError?.(); regenerate(); }} className="shrink-0 px-3 py-1 bg-red-200 dark:bg-red-800/50 hover:bg-red-300 dark:hover:bg-red-700/50 rounded-lg font-bold transition-colors cursor-pointer">
                  {isRtl ? "إعادة المحاولة" : "Réessayer"}
                </button>
              </div>
            )}

            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 scrollbar-none bg-slate-50/50 dark:bg-slate-950/50 relative">
              {trimmedQuery && displayMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-10 text-slate-400">
                  <Search size={28} className="mb-2 opacity-60" />
                  <p className="text-xs font-bold">{isRtl ? "لا توجد رسائل مطابقة" : "Aucun message correspondant"}</p>
                </div>
              )}

              {displayMessages.map((message, index) => {
                const isAssistant = message.role === "assistant";
                const isLast = index === displayMessages.length - 1;
                const messageText = getMessageTextContent(message);
                const prev = index > 0 ? displayMessages[index - 1] : null;
                const dayLabel = formatDayLabel((message as any).createdAt);
                const prevDayLabel = prev ? formatDayLabel((prev as any).createdAt) : null;
                const showDaySeparator = dayLabel !== null && dayLabel !== prevDayLabel;

                if (message.role === "user" && cleanMessageContext(messageText) === "" && !message.parts?.some((p: any) => p.type === 'file')) return null;

                return (
                  <div key={message.id || index} className="flex flex-col">
                    {showDaySeparator && (
                      <div className="flex items-center justify-center mb-5 -mt-1">
                        <span className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800/70 text-[10px] font-black text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                          {dayLabel}
                        </span>
                      </div>
                    )}
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
                                  <img src={part.url} alt={part.filename || "Uploaded Image"} loading="lazy" decoding="async" className="max-h-60 object-contain w-full rounded-lg" />
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
                        {(message as any).createdAt ? new Date((message as any).createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "الآن"}
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
                        <button onClick={() => { clearError?.(); regenerate(); }} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer ml-2">
                          <RefreshCw size={10} />
                          {isRtl ? "إعادة توليد" : "Regénérer"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                  </div>
                );
              })}

              {showContextual && (
                <div className="flex flex-wrap gap-2 pl-1">
                  {contextualPrompts.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPromptClick(item.prompt)}
                      disabled={!isOnline || isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {item.icon}
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-2 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 w-fit rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "L'Artisan AI يفكر..." : "L'Artisan AI réfléchit..."}</span>
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

            {messages.length === 1 && !isLoading && chatShowSuggestions && !trimmedQuery && (
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
                      <img src={selectedFile.preview} alt="Preview" loading="lazy" className="w-full h-full object-cover" />
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
