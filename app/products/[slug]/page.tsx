import Link from "next/link";
import { ProductStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/product-categories";
import { prisma } from "@/lib/prisma";
import { StorefrontHeader } from "@/app/StorefrontHeader";
import AddToCartSection from "./AddToCartSection";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatPrice(priceInCents: number) {
  return currencyFormatter.format(priceInCents / 100);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: {
      slug,
      status: ProductStatus.PUBLISHED,
    },
  });

  if (!product) {
    notFound();
  }

  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StorefrontHeader />
      <main className="px-4 py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-900"
          >
            Back to shop
          </Link>

          <article className="mt-4 grid gap-6 p-4 md:grid-cols-2 md:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full max-h-[560px] w-full object-cover"
            />

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {PRODUCT_CATEGORY_LABELS[product.category]}
              </p>
              <p className="mt-2 text-xl font-medium text-slate-800">
                {formatPrice(product.priceInCents)}
              </p>
              <p
                className={`mt-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                  isOutOfStock ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {isOutOfStock ? "Out of stock" : `In stock: ${product.stockQuantity}`}
              </p>
              <p className="mt-6 whitespace-pre-line text-sm leading-6 text-slate-700">
                {product.description}
              </p>

              <AddToCartSection
                productId={product.id}
                slug={product.slug}
                name={product.name}
                imageUrl={product.imageUrl}
                priceInCents={product.priceInCents}
                stockQuantity={product.stockQuantity}
              />
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
