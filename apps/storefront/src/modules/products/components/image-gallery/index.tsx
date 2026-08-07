"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { HttpTypes } from "@medusajs/types";

import { cn } from "@lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/atoms/dialog";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/atoms/carousel";

type Props = {
  images: HttpTypes.StoreProductImage[];
};

export default function ImageGallery({ images }: Props) {
  const t = useTranslations("ProductGallery");
  const tCommon = useTranslations("Common");
  const [active, setActive] = React.useState(0);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const [zoomApi, setZoomApi] = React.useState<CarouselApi>();
  const safeImages = images?.length ? images : [];
  const current = safeImages[active];
  const hasThumbnails = safeImages.length > 1;

  React.useEffect(() => {
    if (!zoomApi) return;

    const syncActiveImage = () => setActive(zoomApi.selectedScrollSnap());
    syncActiveImage();
    zoomApi.on("select", syncActiveImage);

    return () => {
      zoomApi.off("select", syncActiveImage);
    };
  }, [zoomApi]);

  React.useEffect(() => {
    if (zoomOpen && zoomApi) {
      zoomApi.scrollTo(active);
    }
  }, [active, zoomApi, zoomOpen]);

  return (
    <div
      data-tmp-id="pdp-gallery-root"
      className={cn(
        "grid w-full gap-4",
        hasThumbnails && "small:grid-cols-[88px_1fr] small:items-start"
      )}
    >
      {hasThumbnails && (
        <div className="no-scrollbar small:order-1 small:max-h-[640px] small:flex-col small:overflow-y-auto small:pb-0 small:pr-1 order-2 flex gap-4 overflow-x-auto pb-1">
          {safeImages.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={t("imageNumber", { number: i + 1 })}
              className={cn(
                "bg-background/10 small:w-full relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 backdrop-blur-xs transition-[border-color,box-shadow,opacity,transform]",
                active === i
                  ? "border-background shadow-md"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              {img.url && (
                <Image
                  src={img.url}
                  alt={t("thumbnailNumber", { number: i + 1 })}
                  fill
                  sizes="88px"
                  className="object-contain p-1.5"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div
        data-tmp-id="pdp-gallery-main-col"
        className={cn(hasThumbnails ? "small:order-2 order-1" : "")}
      >
        <button
          type="button"
          onClick={() => current && setZoomOpen(true)}
          data-tmp-id="pdp-gallery-main-image"
          className="group xsmall:h-[440px] small:h-[560px] medium:h-[600px] large:h-[640px] relative block h-[360px] w-full"
          aria-label={t("zoomImage")}
        >
          {current?.url ? (
            <Image
              src={current.url}
              alt={t("productImage")}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 820px"
              className="object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="text-background/70 absolute inset-0 grid place-items-center">
              {tCommon("noImage")}
            </div>
          )}
          {hasThumbnails && (
            <span className="bg-foreground/85 text-2xs text-background absolute top-4 right-4 rounded-full px-2.5 py-1 font-semibold tracking-wider uppercase">
              {active + 1} / {safeImages.length}
            </span>
          )}
        </button>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="bg-background grid h-[92vh] max-w-[1080px] grid-rows-[auto_1fr_auto] gap-4 overflow-hidden p-0 sm:rounded-2xl">
          <DialogTitle className="text-muted-foreground px-6 pt-6 text-sm font-semibold">
            {hasThumbnails
              ? t("imageOf", { number: active + 1, total: safeImages.length })
              : t("productImage")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("zoomGalleryDescription")}
          </DialogDescription>
          <Carousel
            setApi={setZoomApi}
            opts={{ startIndex: active }}
            className="min-h-0"
            aria-label={t("zoomGalleryAriaLabel")}
          >
            <CarouselContent className="ml-0">
              {safeImages.map((img, i) => (
                <CarouselItem
                  key={img.id}
                  className="relative h-[calc(92dvh-10rem)] pl-0"
                >
                  {img.url && (
                    <Image
                      src={img.url}
                      alt={t("productImageNumber", { number: i + 1 })}
                      fill
                      sizes="100vw"
                      className="object-contain p-8"
                    />
                  )}
                </CarouselItem>
              ))}
            </CarouselContent>
            {hasThumbnails && (
              <>
                <CarouselPrevious
                  aria-label={t("previousImage")}
                  className="left-4 z-10"
                />
                <CarouselNext
                  aria-label={t("nextImage")}
                  className="right-4 z-10"
                />
              </>
            )}
          </Carousel>
          {hasThumbnails && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-6 pb-6">
              {safeImages.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    setActive(i);
                    zoomApi?.scrollTo(i);
                  }}
                  className={cn(
                    "bg-surface-subtle relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2",
                    active === i
                      ? "border-foreground"
                      : "border-transparent opacity-70 hover:opacity-100"
                  )}
                  aria-label={t("imageNumber", { number: i + 1 })}
                >
                  {img.url && (
                    <Image
                      src={img.url}
                      alt={t("thumbnailNumber", { number: i + 1 })}
                      fill
                      sizes="64px"
                      className="object-contain p-1"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
