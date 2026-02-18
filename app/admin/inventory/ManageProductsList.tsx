"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategoryValue,
} from "@/lib/product-categories";
import { uploadProductImageDirect } from "./upload-product-image";

type ProductStatus = "DRAFT" | "PUBLISHED";

type InventoryProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category: ProductCategoryValue;
  description: string;
  priceInCents: number;
  stockQuantity: number;
  imageUrl: string;
  status: ProductStatus;
};

type ApiErrorPayload = {
  error?: string;
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatPrice(priceInCents: number) {
  return currencyFormatter.format(priceInCents / 100);
}

async function parseApiError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return payload.error || "Request failed.";
}

function ProductCard({ product }: { product: InventoryProduct }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [price, setPrice] = useState((product.priceInCents / 100).toFixed(2));
  const [stockQuantity, setStockQuantity] = useState(
    product.stockQuantity.toString(),
  );
  const [category, setCategory] = useState<ProductCategoryValue>(product.category);
  const [description, setDescription] = useState(product.description);
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [replacementImage, setReplacementImage] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;
    setName(nextName);
    if (!slugEdited) {
      setSlug(makeSlug(nextName));
    }
  };

  const onSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSlugEdited(true);
    setSlug(makeSlug(event.target.value));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("slug", slug);
      formData.set("price", price);
      formData.set("stockQuantity", stockQuantity);
      formData.set("category", category);
      formData.set("description", description);
      formData.set("status", status);

      if (replacementImage) {
        const slugHint = makeSlug(slug || name) || "product";
        const uploadedImage = await uploadProductImageDirect({
          file: replacementImage,
          slugHint,
        });

        formData.set("replacementImageKey", uploadedImage.imageKey);
      }

      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        setErrorMessage(await parseApiError(response));
        return;
      }

      setSuccessMessage("Product updated.");
      setIsEditing(false);
      setReplacementImage(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update product.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const shouldDelete = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setErrorMessage(await parseApiError(response));
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Failed to delete product.");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetEditState = () => {
    setIsEditing(false);
    setName(product.name);
    setSlug(product.slug);
    setSlugEdited(false);
    setPrice((product.priceInCents / 100).toFixed(2));
    setStockQuantity(product.stockQuantity.toString());
    setCategory(product.category);
    setDescription(product.description);
    setStatus(product.status);
    setReplacementImage(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <article className="rounded-xl border border-slate-200 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-40 w-full rounded-lg object-cover"
        loading="lazy"
      />

      {!isEditing ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold tracking-tight">{product.name}</h3>
            <span
              className={
                product.status === "PUBLISHED"
                  ? "rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700"
                  : "rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-700"
              }
            >
              {product.status.toLowerCase()}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-600">{product.slug}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            SKU {product.sku || "pending"}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            {PRODUCT_CATEGORY_LABELS[product.category]}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {formatPrice(product.priceInCents)}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Stock {product.stockQuantity}
          </p>
          <p className="mt-2 text-sm text-slate-700">{product.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                setIsEditing(true);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-700 hover:border-slate-400 hover:text-slate-900"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-rose-700 hover:border-rose-400 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            {product.status === "PUBLISHED" ? (
              <Link
                href={`/products/${product.slug}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-700 hover:border-slate-400 hover:text-slate-900"
              >
                View
              </Link>
            ) : null}
          </div>
        </>
      ) : (
        <form onSubmit={handleSave} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Name
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={onNameChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Slug
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={onSlugChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Price (USD)
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Stock
              </span>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={stockQuantity}
                onChange={(event) => setStockQuantity(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Category
              </span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ProductCategoryValue)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {PRODUCT_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {PRODUCT_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Status
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ProductStatus)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
              Description
            </span>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
              Replace Image (optional)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setReplacementImage(event.target.files?.[0] || null)
              }
              className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={resetEditState}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}
    </article>
  );
}

export default function ManageProductsList({
  products,
}: {
  products: InventoryProduct[];
}) {
  const [skuQuery, setSkuQuery] = useState("");
  const normalizedSkuQuery = skuQuery.trim();
  const filteredProducts = normalizedSkuQuery
    ? products.filter((product) =>
        (product.sku || "").includes(normalizedSkuQuery),
      )
    : products;

  return (
    <>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
            Search by SKU
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={skuQuery}
            onChange={(event) => setSkuQuery(event.target.value)}
            placeholder="Enter SKU (example: 123456)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
          />
        </label>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {`No products found for SKU "${normalizedSkuQuery}".`}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
