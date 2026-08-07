// src/lib/native.ts
// ---------------------------------------------------------------------------
// الجسر الأصلي (Native Bridge) — يربط تطبيق الويب بإمكانيات أندرويد وiOS عبر
// كاباسيتور. كل الدوال آمنة على الويب: تتحقق أولاً من بيئة كاباسيتور الأصلية
// وتستعمل استيرادات ديناميكية حتى لا تُحمَّل عند التصيير على الخادم، وتتراجع
// (fallback) تلقائياً إلى واجهات الويب عند عدم توفر التطبيق الأصلي.
// ---------------------------------------------------------------------------

export interface NativeSharePayload {
  title?: string;
  text?: string;
  url?: string;
}

/** هل نعمل داخل التطبيق الأصلي (كاباسيتور)؟ */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
}

/** معلومات إصدار التطبيق الأصلي (من ستور/مُوقَّع). */
export async function getNativeAppInfo(): Promise<{ version: string | null; build: string | null } | null> {
  if (!isNative()) return null;
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    return { version: info.version ?? null, build: info.build ?? null };
  } catch {
    return null;
  }
}

/**
 * مشاركة أصلية (ورقة المشاركة في أندرويد/iOS)، مع التراجع إلى Web Share API.
 * تعيد true إذا نجحت المشاركة (أو عُرضت ولو قُوبلت بالإلغاء).
 */
export async function nativeShare(payload: NativeSharePayload): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.title,
      });
      return true;
    } catch {
      // المستخدم ألغى المشاركة أو حدث خطأ — لا نعتبرها نجاحاً.
      return false;
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** مشاركة رابط التطبيق من الإعدادات. */
export async function shareApp(): Promise<boolean> {
  return nativeShare({
    title: "L'Artisan Imprimeur | الحرفي للطباعة",
    text: "الطباعة الاحترافية في الجزائر — Impressions pro en Algérie",
    url: "https://artisanimprimeur.vercel.app",
  });
}

/**
 * فتح الكاميرا الأصلية ومسح رمز QR ثم فك تشفيره.
 * تعيد النص الممسوح أو null عند الإلغاء/الفشل.
 * على الويب تعيد null (تُستعمل كاميرا html5-qrcode المعتادة).
 */
export async function scanQrWithNativeCamera(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { Camera, CameraSource, CameraResultType } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.DataUrl,
      promptLabelHeader: "Scan QR",
      promptLabelCancel: "Annuler",
    });
    if (!photo?.dataUrl) return null;

    const blob = await (await fetch(photo.dataUrl)).blob();
    const file = new File([blob], "qr-scan.png", { type: blob.type || "image/png" });

    const { Html5Qrcode } = await import("html5-qrcode");
    const id = "native-qr-decode-container";
    let el = document.getElementById(id) as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style.display = "none";
      document.body.appendChild(el);
    }
    const decoder = new Html5Qrcode(id);
    try {
      const result = await decoder.scanFileV2(file, false);
      return result.decodedText ?? null;
    } finally {
      try {
        await decoder.clear();
      } catch {
        /* ignore */
      }
    }
  } catch {
    return null;
  }
}

/** اهتزاز أصلي (Haptic) بحسب الشدة، على الويب يعود false ويُترك للـ fallback. */
export async function nativeHaptic(type: "light" | "medium" | "heavy"): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (type === "light") {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (type === "medium") {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
    return true;
  } catch {
    return false;
  }
}

/** رد اهتزاز ناجح (مثل إكمال طلب). */
export async function nativeHapticSuccess(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
    return true;
  } catch {
    return false;
  }
}

/** هل البصمة/وجه متاحان على الجهاز؟ */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const result: any = await BiometricAuth.checkBiometry();
    return !!(result && result.isAvailable && result.biometryType !== undefined && result.biometryType !== 0);
  } catch {
    return false;
  }
}

/** نوع البيومترية المتوفرة على الجهاز. */
export type BiometryKind = "fingerprint" | "face" | "iris" | "none" | "unknown";

