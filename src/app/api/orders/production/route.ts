import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc, updateDoc, getDoc, collection, addDoc,
  serverTimestamp, query, orderBy, getDocs
} from "firebase/firestore";
import { getFirestore } from "firebase-admin/firestore";

const PRODUCTION_STAGES = [
  "En attente", "Conception", "Impression", "Découpage",
  "Façonnage", "Contrôle qualité", "Prêt", "Terminé", "Annulé"
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, action, stage } = body;

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
      case "advance": {
        const currentIndex = PRODUCTION_STAGES.indexOf(orderData.status || "En attente");
        if (currentIndex < PRODUCTION_STAGES.length - 1) {
          const nextStage = PRODUCTION_STAGES[currentIndex + 1];
          await updateDoc(orderRef, {
            status: nextStage,
            lastProductionUpdate: serverTimestamp(),
          });

          await addDoc(collection(db, `orders/${orderId}/productionLog`), {
            from: orderData.status,
            to: nextStage,
            timestamp: serverTimestamp(),
            action: "advance",
          });

          return NextResponse.json({
            success: true,
            previousStatus: orderData.status,
            newStatus: nextStage,
          });
        }
        return NextResponse.json({ error: "Already at final stage" }, { status: 400 });
      }

      case "regress": {
        const currentIndex = PRODUCTION_STAGES.indexOf(orderData.status || "En attente");
        if (currentIndex > 0) {
          const prevStage = PRODUCTION_STAGES[currentIndex - 1];
          await updateDoc(orderRef, {
            status: prevStage,
            lastProductionUpdate: serverTimestamp(),
          });

          await addDoc(collection(db, `orders/${orderId}/productionLog`), {
            from: orderData.status,
            to: prevStage,
            timestamp: serverTimestamp(),
            action: "regress",
          });

          return NextResponse.json({
            success: true,
            previousStatus: orderData.status,
            newStatus: prevStage,
          });
        }
        return NextResponse.json({ error: "Already at initial stage" }, { status: 400 });
      }

      case "set_stage": {
        if (!stage || !PRODUCTION_STAGES.includes(stage)) {
          return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
        }

        await updateDoc(orderRef, {
          status: stage,
          lastProductionUpdate: serverTimestamp(),
        });

        await addDoc(collection(db, `orders/${orderId}/productionLog`), {
          from: orderData.status,
          to: stage,
          timestamp: serverTimestamp(),
          action: "set_stage",
        });

        return NextResponse.json({
          success: true,
          previousStatus: orderData.status,
          newStatus: stage,
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
      const logsRef = collection(db, `orders/${orderId}/productionLog`);
      const q = query(logsRef, orderBy("timestamp", "asc"));
      const snap = await getDocs(q);
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      return NextResponse.json({ logs });
    }

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const orders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((o: any) => !["Terminé"].includes(o.status));

    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
