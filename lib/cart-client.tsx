"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import type {
  CartAdjustment,
  CartSnapshot,
  CartSnapshotItem,
  GuestCartItemInput,
} from "@/lib/cart-types";

const GUEST_CART_STORAGE_KEY = "shop-template:cart:v1";

type SessionLike = {
  user?: {
    email?: string | null;
  } | null;
} | null;

type GuestStoredCartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  priceInCents: number;
  stockQuantity: number;
  quantity: number;
};

type AddCartItemInput = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  priceInCents: number;
  stockQuantity: number;
  quantity: number;
};

type CartContextValue = {
  cart: CartSnapshot;
  isCartOpen: boolean;
  isLoading: boolean;
  isMutating: boolean;
  errorMessage: string | null;
  openCart: () => void;
  closeCart: () => void;
  clearError: () => void;
  clearAdjustments: () => void;
  refresh: () => Promise<void>;
  add: (input: AddCartItemInput) => Promise<void>;
  setQuantity: (
    itemId: string,
    productId: string,
    quantity: number,
  ) => Promise<void>;
  remove: (itemId: string, productId: string) => Promise<void>;
};

const EMPTY_CART: CartSnapshot = {
  items: [],
  itemCount: 0,
  subtotalInCents: 0,
  adjustments: [],
};

const CartContext = createContext<CartContextValue | null>(null);

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeStockQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function createSnapshotFromGuestItems(
  items: GuestStoredCartItem[],
  adjustments: CartAdjustment[] = [],
): CartSnapshot {
  const snapshotItems: CartSnapshotItem[] = items.map((item) => {
    const stockQuantity = normalizeStockQuantity(item.stockQuantity);
    const quantity = Math.min(normalizeQuantity(item.quantity), stockQuantity);

    return {
      id: `guest:${item.productId}`,
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      imageUrl: item.imageUrl,
      priceInCents: item.priceInCents,
      stockQuantity,
      maxAllowedQuantity: stockQuantity,
      quantity,
      lineTotalInCents: item.priceInCents * quantity,
    };
  });

  const itemCount = snapshotItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalInCents = snapshotItems.reduce(
    (sum, item) => sum + item.lineTotalInCents,
    0,
  );

  return {
    items: snapshotItems,
    itemCount,
    subtotalInCents,
    adjustments,
  };
}

function parseGuestCartStorage(rawValue: string | null): GuestStoredCartItem[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (typeof entry !== "object" || entry === null) {
          return null;
        }

        const item = entry as Partial<GuestStoredCartItem>;
        if (
          typeof item.productId !== "string" ||
          typeof item.slug !== "string" ||
          typeof item.name !== "string" ||
          typeof item.imageUrl !== "string" ||
          typeof item.priceInCents !== "number" ||
          typeof item.stockQuantity !== "number" ||
          typeof item.quantity !== "number"
        ) {
          return null;
        }

        return {
          productId: item.productId,
          slug: item.slug,
          name: item.name,
          imageUrl: item.imageUrl,
          priceInCents: normalizeQuantity(item.priceInCents),
          stockQuantity: normalizeStockQuantity(item.stockQuantity),
          quantity: normalizeQuantity(item.quantity),
        } satisfies GuestStoredCartItem;
      })
      .filter((item): item is GuestStoredCartItem => item !== null);
  } catch {
    return [];
  }
}

function readGuestItems() {
  if (typeof window === "undefined") {
    return [];
  }

  return parseGuestCartStorage(window.localStorage.getItem(GUEST_CART_STORAGE_KEY));
}

function writeGuestItems(items: GuestStoredCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
}

function clearGuestItems() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
}

