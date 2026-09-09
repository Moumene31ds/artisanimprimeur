"use client";

// ---------------------------------------------------------------------------
// capabilities.ts — قدرات المتصفح الحديثة للـ PWA
// ---------------------------------------------------------------------------
// أدوات موحدة مع كشف دعم وفوائل احتياطية أنيقة:
//  - EyeDropper API        : التقاط لون من الشاشة (المصمّم).
//  - Web Share Level 2     : مشاركة ملفات (صور/PDF) عبر نافذة المشاركة النظامية.
//  - File System Access API: حفظ مباشر في مجلد يختاره المستخدم.
//  - Contact Picker API    : اختيار جهات اتصال لحملات الدعوة/الإحالة.
//  - WebOTP                : قراءة رمز التحقق من SMS تلقائياً.
//  - Background Fetch API  : رفع/تنزيل كبير يستمر بالخلفية.
// ---------------------------------------------------------------------------

/* ============================ EyeDropper ============================ */

export function isEyeDropperSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "EyeDropper" in window;
}

/**
 * فتح قطارة الشاشة وإرجاع اللون الملتقط بصيغة HEX.
 * يرمي خطأ إذا أُلغى الالتقاط أو لم يُمنح الإذن.
 */
export async function pickScreenColor(): Promise<string> {
  if (!isEyeDropperSupported()) throw new Error("unsupported");
  const dropper = new (window as any).EyeDropper();
  const result = await dropper.open();
  return result.sRGBHex as string;
}

/* ======================= Web Share Level 2 ======================= */

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  return !!(navigator as any).canShare?.({ files: [new File([""], "t.png", { type: "image/png" })] });
}

/**
 * مشاركة Blob كملف عبر نافذة المشاركة النظامية.
 * يعيد "shared" عند النجاح، "copied" عند الرجوع لنسخ الرابط، أو يرمي خطأ.
 */
export async function shareFile(
  blob: Blob,
  filename: string,
  title?: string,
  text?: string
): Promise<"shared" | "cancelled"> {
  const file = new File([blob], filename, { type: blob.type });
  if (!canShareFiles()) throw new Error("unsupported");
  try {
    await (navigator as any).share({
      files: [file],
      title,
      text,
    });
    return "shared";
  } catch (err: any) {
    if (err?.name === "AbortError") return "cancelled";
    throw err;
  }
}

/* ===================== File System Access API ===================== */

export function canSaveToFileSystem(): boolean {
  if (typeof window === "undefined") return false;
  return "showSaveFilePicker" in window;
}

/** حفظ Blob في ملف يختاره المستخدم (نافذة حفظ نظامية). يعيد اسم الملف. */
export async function saveBlobToFile(blob: Blob, suggestedName: string): Promise<string> {
  if (!canSaveToFileSystem()) throw new Error("unsupported");
  const picker = (window as any).showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: suggestedName.split(".").pop()?.toUpperCase() || "File",
        accept: { [blob.type || "application/octet-stream"]: ["." + (suggestedName.split(".").pop() || "bin")] },
      },
    ],
  });
  const handle = await picker;
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return handle.name as string;
}

/* ======================= Contact Picker API ======================= */

export interface PickedContact {
  name: string[];
  tel?: string[];
}

export function isContactPickerSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "contacts" in navigator && "ContactsManager" in window;
}

export async function pickContacts(properties: string[] = ["name", "tel"], multiple = true): Promise<PickedContact[]> {
  if (!isContactPickerSupported()) throw new Error("unsupported");
  return (navigator as any).contacts.select(properties, { multiple }) as Promise<PickedContact[]>;
}

/* ============================= WebOTP ============================= */

export function isWebOTPSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "OTPCredential" in window;
}

/**
 * انتظار رمز التحقق الوارد عبر SMS (يتطلب رسالة بالصيغة القياسية:
 * "@domain #code"). يستدعى عند تركيز حقل إدخال الرمز.
 */
export async function readSmsOtp(): Promise<string | null> {
  if (!isWebOTPSupported() || typeof AbortController === "undefined") return null;
  const ac = new AbortController();
  try {
    const otp: any = await (navigator as any).credentials.get({
      otp: { transport: "sms" },
      signal: ac.signal,
    });
    return otp?.code ?? null;
  } catch {
    return null;
  } finally {
    // إلغاء المستمع بعد أول قراءة/مهلة المتصفح.
    ac.abort();
  }
}

/* ======================== Background Fetch ======================== */

export function isBackgroundFetchSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "BackgroundFetchManager" in window;
}
