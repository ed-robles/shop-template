import Link from "next/link";
import CreateProductForm from "./CreateProductForm";
import ManageProductsList from "./ManageProductsList";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">inventory</h1>
          <Link
            href="/admin"
            className="text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-900"
          >
            Back to modules
          </Link>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          This module will be used to create products and attach product images
          and details for storefront product pages.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Create Product
          </h2>
          <div className="mt-4">
            <CreateProductForm />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Saved Products
          </h2>

          {products.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No products yet.
            </p>
          ) : (
            <ManageProductsList
              products={products.map((product) => ({
                id: product.id,
                name: product.name,
                slug: product.slug,
                sku: product.sku,
                category: product.category,
                description: product.description,
                priceInCents: product.priceInCents,
                stockQuantity: product.stockQuantity,
                imageUrl: product.imageUrl,
                status: product.status,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
