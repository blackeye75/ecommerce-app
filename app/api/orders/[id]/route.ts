import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models";
import { requireAuth } from "@/lib/middleware/requireAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    const order = await Order.findById(params.id).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = (order as { user: unknown }).user?.toString() === user.id;
    if (!isOwner && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error("Get order error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// PUT (admin order status updates) arrives in Phase 7 alongside the admin
// order management UI — no point half-building it without a screen to use it.