/**
 * يحدد نوع البيومترية (بصمة / وجه / عين / بلا).
 * الأجهزة تُرجع أرقاماً مطابقة لـ BiometryType:
 *  0=none, 1=touchId, 2=faceId, 3=fingerprint, 4=faceAuth, 5=iris
 */
export async function getBiometryKind(): Promise<BiometryKind> {
  if (!isNative()) return "unknown";
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const result: any = await BiometricAuth.checkBiometry();
    if (!result || !result.isAvailable) return "none";
    const t = result.biometryType;
    const num = typeof t === "number" ? t : Number(t);
    const name = typeof t === "string" ? t.toLowerCase() : "";
    if (num === 1 || num === 3 || name.includes("finger") || name.includes("touch")) return "fingerprint";
    if (num === 2 || num === 4 || name.includes("face")) return "face";
    if (num === 5 || name.includes("iris")) return "iris";
    return "none";
  } catch {
    return "unknown";
  }
}

/** عنوان البيومترية للعرض (بصمة / Face ID / عين). */
export function biometryKindLabel(kind: BiometryKind, isRtl: boolean): string {
  switch (kind) {
    case "face":
      return "Face ID";
    case "fingerprint":
      return isRtl ? "بصمة الإصبع" : "Empreinte digitale";
    case "iris":
      return isRtl ? "بصمة العين" : "Scanner d\u2019iris";
    case "none":
    case "unknown":
    default:
      return isRtl ? "البيومترية" : "Biométrie";
  }
}

export type BiometricPromptReason =
  | "canceled"
  | "failed"
  | "locked"
  | "fallback"
  | "unavailable"
  | "not_enrolled"
  | "no_credential"
  | "error";

export type BiometricPromptResult = { ok: true } | { ok: false; reason: BiometricPromptReason };

/**
 * نافذة تحقق بيومترية احترافية مع تصنيف نتيجة فشل دقيق.
 * `allowDeviceCredential` يتيح بديل رمز الجهاز (PIN/نمط/كلمة مرور).
 */
export async function biometricPrompt(
  reason: string,
  opts?: { allowDeviceCredential?: boolean; cancelTitle?: string; iosFallbackTitle?: string }
): Promise<BiometricPromptResult> {
  if (!isNative()) return { ok: false, reason: "unavailable" };
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({
      reason,
      allowDeviceCredential: opts?.allowDeviceCredential ?? true,
      cancelTitle: opts?.cancelTitle ?? undefined,
      iosFallbackTitle: opts?.iosFallbackTitle ?? undefined,
      androidTitle: "",
      androidSubtitle: "",
    });
    return { ok: true };
  } catch (err: any) {
    const code = err?.code ?? "";
    switch (code) {
      case "userCancel":
      case "systemCancel":
      case "appCancel":
        return { ok: false, reason: "canceled" };
      case "authenticationFailed":
        return { ok: false, reason: "failed" };
      case "biometryLockout":
        return { ok: false, reason: "locked" };
      case "userFallback":
        return { ok: false, reason: "fallback" };
      case "biometryNotAvailable":
        return { ok: false, reason: "unavailable" };
      case "biometryNotEnrolled":
        return { ok: false, reason: "not_enrolled" };
      case "noDeviceCredential":
      case "passcodeNotSet":
        return { ok: false, reason: "no_credential" };
      default:
        return { ok: false, reason: "error" };
    }
  }
}

/** طلب التحقق بالمصادقة البيومترية (بصمة/وجه/رمز الجهاز) — إصدار بسيط. */
export async function authenticateWithBiometric(reason: string): Promise<boolean> {
  const result = await biometricPrompt(reason, { allowDeviceCredential: true });
  return result.ok;
}

/**
 * إملاء صوتي أصلي (الإدخال الصوتي في شات الذكاء الاصطناعي).
 * يعمل داخل التطبيق الأصلي فقط (WebView) حيث أن Web Speech API غير متوفر.
 * `lang` بصيغة BCP-47 مثل "ar" أو "fr-FR".
 * تعيد { supported, transcript } — transcript null عند الإلغاء أو عدم النطق.
 */
