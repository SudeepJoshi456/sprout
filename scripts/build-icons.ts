/**
 * Generates the app icons and logo images from the brand logo photo.
 *
 *   npx tsx scripts/build-icons.ts <path-to-logo.jpeg>
 *
 * The source is a 1010×1024 photo of the logo on a glass plaque. We crop to
 * the silver plate for the full logo, and to the seedling and coin alone for
 * icons, where the "SPROUT" lettering would be too small to read.
 */
import sharp from "sharp";
import { join } from "node:path";

const pub = join(process.cwd(), "public");
const PLATE = { left: 106, top: 105, width: 802, height: 828 };
const MARK = { left: 170, top: 100, width: 690, height: 690 };
const PLATE_GREY = { r: 216, g: 216, b: 214, alpha: 1 };

async function main() {
  const src = process.argv[2];
  if (!src) throw new Error("Usage: npx tsx scripts/build-icons.ts <path-to-logo.jpeg>");

  await sharp(src).extract(PLATE).webp({ quality: 85 }).toFile(join(pub, "logo.webp"));
  const mark = await sharp(src).extract(MARK).png().toBuffer();
  await sharp(mark).resize(256, 256).png().toFile(join(pub, "logo-mark.png"));
  for (const [file, size] of [["icon-32.png", 32], ["icon-192.png", 192], ["icon-512.png", 512], ["apple-icon.png", 180]] as const) {
    await sharp(mark).resize(size, size).png().toFile(join(pub, file));
  }
  // Maskable icons need the artwork inside the central 80% safe zone.
  await sharp(mark).resize(400, 400).extend({ top: 56, bottom: 56, left: 56, right: 56, background: PLATE_GREY }).png().toFile(join(pub, "icon-maskable-512.png"));
  console.log("Icons written to /public");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
