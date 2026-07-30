import { defineWidgetConfig } from "@medusajs/admin-sdk";
import {
  AdminProductCategory,
  DetailWidgetProps,
} from "@medusajs/framework/types";
import { toast } from "@medusajs/ui";
import { ChangeEvent, useEffect, useState } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadResponse = {
  file?: { url?: string };
};

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function configuredImage(category: AdminProductCategory) {
  const value = category.metadata?.nav_thumbnail_url;
  return typeof value === "string" ? value : "";
}

async function updateCategoryImage(
  category: AdminProductCategory,
  imageUrl: string | null
) {
  const response = await fetch(`/admin/product-categories/${category.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      metadata: {
        ...(category.metadata ?? {}),
        nav_thumbnail_url: imageUrl,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Actualizarea categoriei a eșuat (${response.status})`);
  }
}

function CategoryImageWidget({
  data,
}: DetailWidgetProps<AdminProductCategory>) {
  const [imageUrl, setImageUrl] = useState(() => configuredImage(data));
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;
    if (!ACCEPTED_TYPES.has(selected.type)) {
      toast.error("Format neacceptat", {
        description: "Folosește JPG, PNG sau WebP.",
      });
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("Imaginea este prea mare", {
        description: "Dimensiunea maximă este 5 MB.",
      });
      event.target.value = "";
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const save = async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      const upload = await fetch("/admin/category-image-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename: `${data.handle}.${file.name.split(".").pop() ?? "webp"}`,
          mime_type: file.type,
          content: await fileToBase64(file),
        }),
      });
      if (!upload.ok) {
        throw new Error(`Încărcarea imaginii a eșuat (${upload.status})`);
      }
      const payload = (await upload.json()) as UploadResponse;
      const uploadedUrl = payload.file?.url;
      if (!uploadedUrl) throw new Error("Răspunsul nu conține URL-ul imaginii");

      await updateCategoryImage(data, uploadedUrl);
      setImageUrl(uploadedUrl);
      setFile(null);
      setPreviewUrl("");
      toast.success("Imaginea categoriei a fost salvată");
    } catch (error) {
      toast.error("Nu am putut salva imaginea", {
        description:
          error instanceof Error ? error.message : "Eroare necunoscută",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateCategoryImage(data, null);
      setImageUrl("");
      setFile(null);
      setPreviewUrl("");
      toast.success("Imaginea categoriei a fost eliminată", {
        description: "Va fi folosită imaginea unui produs din categorie.",
      });
    } catch (error) {
      toast.error("Nu am putut elimina imaginea", {
        description:
          error instanceof Error ? error.message : "Eroare necunoscută",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayedImage = previewUrl || imageUrl;

  return (
    <div className="border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest rounded-lg border p-6">
      <div className="mb-4">
        <h2 className="text-ui-fg-base text-base font-semibold">
          Imagine categorie
        </h2>
        <p className="text-ui-fg-subtle mt-1 text-sm">
          Imaginea selectată are prioritate. Fără ea, magazinul folosește un
          produs reprezentativ.
        </p>
      </div>

      {displayedImage ? (
        <div
          aria-label="Previzualizare imagine categorie"
          className="bg-ui-bg-subtle mb-4 aspect-square w-full max-w-56 rounded-lg bg-contain bg-center bg-no-repeat"
          role="img"
          style={{ backgroundImage: `url(${JSON.stringify(displayedImage)})` }}
        />
      ) : (
        <div className="border-ui-border-base text-ui-fg-muted mb-4 flex aspect-square w-full max-w-56 items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm">
          Se folosește automat imaginea unui produs
        </div>
      )}

      <input
        accept="image/jpeg,image/png,image/webp"
        className="text-ui-fg-subtle block w-full text-sm"
        disabled={saving}
        onChange={selectFile}
        type="file"
      />

      <div className="mt-4 flex gap-2">
        <button
          className="bg-ui-bg-interactive text-ui-fg-on-color rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
          disabled={!file || saving}
          onClick={save}
          type="button"
        >
          {saving ? "Se salvează…" : "Salvează imaginea"}
        </button>
        {imageUrl ? (
          <button
            className="border-ui-border-base text-ui-fg-base rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
            disabled={saving}
            onClick={remove}
            type="button"
          >
            Elimină
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "product_category.details.side.after",
});

export default CategoryImageWidget;
