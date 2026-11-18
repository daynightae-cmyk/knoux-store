import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = process.argv[2];
if (!output) throw new Error('Pass the destination .ico path.');

const source = await readFile(new URL('../src/app/icon.svg', import.meta.url));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const images = await page.evaluate(async ({ sizes, svg }) => {
    const mark = new Image();
    mark.src = `data:image/svg+xml;base64,${svg}`;
    await mark.decode();
    return sizes.map((size) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      const height = Math.floor(size * 0.875);
      const width = Math.round(mark.naturalWidth / mark.naturalHeight * height);
      context.drawImage(mark, Math.floor((size - width) / 2), Math.floor((size - height) / 2), width, height);
      return Array.from(context.getImageData(0, 0, size, size).data);
    });
  }, { sizes, svg: source.toString('base64') });

  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  const frames = images.map((pixels, index) => {
    const size = sizes[index];
    const maskStride = Math.ceil(size / 32) * 4;
    const pixelBytes = size * size * 4;
    const frame = Buffer.alloc(40 + pixelBytes + maskStride * size);
    frame.writeUInt32LE(40, 0);
    frame.writeInt32LE(size, 4);
    frame.writeInt32LE(size * 2, 8);
    frame.writeUInt16LE(1, 12);
    frame.writeUInt16LE(32, 14);
    frame.writeUInt32LE(pixelBytes, 20);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const input = ((size - y - 1) * size + x) * 4;
        const output = 40 + (y * size + x) * 4;
        frame.set([pixels[input + 2], pixels[input + 1], pixels[input], pixels[input + 3]], output);
        if (pixels[input + 3] === 0) frame[40 + pixelBytes + y * maskStride + (x >> 3)] |= 0x80 >> (x % 8);
      }
    }

    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size % 256;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
    return frame;
  });

  await writeFile(output, Buffer.concat([header, ...frames]));
} finally {
  await browser.close();
}
