// Post-build step for the presentation mockup.
// Vite (with vite-plugin-singlefile) already inlines all JS + CSS into
// dist/index.html. The only remaining external references are the logo
// assets in public/ (referenced as plain "/name.png" paths) — those break
// from file://. Here every "/name.png" found in the built HTML is swapped
// for its own embedded data URI, and the result is written as the final,
// fully self-contained WMS-demo.html.
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'

let html = readFileSync('dist/index.html', 'utf8')

// Every PNG vite copied from public/ into dist/ (the logo assets) — anything else matching
// *.png in the bundle belongs to a dependency's own strings, not to us, and must be left alone.
const assets = readdirSync('dist').filter(f => f.endsWith('.png'))

let embedded = 0
for (const filename of assets) {
  // vite's base: './' strips the leading slash at build time, so a source `/name.png` can
  // show up here as "name.png" or "./name.png" depending on how it was referenced.
  const variants = [`"${filename}"`, `"./${filename}"`, `"/${filename}"`]
  const found = variants.find(v => html.includes(v))
  if (!found) continue
  const dataUri = 'data:image/png;base64,' + readFileSync(`dist/${filename}`).toString('base64')
  for (const v of variants) html = html.split(v).join(JSON.stringify(dataUri))
  embedded++
}

writeFileSync('WMS-demo.html', html)

const kb = Math.round(statSync('WMS-demo.html').size / 1024)
const leftover = assets.filter(filename =>
  [`"${filename}"`, `"./${filename}"`, `"/${filename}"`].some(v => html.includes(v))
).length
console.log(`WMS-demo.html written — ${kb} KB, logo refs embedded: ${embedded}, leftover asset refs: ${leftover}`)
if (leftover > 0) {
  console.warn('WARNING: unresolved image reference remains — an asset may not load from file://')
  process.exit(1)
}
