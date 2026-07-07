/**
 * Generates icon-192.png and icon-512.png — zero dependencies, pure Node.js
 * Run: node scripts/gen-icons.mjs
 */
import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'

/* ── CRC32 ── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

/* ── PNG chunk builder ── */
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0)
  const combined = Buffer.concat([t, data])
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(combined), 0)
  return Buffer.concat([len, t, data, crc])
}

/* ── Draw icon into RGBA pixel array ── */
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4) // RGBA

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const s = size / 192

      // Rounded corner check
      const radius = size * 0.13
      const dx = Math.min(x, size - 1 - x)
      const dy = Math.min(y, size - 1 - y)
      if (dx < radius && dy < radius) {
        const cx = radius - dx, cy = radius - dy
        if (cx * cx + cy * cy > radius * radius) {
          pixels[idx + 3] = 0 // transparent corner
          continue
        }
      }

      // Background gradient (dark blue → indigo)
      const t = y / size
      pixels[idx]     = Math.round(0x06 + (0x1A - 0x06) * t)  // R
      pixels[idx + 1] = Math.round(0x00 + (0x00 - 0x00) * t)  // G
      pixels[idx + 2] = Math.round(0x2A + (0xC8 - 0x2A) * t)  // B
      pixels[idx + 3] = 255

      // Normalize to 192-space
      const nx = x / s, ny = y / s

      // White "I" — top bar, stem, bottom bar
      if (
        (nx >= 68 && nx < 124 && ny >= 30 && ny < 46) ||
        (nx >= 84 && nx < 108 && ny >= 46 && ny < 148) ||
        (nx >= 68 && nx < 124 && ny >= 148 && ny < 164)
      ) {
        pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255
        continue
      }

      // Green AI dot (circle at 148, 44, r=18)
      const ddx = nx - 148, ddy = ny - 44
      if (ddx * ddx + ddy * ddy <= 18 * 18) {
        pixels[idx] = 0x00; pixels[idx + 1] = 0xC8; pixels[idx + 2] = 0x96
      }
    }
  }
  return pixels
}

/* ── Build valid PNG ── */
function makePNG(size) {
  const pixels = drawIcon(size)

  // Raw image data: filter byte (0x00) before each row
  const raw = Buffer.allocUnsafe(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // None filter
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = y * (size * 4 + 1) + 1 + x * 4
      raw[dst]     = pixels[src]
      raw[dst + 1] = pixels[src + 1]
      raw[dst + 2] = pixels[src + 2]
      raw[dst + 3] = pixels[src + 3]
    }
  }

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const idat = pngChunk('IDAT', deflateSync(raw, { level: 6 }))
  const iend = pngChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), idat, iend])
}

import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
writeFileSync(join(publicDir, 'icon-192.png'), makePNG(192))
writeFileSync(join(publicDir, 'icon-512.png'), makePNG(512))
console.log('✅ icon-192.png and icon-512.png saved to /public/')