function sanitizeGuestItems(items: GuestStoredCartItem[]) {
  const adjustments: CartAdjustment[] = [];
  let mutated = false;

  const sanitizedItems = items
    .map((item) => {
      const stockQuantity = normalizeStockQuantity(item.stockQuantity);
      const quantity = normalizeQuantity(item.quantity);

      if (stockQuantity <= 0 || quantity <= 0) {
        mutated = true;
        adjustments.push({
          code: "REMOVED_UNAVAILABLE",
          productId: item.productId,
          productName: item.name,
          requestedQuantity: quantity,
          adjustedQuantity: 0,
          message: `${item.name} is no longer available and was removed from your cart.`,
        });
        return null;
      }

      const clampedQuantity = Math.min(quantity, stockQuantity);
      if (clampedQuantity !== quantity) {
        mutated = true;
        adjustments.push({
          code: "CLAMPED_TO_STOCK",
          productId: item.productId,
          productName: item.name,
          requestedQuantity: quantity,
          adjustedQuantity: clampedQuantity,
          message: `${item.name} was adjusted to ${clampedQuantity} because of available stock.`,
        });
      }

      return {
        ...item,
        stockQuantity,
        quantity: clampedQuantity,
      } satisfies GuestStoredCartItem;
    })
    .filter((item): item is GuestStoredCartItem => item !== null);

  return {
    sanitizedItems,
    adjustments,
    mutated,
  };
}

