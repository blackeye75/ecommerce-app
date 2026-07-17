"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { AddressForm } from "@/components/storefront/AddressForm";
import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

interface Address {
  _id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);

  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");

  useEffect(() => setMounted(true), []);

  async function loadAddresses() {
    setAddressLoading(true);
    const res = await fetch("/api/addresses");
    if (res.status === 401) {
      router.push("/login?callbackUrl=/checkout");
      return;
    }
    const data = await res.json();
    const list: Address[] = data.addresses ?? [];
    setAddresses(list);
    const defaultAddr = list.find((a) => a.isDefault) ?? list[0];
    if (defaultAddr) setSelectedAddressId(defaultAddr._id);
    setShowAddressForm(list.length === 0);
    setAddressLoading(false);
  }

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingFee = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal - discount + shippingFee);

  async function handleApplyCoupon() {
    setCouponError("");
    if (!couponInput.trim()) return;
    setCouponLoading(true);

    try {
      const res = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Invalid coupon");
        setDiscount(0);
        setCouponCode(null);
        return;
      }
      setDiscount(data.discount);
      setCouponCode(data.code);
    } catch {
      setCouponError("Something went wrong");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCouponCode(null);
    setDiscount(0);
    setCouponInput("");
    setCouponError("");
  }

  async function handlePlaceOrder() {
    setOrderError("");
    if (!selectedAddressId) {
      setOrderError("Please select a shipping address");
      return;
    }
    setPlacing(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            variant: i.variant,
          })),
          addressId: selectedAddressId,
          paymentMethod: "cod",
          couponCode: couponCode ?? undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOrderError(data.error || "Failed to place order");
        return;
      }

      clearCart();
      router.push(`/order-success/${data.order._id}`);
    } catch {
      setOrderError("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/shop" className="text-primary underline">
          Continue shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-10">
      <div className="md:col-span-2 space-y-8">
        <section>
          <h2 className="font-bold text-lg mb-3">Shipping Address</h2>

          {addressLoading ? (
            <p className="text-gray-400 text-sm">Loading addresses...</p>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <label
                  key={addr._id}
                  className={`block border rounded-md p-3 text-sm cursor-pointer ${
                    selectedAddressId === addr._id ? "border-primary" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === addr._id}
                    onChange={() => setSelectedAddressId(addr._id)}
                    className="mr-2"
                  />
                  <span className="font-medium">{addr.fullName}</span> — {addr.phone}
                  <br />
                  <span className="text-gray-500">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} -{" "}
                    {addr.pincode}
                  </span>
                </label>
              ))}

              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="text-sm text-primary underline"
                >
                  + Add a new address
                </button>
              )}

              {showAddressForm && (
                <AddressForm
                  onSaved={() => {
                    setShowAddressForm(false);
                    loadAddresses();
                  }}
                  onCancel={addresses.length > 0 ? () => setShowAddressForm(false) : undefined}
                />
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-lg mb-3">Payment Method</h2>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 border rounded-md p-3 border-primary">
              <input type="radio" name="payment" checked readOnly />
              Cash on Delivery
            </label>
            <label className="flex items-center gap-2 border rounded-md p-3 text-gray-400">
              <input type="radio" name="payment" disabled />
              Pay Online (Razorpay) — coming soon
            </label>
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg">Order Summary</h2>

        <div className="border rounded-md p-4 space-y-3 text-sm">
          {items.map((item) => (
            <div
              key={item.productId + JSON.stringify(item.variant ?? {})}
              className="flex justify-between"
            >
              <span className="text-gray-600">
                {item.title} × {item.quantity}
              </span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        <div>
          {couponCode ? (
            <div className="flex items-center justify-between text-sm bg-green-50 rounded-md p-2">
              <span>
                Coupon <strong>{couponCode}</strong> applied
              </span>
              <button onClick={removeCoupon} className="text-red-500 text-xs underline">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading}
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}
          {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
        </div>

        <div className="border-t pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−₹{discount}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{shippingFee === 0 ? "Free" : `₹${shippingFee}`}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t mt-1">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        {orderError && <p className="text-sm text-red-600">{orderError}</p>}

        <button
          onClick={handlePlaceOrder}
          disabled={placing || addressLoading}
          className="w-full rounded-md bg-primary text-primary-foreground py-3 font-medium disabled:opacity-50"
        >
          {placing ? "Placing order..." : "Place Order"}
        </button>
      </div>
    </main>
  );
}
