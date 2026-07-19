import Link from "next/link";
import { WishlistButton } from "./WishlistButton";

interface ProductCardProps {
  product: {
    _id: string;
    title: string;
    slug: string;
    price: number;
    discountPrice?: number;
    images: string[];
    category?: { name: string } | null;
  };
  /** Currency symbol from Site Settings; defaults to ₹ so existing call sites keep working. */
  currency?: string;
}

export function ProductCard({ product, currency = "₹" }: ProductCardProps) {
  const hasDiscount = Boolean(
    product.discountPrice && product.discountPrice < product.price
  );

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
        <WishlistButton productId={product._id} className="absolute top-2 right-2 z-10" />
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            No image
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium line-clamp-2">{product.title}</h3>
      {product.category?.name && (
        <p className="text-xs text-gray-400">{product.category.name}</p>
      )}
      <div className="mt-1 flex items-center gap-2">
        {hasDiscount ? (
          <>
            <span className="font-semibold">{currency}{product.discountPrice}</span>
            <span className="text-sm text-gray-400 line-through">{currency}{product.price}</span>
          </>
        ) : (
          <span className="font-semibold">{currency}{product.price}</span>
        )}
      </div>
    </Link>
  );
}