export async function nativeSpeechRecognize(lang: string): Promise<{ supported: boolean; transcript: string | null }> {
  if (!isNative()) return { supported: false, transcript: null };
  try {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
    const availability = await SpeechRecognition.available();
    if (!availability.available) return { supported: false, transcript: null };

    let perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== "granted") {
      perm = await SpeechRecognition.requestPermissions();
    }
    if (perm.speechRecognition !== "granted") return { supported: true, transcript: null };

    const result = await SpeechRecognition.start({
      language: lang,
      maxResults: 1,
      popup: true,
      prompt: "",
      partialResults: false,
    });
    return { supported: true, transcript: result.matches?.[0] ?? null };
  } catch {
    return { supported: false, transcript: null };
  }
}

// ---------------------------------------------------------------------------
// الإشعارات الأصلية (FCM على أندرويد / APNs على iOS)
// ---------------------------------------------------------------------------

/** طلب إذن الإشعارات وتسجيل الجهاز لدى FCM — يُخزَّن الرمز محلياً. */
export async function registerNativePush(): Promise<{ supported: boolean; granted: boolean }> {
  if (!isNative()) return { supported: false, granted: false };
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === "prompt") {
      permission = await PushNotifications.requestPermissions();
    }
    const granted = permission.receive === "granted";
    if (granted) {
      await PushNotifications.register();
      try {
        localStorage.setItem("native_push_enabled", "1");
      } catch {
        /* ignore */
      }
    }
    return { supported: true, granted };
  } catch {
    return { supported: true, granted: false };
  }
}

/** ربط مستمعي الإشعارات الأصلية (استقبال أثناء التشغيل + نقرة). */
export async function setupNativePushListeners(handlers?: {
  onToken?: (token: string) => void;
  onReceived?: (notification: any) => void;
  onOpened?: (notification: any) => void;
}): Promise<() => void> {
  if (!isNative()) return () => {};
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const listeners: Array<{ remove: () => void }> = [];
  try {
    listeners.push(
      await PushNotifications.addListener("registration", (token: any) => {
        const value = token?.value ?? "";
        try {
          localStorage.setItem("fcm_token", value);
        } catch {
          /* ignore */
        }
        handlers?.onToken?.(value);
      })
    );
    listeners.push(
      await PushNotifications.addListener("registrationError", (err: any) => {
        console.error("FCM registration error:", err);
      })
    );
    listeners.push(
      await PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
        handlers?.onReceived?.(notification);
      })
    );
    listeners.push(
      await PushNotifications.addListener("pushNotificationActionPerformed", (action: any) => {
        handlers?.onOpened?.(action?.notification);
      })
    );
  } catch {
    /* ignore */
  }
  return () => listeners.forEach((l) => l.remove());
}

// ---------------------------------------------------------------------------
// تهيئة التطبيق الأصلي عند الإقلاع (شاشة البداية + شريط الحالة)
// ---------------------------------------------------------------------------

/** إخفاء شاشة البداية وضبط شريط الحالة — يُستدعى مرة واحدة عند فتح التطبيق. */
export async function setupNativeApp(): Promise<void> {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    /* ignore */
  }
}

/** منع خروج مفاجئ بزر الرجوع في أندرويد (معاودة للخلف داخل التطبيق فقط). */
export async function registerAndroidBackButton(handler: () => void): Promise<() => void> {
  if (!isNative()) return () => {};
  try {
    const { App } = await import("@capacitor/app");
    const listener = await App.addListener("backButton", (event) => {
      if ((event as any).canGoBack) {
        handler();
      }
    });
    return () => listener.remove();
  } catch {
    return () => {};
  }
}

/** هل نعمل داخل التطبيق الأصلي؟ (مُصدَّر أيضاً للاستخدام المتزامن). */
export function getNativePlatform(): "android" | "ios" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    return cap.getPlatform?.() === "ios" ? "ios" : "android";
  }
  return "web";
}
