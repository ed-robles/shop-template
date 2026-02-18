import Link from "next/link";
import { ProductStatus } from "@prisma/client";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  isProductCategory,
  type ProductCategoryValue,
} from "@/lib/product-categories";
import { prisma } from "@/lib/prisma";
import { StorefrontHeader } from "./StorefrontHeader";

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

function parseSearchTerm(rawValue: string | string[] | undefined): string | null {
  const value = getFirstValue(rawValue);
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getCategoryMatches(searchTerm: string): ProductCategoryValue[] {
  const normalizedTerm = searchTerm.toLowerCase();

  return PRODUCT_CATEGORIES.filter((category) => {
    const categoryKey = category.toLowerCase();
    const categoryLabel = PRODUCT_CATEGORY_LABELS[category].toLowerCase();

    return (
      categoryKey.includes(normalizedTerm) ||
      categoryLabel.includes(normalizedTerm) ||
      normalizedTerm.includes(categoryKey) ||
      normalizedTerm.includes(categoryLabel)
    );
  });
}

type HomeSearchParams = Record<string, string | string[] | undefined>;

export default async function Home({
  searchParams,
}: {
  searchParams?: HomeSearchParams | Promise<HomeSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeCategory = parseCategoryFilter(resolvedSearchParams.category);
  const searchTerm = parseSearchTerm(resolvedSearchParams.q);
  const searchCategoryMatches = searchTerm
    ? getCategoryMatches(searchTerm)
    : [];

  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.PUBLISHED,
      ...(activeCategory ? { category: activeCategory } : {}),
      ...(searchTerm
        ? {
            OR: [
              {
                name: {
                  contains: searchTerm,
                  mode: "insensitive",
                },
              },
              {
                sku: {
                  contains: searchTerm,
                  mode: "insensitive",
                },
              },
              ...(searchCategoryMatches.length > 0
                ? [
                    {
                      category: {
                        in: searchCategoryMatches,
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StorefrontHeader initialSearchTerm={searchTerm ?? ""} />
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
                <p
                  className={`mt-1 text-xs font-semibold uppercase tracking-wider ${
                    product.stockQuantity > 0 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {product.stockQuantity > 0
                    ? `In stock: ${product.stockQuantity}`
                    : "Out of stock"}
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
