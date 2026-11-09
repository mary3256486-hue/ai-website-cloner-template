import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const logo = path.join(root, "public", "sites", "PAT", "images", "han-pham.png");
const RED = "#8a1c15";

const meta = await sharp(logo).metadata();
if (!meta.hasAlpha) throw new Error("Logo cần nền trong suốt để đặt lên nền đỏ");

async function compose(size, logoHeight, out) {
  const resized = await sharp(logo).resize({ height: logoHeight }).png().toBuffer();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: size, height: size, channels: 4, background: RED } })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toFile(out);
  console.log(out);
}

await compose(1024, 780, path.join(root, "assets", "logo.png"));
await compose(2732, 1400, path.join(root, "assets", "splash.png"));
await compose(1024, 780, path.join(root, "build", "icon.png"));