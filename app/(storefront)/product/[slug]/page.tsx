import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Product } from "@/models";
import { ProductDetailClient } from "@/components/storefront/ProductDetailClient";
import { ProductCard } from "@/components/storefront/ProductCard";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  await connectDB();

  const product = await Product.findOne({ slug: params.slug, isActive: true })
    .populate("category", "name slug")
    .lean();

  if (!product) notFound();

  const categoryId = (product as { category: { _id: unknown } }).category?._id;
  const productId = (product as { _id: unknown })._id;

  const related = categoryId
    ? await Product.find({
        category: categoryId,
        _id: { $ne: productId },
        isActive: true,
      })
        .limit(4)
        .lean()
    : [];

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <ProductDetailClient product={JSON.parse(JSON.stringify(product))} />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold mb-6">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={String(p._id)} product={JSON.parse(JSON.stringify(p))} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
