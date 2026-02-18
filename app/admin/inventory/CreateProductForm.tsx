"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategoryValue,
} from "@/lib/product-categories";
import { uploadProductImageDirect } from "./upload-product-image";

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type CreateProductResponse = {
  error?: string;
};

export default function CreateProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [category, setCategory] = useState<ProductCategoryValue>("TOPS");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setImageFile(nextFile);
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setPrice("");
    setStockQuantity("0");
    setCategory("TOPS");
    setDescription("");
    setStatus("PUBLISHED");
    setImageFile(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!imageFile) {
      setErrorMessage("Please choose an image file.");
      return;
    }

    setIsSubmitting(true);

    try {
      const slugHint = makeSlug(slug || name) || "product";
      const uploadedImage = await uploadProductImageDirect({
        file: imageFile,
        slugHint,
      });

      const formData = new FormData();
      formData.set("name", name);
      formData.set("slug", slug);
      formData.set("price", price);
      formData.set("stockQuantity", stockQuantity);
      formData.set("category", category);
      formData.set("description", description);
      formData.set("status", status);
      formData.set("imageKey", uploadedImage.imageKey);

      const response = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as CreateProductResponse;

      if (!response.ok) {
        setErrorMessage(payload.error || "Unable to save product.");
        return;
      }

      setSuccessMessage("Product saved.");
      resetForm();
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create product.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
            Name
          </span>
          <input
            type="text"
            required
            value={name}
            onChange={onNameChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
            placeholder="Classic denim jacket"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
            placeholder="classic-denim-jacket"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
            placeholder="89.00"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
            placeholder="10"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
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
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
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
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
          placeholder="Product details that appear on the storefront product page."
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
          Image
        </span>
        <input
          type="file"
          accept="image/*"
          required
          onChange={onImageChange}
          className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        />
      </label>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Saving..." : "Create product"}
      </button>
    </form>
  );
}
