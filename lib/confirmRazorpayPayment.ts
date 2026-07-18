import { connectDB } from "@/lib/db";
import { Order, Product, Coupon } from "@/models";

/**
 * Applies the side effects of a CONFIRMED Razorpay payment: decrements stock,
 * increments coupon usage, marks the order paid. Called from both
 * /api/payments/razorpay/verify (the browser callback) and
 * /api/payments/razorpay/webhook (the server-to-server backup path) —
 * idempotent by design, since either one might fire first, or both might fire.
 */
export async function confirmRazorpayPayment(orderId: string, razorpayPaymentId: string) {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) return { ok: false as const, error: "Order not found" };
  if (order.paymentMethod !== "razorpay") {
    return { ok: false as const, error: "Not a Razorpay order" };
  }

  // Already processed by the other path (verify vs webhook) — safe no-op.
  if (order.paymentStatus === "paid") {
    return { ok: true as const, order };
  }

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    if (item.variant && product.variants.length > 0) {
      const idx = product.variantCombinations.findIndex((c: any) =>
        product.variants.every(
          (v: any) => c.combination.get(v.name) === (item.variant as any)?.get?.(v.name)
        )
      );
      if (idx !== -1) {
        await Product.updateOne(
          { _id: product._id },
          { $inc: { [`variantCombinations.${idx}.stock`]: -item.quantity } }
        );
      }
    } else {
      await Product.updateOne({ _id: product._id }, { $inc: { stock: -item.quantity } });
    }
  }

  if (order.couponCode) {
    await Coupon.updateOne({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  }

  order.paymentStatus = "paid";
  order.razorpayPaymentId = razorpayPaymentId;
  await order.save();

  return { ok: true as const, order };
}
