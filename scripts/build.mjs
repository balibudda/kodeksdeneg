// Статический генератор сайта «Кодекс денег». Zero dependencies —
// только встроенные модули Node.js. По архитектуре — младший брат
// «Кодекса детства» (kodeksdetstva.ru): та же модель (раздел → тема →
// страница), тот же принцип «баланс тьмы и света» с самого начала.

import { mkdir, writeFile, rm, cp, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SECTIONS, TOPICS, topicUrl, sectionUrl, topicsOfSection, validateContent } from '../content/index.mjs'
import { CONTACTS, CONTACTS_BY_ID } from '../content/contacts.mjs'
import { sectionIconSvg } from '../content/icons.mjs'
import { topicIconSvg } from '../content/topic-icons.mjs'
import { NEWS } from '../content/news.mjs'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DIST = path.join(ROOT, 'dist')

const SITE = {
  name: 'Кодекс денег',
  tagline: 'долги, приставы, коллекторы, банкротство и личные финансы — простым языком',
  origin: 'https://kodeksdeneg.ru',
  description:
    'Справочник о деньгах: что делать, если приставы списали доход, звонят коллекторы, стоит ли банкротиться — и как научиться откладывать и не попасть на развод с инвестициями. Бесплатно, без рекламы платных услуг.',
}

const RU_MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]
const _now = new Date()
const BUILD_MONTH = `${RU_MONTHS[_now.getMonth()]} ${_now.getFullYear()} г.`

const BUILD_ID = String(Date.now())
const V = `?v=${BUILD_ID}`

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
function attr(s) {
  return esc(s).replace(/"/g, '&quot;')
}

// [[slug]] / [[slug|подпись]] -> ссылка на тему. Падаем на сборке, если slug не существует.
import { TOPICS_BY_SLUG } from '../content/index.mjs'
function richText(s) {
  return esc(s).replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/gi, (_, slug, label) => {
    const t = TOPICS_BY_SLUG[slug]
    if (!t) throw new Error(`richText: неизвестный slug "${slug}"`)
    return `<a href="${topicUrl(t)}">${esc(label || t.title)}</a>`
  })
}

function block(title, icon, items, cls) {
  if (!items || !items.length) return ''
  return `<section class="tblock ${cls}"><h2>${icon ? `<span class="ic">${icon}</span> ` : ''}${esc(title)}</h2><ul>${items
    .map((s) => `<li>${richText(s)}</li>`)
    .join('')}</ul></section>`
}

function renderContact(id) {
  const c = CONTACTS_BY_ID[id]
  if (!c) return ''
  const acts = []
  if (c.tel) acts.push(`<a class="c-act c-tel" href="tel:${attr(c.tel)}">☎ ${esc(c.telDisplay || c.tel)}</a>`)
  if (c.email) acts.push(`<a class="c-act c-mail" href="mailto:${attr(c.email)}">✉ ${esc(c.email)}</a>`)
  if (c.site) acts.push(`<a class="c-act c-site" href="${attr(c.site)}" target="_blank" rel="noopener noreferrer">🔗 ${esc(c.siteDisplay || c.site)}</a>`)
  return `<li class="contact">
    <div class="contact-name">${esc(c.name)}</div>
    <div class="contact-when"><b>Когда обращаться:</b> ${esc(c.when)}</div>
    ${acts.length ? `<div class="contact-actions">${acts.join('')}</div>` : ''}
  </li>`
}

function breadcrumbs(items) {
  const parts = items
    .map((it, i) => {
      const label = esc(it.name)
      return it.url && i < items.length - 1 ? `<a href="${attr(it.url)}">${label}</a>` : `<span aria-current="page">${label}</span>`
    })
    .join('<span class="sep">/</span>')
  return `<nav class="crumbs" aria-label="Хлебные крошки">${parts}</nav>`
}

// Быстрый поиск с чипами-примерами (14.09.2026, по просьбе Ника — «вначале
// поиск быстрый с разными возможными запросами» на страницах, где особенно
// нужно быстро найти свою ситуацию, не листая всё подряд). Не отдельная
// реализация — использует тот же /assets/search.js и #q/#results, что и
// главная и /poisk/; клик по чипу сразу подставляет текст и ищет (см.
// обработчик [data-q] в конце search.js). Подключать не более одного раза
// на страницу (общий #q по id) и не забыть сам <script src="/assets/search.js">.
function quickSearchBox(placeholder, chips) {
  const chipsHtml = chips.map((q) => `<button type="button" class="qs-chip" data-q="${attr(q)}">${esc(q)}</button>`).join('')
  return `<section class="home-search-box quick-search" aria-label="Быстрый поиск">
  <h2>🔎 Быстрый поиск по ситуации</h2>
  <p>Опишите своими словами, что случилось, или нажмите на пример ниже.</p>
  <form class="search-form home-search" role="search" onsubmit="return false">
    <input type="search" id="q" name="q" placeholder="${attr(placeholder)}" autocomplete="off">
  </form>
  <div class="qs-chips">${chipsHtml}</div>
  <ul id="results" class="search-results" aria-live="polite"></ul>
</section>`
}

// JSON-LD BreadcrumbList — те же items, что рендерятся в breadcrumbs().
function breadcrumbsJsonLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: SITE.origin + it.url } : {}),
    })),
  }
}

function ldScript(data) {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}

function xmlEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}
function translit(s) {
  return String(s)
    .toLowerCase()
    .split('')
    .map((ch) => (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch))
    .join('')
}
function slugify(s) {
  return translit(s)
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

function newsItemSlug(n) {
  return n.slug || `${n.date}-${slugify(n.title)}`.slice(0, 80).replace(/-+$/, '')
}
function newsItemUrl(n) {
  return `/novosti/${newsItemSlug(n)}/`
}

function newsTeaser(summary) {
  const s = String(summary || '')
  const target = Math.round(s.length / 2)
  if (s.length <= target) return s
  const cut = s.lastIndexOf(' ', target)
  return s.slice(0, cut > 0 ? cut : target).replace(/[,;:.\s]+$/, '') + '…'
}

function newsRelatedHtml(n) {
  const rel = (n.relatedTopics || [])
    .map((slug) => TOPICS_BY_SLUG[slug])
    .filter(Boolean)
    .map((t) => `<a href="${topicUrl(t)}">${esc(t.title)}</a>`)
    .join(', ')
  return rel ? `<p class="news-related">Читать по теме: ${rel}</p>` : ''
}

function renderNovosti() {
  const sorted = NEWS.slice().sort((a, b) => (a.date < b.date ? 1 : -1))
  const list = sorted
    .map(
      (n) => `<li class="news-item">
        <a href="${newsItemUrl(n)}">
          <p class="news-date">${esc(n.date)}</p>
          <h2>${esc(n.title)}</h2>
          <p>${esc(newsTeaser(n.summary))}</p>
          <span class="news-open">Читать целиком →</span>
        </a>
      </li>`,
    )
    .join('')

  const crumbs = [{ name: 'Главная', url: '/' }, { name: 'Новости', url: '/novosti/' }]
  const main = `
${breadcrumbs(crumbs)}
<h1>Новости: законы и госинициативы о деньгах и долгах</h1>
<p class="frame">Только законодательство — новые законы, поправки, официальные инициативы ЦБ, Минфина, ФССП и других ведомств, касающиеся долгов, кредитов, приставов и личных финансов. Без криминальной хроники и трагедий. У каждой новости — прямая ссылка на первоисточник, проверяйте актуальность там же.</p>
<p class="news-subscribe"><a class="btn btn-ghost" href="/novosti/rss.xml">📶 Подписаться (RSS)</a> — добавьте ссылку в любой RSS-читалку (Inoreader, Feedly и т. п.), новые записи будут приходить туда автоматически.</p>
${sorted.length ? `<ul class="news-list">${list}</ul>` : '<p class="news-empty">Пока новостей нет — раздел новый, наполняется по мере появления значимых изменений в законодательстве.</p>'}`

  return layout({
    title: `Новости: законы и инициативы о деньгах — ${SITE.name}`,
    description: 'Новые законы, поправки и государственные инициативы, касающиеся долгов, кредитов, приставов и личных финансов в России. Без криминальной хроники — только законодательство, со ссылками на первоисточники.',
    canonicalPath: '/novosti/',
    bodyClass: 'page-novosti',
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
    main,
  })
}

// Длинный summary (≥1000 символов) — несколько абзацев через пустую
// строку; рендерим каждый своим <p>, не одним сплошным полотном текста.
function newsParagraphs(summary) {
  return String(summary)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('\n  ')
}

function renderNewsItem(n) {
  const crumbs = [{ name: 'Главная', url: '/' }, { name: 'Новости', url: '/novosti/' }, { name: n.title, url: newsItemUrl(n) }]
  const main = `
${breadcrumbs(crumbs)}
<article>
  <p class="news-date">${esc(n.date)}</p>
  <h1>${esc(n.title)}</h1>
  ${newsParagraphs(n.summary)}
  <p class="news-source">Источник: <a href="${attr(n.sourceUrl)}" target="_blank" rel="nofollow noopener noreferrer">${esc(n.sourceName)}</a></p>
  ${newsRelatedHtml(n)}
</article>
<p><a href="/novosti/">← Все новости</a></p>`

  return layout({
    title: `${n.title} — Новости — ${SITE.name}`,
    description: n.summary.slice(0, 170),
    canonicalPath: newsItemUrl(n),
    bodyClass: 'page-news-item',
    jsonLd: [
      { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: n.title,
        description: n.summary,
        datePublished: n.date,
        inLanguage: 'ru-RU',
        mainEntityOfPage: SITE.origin + newsItemUrl(n),
        publisher: { '@type': 'Organization', name: SITE.name, url: SITE.origin },
        isAccessibleForFree: true,
      },
    ],
    main,
  })
}

function buildNewsRss() {
  const sorted = NEWS.slice().sort((a, b) => (a.date < b.date ? 1 : -1))
  const items = sorted
    .map((n) => {
      const url = SITE.origin + newsItemUrl(n)
      const pubDate = new Date(n.date + 'T09:00:00Z').toUTCString()
      return `  <item>
    <title>${xmlEsc(n.title)}</title>
    <link>${xmlEsc(url)}</link>
    <guid isPermaLink="true">${xmlEsc(url)}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${xmlEsc(n.summary)}</description>
  </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${xmlEsc(SITE.name)} — новости</title>
  <link>${xmlEsc(SITE.origin + '/novosti/')}</link>
  <description>${xmlEsc('Законы и госинициативы о деньгах, долгах и личных финансах')}</description>
  <language>ru</language>
${items}
</channel></rss>`
}

function layout({ title, description, canonicalPath, bodyClass = '', accent = '', main, jsonLd, noindex = false }) {
  const canonical = SITE.origin + canonicalPath
  const ldBlocks = (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []).map(ldScript).join('\n')
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${attr(canonical)}">
${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(SITE.name)}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${attr(canonical)}">
<meta property="og:locale" content="ru_RU">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(description)}">
<meta name="theme-color" content="#3a4f6b">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${attr(SITE.name)} — новости" href="/novosti/rss.xml">
<link rel="stylesheet" href="/assets/styles.css${V}">
${ldBlocks}
<!-- Yandex.Metrika counter (загружается на всех страницах, без записи действий: Вебвизор отключён) -->
<script type="text/javascript">
  window.kdLoadMetrika = function () {
    if (window.__kdMetrikaLoaded) return;
    window.__kdMetrikaLoaded = true;
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=112520018', 'ym');
    ym(112520018, 'init', {ssr:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
  };
  window.kdLoadMetrika();
</script>
<!-- /Yandex.Metrika counter -->
</head>
<body class="${bodyClass}"${accent ? ` style="--sec:${accent}"` : ''}>
<a class="skip" href="#main">К содержанию</a>
<header class="site-head">
  <div class="head-inner">
    <details class="menu" id="menu">
      <summary class="menu-btn" aria-label="Меню разделов">☰</summary>
      <nav class="menu-panel" aria-label="Разделы">
        <a class="menu-home" href="/">На главную</a>
        <p class="menu-h">Разделы</p>
        <ul>
          ${SECTIONS.map((s) => `<li><a href="${sectionUrl(s)}" style="--sec:${s.accent}"><span class="menu-i">${sectionIconSvg(s.id, 18)}</span> ${esc(s.title)} <b>${topicsOfSection(s.id).length}</b></a></li>`).join('')}
        </ul>
        <p class="menu-h">Ещё</p>
        <ul>
          <li><a href="/poisk/">🔎 Поиск по ситуации</a></li>
          <li><a href="/vse-temy/">📚 Все темы</a></li>
          <li><a href="/priznaki-moshennika/">🛑 Признаки мошенника</a></li>
          <li><a href="/novosti/">📰 Новости</a></li>
          <li><a href="/kontakty/">📞 Все контакты</a></li>
          <li><a href="/sovetnik/">🧭 Советник — личная консультация</a></li>
          <li><a href="/o-proekte/">О проекте</a></li>
          <li><a href="/politika/">Политика конфиденциальности</a></li>
        </ul>
      </nav>
    </details>
    <a class="logo" href="/"><img class="logo-mark" src="/favicon.svg" alt="" width="24" height="24"><span>${esc(SITE.name)}</span></a>
    <a class="search-btn" href="/poisk/" aria-label="Поиск по ситуации" title="Поиск">🔎</a>
  </div>
</header>
<main id="main">
${main}
</main>
<footer class="site-foot">
  <nav class="foot-nav">
    <a href="/">Главная</a>
    <a href="/vse-temy/">Все темы</a>
    <a href="/priznaki-moshennika/">Признаки мошенника</a>
    <a href="/novosti/">Новости</a>
    <a href="/kontakty/">Все контакты</a>
    <a href="/sovetnik/">Советник</a>
    <a href="/o-proekte/">О проекте</a>
  </nav>
  <p class="foot-sibling">Наш сайт-брат — <a href="https://kodeksdetstva.ru" target="_blank" rel="noopener noreferrer">«Кодекс детства»</a>: справочник о правах ребёнка для родителей и подростков.</p>
  <p class="foot-mission">Наша миссия — чтобы в вопросах денег человек точно знал, что говорит закон и на что он реально имеет право: с приставами, коллекторами, банком, работодателем, арендодателем или мошенником — и не платил дважды, деньгами и страхом от незнания.</p>
  <p class="foot-disclaimer">Справочно-просветительские материалы, не заменяют консультацию юриста. Предоставляются «как есть», без гарантий. Проект бесплатный, без рекламы платных услуг и без продажи «банкротства под ключ». <a href="/politika/">Политика обработки персональных данных</a>.</p>
  <p class="foot-tg">Бот с поиском по темам — <a href="https://t.me/kodeksdeneg_bot" target="_blank" rel="noopener noreferrer">✈️ t.me/kodeksdeneg_bot</a> · Контакты и обратная связь — <a href="https://t.me/Reborn_Lab" target="_blank" rel="noopener noreferrer">✈️ t.me/Reborn_Lab</a></p>
  <p class="foot-tg"><a href="https://github.com/balibudda/kodeksdeneg-releases/releases/latest/download/kodeksdeneg.apk">📱 Скачать APK для Android</a> — отдельное приложение (не браузер), тот же справочник офлайн.</p>
  <div id="app-version-box" class="app-version-box" hidden>
    <p class="app-version-line">📱 Версия приложения: <b id="app-version-num"></b></p>
    <p class="app-version-update" id="app-update-box" hidden><a id="app-update-link" href="https://github.com/balibudda/kodeksdeneg-releases/releases/latest">🔴 Доступна новая версия — скачать</a></p>
  </div>
</footer>
<div class="cookie-bar" id="cookie-bar" hidden>
  <p>Сайт использует cookies и сервис Яндекс.Метрика — только для обезличенной статистики посещаемости, без записи ваших действий на странице. Продолжая пользоваться сайтом, вы соглашаетесь с этим. Подробнее — в <a href="/politika/">Политике обработки персональных данных</a>.</p>
  <div class="cookie-actions">
    <button type="button" id="cookie-accept" class="btn">Понятно</button>
  </div>
</div>
<script>
(function () {
  var KEY = 'kd_cookie_consent';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  var bar = document.getElementById('cookie-bar');
  if (!bar) return;
  if (stored === '1' || stored === '0') { bar.hidden = true; return; }
  bar.hidden = false;
  var a = document.getElementById('cookie-accept');
  if (a) a.addEventListener('click', function () {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    bar.hidden = true;
  });
})();
</script>
<script src="/assets/nav.js${V}" defer></script>
</body>
</html>`
}

function renderHome() {
  const sectionsHtml = SECTIONS.map(
    (s) => `<li class="sec-card" style="--sec:${s.accent}">
      <a class="sec-card-head" href="${sectionUrl(s)}">
        <span class="sec-card-txt">
          <span class="sec-title"><span class="tc-icon">${sectionIconSvg(s.id, 20)}</span>${esc(s.title)}</span>
          <span class="sec-lead">${esc(s.lead)}</span>
          <span class="sec-open">Все темы раздела (${topicsOfSection(s.id).length}) →</span>
        </span>
        <span class="tc-go" aria-hidden="true">›</span>
      </a>
      <ul class="sec-topics">${topicsOfSection(s.id)
        .slice(0, 10)
        .map((t) => `<li><span class="tc-icon">${topicIconSvg(t.slug, 15)}</span><a href="${topicUrl(t)}">${esc(t.title)}</a></li>`)
        .join('')}</ul>
    </li>`,
  ).join('')

  const main = `
<section class="hero">
  <svg class="hero-deco" width="240" height="240" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <circle cx="195" cy="35" r="130" fill="currentColor" opacity=".07"/>
    <circle cx="210" cy="80" r="78" fill="currentColor" opacity=".09"/>
    <circle cx="160" cy="10" r="42" fill="currentColor" opacity=".12"/>
  </svg>
  <div class="hero-content">
  <h1>${esc(SITE.name)}</h1>
  <p class="freshness-badge">✅ Все ${TOPICS.length} тем проверены и актуальны на <b>${esc(BUILD_MONTH)}</b></p>
  <p class="hero-lead">Справочник о деньгах простым языком: приставы списали доход, звонят коллекторы, стоит ли банкротиться — и как научиться откладывать, не попадая на развод с инвестициями.</p>
  <p class="hero-lead hero-lead2">Без рекламы платных услуг. Мы не продаём «банкротство под ключ» — честно объясняем, когда оно вообще нужно.</p>
  <div class="hero-cta">
    <a class="btn btn-fill" href="/poisk/">🔎 Найти свою ситуацию</a>
    <a class="btn" href="/vse-temy/">📚 Все ${TOPICS.length} тем</a>
    <a class="btn" href="/priznaki-moshennika/">🛑 Признаки мошенника</a>
  </div>
  </div>
</section>
<section class="home-stats" aria-label="Масштаб проекта">
  <a class="stat" href="/vse-temy/"><b>${TOPICS.length}</b><span>разобранных тем</span></a>
  <a class="stat" href="#razdely"><b>${SECTIONS.length}</b><span>разделов</span></a>
  <a class="stat" href="/kontakty/"><b>${CONTACTS.length}</b><span>федеральных контактов</span></a>
</section>
<section class="home-search-box" aria-label="Поиск по ситуации">
  <h2>🔎 Найдите свою ситуацию</h2>
  <p>Опишите простыми словами, что случилось, — поиск подберёт подходящие темы.</p>
  <form class="search-form home-search" role="search" onsubmit="return false">
    <input type="search" id="q" name="q" placeholder="«приставы списали деньги», «звонят коллекторы», «взяли микрозайм»…" autocomplete="off">
  </form>
  <ul id="results" class="search-results" aria-live="polite"></ul>
</section>
<h2 class="sec-h">Разделы</h2>
<nav class="sec-nav" aria-label="Быстрый переход по разделам">
  ${SECTIONS.map(
    (s) => `<a class="sec-chip" href="${sectionUrl(s)}" style="--sec:${s.accent}"><span class="sec-chip-i">${sectionIconSvg(s.id, 16)}</span><span>${esc(s.title)}</span><span class="sec-chip-n">${topicsOfSection(s.id).length}</span></a>`,
  ).join('')}
</nav>
<h2 class="sec-h" id="razdely">Разделы — подробно</h2>
<ul class="sec-list">${sectionsHtml}</ul>
<script src="/assets/search.js${V}" defer></script>`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.name,
      url: SITE.origin,
      description: SITE.description,
      inLanguage: 'ru',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE.name,
      url: SITE.origin,
      description: SITE.description,
    },
  ]

  return layout({ title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description, canonicalPath: '/', bodyClass: 'page-home', main, jsonLd })
}

function renderSection(s) {
  const topics = topicsOfSection(s.id)
  const list = topics
    .map(
      (t) => `<li class="topic-card">
      <a href="${topicUrl(t)}">
        <span class="tc-body">
          <span class="tc-title-row"><span class="tc-icon">${topicIconSvg(t.slug, 16)}</span><span class="tc-title">${esc(t.title)}</span></span>
          <span class="tc-desc">${esc(t.seoDescription)}</span>
        </span>
        <span class="tc-go" aria-hidden="true">›</span>
      </a>
    </li>`,
    )
    .join('')
  const crumbs = [{ name: 'Главная', url: '/' }, { name: s.title, url: sectionUrl(s) }]
  // На «Мошенничестве» — быстрый поиск с примерами прямо вверху страницы
  // (Ник: «вначале поиск быстрый») и явная ссылка на хаб-разбор признаков —
  // без нового пункта в общем меню её было не найти, кроме как с главной.
  const mosQuickSearch =
    s.id === 'moshennichestvo'
      ? quickSearchBox('«мошенники звонят», «перевела деньги мошенникам», «поддельный сайт»…', [
          'мошенники звонят',
          'перевела деньги мошенникам',
          'поддельный сайт оплаты',
          'SMS про штраф или посылку',
          'мошенники с криптовалютой',
          'проверить коллектора',
          'обманули с билетами',
          'мошенники в Telegram',
        ])
      : ''
  const mosHubLink =
    s.id === 'moshennichestvo'
      ? `<p class="frame"><a href="/priznaki-moshennika/"><b>🛑 Как распознать мошенника — разбор всех ${topics.length} схем по типам →</b></a></p>`
      : ''
  const main = `${breadcrumbs(crumbs)}
<h1><span class="tc-icon">${sectionIconSvg(s.id, 26)}</span>${esc(s.title)}</h1>
<p class="frame">${esc(s.frame)}</p>
${mosHubLink}
${mosQuickSearch}
<ul class="topic-list">${list}</ul>
${s.id === 'moshennichestvo' ? `<script src="/assets/search.js${V}" defer></script>` : ''}`
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: s.title,
      url: SITE.origin + sectionUrl(s),
      description: s.lead,
      isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.origin },
      hasPart: topics.map((t) => ({ '@type': 'Article', name: t.title, url: SITE.origin + topicUrl(t) })),
    },
    { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
  ]
  return layout({
    title: `${s.title} — ${SITE.name}`,
    description: `${s.lead} ${s.frame}`.slice(0, 300),
    canonicalPath: sectionUrl(s),
    bodyClass: 'page-section',
    accent: s.accent,
    main,
    jsonLd,
  })
}

function renderTopic(t) {
  const s = SECTIONS.find((sec) => sec.id === t.sectionId)
  const crumbs = [{ name: 'Главная', url: '/' }, { name: s.title, url: sectionUrl(s) }, { name: t.title, url: topicUrl(t) }]
  const contactsHtml = t.contacts?.length
    ? `<section class="tblock contacts"><h2>📞 Куда обратиться</h2><ul class="contact-list">${t.contacts.map(renderContact).join('')}</ul></section>`
    : ''
  const relatedHtml = t.related?.length
    ? `<section class="tblock related"><h2>Смежные темы</h2><ul>${t.related
        .map((slug) => TOPICS_BY_SLUG[slug])
        .filter(Boolean)
        .map((rt) => `<li><a href="${topicUrl(rt)}">${esc(rt.title)}</a></li>`)
        .join('')}</ul></section>`
    : ''
  const sourcesHtml = t.sources?.length ? `<section class="tblock sources"><h2>На чём основано</h2><ul>${t.sources.map((s2) => `<li>${esc(s2)}</li>`).join('')}</ul></section>` : ''

  const main = `${breadcrumbs(crumbs)}
<h1>${esc(t.title)}</h1>
${block('Что происходит', '', t.sut, 'sut')}
${block('Что сделать в первую очередь', '📌', t.first, 'first')}
${block('Что говорит закон', '⚖️', t.law, 'law')}
${block('По шагам', '✅', t.steps, 'steps')}
${block('Чего не делать', '⛔', t.dont, 'dont')}
${contactsHtml}
${sourcesHtml}
${relatedHtml}`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: t.title,
      description: t.seoDescription,
      url: SITE.origin + topicUrl(t),
      inLanguage: 'ru',
      dateModified: t.updated,
      datePublished: t.updated,
      keywords: (t.keywords || []).join(', '),
      author: { '@type': 'Organization', name: SITE.name, url: SITE.origin },
      publisher: { '@type': 'Organization', name: SITE.name, url: SITE.origin },
      about: s.title,
      isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.origin },
    },
    { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
  ]

  return layout({
    title: `${t.title} — ${SITE.name}`,
    description: t.seoDescription,
    canonicalPath: topicUrl(t),
    bodyClass: 'page-topic',
    accent: s.accent,
    main,
    jsonLd,
  })
}

function renderKontakty() {
  const crumbs = [{ name: 'Главная', url: '/' }, { name: 'Все контакты', url: '/kontakty/' }]
  const main = `${breadcrumbs(crumbs)}
<h1>Все контакты</h1>
<p class="frame">Телефоны кликабельны. Проверенные официальные линии.</p>
<ul class="contact-list">${CONTACTS.map((c) => renderContact(c.id)).join('')}</ul>`
  return layout({
    title: `Все контакты — ${SITE.name}`,
    description: 'Официальные контакты: ФССП, финансовый уполномоченный, ЦБ РФ, Роспотребнадзор, прокуратура.',
    canonicalPath: '/kontakty/',
    bodyClass: 'page-contacts',
    main,
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
  })
}

function renderAbout() {
  const crumbs = [{ name: 'Главная', url: '/' }, { name: 'О проекте', url: '/o-proekte/' }]
  const main = `${breadcrumbs(crumbs)}
<h1>О проекте</h1>
<p class="frame">Долг — это не приговор и не повод для стыда, а обычная юридическая ситуация со своими правилами. Большинство проблем с приставами, коллекторами и банками решаются не «связями» и не страхом, а простым знанием: что закон реально разрешает делать взыскателю, а что — просто запугивание на грани блефа.</p>
<p>«${esc(SITE.name)}» — бесплатный справочник о деньгах, долгах и правах должника: что делать, если приставы списали доход, звонят коллекторы, стоит ли банкротиться, как не попасть на развод с инвестициями и микрозаймами. Мы не продаём банкротство «под ключ» и не берём рекламу от коллекторских, микрофинансовых или кредитных организаций.</p>
<p><b>Мы честно называем каждую часть этой работы так, какая она есть</b>: почти весь сайт — защитный, юридический справочник, «что делать, если уже плохо», а не курс по инвестициям или личностному росту. Раздел «<a href="/rost-i-svoboda/">Рост и свобода</a>» — единственное исключение, и оно явно обозначено, а не спрятано под той же вывеской: там нет статей закона, потому что это не про защиту прав, а про мышление и рост. Мы не продаём готовую формулу быстрого богатства и не занимаемся инвестиционными советами — только честный разговор о том, что реально стоит за словами «финансовая свобода».</p>
<h2>Как устроена каждая тема</h2>
<ul>
  <li><b>Что происходит</b> — суть ситуации простыми словами, без канцелярита;</li>
  <li><b>Что сделать в первую очередь</b> — конкретные шаги, а не общие советы «обратитесь к юристу»;</li>
  <li><b>Дальнейшие шаги</b> — что делать, если первый шаг не сработал;</li>
  <li><b>⚖️ Что говорит закон</b> — с номером статьи и, где уместно, дословной цитатой нормы;</li>
  <li><b>Чего не делать</b> — частые ошибки, которые ухудшают положение должника;</li>
  <li><b>Контакты и источники</b> — куда обратиться и откуда взята норма, чтобы можно было проверить самим.</li>
</ul>
<h2>Как готовятся материалы и почему им можно доверять — с оговорками</h2>
<p>Тексты сайта пишутся с помощью ИИ (Claude), который сверяется с текстами законов и официальными источниками («Консультант Плюс», «Гарант», сайты ЦБ/ФССП/Минфина) и старается приводить формулировки норм дословно, со ссылкой на статью. Это не «пересказ по памяти из интернета» и не выдумка — но и не гарантия отсутствия ошибок: законы меняются, ставки и лимиты пересматриваются, а формулировка нормы — тонкая вещь, где легко ошибиться в нюансе.</p>
<p><b>Поэтому прямо и без обтекаемости:</b> материалы сайта предоставляются «как есть», носят справочно-просветительский характер, не являются юридической или финансовой консультацией и не создают никаких обязательств между вами и Оператором сайта. Перед тем как принимать решение по мотивам прочитанного — сверьте норму с актуальной редакцией закона (например, на <a href="https://www.consultant.ru/" target="_blank" rel="noopener noreferrer">consultant.ru</a>) и, если сумма или ситуация серьёзная, проконсультируйтесь с живым юристом. Оператор не несёт ответственности за решения, принятые исключительно на основании материалов сайта без такой проверки.</p>
<p>Сайт некоммерческий и бесплатный: мы не оказываем платных услуг и не заключаем с посетителем никакого договора. Если вы нашли неточность, устаревшую норму (изменившийся лимит, ставку, реквизиты) или ошибку — это самый ценный сигнал, который вы можете нам дать: напишите в Telegram <a href="https://t.me/Reborn_Lab" target="_blank" rel="noopener noreferrer">t.me/Reborn_Lab</a>, и мы проверим и поправим.</p>
<h2>Независимость</h2>
<p>«${esc(SITE.name)}» — независимый проект. Он не является государственным ресурсом, не связан с банками, коллекторскими агентствами, кредитными организациями или органами взыскания и не получает от них никакого вознаграждения. Материалы готовятся на основе открытых источников и действующего законодательства.</p>
<h2>Данные и приватность</h2>
<p>Сайт использует cookies и сервис веб-аналитики Яндекс.Метрика, чтобы понимать, как посетители пользуются справочником. Аналитика обезличенная и без записи ваших действий на странице (Вебвизор не используется). Что именно собирается и зачем — в <a href="/politika/">Политике обработки персональных данных</a>.</p>`
  return layout({
    title: `О проекте — ${SITE.name}`,
    description: 'Зачем нужен справочник «Кодекс денег», как устроена каждая тема и почему это честно защитный, а не инвестиционный проект.',
    canonicalPath: '/o-proekte/',
    bodyClass: 'page-about',
    main,
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
  })
}

function renderSovetnik() {
  const crumbs = [{ name: 'Главная', url: '/' }, { name: 'Советник', url: '/sovetnik/' }]
  const main = `${breadcrumbs(crumbs)}
<h1>Советник</h1>
<p class="frame">Иногда мало прочитать тему на сайте — ситуация не укладывается в готовый разбор, и хочется просто рассказать всё как есть человеку, а не искать по ключевым словам. Это и есть «Советник»: личное общение со мной, автором проекта — не с юристом по образованию, а с человеком, который несколько лет разбирался в теме долгов, приставов и денег вплотную, чтобы этот сайт вообще появился.</p>
<h2>Что это</h2>
<ul>
  <li>Ты пишешь свою ситуацию своими словами — как есть, без «юридического» языка;</li>
  <li>Я читаю и отвечаю лично, в переписке — без готовых шаблонов;</li>
  <li>Если вопрос выходит за рамки того, в чём я реально разбираюсь — честно скажу, что тут нужен живой юрист, и не буду делать вид, что знаю больше, чем знаю.</li>
</ul>
<p>Цена не фиксирована и не указана здесь — обсуждается лично, в переписке, в зависимости от ситуации. Никакой оплаты на этом шаге нет — просто оставь заявку, а дальше решим вместе, есть ли смысл и во что это выльется.</p>
<h2>Оставить заявку</h2>
<form id="sovetnik-form" class="sovetnik-form">
  <label>Имя (необязательно)<input type="text" name="name" maxlength="120" autocomplete="name"></label>
  <label>Контакт для связи *<input type="text" name="contact" required minlength="3" maxlength="200" placeholder="телефон, e-mail или ник в Telegram" autocomplete="tel"></label>
  <label>Удобный канал связи
    <select name="channel">
      <option value="telegram">Telegram</option>
      <option value="whatsapp">WhatsApp</option>
      <option value="email">E-mail</option>
    </select>
  </label>
  <label>Твоя ситуация *<textarea name="question" required minlength="15" maxlength="4000" rows="6" placeholder="Расскажи, что происходит — чем подробнее, тем точнее смогу ответить"></textarea></label>
  <input type="text" name="company" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button type="submit" class="btn btn-fill">Отправить заявку</button>
  <p id="sovetnik-status" class="sovetnik-status" role="status" aria-live="polite"></p>
</form>
<script>
(function () {
  var form = document.getElementById('sovetnik-form');
  if (!form) return;
  var status = document.getElementById('sovetnik-status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var body = {
      name: fd.get('name'), contact: fd.get('contact'), channel: fd.get('channel'),
      question: fd.get('question'), company: fd.get('company'),
    };
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    status.textContent = 'Отправляю…';
    fetch('https://bot.kodeksdeneg.ru/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function () {
        form.innerHTML = '';
        status.textContent = 'Заявка отправлена. Я отвечу лично на указанный контакт — обычно в течение нескольких дней.';
      })
      .catch(function () {
        btn.disabled = false;
        status.textContent = 'Не получилось отправить — попробуй ещё раз или напиши прямо в Telegram: t.me/Reborn_Lab';
      });
  });
})();
</script>`
  return layout({
    title: `Советник — личная консультация — ${SITE.name}`,
    description: 'Личное общение с автором проекта «Кодекс денег» по твоей ситуации с долгами, приставами или деньгами — не готовый шаблон, а разговор один на один.',
    canonicalPath: '/sovetnik/',
    bodyClass: 'page-sovetnik',
    main,
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
  })
}

function renderPolitika() {
  const crumbs = [{ name: 'Главная', url: '/' }, { name: 'Политика обработки персональных данных', url: '/politika/' }]
  const main = `${breadcrumbs(crumbs)}
<h1>Политика в отношении обработки персональных данных</h1>
<p class="frame">Действует для сайта <b>${SITE.origin.replace('https://', '')}</b> и его Telegram-бота (<a href="https://t.me/kodeksdeneg_bot" target="_blank" rel="noopener noreferrer">t.me/kodeksdeneg_bot</a>). Последнее обновление: ${esc(BUILD_MONTH)}</p>

<h2>1. Общие положения</h2>
<p>Настоящая Политика определяет порядок обработки персональных данных на сайте ${SITE.origin.replace('https://', '')} (далее — Сайт) в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных». Оператором обработки данных является владелец Сайта (далее — Оператор). Связь с Оператором: Telegram <a href="https://t.me/Reborn_Lab" target="_blank" rel="noopener noreferrer">t.me/Reborn_Lab</a>.</p>
<p>Используя Сайт, посетитель подтверждает согласие с настоящей Политикой. При несогласии использование Сайта следует прекратить.</p>

<h2>2. Какие данные обрабатываются</h2>
<p>Оператор не собирает данные, позволяющие прямо идентифицировать личность, и не запрашивает у посетителей имя, телефон, адрес и иные подобные сведения. Обрабатываются обезличенные технические данные, которые автоматически передаёт браузер:</p>
<ul>
  <li>IP-адрес, тип и версия браузера и операционной системы, язык, разрешение экрана;</li>
  <li>адрес страницы Сайта и адрес страницы-источника перехода (referrer);</li>
  <li>дата и время визита, действия на страницах (клики, прокрутка, переходы) в агрегированном обезличенном виде, без записи сессий;</li>
  <li>файлы cookie и идентификаторы, которые сервис веб-аналитики использует для различения визитов.</li>
</ul>
<p>Поиск по ситуации на Сайте обрабатывается прямо в браузере посетителя, на сервер Оператора не передаётся. Telegram-бот технически — обёртка над тем же Сайтом: принимает текст поиска, отправляет подходящую страницу в ответ и не сохраняет сообщения на своей стороне (нет базы данных); сообщения передаются через серверы Telegram на условиях их собственной политики обработки данных.</p>

<h2>3. Цели обработки</h2>
<ul>
  <li>анализ посещаемости и поведения посетителей для улучшения содержания и удобства Сайта;</li>
  <li>выявление технических ошибок и проблем отображения;</li>
  <li>обеспечение работоспособности и безопасности Сайта (в том числе защита от автоматизированных запросов).</li>
</ul>

<h2>4. Правовые основания</h2>
<p>Обработка ведётся на основании законных интересов Оператора (статистика посещаемости, обеспечение работы и безопасности Сайта) и согласия посетителя, выражаемого продолжением использования Сайта после ознакомления с информационной плашкой о cookie. Сервис веб-аналитики работает без записи действий посетителя на странице.</p>

<h2>5. Использование cookie и веб-аналитики</h2>
<p>Сайт использует сервис <b>Яндекс.Метрика</b>, предоставляемый ООО «ЯНДЕКС». Сервис использует cookie для различения визитов; технология записи действий на странице (Вебвизор) на Сайте не используется. Условия обработки данных Яндекс.Метрикой — на сайте Яндекса (<a href="https://yandex.ru/legal/metrica_agreement/" target="_blank" rel="noopener noreferrer">yandex.ru/legal/metrica_agreement</a>). Отключить сбор можно, запретив cookie в браузере, либо установив блокировщик Яндекс.Метрики.</p>

<h2>6. Передача данных третьим лицам</h2>
<p>Оператор не продаёт и не передаёт собранные данные третьим лицам, кроме передачи обезличенных данных сервису Яндекс.Метрика как обработчику в описанных выше целях. Данные могут быть предоставлены государственным органам по законному требованию.</p>

<h2>7. Сроки хранения</h2>
<p>Обезличенные данные веб-аналитики хранятся в течение срока, установленного сервисом Яндекс.Метрика. Отметка о прочтении плашки о cookie хранится в браузере посетителя (localStorage) до его удаления посетителем.</p>

<h2>8. Права посетителя</h2>
<p>Посетитель вправе отозвать согласие на обработку (нажав «Отклонить» или очистив данные сайта в браузере), получить информацию об обработке своих данных и обратиться с жалобой в Роскомнадзор. Вопросы и обращения — в Telegram <a href="https://t.me/Reborn_Lab" target="_blank" rel="noopener noreferrer">t.me/Reborn_Lab</a>.</p>

<h2>9. Изменения</h2>
<p>Оператор вправе изменять настоящую Политику. Актуальная редакция всегда доступна по адресу ${SITE.origin.replace('https://', '')}/politika/. Дата последнего обновления указана в начале страницы.</p>`
  return layout({
    title: `Политика обработки персональных данных — ${SITE.name}`,
    description: 'Как сайт «Кодекс денег» обрабатывает данные: cookie и Яндекс.Метрика для обезличенной статистики (без записи действий), никакой идентификации личности.',
    canonicalPath: '/politika/',
    bodyClass: 'page-politika',
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
    main,
  })
}

function renderSearch() {
  const main = `
${breadcrumbs([{ name: 'Главная', url: '/' }, { name: 'Поиск', url: '/poisk/' }])}
<h1>Поиск по ситуации</h1>
<p class="frame">Опишите, что случилось, простыми словами: «приставы списали деньги», «звонят коллекторы», «взяли микрозайм под большой процент», «мошенники представились приставом», «стоит ли банкротиться». Поиск идёт по заголовкам, описаниям, ключевым словам и тексту тем.</p>
<form class="search-form" role="search" onsubmit="return false">
  <input type="search" id="q" name="q" placeholder="Что случилось?" autocomplete="off" autofocus>
</form>
<ul id="results" class="search-results" aria-live="polite"></ul>
<script src="/assets/search.js${V}" defer></script>`

  return layout({
    title: `Поиск по ситуации — ${SITE.name}`,
    description: 'Найдите свою ситуацию: долги, приставы, коллекторы, банкротство, мошенничество, займы, ипотека.',
    canonicalPath: '/poisk/',
    bodyClass: 'page-search',
    noindex: true,
    main,
  })
}

function renderVseTemy() {
  const rows = TOPICS.map((t, i) => {
    const s = SECTIONS.find((sec) => sec.id === t.sectionId)
    return `<li style="--sec:${s.accent}"><span class="vt-n">${i + 1}</span><span class="vt-ic">${topicIconSvg(t.slug, 15)}</span><a href="${topicUrl(t)}">${esc(t.title)}</a></li>`
  }).join('')

  const crumbs = [{ name: 'Главная', url: '/' }, { name: 'Все темы', url: '/vse-temy/' }]

  const main = `
${breadcrumbs(crumbs)}
<h1>Все темы сайта — ${TOPICS.length}</h1>
<p class="frame">Честный список без фильтров: все темы сайта пронумерованы от 1 до ${TOPICS.length}, каждое название — рабочая ссылка на саму тему. Появятся новые — список продолжится дальше, старые номера не меняются.</p>
<ol class="vse-temy-list">${rows}</ol>`

  return layout({
    title: `Все темы сайта (${TOPICS.length}) — ${SITE.name}`,
    description: `Полный пронумерованный список всех ${TOPICS.length} тем сайта «${SITE.name}» — с прямой ссылкой на каждую.`,
    canonicalPath: '/vse-temy/',
    bodyClass: 'page-vse-temy',
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
    main,
  })
}

// Хаб-страница «Признаки мошенника» (13.09.2026, по просьбе Ника — «может вообще
// какой-то сервис - страницу сделаем - что будет связывать их»): не ещё один
// список карточек раздела, а разбор по типу схемы + сквозные признаки
// обмана, которые повторяются почти в каждой теме независимо от легенды.
// Категории — вручную подобранная группировка (не по разделу, а по способу
// контакта с жертвой); всё, что не попало ни в одну категорию, уходит в
// «Другое», так что новая тема раздела moshennichestvo никогда не потеряется
// молча, даже если её забыли вручную распределить.
const PRIZNAKI_CATEGORIES = [
  {
    title: '📞 Звонки, голос и «служба безопасности»',
    slugs: [
      'lzheprisatv-po-telefonu',
      'dolg-rodstvennika-obman',
      'dipfeyk-golos-rodstvennika-ii',
      'falshivaya-podderzhka-banka-udalennyy-dostup',
      'mnogostupenchataya-shema-razvoda',
      'videozvonok-deepfake-direktor-shkoly',
      'lzhenalogovaya-zvonit-samozanyatym',
      'feykovoe-pismo-sudebnaya-povestka-pristavy',
    ],
  },
  {
    title: '💰 Деньги, инвестиции и криптовалюта',
    slugs: [
      'novaya-finansovaya-piramida-2026',
      'kriptovalyuta-moshennichestvo-shemy',
      'investicionnye-telegram-kanaly-boty',
      'kreditnyy-broker-moshenniki-predoplata',
      'lzhe-yuristy-spisanie-dolgov',
      'setevoy-marketing-mlm-priznaki-piramidy',
    ],
  },
  {
    title: '🛍 Покупки, билеты и объявления',
    slugs: [
      'bezopasnaya-sdelka-marketplejs-obman',
      'poddelnye-bilety-koncerty-messendzhery',
      'arenda-chuzhoy-kvartiry-moshenniki',
      'obmen-valyuty-cherez-telegram-obman',
      'poddelnyy-qr-kod-oplata-shtraf-parkovka',
      'poddelnye-sayty-bronirovaniya-otdyha',
      'lzheponkupatel-avto-predoplata-sbory',
      'feykovyy-keshbek-marketpleysa-fishing',
    ],
  },
  {
    title: '❤️ Знакомства, доверие и просьбы о помощи',
    slugs: ['romanticheskoe-moshennichestvo-znakomstva', 'poddelnye-blagotvoritelnye-sbory', 'vyigral-priz-v-loteree-komissiya-za-perevod'],
  },
  {
    title: '📄 Документы, доступы и переводы денег',
    slugs: [
      'vzlomali-gosuslugi-kredit-na-vas',
      'elektronnaya-podpis-moshenniki-nedvizhimost',
      'smishing-sms-dostavka-posylka',
      'proverit-kollektora-v-reestre',
      'sim-svop-podmena-nomera-telefona',
      'poddelnyy-vozvrat-naloga-fns-sayt',
      'ugon-telegram-akkaunta-kod-podtverzhdeniya',
      'poddelnoe-prilozhenie-banka-apk',
    ],
  },
  {
    title: '💼 Работа и подработка',
    slugs: ['dropper-ne-stat-souchastnikom', 'feykovaya-udalenka-predoplata-obuchenie', 'layki-za-dengi-marketpleys-vovlechenie-v-dropperstvo'],
  },
]

function renderPriznaki() {
  const HUB_SLUG = 'kak-raspoznat-priznaki-manipulyacii-moshennikov'
  const hub = TOPICS.find((t) => t.slug === HUB_SLUG)
  const all = topicsOfSection('moshennichestvo')
  const categorized = new Set(PRIZNAKI_CATEGORIES.flatMap((c) => c.slugs).concat(HUB_SLUG))
  const rest = all.filter((t) => !categorized.has(t.slug))

  const cardLi = (t) => `<li class="topic-card">
      <a href="${topicUrl(t)}">
        <span class="tc-body">
          <span class="tc-title-row"><span class="tc-icon">${topicIconSvg(t.slug, 16)}</span><span class="tc-title">${esc(t.title)}</span></span>
          <span class="tc-desc">${esc(t.seoDescription)}</span>
        </span>
        <span class="tc-go" aria-hidden="true">›</span>
      </a>
    </li>`

  const blocks = PRIZNAKI_CATEGORIES.map((c) => {
    const items = c.slugs.map((slug) => all.find((t) => t.slug === slug)).filter(Boolean)
    if (!items.length) return ''
    return `<h2>${esc(c.title)}</h2><ul class="topic-list">${items.map(cardLi).join('')}</ul>`
  }).join('')

  const restBlock = rest.length ? `<h2>📌 Другое</h2><ul class="topic-list">${rest.map(cardLi).join('')}</ul>` : ''

  const crumbs = [{ name: 'Главная', url: '/' }, { name: 'Признаки мошенника', url: '/priznaki-moshennika/' }]
  const quickSearch = quickSearchBox('«мошенники звонят», «перевела деньги мошенникам», «поддельный сайт»…', [
    'мошенники звонят',
    'перевела деньги мошенникам',
    'поддельный сайт оплаты',
    'SMS про штраф или посылку',
    'мошенники с криптовалютой',
    'проверить коллектора',
    'обманули с билетами',
    'мошенники в Telegram',
  ])
  const main = `${breadcrumbs(crumbs)}
<h1>Как распознать мошенника — разбор по типам схем</h1>
<p class="frame">Легенды меняются каждый месяц — сегодня это «пристав», завтра «голос сына», послезавтра «выгодный курс в Telegram». Но приёмы давления, на которых держится почти любая схема, одни и те же. Начните с разбора общих признаков, а затем смотрите конкретный тип — по способу, которым мошенник вышел на связь.</p>
${quickSearch}
${hub ? `<p class="frame"><a href="${topicUrl(hub)}"><b>${esc(hub.title)} →</b></a></p>` : ''}
${blocks}
${restBlock}
<script src="/assets/search.js${V}" defer></script>`

  return layout({
    title: `Как распознать мошенника — ${all.length} разобранных схем — ${SITE.name}`,
    description: `Все ${all.length} разобранных на сайте схемы мошенничества — звонки, инвестиции, покупки, знакомства, документы — сгруппированы по типу, плюс общие признаки психологического давления.`,
    canonicalPath: '/priznaki-moshennika/',
    bodyClass: 'page-priznaki',
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbsJsonLd(crumbs) },
    main,
  })
}

function buildSearchIndex() {
  return TOPICS.map((t) => {
    const s = SECTIONS.find((sec) => sec.id === t.sectionId)
    const text = [...(t.sut || []), ...(t.first || []), ...(t.steps || [])].join(' ').slice(0, 900)
    return {
      t: t.title,
      u: topicUrl(t),
      s: s.title,
      d: t.seoDescription,
      k: (t.keywords || []).join(' '),
      x: text,
    }
  })
}

function render404() {
  const main = `<h1>Страница не найдена</h1><p><a href="/">На главную</a></p>`
  return layout({ title: `Страница не найдена — ${SITE.name}`, description: '404', canonicalPath: '/404.html', bodyClass: 'page-404', main })
}

async function writePage(routePath, html) {
  const dir = routePath === '/' ? DIST : path.join(DIST, routePath)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'index.html'), html, 'utf8')
  return routePath
}

async function main() {
  const errors = validateContent()
  if (errors.length) {
    console.error('Ошибки контента:\n' + errors.join('\n'))
    process.exit(1)
  }

  await rm(DIST, { recursive: true, force: true })
  await mkdir(DIST, { recursive: true })

  const buildDate = new Date().toISOString().slice(0, 10)
  const routes = []
  routes.push({ path: await writePage('/', renderHome()), lastmod: buildDate })
  routes.push({ path: await writePage('/kontakty/', renderKontakty()), lastmod: buildDate })
  routes.push({ path: await writePage('/o-proekte/', renderAbout()), lastmod: buildDate })
  routes.push({ path: await writePage('/sovetnik/', renderSovetnik()), lastmod: buildDate })
  routes.push({ path: await writePage('/politika/', renderPolitika()), lastmod: buildDate })
  routes.push({ path: await writePage('/vse-temy/', renderVseTemy()), lastmod: buildDate })
  routes.push({ path: await writePage('/priznaki-moshennika/', renderPriznaki()), lastmod: buildDate })
  await writePage('/poisk/', renderSearch())
  for (const s of SECTIONS) {
    const topics = topicsOfSection(s.id)
    const lastmod = topics.length ? topics.map((t) => t.updated).sort().at(-1) : buildDate
    routes.push({ path: await writePage(sectionUrl(s), renderSection(s)), lastmod })
  }
  for (const t of TOPICS) routes.push({ path: await writePage(topicUrl(t), renderTopic(t)), lastmod: t.updated })
  routes.push({ path: await writePage('/novosti/', renderNovosti()), lastmod: buildDate })
  for (const n of NEWS) routes.push({ path: await writePage(newsItemUrl(n), renderNewsItem(n)), lastmod: n.date })
  await writeFile(path.join(DIST, 'novosti', 'rss.xml'), buildNewsRss(), 'utf8')
  await writeFile(path.join(DIST, '404.html'), render404(), 'utf8')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${SITE.origin}${r.path}</loc><lastmod>${r.lastmod}</lastmod></url>`).join('\n')}
</urlset>`
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8')
  await writeFile(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /poisk/\nSitemap: ${SITE.origin}/sitemap.xml\n`,
    'utf8',
  )
  await writeFile(path.join(DIST, 'search-index.json'), JSON.stringify(buildSearchIndex()), 'utf8')

  await cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true })
  if (existsSync(path.join(ROOT, 'public'))) await cp(path.join(ROOT, 'public'), DIST, { recursive: true })

  console.log(`Готово: ${routes.length} страниц, ${TOPICS.length} тем в ${SECTIONS.length} разделах.`)
}

main()
