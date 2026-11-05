import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function savePlayerAvatar(
  playerId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("INVALID_TYPE");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(buffer)
    .rotate()
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  const dir = path.join(process.cwd(), "public", "avatars");
  await mkdir(dir, { recursive: true });
  const filename = `${playerId}.webp`;
  await writeFile(path.join(dir, filename), webp);

  return `/avatars/${filename}`;
}
