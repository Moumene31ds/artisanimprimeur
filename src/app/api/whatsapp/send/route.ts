import { NextRequest, NextResponse } from "next/server";
import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendBATNotification,
  sendOrderReadyNotification,
  sendPromotionalMessage,
} from "@/lib/whatsapp-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, phone, data } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "Message type is required" }, { status: 400 });
    }

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

      default:
        return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
