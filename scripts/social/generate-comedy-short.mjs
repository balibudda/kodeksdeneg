// НОВЫЙ формат — комедийные короткие ролики (14.09.2026, по прямой
// просьбе Ника: обратная связь друга «формат сайта устарел, нет
// личности/юмора»). НЕ трогает и НЕ заменяет существующий продовый
// пайплайн (generate-video-topic.mjs / daily-social-post.mjs) — отдельный
// файл, отдельный автопилот (daily-comedy-post.mjs), своя очередь тем.
//
// Идея: комедийный мини-ролик «злодей проигрывает» (в духе Тома и Джерри)
// с персонажем-ведущим — не пересказ статьи нейтральным голосом, а
// короткая сценка с сюжетом, шуткой и твистом, которая всё равно доносит
// настоящий юридический совет.
//
// Технически — не рисованные ИИ-персонажи (это платная генерация
// изображений, требует отдельного одобрения Ника на трату денег), а
// HTML/CSS-сцены с эмодзи и крупным текстом, отрендеренные через Playwright
// (тот же приём, что уже используется в generate-video-topic.mjs для
// скриншота страницы сайта — только здесь скриншотим не сайт, а свою
// вёрстку). Эмодзи в браузере рендерятся системным шрифтом честно, в
// отличие от ffmpeg drawtext, где цветные эмодзи часто не отображаются.
//
// Озвучка/субтитры — тот же самый проверенный TTS+Whisper пайплайн, что
// и в продовых роликах.
//
// Использование как модуля: import { renderComedyVideo, PILOT } from './generate-comedy-short.mjs'
// Использование из CLI: node scripts/social/generate-comedy-short.mjs [--out=dir]
//   (без аргументов рендерит пилотный сценарий PILOT — тот, что уже
//   одобрил Ник 14.09.2026)

import { execFile } from 'node:child_process'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'
import { TOPICS_BY_SLUG, topicUrl } from '../../content/index.mjs'

