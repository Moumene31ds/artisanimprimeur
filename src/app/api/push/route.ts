import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, query, where, getDocs,
  deleteDoc, doc, serverTimestamp
} from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body;

    if (!userId || !subscription) {
      return NextResponse.json({ error: "userId and subscription are required" }, { status: 400 });
    }

    const existingQuery = query(
      collection(db, "pushSubscriptions"),
      where("userId", "==", userId),
      where("endpoint", "==", subscription.endpoint)
    );
    const existing = await getDocs(existingQuery);

    if (existing.empty) {
      await addDoc(collection(db, "pushSubscriptions"), {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        createdAt: serverTimestamp(),
        userAgent: request.headers.get("user-agent") || "",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, endpoint } = await request.json();

    if (!userId || !endpoint) {
      return NextResponse.json({ error: "userId and endpoint are required" }, { status: 400 });
    }

    const existingQuery = query(
      collection(db, "pushSubscriptions"),
      where("userId", "==", userId),
      where("endpoint", "==", endpoint)
    );
    const existing = await getDocs(existingQuery);

    const deletePromises = existing.docs.map((d) => deleteDoc(doc(db, "pushSubscriptions", d.id)));
    await Promise.all(deletePromises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");

    if (userId) {
      const q = query(
        collection(db, "pushSubscriptions"),
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      const subscriptions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      return NextResponse.json({ subscriptions });
    }

    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
