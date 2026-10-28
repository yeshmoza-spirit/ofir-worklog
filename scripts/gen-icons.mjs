import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const svg = readFileSync(new URL("./icon.svg", import.meta.url));

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#7c6a58"/>
  <g transform="translate(76,76) scale(0.70)">
    ${readFileSync(new URL("./icon.svg", import.meta.url), "utf8")
      .replace(/<\?xml.*\?>/, "")
      .replace(/<svg[^>]*>/, "")
      .replace("</svg>", "")}
  </g>
</svg>`;

async function run() {
  await sharp(svg).resize(192, 192).png().toFile(fileURLToPath(new URL("../public/icons/icon-192.png", import.meta.url)));
  await sharp(svg).resize(512, 512).png().toFile(fileURLToPath(new URL("../public/icons/icon-512.png", import.meta.url)));
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(fileURLToPath(new URL("../public/icons/icon-maskable-512.png", import.meta.url)));
  console.log("Icons generated");
}

run();
