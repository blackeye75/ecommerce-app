import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order, Product, Address, Coupon } from "@/models";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import razorpay from "@/lib/razorpay";

interface CheckoutItemInput {
  productId: string;
  quantity: number;
  variant?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const items: CheckoutItemInput[] = Array.isArray(body.items) ? body.items : [];
    const addressId: string | undefined = body.addressId;
    const couponCode: string | undefined = body.couponCode;

    if (items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }
    if (!addressId) {
      return NextResponse.json({ error: "Please select a shipping address" }, { status: 400 });
    }

    await connectDB();

    const address = await Address.findById(addressId);
    if (!address || address.user.toString() !== user.id) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Same recomputation pattern as the COD route in /api/orders — never
    // trust client-sent prices/stock. Stock is validated here but NOT
    // decremented yet; it's only decremented once payment is confirmed
    // (in confirmRazorpayPayment), so an abandoned Razorpay checkout never
    // holds stock hostage.
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return NextResponse.json(
          { error: "A product in your cart is no longer available" },
          { status: 400 }
        );
      }

      const hasVariants = product.variants.length > 0;
      let unitPrice = product.discountPrice ?? product.price;
      let availableStock = product.stock;

      if (hasVariants) {
        if (!item.variant) {
          return NextResponse.json(
            { error: `Please select variant options for ${product.title}` },
            { status: 400 }
          );
        }
        const combo = product.variantCombinations.find((c: any) =>
          product.variants.every((v: any) => c.combination.get(v.name) === item.variant?.[v.name])
        );
        if (!combo) {
          return NextResponse.json(
            { error: `Selected options for ${product.title} are no longer available` },
            { status: 400 }
          );
        }
        unitPrice = combo.price ?? unitPrice;
        availableStock = combo.stock;
      }

      if (item.quantity < 1 || item.quantity > availableStock) {
        return NextResponse.json(
          { error: `Not enough stock for ${product.title} (only ${availableStock} left)` },
          { status: 400 }
        );
      }

      subtotal += unitPrice * item.quantity;

      orderItems.push({
        product: product._id,
        title: product.title,
        price: unitPrice,
        quantity: item.quantity,
        image: product.images?.[0],
        variant: item.variant,
      });
    }

    // Coupon validated here but usedCount only incremented once payment is
    // confirmed (see confirmRazorpayPayment) — a coupon shouldn't be "spent"
    // on a checkout the shopper never completes.
    let discount = 0;
    let appliedCouponCode: string | undefined;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
      if (
        coupon &&
        coupon.isActive &&
        coupon.expiresAt >= new Date() &&
        (coupon.usageLimit === 0 || coupon.usedCount < coupon.usageLimit) &&
        subtotal >= coupon.minOrderValue
      ) {
        discount =
          coupon.discountType === "percent"
            ? Math.round((subtotal * coupon.value) / 100)
            : Math.min(coupon.value, subtotal);
        appliedCouponCode = coupon.code;
      }
    }

    const shippingFee = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = Math.max(0, subtotal - discount + shippingFee);

    const order = await Order.create({
      user: user.id,
      items: orderItems,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      subtotal,
      discount,
      couponCode: appliedCouponCode,
      shippingFee,
      total,
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      orderStatus: "placed",
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // paise
      currency: "INR",
      receipt: order._id.toString(),
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return NextResponse.json({
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      prefill: {
        name: address.fullName,
        email: user.email,
        contact: address.phone,
      },
    });
  } catch (err) {
    console.error("Razorpay create-order error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
