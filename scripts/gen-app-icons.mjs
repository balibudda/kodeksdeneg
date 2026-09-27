// Генерация исходников иконки/сплэша для Android-приложения (Capacitor):
// resources/icon.png, icon-foreground.png, icon-background.png, splash.png.
// Не самописный PNG-кодек (как у kodeksdetstva) — тут проще: рендерим тот же
// SVG-глиф, что и в public/favicon.svg (стилизованный знак ₽ в скруглённом
// квадрате, акцент #3a4f6b), через уже имеющийся в devDependencies Playwright.
// Нужно один раз локально — на билд Vercel/CI не влияет (это только для
// сборки APK через npx cap sync android).

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'resources')
mkdirSync(OUT, { recursive: true })

const BG = '#3a4f6b'
const FG = '#faf7f0'

// глиф из public/favicon.svg (viewBox 0 0 64 64) — знак ₽: кольцо + буква Р с перекладиной
const GLYPH = `<circle cx="32" cy="32" r="17" fill="none" stroke="${FG}" stroke-width="3.4" />
  <path d="M27 24v16M27 24h6.5a4 4 0 0 1 0 8H27M27 32h9" fill="none" stroke="${FG}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />`

function page(bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent;}
    svg{display:block;}
  </style></head><body>${bodyHtml}</body></html>`
}

async function shot(browser, html, size, outFile, { transparent = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.setContent(html)
  await p.screenshot({ path: outFile, omitBackground: transparent })
  await ctx.close()
}

async function main() {
  const browser = await chromium.launch()

  // icon.png — полная иконка сайта (скруглённый фон + кольцо + знак), 1024
  await shot(
    browser,
    page(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">
      <rect width="64" height="64" rx="14" fill="${BG}" />
      ${GLYPH}
    </svg>`),
    1024,
    path.join(OUT, 'icon.png'),
  )

  // icon-foreground.png — только глиф, без фона (Android сам применит маску адаптивной иконки), 1024
  await shot(
    browser,
    page(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">${GLYPH}</svg>`),
    1024,
    path.join(OUT, 'icon-foreground.png'),
    { transparent: true },
  )

  // icon-background.png — сплошной фирменный цвет на весь холст, 1024
  await shot(browser, page(`<div style="width:1024px;height:1024px;background:${BG};"></div>`), 1024, path.join(OUT, 'icon-background.png'))

  // splash.png — сплошной фон, 2732 (как у kodeksdetstva — без логотипа, чтобы не мигал не в масштабе на разных экранах)
  await shot(browser, page(`<div style="width:2732px;height:2732px;background:${BG};"></div>`), 2732, path.join(OUT, 'splash.png'))

  await browser.close()
  console.log('Иконки для Android: resources/icon.png, icon-foreground.png, icon-background.png, splash.png')
}

main()