const run = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Локально на Маке Ника обычный `ffmpeg` в PATH — без drawtext (нет
// libfreetype), нужен ffmpeg-full, см. CLAUDE.md. В GitHub Actions
// (Ubuntu) обычный `apt-get install ffmpeg` уже умеет drawtext — там
// используем просто команду из PATH.
const MAC_FFMPEG_FULL = '/opt/homebrew/Cellar/ffmpeg-full/9.0.1_1/bin/ffmpeg'
const FFMPEG = existsSync(MAC_FFMPEG_FULL) ? MAC_FFMPEG_FULL : 'ffmpeg'
const CREAM = '#EDE5D4'

export const SITE = { name: 'Кодекс денег', origin: 'https://kodeksdeneg.ru', domain: 'kodeksdeneg.ru' }

// Персонаж-ведущий (14.09.2026, идея Ника — «свой персонаж на каждом
// проекте»). Имя/эмодзи — не рисованный ИИ-арт (это отдельная трата
// денег, нужно отдельное одобрение), а текстовый бренд-приём: имя + один
// и тот же эмодзи-«аватар» в интро/финале каждого ролика. Дёшево, можно
// поменять одной строкой. У kodeksdetstva — свой персонаж, не этот.
export const MASCOT_NAME = 'Рублёнок' // было «Рублик», Ник попросил помягче 14.09.2026 (после первого, уже опубликованного пилота)
export const MASCOT_EMOJI = '💰' // 🪙 у Apple рисуется как конкретная памятная монета с посторонней надписью — не похоже на рубль

// ── пилотный сценарий, одобренный Ником 14.09.2026 (используется, пока
// очередь posted-comedy.json пуста — см. daily-comedy-post.mjs) ──
export const PILOT = {
  slug: 'dipfeyk-golos-rodstvennika-ii',
  title: 'Мошенник клонировал голос «племянника» — но не знал одну вещь',
  scenes: [
    {
      bg: 'linear-gradient(160deg, #1a2540 0%, #2e3f6b 100%)',
      emoji: MASCOT_EMOJI,
      headline: `${MASCOT_NAME} рассказывает`,
      bubble: 'Реальная история: как ловят на дипфейк-голос',
      domain: SITE.domain,
      narration: `${MASCOT_NAME} — герой проекта «Кодекс денег» — сегодня показывает реальную схему обмана.`,
    },
    {
      bg: 'linear-gradient(160deg, #2a1a3a 0%, #4a1f3a 100%)',
      emoji: '🕵️‍♂️🤖',
      headline: 'Мошенник был уверен',
      bubble: '«Я клонирую ЛЮБОЙ голос за 10 секунд!»',
      narration: 'Мошенник был уверен: искусственный интеллект клонирует любой голос за десять секунд — обмануть можно кого угодно.',
    },
    {
      bg: 'linear-gradient(160deg, #1a2a3a 0%, #1f4a5a 100%)',
      emoji: '📱👤',
      headline: 'Звонок тёте Вале',
      bubble: '«Тётя Валя! Это Вова! Срочно нужны деньги!»',
      narration: 'Голосом «племянника Вовы» — точь-в-точь, не отличить — он звонит тёте Вале и просит срочно перевести деньги.',
    },
    {
      bg: 'linear-gradient(160deg, #1a3a2a 0%, #1f5a3a 100%)',
      emoji: '👵🤔',
      headline: 'Тётя Валя не спешит',
      bubble: '«А как звали кота соседки, когда тебе было пять?»',
      narration: 'Тётя Валя спокойно отвечает: «А как звали кота соседки, когда тебе было пять лет?»',
    },
    {
      bg: 'linear-gradient(160deg, #3a1a1a 0%, #5a1f1f 100%)',
      emoji: '🤖💥',
      headline: 'Мошенник пропал',
      bubble: '«...Э... Барсик?» — ГУДБАЙ.',
      narration: 'Искусственный интеллект знает голос. Кодовое слово знает только семья. Мошенник пропал — тётя Валя победила.',
    },
    {
      bg: 'linear-gradient(160deg, #2a3a1a 0%, #3a5a1f 100%)',
      emoji: '✅🔑',
      headline: 'Ваш ход',
      bubble: 'Придумайте секретное слово с близкими',
      domain: SITE.domain,
      narration: `Договоритесь с близкими о своём секретном слове — и никакой искусственный интеллект вас не обманет. ${MASCOT_NAME} и подробный разбор — на сайте кодекс денег точка ру.`,
    },
  ],
}

// Безопасная зона (14.09.2026, Ник заметил на реальном плеере: нижние
// ~20% экрана перекрывает интерфейс площадки — подпись, плеер, кнопки).
// Весь значимый контент держим выше y≈1500 из 1920 — верстаем сверху
// (padding-top), а не по центру, чтобы блок не «сползал» в опасную
// нижнюю зону при трёхстрочном пузыре.
function sceneHtml(scene) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 360px; height: 640px; overflow: hidden; }
    body {
      background: ${scene.bg};
      display: flex; flex-direction: column; align-items: center;
      justify-content: flex-start; padding-top: 70px;
      font-family: -apple-system, "Apple Color Emoji", "Helvetica Neue", sans-serif;
      color: ${CREAM};
      text-align: center;
      padding-left: 28px; padding-right: 28px;
    }
    .emoji { font-size: 88px; line-height: 1; margin-bottom: 20px; }
    .headline { font-size: 32px; font-weight: 800; margin-bottom: 22px; letter-spacing: -0.01em; }
    .bubble {
      background: rgba(255,255,255,0.96); color: #1a1a1a; border-radius: 20px;
      padding: 20px 22px; font-size: 23px; font-weight: 600; line-height: 1.32;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      max-width: 300px;
    }
    .domain {
      margin-top: 14px; padding-top: 12px; border-top: 2px solid rgba(0,0,0,0.12);
      font-size: 18px; font-weight: 700; opacity: 0.7; letter-spacing: 0.02em;
    }
  </style></head><body>
    <div class="emoji">${scene.emoji}</div>
    <div class="headline">${scene.headline}</div>
    <div class="bubble">${scene.bubble}${scene.domain ? `<div class="domain">${scene.domain}</div>` : ''}</div>
  </body></html>`
}

async function renderScenes(scenes, outDir) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 })
  const files = []
  for (let i = 0; i < scenes.length; i++) {
    await page.setContent(sceneHtml(scenes[i]))
    const p = path.join(outDir, `scene-${i}.png`)
    await page.screenshot({ path: p })
    files.push(p)
  }
  await browser.close()
  return files
}

async function synthesizeSpeech(text, outPath, apiKey) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'onyx', input: text, response_format: 'mp3', speed: 1 }),
  })
  if (!res.ok) throw new Error(`TTS failed: ${res.status} ${await res.text()}`)
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()))
  return outPath
}

async function getWordTimestamps(audioPath, apiKey) {
  const buf = await readFile(audioPath)
  const form = new FormData()
  form.append('file', new Blob([buf], { type: 'audio/mpeg' }), 'narration.mp3')
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'word')
  form.append('language', 'ru')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Whisper failed: ${res.status} ${await res.text()}`)
  return (await res.json()).words ?? []
}

function chunkWords(words, wordsPerChunk = 3) {
  const chunks = []
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const slice = words.slice(i, i + wordsPerChunk)
    chunks.push({ text: slice.map((w) => w.word.trim()).join(' '), start: slice[0].start, end: slice[slice.length - 1].end })
  }
  return chunks
}

