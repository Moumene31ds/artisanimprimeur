import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { fsGet, fsPatch, fsCreate, fsQuery } from "@/lib/firestore-rest";
import { ORDER_STATUSES, buildStatusHistory, getStepIndex } from "@/lib/order-status";
import { awardPointsForOrder } from "@/lib/loyalty-award";

// Same admin list the Firestore rules use (see firestore.rules isAdmin()).
const RULES_ADMIN_EMAIL = "attouabdelkarim2@gmail.com";

const ADMIN_EMAILS = new Set(
  [
    ...(process.env.ADMIN_EMAILS || "").split(","),
    RULES_ADMIN_EMAIL,
  ]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

async function requireAdmin(request: NextRequest): Promise<{ uid: string; email: string } | null> {
  const user = await verifyIdToken(bearerToken(request.headers.get("authorization")));
  if (!user?.email) return null;
  if (!ADMIN_EMAILS.has(user.email.toLowerCase())) return null;
  return { uid: user.uid, email: user.email };
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return error("Unauthorized", 401);
    const token = bearerToken(request.headers.get("authorization")) as string;

    const body = await request.json();
    const { orderId, action, stage } = body;

    if (!orderId) return error("Order ID is required", 400);

    const order = await fsGet(token, `orders/${orderId}`);
    if (!order) return error("Order not found", 404);

    const currentStatus = order.status || "En attente";
    const currentIndex = getStepIndex(currentStatus);
    // سلسلة الإنتاج لا تتضمن "Annulé" (حالة إلغاء وليست مرحلة)
    const stageChain = ORDER_STATUSES.slice(0, -1);

    let nextStage: string | null = null;
    switch (action) {
      case "advance":
        if (currentIndex < 0 || currentIndex >= stageChain.length - 1) {
          return error("Already at final stage", 400);
        }
        nextStage = stageChain[currentIndex + 1];
        break;
      case "regress":
        if (currentIndex <= 0) return error("Already at initial stage", 400);
        nextStage = stageChain[currentIndex - 1];
        break;
      case "set_stage":
        if (!stage || !ORDER_STATUSES.includes(stage)) {
          return error("Invalid stage", 400);
        }
        nextStage = stage;
        break;
      default:
        return error("Invalid action", 400);
    }

    if (!nextStage) return error("Invalid action", 400);

    const statusHistory = buildStatusHistory(
      order.statusHistory,
      nextStage,
      action === "set_stage" && stage ? `Manuel: ${stage}` : undefined
    );

    await fsPatch(token, `orders/${orderId}`, {
      status: nextStage,
      statusHistory,
      lastProductionUpdate: new Date().toISOString(),
    });

    try {
      await fsCreate(token, `orders/${orderId}/productionLog`, {
        orderId,
        from: currentStatus,
        to: nextStage,
        timestamp: new Date().toISOString(),
        action,
      });
    } catch (logErr) {
      console.error("[production] Failed to write productionLog:", (logErr as Error)?.message);
    }

    // إشعار فوري للزبون بتغيير الحالة (واتساب + بريد) — دون إبطاء الاستجابة
    try {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/orders/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "status",
          order: {
            id: orderId,
            phone: order.phone,
            customerName: order.customerName,
            customerEmail: order.customerEmail || null,
            status: nextStage,
          },
        }),
      }).catch(() => {});
    } catch (notifyErr) {
      console.error("[production] Notify dispatch failed:", (notifyErr as Error)?.message);
    }

    // منح نقاط الولاء تلقائياً عند إتمام الطلب (Terminé) — idempotent وآمن
    if (nextStage === "Terminé" && order.customerUserId && order.customerUserId !== "guest") {
      try {
        await awardPointsForOrder(token, orderId);
      } catch (loyaltyErr) {
        console.error("[production] Loyalty award failed:", (loyaltyErr as Error)?.message);
      }
    }

    return NextResponse.json({
      success: true,
      previousStatus: currentStatus,
      newStatus: nextStage,
    });
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return error("Unauthorized", 401);
    const token = bearerToken(request.headers.get("authorization")) as string;

    const orderId = request.nextUrl.searchParams.get("orderId");

    if (orderId) {
      const logs = await fsQuery(token, {
        from: [{ collectionId: "productionLog", allDescendants: true }],
        where: {
          fieldFilter: {
            field: { fieldPath: "orderId" },
            op: "EQUAL",
            value: { stringValue: orderId },
          },
        },
        orderBy: [{ field: { fieldPath: "timestamp" }, direction: "ASCENDING" }],
      });
      return NextResponse.json({ logs });
    }

    const orders = await fsQuery(token, {
      from: [{ collectionId: "orders" }],
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    });
    const filtered = orders.filter((order: any) => !["Terminé"].includes(order.status));
    return NextResponse.json({ orders: filtered });
  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
}
