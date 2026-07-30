import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc, updateDoc, getDoc, collection, addDoc,
  serverTimestamp, query, orderBy, getDocs
} from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, action, data } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data();

    switch (action) {
      case "send_bat": {
        if (!data?.proofUrl) {
          return NextResponse.json({ error: "Proof URL is required" }, { status: 400 });
        }

        await updateDoc(orderRef, {
          printProofUrl: data.proofUrl,
          batStatus: "sent",
          batVersion: (orderData.batVersion || 0) + 1,
          batSentAt: serverTimestamp(),
        });

        await addDoc(collection(db, `orders/${orderId}/batAudit`), {
          action: "bat_sent",
          proofUrl: data.proofUrl,
          version: (orderData.batVersion || 0) + 1,
          timestamp: serverTimestamp(),
        });

        return NextResponse.json({
          success: true,
          batStatus: "sent",
          version: (orderData.batVersion || 0) + 1,
        });
      }

      case "approve": {
        await updateDoc(orderRef, {
          batStatus: "approved",
          batApprovedAt: serverTimestamp(),
          status: "Impression",
        });

        await addDoc(collection(db, `orders/${orderId}/batAudit`), {
          action: "bat_approved",
          timestamp: serverTimestamp(),
        });

        return NextResponse.json({ success: true, batStatus: "approved" });
      }

      case "reject": {
        if (!data?.reason) {
          return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
        }

        await updateDoc(orderRef, {
          batStatus: "rejected",
          batRejectionReason: data.reason,
        });

        await addDoc(collection(db, `orders/${orderId}/batAudit`), {
          action: "bat_rejected",
          reason: data.reason,
          timestamp: serverTimestamp(),
        });

        return NextResponse.json({ success: true, batStatus: "rejected" });
      }

      case "send_revision": {
        if (!data?.proofUrl) {
          return NextResponse.json({ error: "Proof URL is required" }, { status: 400 });
        }

        await updateDoc(orderRef, {
          printProofUrl: data.proofUrl,
          batStatus: "revision",
          batVersion: (orderData.batVersion || 0) + 1,
          batSentAt: serverTimestamp(),
        });

        await addDoc(collection(db, `orders/${orderId}/batAudit`), {
          action: "bat_revision_sent",
          proofUrl: data.proofUrl,
          version: (orderData.batVersion || 0) + 1,
          timestamp: serverTimestamp(),
        });

        return NextResponse.json({
          success: true,
          batStatus: "revision",
          version: (orderData.batVersion || 0) + 1,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");

    if (orderId) {
      const logsRef = collection(db, `orders/${orderId}/batAudit`);
      const q = query(logsRef, orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      return NextResponse.json({ logs });
    }

    const ordersRef = collection(db, "orders");
    const snap = await getDocs(query(ordersRef, orderBy("createdAt", "desc")));
    const orders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((o: any) => ["En attente", "Conception", "Impression"].includes(o.status));

    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
