// Телеграм-бот «Кодекс денег» — лаунчер мини-приложения + инлайн-поиск по темам.
// Вебхук: POST https://bot.kodeksdeneg.ru/api/tg  (НЕ на основном домене — см. CLAUDE.md:
// основной домен kodeksdeneg.ru отдаёт статику через GitHub Pages, бот живёт отдельно
// на поддомене bot.kodeksdeneg.ru, который остаётся на Vercel).
// Секреты — только в переменных окружения Vercel:
//   TELEGRAM_BOT_TOKEN       — токен бота от @BotFather
//   TELEGRAM_WEBHOOK_SECRET  — произвольная строка, сверяется с заголовком
//                              X-Telegram-Bot-Api-Secret-Token
// Инлайн-режим нужно включить в @BotFather: /setinline

const SITE = 'https://kodeksdeneg.ru'
const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

async function tg(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return r.json()
}

// ── поисковый индекс сайта: /search-index.json, кэш в памяти функции ──
let _idx = null
let _idxAt = 0
async function loadIndex() {
  if (_idx && Date.now() - _idxAt < 10 * 60 * 1000) return _idx
  try {
    const r = await fetch(`${SITE}/search-index.json`, { headers: { 'cache-control': 'no-cache' } })
    if (r.ok) {
      _idx = await r.json()
      _idxAt = Date.now()
    }
  } catch (e) {}
  return _idx || []
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е')
}

function search(list, query, limit = 12) {
  const words = norm(query).split(/[^a-zа-я0-9]+/).filter((w) => w.length >= 2)
  if (!words.length) return []
  const scored = []
  for (const e of list) {
    const t = norm(e.t), k = norm(e.k), s = norm(e.s), d = norm(e.d), x = norm(e.x)
    let score = 0
    for (const w of words) {
      if (t.includes(w)) score += 5
      if (k.includes(w)) score += 3
      if (s.includes(w)) score += 2
      if (d.includes(w)) score += 1
      if (x.includes(w)) score += 0.5
    }
    if (norm(e.t).includes(norm(query))) score += 4
    if (score > 0) scored.push({ e, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.e)
}

// подборка на пустой инлайн-запрос
const PICKS = [
  { t: '⚖️ Приставы и взыскание долгов', u: '/pristavy/', s: 'Раздел', d: 'Списали деньги, арестовали имущество, удерживают из зарплаты.' },
  { t: '📵 Коллекторы', u: '/kollektory/', s: 'Раздел', d: 'Звонят, угрожают — что законно, а что уже нарушение.' },
  { t: '🧾 Банкротство физлица', u: '/bankrotstvo/', s: 'Раздел', d: '' },
  { t: '🚩 Мошенничество', u: '/moshennichestvo/', s: 'Раздел', d: '' },
  { t: '🛒 Права потребителя', u: '/potrebitelskie-prava/', s: 'Раздел', d: 'Возврат товара, маркетплейсы, авиа/жд/тур возвраты.' },
  { t: '🌱 Личные финансы и накопления', u: '/finansy/', s: 'Раздел', d: '' },
  { t: '📇 Все контакты', u: '/kontakty/', s: 'Служебное', d: 'Справочник служб и ведомств.' },
]

function inlineResults(items) {
  return items.slice(0, 20).map((e, i) => ({
    type: 'article',
    id: String(i) + '_' + (e.u || '').replace(/\W+/g, '').slice(0, 40),
    title: e.t,
    description: (e.s ? e.s + ' — ' : '') + (e.d || '').slice(0, 120),
    input_message_content: {
      message_text: `<b>${esc(e.t)}</b>\n${e.s ? esc(e.s) + '\n' : ''}${SITE}${e.u}`,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    },
    reply_markup: { inline_keyboard: [[{ text: '📖 Открыть тему', url: `${SITE}${e.u}` }]] },
  }))
}

function esc(s) {
  return String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

// payload из deep-link: «pristavy__arest-avtomobilya» → «/pristavy/arest-avtomobilya/»
function deepUrl(param) {
  if (!param || param === 'start') return SITE
  const path = String(param)
    .replace(/[^a-z0-9_-]/gi, '')
    .replace(/__/g, '/')
    .replace(/^\/+|\/+$/g, '')
  if (!path) return SITE
  return `${SITE}/${path}/`
}

function startKeyboard(url) {
  return {
    inline_keyboard: [
      [{ text: '💰 Открыть «Кодекс денег»', web_app: { url } }],
      [{ text: '📇 Все контакты', web_app: { url: `${SITE}/kontakty/` } }],
      [{ text: '🔎 Поиск по темам', web_app: { url: `${SITE}/poisk/` } }],
    ],
  }
}

const GREETING =
  'Это «Кодекс денег» — памятка по долгам, приставам, коллекторам, ' +
  'банкротству, правам потребителя и личным финансам простым языком, ' +
  'без рекламы платных юрфирм.\n\n' +
  'Нажми кнопку ниже, чтобы открыть приложение — там разделы и поиск.\n\n' +
  'Или просто напиши мне запрос словами — например «списали зарплату» или ' +
  '«коллекторы звонят» — подберу подходящие темы.'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, hint: 'Telegram webhook endpoint' })
    return
  }
  if (!TOKEN) {
    res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' })
    return
  }
  // fail closed: если секрет не настроен — отклоняем, а не пропускаем всех подряд
  if (!SECRET || req.headers['x-telegram-bot-api-secret-token'] !== SECRET) {
    res.status(401).json({ ok: false })
    return
  }

  const update = req.body || {}

  try {
    // ── инлайн-поиск: @<bot> <запрос> ──
    if (update.inline_query) {
      const q = (update.inline_query.query || '').trim()
      const list = await loadIndex()
      const items = q ? search(list, q) : PICKS
      await tg('answerInlineQuery', {
        inline_query_id: update.inline_query.id,
        results: inlineResults(items.length ? items : PICKS),
        cache_time: 60,
        is_personal: false,
        button: { text: 'Открыть приложение', web_app: { url: SITE } },
      })
      res.status(200).json({ ok: true })
      return
    }

    const msg = update.message || update.edited_message
    const chatId = msg && msg.chat && msg.chat.id

    if (chatId && typeof msg.text === 'string') {
      const text = msg.text.trim()
      if (text.startsWith('/start')) {
        const param = text.split(/\s+/)[1] || ''
        await tg('sendMessage', {
          chat_id: chatId,
          text: GREETING,
          reply_markup: startKeyboard(deepUrl(param)),
        })
      } else if (text.startsWith('/help')) {
        await tg('sendMessage', { chat_id: chatId, text: GREETING, reply_markup: startKeyboard(SITE) })
      } else {
        // свободный текст → поиск по темам
        const list = await loadIndex()
        const hits = search(list, text, 5)
        if (hits.length) {
          const lines = hits.map((e) => `• <a href="${SITE}${e.u}">${esc(e.t)}</a>`).join('\n')
          await tg('sendMessage', {
            chat_id: chatId,
            text: `Похоже, вам подойдут эти темы:\n\n${lines}\n\nИли откройте приложение целиком:`,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: startKeyboard(SITE),
          })
        } else {
          await tg('sendMessage', {
            chat_id: chatId,
            text:
              'Не нашёл подходящей темы по этим словам. Откройте приложение и ' +
              'воспользуйтесь поиском внутри, или напишите /start.',
            reply_markup: startKeyboard(SITE),
          })
        }
      }
    }
  } catch (e) {
    // не роняем вебхук — Telegram иначе будет повторять доставку
  }

  res.status(200).json({ ok: true })
}
