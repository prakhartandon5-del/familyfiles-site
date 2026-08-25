/**
 * Static build for the familyfiles landing page.
 *
 *   node build.mjs   ->  dist/
 *
 * Every page is assembled from src/ with a shared head and footer, and all
 * configuration is substituted here at build time. That keeps the checkout URL
 * in exactly one place (site.config.json, or the CHECKOUT_URL env var) and
 * means the shipped HTML needs no JavaScript to work.
 */
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(ROOT, 'src')
const DIST = path.join(ROOT, 'dist')

const cfg = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'))

/* Env wins over the committed config, so production can be set in Vercel
   without a code change. */
const SITE_URL = (process.env.SITE_URL || cfg.siteUrl).replace(/\/$/, '')
const CHECKOUT_URL = process.env.CHECKOUT_URL || cfg.checkoutUrl || ''
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || cfg.supportEmail

/* Until a checkout link exists, every CTA scrolls to the offer section rather
   than pointing at a dead URL. One config value swaps them all over. */
const CTA_HREF = CHECKOUT_URL || '/#get'

const TITLE = "familyfiles — Get your family's important information together"
const DESC =
  'familyfiles helps you organize the important information your family may need, one useful step at a time. ' +
  'Private, simple and $19 one-time.'

const PAGES = [
  { file: 'index.html', out: 'index.html', path: '/', title: TITLE, desc: DESC },
  {
    file: 'privacy.html', out: 'privacy.html', path: '/privacy',
    title: 'Privacy — familyfiles',
    desc: 'How familyfiles handles your information: your family details stay on your own device, with no account and no cloud database.',
  },
  {
    file: 'terms.html', out: 'terms.html', path: '/terms',
    title: 'Terms — familyfiles',
    desc: 'The terms for buying and using familyfiles, a one-time $19 digital product.',
  },
  {
    file: 'contact.html', out: 'contact.html', path: '/contact',
    title: 'Contact — familyfiles',
    desc: 'Get in touch about familyfiles — questions before buying, download help, or a refund.',
  },
]

const UPDATED = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

const fill = (html, page) =>
  html
    .replaceAll('{{TITLE}}', page.title)
    .replaceAll('{{OG_TITLE}}', page.path === '/' ? 'familyfiles' : page.title)
    .replaceAll('{{DESC}}', page.desc)
    .replaceAll('{{PATH}}', page.path === '/' ? '' : page.path)
    .replaceAll('{{SITE_URL}}', SITE_URL)
    .replaceAll('{{CHECKOUT_URL}}', CTA_HREF)
    .replaceAll('{{SUPPORT_EMAIL}}', SUPPORT_EMAIL)
    .replaceAll('{{PRICE}}', cfg.price)
    .replaceAll('{{UPDATED}}', UPDATED)
    .replaceAll('{{YEAR}}', String(new Date().getFullYear()))

const run = async () => {
  await rm(DIST, { recursive: true, force: true })
  await mkdir(DIST, { recursive: true })

  const head = await readFile(path.join(SRC, '_head.html'), 'utf8')
  const foot = await readFile(path.join(SRC, '_foot.html'), 'utf8')

  for (const page of PAGES) {
    const body = await readFile(path.join(SRC, page.file), 'utf8')
    const html = fill(head + '\n' + body + '\n' + foot, page)
    if (html.includes('{{')) throw new Error(`Unreplaced token in ${page.out}: ${html.match(/\{\{\w+\}\}/)?.[0]}`)
    await writeFile(path.join(DIST, page.out), html)
  }

  await cp(path.join(SRC, 'styles.css'), path.join(DIST, 'styles.css'))
  await cp(path.join(ROOT, 'public'), DIST, { recursive: true })

  // Sitemap and robots reflect whatever domain this build targets.
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    PAGES.map((p) =>
      `  <url>\n    <loc>${SITE_URL}${p.path === '/' ? '/' : p.path}</loc>\n` +
      `    <changefreq>monthly</changefreq>\n    <priority>${p.path === '/' ? '1.0' : '0.5'}</priority>\n  </url>`
    ).join('\n') + '\n</urlset>\n'
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap)
  await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

  const files = await readdir(DIST)
  console.log(`Built ${PAGES.length} pages -> dist/`)
  console.log(`  checkout: ${CHECKOUT_URL ? CHECKOUT_URL : 'not set — CTAs link to /#get'}`)
  console.log(`  site url: ${SITE_URL}`)
  console.log(`  files:    ${files.join(', ')}`)
}

run().catch((e) => { console.error(e.message); process.exit(1) })
