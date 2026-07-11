import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const svg = readFileSync(`${projectRoot}/src/assets/padel-brow-mark.svg`)
mkdirSync(`${projectRoot}/public/icons`, { recursive: true })

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`${projectRoot}/public/icons/icon-${size}.png`)
  console.log(`Generated public/icons/icon-${size}.png`)
}
