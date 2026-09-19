// Post-build step for the presentation mockup.
// Vite (with vite-plugin-singlefile) already inlines all JS + CSS into
// dist/index.html. The only remaining external reference is the logo, which
// lives in public/ and is emitted as new URL("mic.png", import.meta.url).href
// — that breaks from file://. Here we swap it for an embedded data URI and
// write the final, fully self-contained WMS-demo.html.
import { readFileSync, writeFileSync, statSync } from 'node:fs'

const png = readFileSync('dist/mic.png').toString('base64')
const dataUri = 'data:image/png;base64,' + png

let html = readFileSync('dist/index.html', 'utf8')

const re = /new URL\(\s*"mic\.png"\s*,\s*import\.meta\.url\s*\)(\.href)?/g
const replaced = (html.match(re) || []).length
html = html.replace(re, JSON.stringify(dataUri))

// Belt-and-suspenders: catch any raw path references too.
html = html.split('"./mic.png"').join(JSON.stringify(dataUri))
           .split('"/mic.png"').join(JSON.stringify(dataUri))

writeFileSync('WMS-demo.html', html)

const kb = Math.round(statSync('WMS-demo.html').size / 1024)
const leftover = (html.match(/mic\.png/g) || []).length
console.log(`WMS-demo.html written — ${kb} KB, logo refs embedded: ${replaced}, leftover mic.png: ${leftover}`)
if (leftover > 0) {
  console.warn('WARNING: unresolved mic.png reference remains — the logo may not load from file://')
  process.exit(1)
}
