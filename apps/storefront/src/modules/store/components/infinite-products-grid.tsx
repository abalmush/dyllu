"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { PlpProductCard } from "@/components/organisms/plp-product-card";
import SkeletonProductPreview from "@modules/skeletons/components/skeleton-product-preview";
import type {
  ProductFeedRequest,
  ProductFeedResponse,
} from "@modules/store/lib/product-feed-contract";
import { toProductFeedSearchParams } from "@modules/store/lib/product-feed-contract";

type Props = {
  initialProducts: ProductFeedResponse["products"];
  initialNextPage: number | null;
  totalCount: number;
  request: Omit<ProductFeedRequest, "page">;
};

export default function InfiniteProductsGrid({
  initialProducts,
  initialNextPage,
  totalCount,
  request,
}: Props) {
  const [products, setProducts] = React.useState(initialProducts);
  const [nextPage, setNextPage] = React.useState(initialNextPage);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const loadingRef = React.useRef(false);

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const loadMore = React.useCallback(async () => {
    if (!nextPage || loadingRef.current) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const params = toProductFeedSearchParams({ ...request, page: nextPage });
      const response = await fetch(`/api/product-feed?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Feed request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ProductFeedResponse;

      setProducts((currentProducts) => {
        const knownIds = new Set(currentProducts.map((product) => product.id));
        const incomingProducts = payload.products.filter(
          (product) => !knownIds.has(product.id)
        );

        return [...currentProducts, ...incomingProducts];
      });
      setNextPage(payload.nextPage);
    } catch (error) {
      if ((error as DOMException).name === "AbortError") {
        return;
      }

      setError("Nu am reușit să încărcăm următoarele produse.");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [nextPage, request]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !nextPage || error) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [error, loadMore, nextPage]);

  return (
    <div>
      <ul
        className="small:grid-cols-3 medium:grid-cols-4 grid w-full grid-cols-2 gap-4"
        data-testid="products-list"
      >
        {products.map((product, index) => (
          <li key={product.id}>
            <PlpProductCard product={product} imagePriority={index < 4} />
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-4">
        {nextPage && (
          <div ref={sentinelRef} className="h-px w-full" aria-hidden />
        )}

        {isLoading && (
          <ul className="small:grid-cols-3 medium:grid-cols-4 grid w-full grid-cols-2 gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index}>
                <SkeletonProductPreview />
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="border-border bg-muted/30 rounded-2xl border border-dashed px-6 py-6 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4">
              <div className="bg-destructive/10 text-destructive grid size-11 place-items-center rounded-full">
                <AlertCircle className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-semibold tracking-tight">
                  Încărcarea s-a întrerupt
                </p>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadMore()}
              >
                Încearcă din nou
              </Button>
            </div>
          </div>
        )}

        {!nextPage && !isLoading && products.length > 0 && (
          <p className="text-muted-foreground text-center text-sm">
            Ai ajuns la finalul selecției. {totalCount} produse disponibile.
          </p>
        )}
      </div>
    </div>
  );
}
