// src/app/api/orders/bat/route.ts
// سير عمل BAT (بروفة قبل الطباعة):
//  - send_bat / send_revision: للمشرف فقط.
//  - approve / reject: لصاحب الطلب نفسه أو المشرف.
//  - GET سجل التدقيق لطلب: صاحب الطلب أو المشرف.
//  - GET قائمة الطلبات: للمشرف فقط.
// كل عمليات Firestore تمر عبر REST بهوية المستخدم (firestore-rest) حتى تُطبَّق
// قواعد الأمان بدلاً من استخدام SDK العميل بلا توكن (كان يتجاهل القواعد ويفشل).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { fsGet, fsPatch, fsCreate, fsQuery } from "@/lib/firestore-rest";
import { ApiError, fail } from "@/lib/security/api-error";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send_bat"),
    orderId: z.string().min(1).max(128),
    data: z.object({ proofUrl: z.string().url().max(2048) }),
  }),
  z.object({
    action: z.literal("send_revision"),
    orderId: z.string().min(1).max(128),
    data: z.object({ proofUrl: z.string().url().max(2048) }),
  }),
  z.object({
    action: z.literal("approve"),
    orderId: z.string().min(1).max(128),
    data: z.record(z.string(), z.any()).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    orderId: z.string().min(1).max(128),
    data: z.object({ reason: z.string().min(1).max(1000) }),
  }),
]);

const CUSTOMER_ACTIONS = new Set(["approve", "reject"]);
const ACTIVE_BAT_STATUSES = ["En attente", "Conception", "Impression"];

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request.headers.get("authorization"));
    const user = await verifyIdToken(token);
    if (!user) throw new ApiError(401, "Authentication required");

    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) throw parsed.error;
    const { action, orderId, data } = parsed.data;

    const admin = await requireAdmin(request);
    if (!admin && !CUSTOMER_ACTIONS.has(action)) {
      throw new ApiError(403, "Admin only");
    }

    // للتحقق من الملكية نقرأ الطلب بهوية المتصل: القواعد تمنع قراءة طلبات الغير.
    const order = await fsGet(token!, `orders/${orderId}`);
    if (!order) throw new ApiError(404, "Order not found");
    if (!admin && order.customerUserId !== user.uid) {
      throw new ApiError(403, "Not allowed");
    }

    const auditPath = `orders/${orderId}/batAudit`;
    const nextVersion = Number(order.batVersion || 0) + 1;

    switch (action) {
      case "send_bat": {
        await fsPatch(token!, `orders/${orderId}`, {
          printProofUrl: data.proofUrl,
          batStatus: "sent",
          batVersion: nextVersion,
        });
        await fsCreate(token!, auditPath, {
          orderId,
          action: "bat_sent",
          proofUrl: data.proofUrl,
          version: nextVersion,
          actorUid: user.uid,
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, batStatus: "sent", version: nextVersion });
      }

      case "approve": {
        await fsPatch(token!, `orders/${orderId}`, {
          batStatus: "approved",
          status: "Impression",
        });
        await fsCreate(token!, auditPath, {
          orderId,
          action: "bat_approved",
          actorUid: user.uid,
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, batStatus: "approved" });
      }

      case "reject": {
        await fsPatch(token!, `orders/${orderId}`, {
          batStatus: "rejected",
          batRejectionReason: data.reason,
        });
        await fsCreate(token!, auditPath, {
          orderId,
          action: "bat_rejected",
          reason: data.reason,
          actorUid: user.uid,
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, batStatus: "rejected" });
      }

      case "send_revision": {
        await fsPatch(token!, `orders/${orderId}`, {
          printProofUrl: data.proofUrl,
          batStatus: "revision",
          batVersion: nextVersion,
        });
        await fsCreate(token!, auditPath, {
          orderId,
          action: "bat_revision_sent",
          proofUrl: data.proofUrl,
          version: nextVersion,
          actorUid: user.uid,
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, batStatus: "revision", version: nextVersion });
      }
    }
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request.headers.get("authorization"));
    const user = await verifyIdToken(token);
    if (!user) throw new ApiError(401, "Authentication required");
    const admin = await requireAdmin(request);

    const orderId = request.nextUrl.searchParams.get("orderId");

    // سجل التدقيق لطلب محدد: صاحب الطلب أو المشرف.
    if (orderId) {
      if (!admin) {
        const order = await fsGet(token!, `orders/${orderId}`);
        if (!order) throw new ApiError(404, "Order not found");
        if (order.customerUserId !== user.uid) throw new ApiError(403, "Not allowed");
      }
      const logs = await fsQuery(token!, {
        from: [{ collectionId: "batAudit", allDescendants: true }],
        where: {
          fieldFilter: {
            field: { fieldPath: "orderId" },
            op: "EQUAL",
            value: { stringValue: orderId },
          },
        },
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      });
      return NextResponse.json({ logs });
    }

    // قائمة الطلبات الكاملة: للمشرف فقط (كانت تكشف بيانات كل الزبائن).
    if (!admin) throw new ApiError(403, "Admin only");

    const orders = await fsQuery(token!, {
      from: [{ collectionId: "orders" }],
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    });
    const filtered = orders.filter((o: any) => ACTIVE_BAT_STATUSES.includes(o.status));
    return NextResponse.json({ orders: filtered });
  } catch (error) {
    return fail(error);
  }
}
