import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { connectDB } from "@/lib/db";
import { Product, Category } from "@/models";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getSiteSettings } from "@/lib/site-settings";

// Always fetch fresh data for now — we can add caching/ISR once the catalog is stable.
export const dynamic = "force-dynamic";

/** Resolve a Lucide icon by name (from settings), falling back to a dot. */
function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (LucideIcons as Record<string, any>)[name] ?? LucideIcons.Circle;
  return <Cmp className={className} size={22} />;
}

export default async function HomePage() {
  await connectDB();

  const [settings, featuredProducts, categories] = await Promise.all([
    getSiteSettings(),
    Product.find({ isActive: true, isFeatured: true })
      .populate("category", "name slug")
      .limit(8)
      .lean(),
    Category.find({ isActive: true, parentCategory: null }).sort({ name: 1 }).lean(),
  ]);

  const { home, commerce } = settings;
  const hero = home.hero;
  const currency = commerce.currencySymbol;

  return (
    <main>
      {/* Hero — text + optional background image, all admin-editable */}
      <section
        className="py-20 px-6 text-center bg-gray-50 bg-cover bg-center relative"
        style={hero.backgroundImage ? { backgroundImage: `url(${hero.backgroundImage})` } : undefined}
      >
        {hero.backgroundImage && <div className="absolute inset-0 bg-black/40" />}
        <div className={`relative ${hero.backgroundImage ? "text-white" : ""}`}>
          <h1 className="text-4xl font-bold mb-4">{hero.title}</h1>
          {hero.subtitle && (
            <p
              className={`mb-6 max-w-xl mx-auto ${hero.backgroundImage ? "text-gray-100" : "text-gray-500"
                }`}
            >
              {hero.subtitle}
            </p>
          )}
          {hero.ctaText && (
            <Link
              href={hero.ctaLink || "/shop"}
              className="inline-block rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium"
            >
              {hero.ctaText}
            </Link>
          )}
        </div>
      </section>

      {/* Feature highlights strip  */}
      {home.highlights.length > 0 && (
        <section className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-10">
            {home.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-3 justify-center sm:justify-center">
                <Icon name={h.icon} className="text-primary" />
                <div>
                  <p className="text-sm font-medium">{h.title}</p>
                  {h.subtitle && <p className="text-xs text-gray-400">{h.subtitle}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-6">{home.categoriesHeading}</h2>
        {categories.length === 0 ? (
          <p className="text-gray-400 text-sm">No categories yet — add some in the admin panel.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat: any) => (
              <Link
                key={cat._id}
                href={`/category/${cat.slug}`}
                className="border rounded-lg p-6 text-center hover:shadow-md transition"
              >
                <span className="font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Promo banners */}
      {/* {home.banners.length > 0 && (
        <section className="max-w-6xl bg-black  mx-auto px-6 py-4 space-y-6">
          {home.banners.map((b, i) => {
            const inner = (
              <div className="relative rounded-lg  overflow-hidden aspect-[16/6] bg-red-400">
                {b.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image} alt={b.heading} className="w-full h-24 object-cover" />
                )}
                {(b.heading || b.subheading) && (
                  <div className="absolute inset-0 bg-black/30 flex flex-col justify-center px-8 text-white">
                    {b.heading && <p className="text-2xl font-bold">{b.heading}</p>}
                    {b.subheading && <p className="text-sm mt-1">{b.subheading}</p>}
                  </div>
                )}
              </div>
            );
            return b.link ? (
              <Link key={i} href={b.link}>
                {inner}
              </Link>
            ) : (
              <div key={i}>{inner}</div>
            );
          })}
        </section>
      )} */}

      {home.banners.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid gap-6 md:grid-cols-2">
            {home.banners.map((b, i) => {
              // First banner spans full width when the count is odd, so rows stay balanced.
              const featured = i === 0 && home.banners.length % 2 === 1;
              const inner = (
                <div
                  className={`group relative overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-sm transition-shadow duration-300 hover:shadow-xl ${featured ? "md:col-span-2 aspect-[16/6]" : "aspect-[16/9]"
                    }`}
                >
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.image}
                      alt={b.heading}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600" />
                  )}

                  {/* Legibility gradient so text always reads on any image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                  <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white">
                    {b.heading && (
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight drop-shadow-sm">
                        {b.heading}
                      </h3>
                    )}
                    {b.subheading && (
                      <p className="mt-1 max-w-md text-sm md:text-base text-white/80">
                        {b.subheading}
                      </p>
                    )}
                    {b.link && (
                      <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-gray-900 transition-all duration-300 group-hover:gap-2.5 group-hover:bg-white">
                        Shop Now
                        <LucideIcons.ArrowRight
                          size={16}
                          className="transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                      </span>
                    )}
                  </div>
                </div>
              );
              return b.link ? (
                <Link key={i} href={b.link}>
                  {inner}
                </Link>
              ) : (
                <div key={i}>{inner}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-6">{home.featuredHeading}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredProducts.map((p: any) => (
              <ProductCard key={p._id} product={JSON.parse(JSON.stringify(p))} currency={currency} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
