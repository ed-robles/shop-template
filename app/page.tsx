import Link from "next/link";
import { ProductStatus } from "@prisma/client";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  isProductCategory,
  type ProductCategoryValue,
} from "@/lib/product-categories";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatPrice(priceInCents: number) {
  return currencyFormatter.format(priceInCents / 100);
}

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseCategoryFilter(
  rawValue: string | string[] | undefined,
): ProductCategoryValue | null {
  const value = getFirstValue(rawValue);
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (!isProductCategory(normalized)) {
    return null;
  }

  return normalized;
}

type HomeSearchParams = Record<string, string | string[] | undefined>;

export default async function Home({
  searchParams,
}: {
  searchParams?: HomeSearchParams | Promise<HomeSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeCategory = parseCategoryFilter(resolvedSearchParams.category);

  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.PUBLISHED,
      ...(activeCategory ? { category: activeCategory } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="h-12 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          <span className="text-xs font-semibold uppercase tracking-[0.24em]">
            Shop Template
          </span>
          <Link
            href="/auth"
            aria-label="Open sign in and sign up page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"
              />
            </svg>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
        <p className="mt-3 max-w-xl text-sm text-slate-600">
          Browse the latest published products from your inventory module.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/"
            className={
              activeCategory === null
                ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
                : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:border-slate-400 hover:text-slate-900"
            }
          >
            All
          </Link>
          {PRODUCT_CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/?category=${category.toLowerCase()}`}
              className={
                activeCategory === category
                  ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
                  : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:border-slate-400 hover:text-slate-900"
              }
            >
              {PRODUCT_CATEGORY_LABELS[category]}
            </Link>
          ))}
        </div>

        {products.length === 0 ? (
          <p className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {activeCategory
              ? `No published products in ${PRODUCT_CATEGORY_LABELS[
                  activeCategory
                ].toLowerCase()} yet.`
              : "No published products yet."}
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-56 w-full rounded-lg object-cover"
                  loading="lazy"
                />
                <h2 className="mt-3 text-base font-semibold tracking-tight">
                  {product.name}
                </h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                  SKU {product.sku || "pending"}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                  {PRODUCT_CATEGORY_LABELS[product.category]}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatPrice(product.priceInCents)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
