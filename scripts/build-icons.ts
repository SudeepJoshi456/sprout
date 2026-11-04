/**
 * Generates app icons and the cropped hero image.
 *
 *   npx tsx scripts/build-icons.ts <path-to-original-welcome-hero.png>
 *
 * The original v0 hero is a full phone mockup with placeholder copy
 * ("WELCOME TO [App Name]") and fake buttons baked in. We crop to the plant
 * and coins only so the image never competes with real UI.
 */
import sharp from "sharp";
import { join } from "node:path";

const pub = join(process.cwd(), "public");

const glyph = (scale = 1) => `
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">
    <path d="M32 50V31" stroke="#f7faf2" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M32.5 32c0-8.5 6.2-14.5 15.5-14.5 0 9.3-6.4 15.4-15.5 14.5z" fill="#e5e75b"/>
    <path d="M31.5 37c0-7.4-5.4-12.6-13.5-12.6 0 8.1 5.6 13.4 13.5 12.6z" fill="#f7faf2"/>
    <path d="M21 50h22" stroke="#f7faf2" stroke-width="4.5" stroke-linecap="round"/>
  </g>`;

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#137d41"/>${glyph()}</svg>`;
const fullBleed = (scale: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#137d41"/>${glyph(scale)}</svg>`;

async function main() {
  const hero = process.argv[2];
  await sharp(Buffer.from(rounded)).resize(32, 32).png().toFile(join(pub, "icon-32.png"));
  await sharp(Buffer.from(fullBleed(1))).resize(180, 180).png().toFile(join(pub, "apple-icon.png"));
  await sharp(Buffer.from(rounded)).resize(192, 192).png().toFile(join(pub, "icon-192.png"));
  await sharp(Buffer.from(rounded)).resize(512, 512).png().toFile(join(pub, "icon-512.png"));
  // Maskable icons need the glyph inside the central 80% safe zone.
  await sharp(Buffer.from(fullBleed(0.78))).resize(512, 512).png().toFile(join(pub, "icon-maskable-512.png"));
  if (hero) {
    await sharp(hero)
      .extract({ left: 282, top: 236, width: 460, height: 460 })
      .resize(720, 720)
      .webp({ quality: 82 })
      .toFile(join(pub, "welcome-hero.webp"));
  }
  console.log("Icons written to /public");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
