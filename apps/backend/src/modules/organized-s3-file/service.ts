import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FileTypes } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { S3FileService } from "@medusajs/file-s3/dist/services/s3-file";
import path from "path";
import { PassThrough } from "stream";
import { ulid } from "ulid";

const PRODUCT_FOLDER = "products";
const CATEGORY_FOLDER = "categories";

function decodeContent(content: string, mimeType: string) {
  const decodedBase64 = Buffer.from(content, "base64");
  if (decodedBase64.toString("base64") === content) return decodedBase64;
  const isText =
    mimeType.startsWith("text/") ||
    mimeType.includes("csv") ||
    mimeType.includes("json") ||
    mimeType.includes("xml");
  return Buffer.from(content, isText ? "utf8" : "binary");
}

export function mediaFolderFor(filename: string) {
  const normalized = filename.replaceAll("\\", "/").replace(/^\/+/, "");
  return normalized.startsWith(`${CATEGORY_FOLDER}/`)
    ? CATEGORY_FOLDER
    : PRODUCT_FOLDER;
}

export function mediaObjectKey(filename: string, id = ulid()) {
  const parsed = path.parse(path.basename(filename));
  return `${mediaFolderFor(filename)}/${parsed.name}-${id}${parsed.ext}`;
}

export function presignedMediaObjectKey(filename: string) {
  const normalized = filename.replaceAll("\\", "/").replace(/^\/+/, "");
  const parsed = path.parse(path.basename(normalized));
  return `${mediaFolderFor(normalized)}/${parsed.base}`;
}

export class OrganizedS3FileService extends S3FileService {
  static identifier = "s3";

  private publicUrl(fileKey: string) {
    const encodedKey = fileKey.split("/").map(encodeURIComponent).join("/");
    return `${this.config_.fileUrl}/${encodedKey}`;
  }

  async upload(file: FileTypes.ProviderUploadFileDTO) {
    if (!file?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided");
    }
    const fileKey = mediaObjectKey(file.filename);
    await this.client_.send(
      new PutObjectCommand({
        ACL: this.resolveAcl(file.access),
        Bucket: this.config_.bucket,
        Body: decodeContent(file.content, file.mimeType),
        Key: fileKey,
        ContentType: file.mimeType,
        CacheControl: this.config_.cacheControl,
        Metadata: { "original-filename": encodeURIComponent(file.filename) },
      })
    );
    return { url: this.publicUrl(fileKey), key: fileKey };
  }

  async getUploadStream(file: FileTypes.ProviderUploadStreamDTO) {
    if (!file?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided");
    }
    const fileKey = mediaObjectKey(file.filename);
    const writeStream = new PassThrough();
    const upload = new Upload({
      client: this.client_,
      params: {
        ACL: this.resolveAcl(file.access),
        Bucket: this.config_.bucket,
        Key: fileKey,
        Body: writeStream,
        ContentType: file.mimeType,
        CacheControl: this.config_.cacheControl,
        Metadata: { "original-filename": encodeURIComponent(file.filename) },
      },
    });
    const promise = upload.done().then(() => ({
      url: this.publicUrl(fileKey),
      key: fileKey,
    }));
    return {
      writeStream,
      promise,
      url: this.publicUrl(fileKey),
      fileKey,
    };
  }

  async getPresignedUploadUrl(file: FileTypes.ProviderGetPresignedUploadUrlDTO) {
    if (!file?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided");
    }
    const fileKey = presignedMediaObjectKey(file.filename);
    const command = new PutObjectCommand({
      Bucket: this.config_.bucket,
      ContentType: file.mimeType,
      ACL: file.access ? this.resolveAcl(file.access) : undefined,
      Key: fileKey,
    });
    return {
      url: await getSignedUrl(this.client_, command, {
        expiresIn: file.expiresIn ?? 3_600,
      }),
      key: fileKey,
    };
  }
}
