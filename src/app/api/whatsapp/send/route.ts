// src/app/api/whatsapp/send/route.ts
// إرسال رسائل WhatsApp (تأكيد طلب، حالة، BAT، ترويجي) — للمشرف فقط.
// كان مفتوحاً للجميع: أي شخص يستطيع إرسال رسائل باي اسم المحل لأي رقم.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendBATNotification,
  sendOrderReadyNotification,
  sendPromotionalMessage,
} from "@/lib/whatsapp-service";
import { requireAdmin } from "@/lib/admin-auth";
import { ApiError, fail } from "@/lib/security/api-error";

const dataSchema = z
  .object({
    customerName: z.string().max(120).optional(),
    orderId: z.string().max(128).optional(),
    total: z.number().nonnegative().max(10_000_000).optional(),
    newStatus: z.string().max(60).optional(),
    batUrl: z.string().max(2048).optional(),
    promoCode: z.string().max(60).optional(),
    discountValue: z.number().nonnegative().max(1_000_000).optional(),
    discountType: z.string().max(20).optional(),
  })
  .optional();

const bodySchema = z.object({
  type: z.enum([
    "order_confirmation",
    "order_status",
    "bat_notification",
    "order_ready",
    "promotional",
  ]),
  phone: z.string().min(6).max(20),
  data: dataSchema,
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) throw new ApiError(401, "Admin authentication required");

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Invalid request payload");
    const { type, phone, data } = parsed.data;

    let result;
    switch (type) {
      case "order_confirmation":
        result = await sendOrderConfirmation(
          phone,
          data?.customerName || "Client",
          data?.orderId || "",
          data?.total || 0
        );
        break;

      case "order_status":
        result = await sendOrderStatusUpdate(
          phone,
          data?.customerName || "Client",
          data?.orderId || "",
          data?.newStatus || ""
        );
        break;

      case "bat_notification":
        result = await sendBATNotification(
          phone,
          data?.customerName || "Client",
          data?.orderId || "",
          data?.batUrl || ""
        );
        break;

      case "order_ready":
        result = await sendOrderReadyNotification(
          phone,
          data?.customerName || "Client",
          data?.orderId || ""
        );
        break;

      case "promotional":
        result = await sendPromotionalMessage(
          phone,
          data?.promoCode || "",
          data?.discountValue || 0,
          data?.discountType || "percent"
        );
        break;
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send WhatsApp message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    return fail(error);
  }
}
