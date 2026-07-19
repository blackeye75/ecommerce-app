"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { WishlistButton } from "./WishlistButton";

interface VariantAttribute {
  name: string;
  options: string[];
}

interface VariantCombination {
  combination: Record<string, string>;
  sku?: string;
  stock: number;
  price?: number;
  image?: string;
}

interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  discountPrice?: number;
  stock: number;
  variants: VariantAttribute[];
  variantCombinations: VariantCombination[];
  category?: { name: string } | null;
}

export function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const hasVariants = product.variants.length > 0;

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.variants.forEach((v) => {
      initial[v.name] = v.options[0];
    });
    return initial;
  });

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const matchedCombination = useMemo(() => {
    if (!hasVariants) return null;
    return (
      product.variantCombinations.find((c) =>
        product.variants.every((v) => c.combination[v.name] === selected[v.name])
      ) ?? null
    );
  }, [selected, hasVariants, product]);

  const displayPrice = matchedCombination?.price ?? product.discountPrice ?? product.price;
  const isDiscounted = !matchedCombination?.price && Boolean(product.discountPrice);
  const stock = hasVariants ? matchedCombination?.stock ?? 0 : product.stock;
  const outOfStock = stock <= 0;

  const images = matchedCombination?.image
    ? [matchedCombination.image, ...product.images]
    : product.images;

  function handleAddToCart() {
    if (hasVariants && !matchedCombination) return;

    addItem({
      productId: product._id,
      title: product.title,
      slug: product.slug,
      price: displayPrice,
      image: product.images?.[0],
      quantity,
      variant: hasVariants ? selected : undefined,
      maxStock: stock,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="grid md:grid-cols-2 gap-10">
      <div>
        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
          {images[activeImage] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[activeImage]}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              No image
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((img, i) => (
              <button
                key={img + i}
                onClick={() => setActiveImage(i)}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 ${
                  i === activeImage ? "border-primary" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {product.category?.name && (
          <p className="text-sm text-gray-400 mb-1">{product.category.name}</p>
        )}
        <h1 className="text-2xl font-bold mb-3">{product.title}</h1>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl font-semibold">₹{displayPrice}</span>
          {isDiscounted && (
            <span className="text-gray-400 line-through">₹{product.price}</span>
          )}
        </div>

        {hasVariants &&
          product.variants.map((v) => (
            <div key={v.name} className="mb-4">
              <p className="text-sm font-medium mb-2">{v.name}</p>
              <div className="flex flex-wrap gap-2">
                {v.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelected((prev) => ({ ...prev, [v.name]: opt }))}
                    className={`px-3 py-1.5 rounded-md border text-sm ${
                      selected[v.name] === opt
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-gray-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

        <p className={`text-sm mb-4 ${outOfStock ? "text-red-600" : "text-green-600"}`}>
          {outOfStock ? "Out of stock" : `${stock} in stock`}
        </p>

        {!outOfStock && (
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium">Qty</label>
            <div className="flex items-center border rounded-md">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1 text-lg"
              >
                −
              </button>
              <span className="px-4">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                className="px-3 py-1 text-lg"
              >
                +
              </button>
            </div>
          </div>
        )}

        <button
          disabled={outOfStock}
          onClick={handleAddToCart}
          className="w-full rounded-md mb-4 bg-primary text-primary-foreground py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {added ? "Added ✓" : "Add to Cart"}
        </button>
        <WishlistButton productId={product._id} variant="inline" />
        {added && (
          <button
            onClick={() => router.push("/cart")}
            className="w-full mt-2 rounded-md border py-2 text-sm font-medium"
          >
            View Cart
          </button>
        )}

        <div className="mt-8 border-t pt-6">
          <h2 className="font-medium mb-2">Description</h2>
          <p className="text-gray-600 text-sm whitespace-pre-line">{product.description}</p>
        </div>
      </div>
    </div>
  );
}
