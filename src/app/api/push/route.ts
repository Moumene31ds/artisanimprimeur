// src/app/api/push/route.ts
// إدارة اشتراكات الإشعارات الفورية:
//  - يتطلب توكن Firebase ID صالحاً، و userId يجب أن يطابق هوية المتصل.
//  - القراءة والحذف والإنشاء تُنفَّذ بهوية المستخدم عبر REST (تطبَّق قواعد Firestore).
// ملاحظة: نقاط النهاية ومفاتيح الاشتراك أسرار لا يجب تسريبها لمستخدم آخر.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { fsCreate, fsQuery, fsDelete } from "@/lib/firestore-rest";
import { ApiError, fail } from "@/lib/security/api-error";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z
    .object({
      p256dh: z.string().min(1).max(512).optional(),
      auth: z.string().min(1).max(512).optional(),
    })
    .optional(),
});

const postSchema = z.object({
  userId: z.string().min(1).max(128),
  subscription: subscriptionSchema,
});

const deleteSchema = z.object({
  userId: z.string().min(1).max(128),
  endpoint: z.string().url().max(2048),
});

/** يتحقق من الهوية ويعيد التوكن + فرض تطابق userId مع المتصل. */
async function authenticate(
  request: NextRequest,
  userId: string
): Promise<{ token: string; uid: string }> {
  const token = bearerToken(request.headers.get("authorization"));
  const user = await verifyIdToken(token);
  if (!user) throw new ApiError(401, "Authentication required");
  if (user.uid !== userId) throw new ApiError(403, "userId mismatch");
  return { token: token!, uid: user.uid };
}

async function findSubscriptions(token: string, uid: string, endpoint?: string) {
  const filters: any[] = [
    { fieldFilter: { field: { fieldPath: "userId" }, op: "EQUAL", value: { stringValue: uid } } },
  ];
  if (endpoint) {
    filters.push({
      fieldFilter: { field: { fieldPath: "endpoint" }, op: "EQUAL", value: { stringValue: endpoint } },
    });
  }
  return fsQuery(token, {
    from: [{ collectionId: "pushSubscriptions" }],
    where: { compositeFilter: { op: "AND", filters } },
    limit: 20,
  });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = postSchema.safeParse(await request.json());
    if (!parsed.success) throw parsed.error;
    const { userId, subscription } = parsed.data;
    const { token, uid } = await authenticate(request, userId);

    // تجنّب التكرار: نفس endpoint لنفس المستخدم يُسجَّل مرة واحدة.
    const existing = await findSubscriptions(token, uid, subscription.endpoint);
    if (existing.length === 0) {
      await fsCreate(token, "pushSubscriptions", {
        userId: uid,
        endpoint: subscription.endpoint,
        keys: subscription.keys ?? {},
        userAgent: request.headers.get("user-agent") || "",
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) throw parsed.error;
    const { userId, endpoint } = parsed.data;
    const { token, uid } = await authenticate(request, userId);

    const existing = await findSubscriptions(token, uid, endpoint);
    await Promise.all(existing.map((doc) => fsDelete(token, `pushSubscriptions/${doc.id}`)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") || "";
    if (!userId) throw new ApiError(400, "userId is required");
    const { token, uid } = await authenticate(request, userId);

    const subscriptions = await findSubscriptions(token, uid);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    return fail(error);
  }
}
