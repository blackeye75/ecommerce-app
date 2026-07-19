import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order, Product, Address, Coupon } from "@/models";
import { requireAuth } from "@/lib/middleware/requireAuth";
import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { orderConfirmationEmail } from "@/lib/emailTemplates";

interface CheckoutItemInput {
  productId: string;
  quantity: number;
  variant?: Record<string, string>;
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const status = searchParams.get("status");

    // Customers only ever see their own orders; admins can see everything.
    const filter: Record<string, unknown> = user.role === "admin" ? {} : { user: user.id };
    if (status) filter.orderStatus = status;

    let query = Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    // Admins need to see who placed each order; customers already know it's theirs.
    if (user.role === "admin") {
      query = query.populate("user", "name email");
    }

    const [orders, total] = await Promise.all([query.lean(), Order.countDocuments(filter)]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("List orders error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const items: CheckoutItemInput[] = Array.isArray(body.items) ? body.items : [];
    const addressId: string | undefined = body.addressId;
    const paymentMethod: string = body.paymentMethod;
    const couponCode: string | undefined = body.couponCode;

    if (items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }
    if (!addressId) {
      return NextResponse.json({ error: "Please select a shipping address" }, { status: 400 });
    }
    // Razorpay wiring lands in Phase 6 — the schema already supports it,
    // but only COD can actually complete an order for now.
    if (paymentMethod !== "cod") {
      return NextResponse.json(
        { error: "Online payment is coming soon — please select Cash on Delivery for now." },
        { status: 400 }
      );
    }

    await connectDB();

    const address = await Address.findById(addressId);
    if (!address || address.user.toString() !== user.id) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Recompute every line item from the DB — never trust client-sent prices/stock.
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return NextResponse.json(
          { error: `A product in your cart is no longer available` },
          { status: 400 }
        );
      }

      const hasVariants = product.variants.length > 0;
      let unitPrice = product.discountPrice ?? product.price;
      let availableStock = product.stock;
      let combinationIndex = -1;

      if (hasVariants) {
        if (!item.variant) {
          return NextResponse.json(
            { error: `Please select variant options for ${product.title}` },
            { status: 400 }
          );
        }
        combinationIndex = product.variantCombinations.findIndex((c: any) =>
          product.variants.every(
            (v: any) => c.combination.get(v.name) === item.variant?.[v.name]
          )
        );
        if (combinationIndex === -1) {
          return NextResponse.json(
            { error: `Selected options for ${product.title} are no longer available` },
            { status: 400 }
          );
        }
        const combo = product.variantCombinations[combinationIndex];
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
        _stockUpdate: hasVariants
          ? { productId: product._id, combinationIndex, quantity: item.quantity }
          : { productId: product._id, quantity: item.quantity },
      });
    }

    // Coupon (optional) — re-validated here rather than trusting the client's
    // earlier /api/coupons/apply response, since the cart may have changed since.
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
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const shippingFee = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = Math.max(0, subtotal - discount + shippingFee);

    const order = await Order.create({
      user: user.id,
      items: orderItems.map(({ _stockUpdate, ...rest }) => rest),
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
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "placed",
    });

    // Decrement stock for each line item now that the order is confirmed.
    for (const item of orderItems) {
      if ("combinationIndex" in item._stockUpdate) {
        const { productId, combinationIndex, quantity } = item._stockUpdate as {
          productId: unknown;
          combinationIndex: number;
          quantity: number;
        };
        await Product.updateOne(
          { _id: productId },
          { $inc: { [`variantCombinations.${combinationIndex}.stock`]: -quantity } }
        );
      } else {
        const { productId, quantity } = item._stockUpdate as {
          productId: unknown;
          quantity: number;
        };
        await Product.updateOne({ _id: productId }, { $inc: { stock: -quantity } });
      }
    }

    // Awaited so the send completes before this serverless function returns —
    // an un-awaited send can be dropped when the lambda freezes. sendEmail
    // catches its own errors, so a mail failure still never fails the order.
    await sendEmail({
      to: user.email,
      subject: `Order Confirmed — #${order._id.toString().slice(-8)}`,
      html: orderConfirmationEmail(order),
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}