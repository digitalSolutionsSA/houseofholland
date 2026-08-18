const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const crcBuf = Buffer.concat([t, data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, t, data, c])
}

function createSolidPNG(width, height, r, g, b) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2

  const rowSize = 1 + width * 3
  const raw = Buffer.alloc(height * rowSize)
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0
    for (let x = 0; x < width; x++) {
      const i = y * rowSize + 1 + x * 3
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 1 })
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

const assetsDir = path.join(__dirname, '..', 'assets')
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })

fs.writeFileSync(path.join(assetsDir, 'icon.png'), createSolidPNG(256, 256, 10, 10, 10))
fs.writeFileSync(path.join(assetsDir, 'splash.png'), createSolidPNG(256, 512, 10, 10, 10))
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), createSolidPNG(256, 256, 212, 175, 55))
fs.writeFileSync(path.join(assetsDir, 'notification-icon.png'), createSolidPNG(96, 96, 212, 175, 55))

console.log('Assets created.')
