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
    <div className="min-h-screen bg-white text-slate-900">
      <StorefrontHeader
        initialSearchTerm={searchTerm ?? ""}
        activeCategory={activeCategory}
      />
      <main className="mx-auto flex w-full max-w-none flex-col px-2 py-8 sm:px-3">

        {products.length === 0 ? (
          <p className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {activeCategory
              ? `No published products in ${PRODUCT_CATEGORY_LABELS[
                  activeCategory
                ].toLowerCase()} yet.`
              : "No published products yet."}
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-1 lg:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="bg-white transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="aspect-[4/5] w-full object-cover"
                  loading="lazy"
                />
                <div className="mt-2 flex items-baseline justify-between gap-3 px-3 pb-3">
                  <h2 className="flex-1 truncate text-base font-light tracking-tight text-slate-900">
                    {product.name}
                  </h2>
                  <p className="whitespace-nowrap text-right text-sm text-black">
                    {formatPrice(product.priceInCents)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