function wrapText(text, maxCharsPerLine) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxCharsPerLine) {
      if (line) lines.push(line.trim())
      line = w
    } else {
      line = (line + ' ' + w).trim()
    }
  }
  if (line) lines.push(line.trim())
  return lines
}

async function probeDurationSeconds(filePath) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath])
  return parseFloat(stdout.trim())
}

// Описание к посту — ПРАВИЛО ПРОЕКТА (Ник, 14.09.2026): минимум 1000
// символов и уникальный текст, не короткий шаблон. Собирается из
// настоящего контента темы сайта (sut/first/steps/law/dont), тот же
// принцип, что уже применяется в generate-video-topic.mjs/buildCaption()
// для утреннего формата — не переизобретаем, переиспользуем идею на
// комедийный формат. Если slug сценария не нашёлся среди реальных тем
// сайта (например у pilot-заготовки) — используем сюжет самого
// сценария (headline/bubble/narration всех сцен) как содержательную
// основу вместо текста темы, и всё равно добиваем до 1000+ символов
// пометкой про маскота/сайт, а не тишиной.
export function buildComedyCaption(scriptData, site, moreUrl) {
  const topic = TOPICS_BY_SLUG[scriptData.slug]
  const title = scriptData.title || scriptData.scenes?.[1]?.headline || 'Новая история'
  const intro = [
    `🎬 ${title}`,
    '',
    `${MASCOT_EMOJI} ${MASCOT_NAME} — герой проекта «${site.name}» — разбирает эту историю в новом коротком видео.`,
  ]

  const body = []
  if (topic) {
    const sut = (topic.sut || []).join('\n\n')
    const first = (topic.first || []).map((s, i) => `${i + 1}. ${s}`).join('\n')
    const steps = (topic.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')
    const law = (topic.law || []).map((s) => `• ${s}`).join('\n')
    const dont = (topic.dont || []).map((s) => `❌ ${s}`).join('\n')
    if (sut) body.push('', sut)
    if (first) body.push('', '🔹 Что делать в первую очередь:', first)
    if (steps) body.push('', '🔹 Дальнейшие шаги:', steps)
    if (law) body.push('', '⚖️ Что говорит закон:', law)
    if (dont) body.push('', '🚫 Чего не делать:', dont)
  } else {
    // Нет отдельной темы сайта под этот slug (например пилот) — берём
    // сюжет из самого сценария, а не оставляем описание пустым.
    const narration = (scriptData.scenes || []).map((s) => s.narration).filter(Boolean).join(' ')
    if (narration) body.push('', narration)
  }

  const outro = [
    '',
    `Подробный разбор со всеми шагами, контактами и ссылками на закон — на сайте: ${moreUrl}`,
    '',
    `${MASCOT_EMOJI} ${MASCOT_NAME} и «${site.name}» — реальные схемы обмана и как из них выйти, простым языком, без рекламы платных услуг.`,
    '',
    '#мошенники #деньги #юрист #shorts',
  ]

  let text = [...intro, ...body, ...outro].join('\n')

  // Страховка на случай короткой темы/сценария — добиваем до 1000+
  // символов содержательным, а не «водянистым» повтором: не тем же
  // предложением, а расширением на тему самого проекта/маскота.
  if (text.length < 1000) {
    text += [
      '',
      `Формат простой: реальная схема обмана, разобранная как короткая сценка — злодей строит план,`,
      `а в конце проигрывает из-за одной конкретной детали, которую вы теперь тоже знаете. Всё, что`,
      `говорит и делает ${MASCOT_NAME} в сюжете, основано на настоящих статьях закона и реальных шагах`,
      `защиты с сайта «${site.name}» — ничего не выдумано ради шутки. Если тема показалась вам близкой`,
      `или вы узнали похожую ситуацию у себя или у близких — сохраните видео и покажите им, а полный`,
      `разбор с контактами нужных ведомств оставьте по ссылке на сайте.`,
    ].join('\n')
  }

  return text
}

// scriptData: { slug, scenes, title?, moreUrl? } — title/moreUrl по умолчанию
// выводятся из site+slug, но можно переопределить (для kodeksdetstva).
export async function renderComedyVideo(scriptData, outDir, site = SITE) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY не задан в окружении')
  const { slug, scenes } = scriptData
  await mkdir(outDir, { recursive: true })

  const sceneFiles = await renderScenes(scenes, outDir)

  const fullNarration = scenes.map((s) => s.narration).join(' ')
  const audioPath = path.join(outDir, `narration-${slug}.mp3`)
  await synthesizeSpeech(fullNarration, audioPath, apiKey)
  const totalAudioDuration = await probeDurationSeconds(audioPath)

  const words = await getWordTimestamps(audioPath, apiKey)

  // Длительность каждой сцены — по РЕАЛЬНЫМ таймингам Whisper, не по
  // пропорции числа слов в сценарии: TTS ставит неравномерные паузы
  // (длиннее после точки), поэтому оценка «по доле слов» уплывала на
  // несколько секунд к концу ролика — картинка отставала от текста,
  // который уже озвучивает следующую сцену (найдено и починено 14.09.2026).
  const wordCounts = scenes.map((s) => s.narration.split(/\s+/).length)
  let wordIdx = 0
  const sceneEnds = wordCounts.map((wc) => {
    wordIdx = Math.min(wordIdx + wc, words.length)
    return words[wordIdx - 1]?.end ?? totalAudioDuration
  })
  sceneEnds[sceneEnds.length - 1] = totalAudioDuration + 0.6
  const sceneDurations = sceneEnds.map((end, i) => Math.max(1.5, end - (i === 0 ? 0 : sceneEnds[i - 1])))

  const fps = 30
  const fontDir = path.join(__dirname, 'fonts')
  const regularFont = path.join(fontDir, 'PTSerif-Regular.ttf')

  // Входы: каждая картинка — РОВНО один входной кадр (framerate=1, t=1 →
  // 1 кадр), а не '-loop 1 -t X' на дефолтном фреймрейте (~25fps).
  // Настоящая причина реального найденного бага: zoompan применяет свою
  // анимацию «d кадров» К КАЖДОМУ входному кадру отдельно, а не один раз
  // на весь клип — при 25fps-входе за несколько секунд это давало сотни
  // лишних кадров, zoompan не успевал завершиться до конца сцены, и
  // concat никогда не получал EOF от первого потока (следующая сцена не
  // показывалась вообще, хотя субтитры/звук уже говорили про неё).
  const inputArgs = []
  sceneFiles.forEach((f) => {
    inputArgs.push('-loop', '1', '-framerate', '1', '-t', '1', '-i', f)
  })
  inputArgs.push('-i', audioPath)

  const perScene = sceneFiles.map((_, i) => {
    const d = sceneDurations[i]
    const z = 'min(zoom+0.0008,1.12)'
    return `[${i}:v]scale=1080:1920,zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(d * fps)}:s=1080x1920:fps=${fps}[v${i}]`
  })
  const concatInputs = sceneFiles.map((_, i) => `[v${i}]`).join('')
  let filter = perScene.join(';') + `;${concatInputs}concat=n=${sceneFiles.length}:v=1:a=0[vbase]`

  // Плашка субтитров — в безопасной зоне (y=1420 из 1920), не у самого
  // низа: реальные Reels/Shorts/TikTok перекрывают нижние ~20% экрана
  // своим интерфейсом (подпись, плеер, кнопки) — Ник поймал это на
  // скриншоте реального плеера.
  const chunks = chunkWords(words, 3)
  const capParts = []
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const lines = wrapText(chunk.text, 22)
    const chunkFile = path.join(outDir, `cap-${slug}-${i}.txt`)
    await writeFile(chunkFile, lines.join('\n'), 'utf8')
    capParts.push(
      `drawtext=fontfile=${regularFont}:textfile=${chunkFile}:fontcolor=${CREAM.replace('#', '0x')}:fontsize=44:` +
        `line_spacing=12:x=(w-text_w)/2:y=1420:box=1:boxcolor=black@0.75:boxborderw=18:enable='between(t,${chunk.start},${chunk.end})'`
    )
  }
  filter += `;[vbase]drawbox=x=0:y=1440:w=1080:h=480:color=black@0.0:t=fill${capParts.length ? ',' + capParts.join(',') : ''}[vout]`

  const outVideo = path.join(outDir, `comedy-${slug}.mp4`)
  const ffmpegArgs = [
    '-y', ...inputArgs,
    '-filter_complex', filter,
    '-map', '[vout]', '-map', `${sceneFiles.length}:a`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-shortest',
    outVideo,
  ]
  await run(FFMPEG, ffmpegArgs)

  const moreUrl = scriptData.moreUrl || `${site.origin}/moshennichestvo/${slug}/`
  const captionText = buildComedyCaption(scriptData, site, moreUrl)
  const captionPath = path.join(outDir, `comedy-${slug}.caption.txt`)
  await writeFile(captionPath, captionText, 'utf8')

  const youtubeTitle = `${scriptData.title || scenes[1]?.headline || 'Реальная история'} #Shorts`
  const metaPath = path.join(outDir, `comedy-${slug}.meta.json`)
  await writeFile(metaPath, JSON.stringify({ slug, title: scriptData.title || scenes[1]?.headline, youtubeTitle, moreUrl }), 'utf8')

  return { video: outVideo, caption: captionPath, meta: metaPath, slug, duration: totalAudioDuration, scenes: sceneFiles.length }
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))
  const outDir = args.out || path.join(os.homedir(), 'Downloads', 'comedy-short-test')
  const result = await renderComedyVideo(PILOT, outDir)
  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