async function parseApiError(response: Response) {
  const payload =
    (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error || "Cart request failed.";
}

async function requestCart(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<CartSnapshot> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const payload = (await response.json()) as { cart: CartSnapshot };
  return payload.cart;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: sessionData, isPending: isSessionPending } = authClient.useSession();
  const session = sessionData as SessionLike;
  const signedInEmail = session?.user?.email?.trim() || "";
  const isSignedIn = Boolean(signedInEmail);

  const [cart, setCart] = useState<CartSnapshot>(EMPTY_CART);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mergedUserRef = useRef<string | null>(null);

  const hydrateGuestCart = useCallback(() => {
    const { sanitizedItems, adjustments, mutated } = sanitizeGuestItems(
      readGuestItems(),
    );

    if (mutated) {
      writeGuestItems(sanitizedItems);
    }

    setCart(createSnapshotFromGuestItems(sanitizedItems, adjustments));
  }, []);

  const refresh = useCallback(async () => {
    setErrorMessage(null);

    if (!isSignedIn) {
      hydrateGuestCart();
      return;
    }

    const nextCart = await requestCart("/api/cart");
    setCart(nextCart);
  }, [hydrateGuestCart, isSignedIn]);

  useEffect(() => {
    if (isSessionPending) {
      return;
    }

    let isCancelled = false;

    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        if (!isSignedIn) {
          mergedUserRef.current = null;
          if (!isCancelled) {
            hydrateGuestCart();
          }
          return;
        }

        const hasMergedForUser = mergedUserRef.current === signedInEmail;
        const guestItems = readGuestItems();

        if (!hasMergedForUser && guestItems.length > 0) {
          const mergeItems: GuestCartItemInput[] = guestItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          }));

          const mergedCart = await requestCart("/api/cart/merge", {
            method: "POST",
            body: JSON.stringify({ items: mergeItems }),
          });

          mergedUserRef.current = signedInEmail;
          clearGuestItems();

          if (!isCancelled) {
            setCart(mergedCart);
          }

          return;
        }

        mergedUserRef.current = signedInEmail;
        const nextCart = await requestCart("/api/cart");

        if (!isCancelled) {
          setCart(nextCart);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load cart.",
          );
          setCart(EMPTY_CART);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [hydrateGuestCart, isSessionPending, isSignedIn, signedInEmail]);

  const add = useCallback(
    async (input: AddCartItemInput) => {
      setErrorMessage(null);
      setIsMutating(true);

      try {
        if (isSignedIn) {
          const nextCart = await requestCart("/api/cart/items", {
            method: "POST",
            body: JSON.stringify({
              productId: input.productId,
              quantity: normalizeQuantity(input.quantity),
            }),
          });

          setCart(nextCart);
          return;
        }

        const { sanitizedItems } = sanitizeGuestItems(readGuestItems());
        const existingItem = sanitizedItems.find(
          (item) => item.productId === input.productId,
        );
        const currentQuantity = normalizeQuantity(existingItem?.quantity || 0);
        const requestedQuantity =
          currentQuantity + normalizeQuantity(input.quantity || 0);
        const stockQuantity = normalizeStockQuantity(input.stockQuantity);
        const adjustedQuantity = Math.min(requestedQuantity, stockQuantity);

        if (adjustedQuantity <= 0) {
          setCart(
            createSnapshotFromGuestItems(sanitizedItems, [
              {
                code: "REMOVED_UNAVAILABLE",
                productId: input.productId,
                productName: input.name,
                requestedQuantity,
                adjustedQuantity: 0,
                message: `${input.name} is no longer available and was removed from your cart.`,
              },
            ]),
          );
          return;
        }

        const nextGuestItems = sanitizedItems.filter(
          (item) => item.productId !== input.productId,
        );

        nextGuestItems.push({
          productId: input.productId,
          slug: input.slug,
          name: input.name,
          imageUrl: input.imageUrl,
          priceInCents: normalizeQuantity(input.priceInCents),
          stockQuantity,
          quantity: adjustedQuantity,
        });

        writeGuestItems(nextGuestItems);

        const adjustments: CartAdjustment[] = [];
        if (adjustedQuantity < requestedQuantity) {
          adjustments.push({
            code: "CLAMPED_TO_STOCK",
            productId: input.productId,
            productName: input.name,
            requestedQuantity,
            adjustedQuantity,
            message: `${input.name} was adjusted to ${adjustedQuantity} because of available stock.`,
          });
        }

        setCart(createSnapshotFromGuestItems(nextGuestItems, adjustments));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to add item.",
        );
      } finally {
        setIsMutating(false);
      }
    },
    [isSignedIn],
  );

  const setQuantity = useCallback(
    async (itemId: string, productId: string, quantity: number) => {
      setErrorMessage(null);
      setIsMutating(true);

      try {
        if (isSignedIn) {
          const nextCart = await requestCart(`/api/cart/items/${itemId}`, {
            method: "PATCH",
            body: JSON.stringify({
              quantity: normalizeQuantity(quantity),
            }),
          });

          setCart(nextCart);
          return;
        }

        const { sanitizedItems } = sanitizeGuestItems(readGuestItems());
        const nextQuantity = normalizeQuantity(quantity);
        const nextGuestItems: GuestStoredCartItem[] = [];
        const adjustments: CartAdjustment[] = [];

        for (const item of sanitizedItems) {
          if (item.productId !== productId) {
            nextGuestItems.push(item);
            continue;
          }

          if (nextQuantity <= 0) {
            continue;
          }

          const adjustedQuantity = Math.min(nextQuantity, item.stockQuantity);
          nextGuestItems.push({
            ...item,
            quantity: adjustedQuantity,
          });

          if (adjustedQuantity < nextQuantity) {
            adjustments.push({
              code: "CLAMPED_TO_STOCK",
              productId: item.productId,
              productName: item.name,
              requestedQuantity: nextQuantity,
              adjustedQuantity,
              message: `${item.name} was adjusted to ${adjustedQuantity} because of available stock.`,
            });
          }
        }

        writeGuestItems(nextGuestItems);
        setCart(createSnapshotFromGuestItems(nextGuestItems, adjustments));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to update quantity.",
        );
      } finally {
        setIsMutating(false);
      }
    },
    [isSignedIn],
  );

  const remove = useCallback(
    async (itemId: string, productId: string) => {
      setErrorMessage(null);
      setIsMutating(true);

      try {
        if (isSignedIn) {
          const nextCart = await requestCart(`/api/cart/items/${itemId}`, {
            method: "DELETE",
          });

          setCart(nextCart);
          return;
        }

        const { sanitizedItems } = sanitizeGuestItems(readGuestItems());
        const nextGuestItems = sanitizedItems.filter(
          (item) => item.productId !== productId,
        );
        writeGuestItems(nextGuestItems);
        setCart(createSnapshotFromGuestItems(nextGuestItems));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to remove item.",
        );
      } finally {
        setIsMutating(false);
      }
    },
    [isSignedIn],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isCartOpen,
      isLoading,
      isMutating,
      errorMessage,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      clearError: () => setErrorMessage(null),
      clearAdjustments: () =>
        setCart((currentCart) => ({
          ...currentCart,
          adjustments: [],
        })),
      refresh,
      add,
      setQuantity,
      remove,
    }),
    [add, cart, errorMessage, isCartOpen, isLoading, isMutating, refresh, remove, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }

  return context;
}
