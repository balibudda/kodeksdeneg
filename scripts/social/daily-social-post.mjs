// Ежедневный автопилот: берёт следующие ещё не опубликованные темы сайта
// (по порядку TOPICS, без повторов — см. posted-social.json), рендерит
// ролик по каждой (generate-video-topic.mjs) и публикует на подключённые
// каналы — YouTube + Facebook. По умолчанию 3 темы за прогон (Ник,
// 13.09.2026: «каждый день три новости» — другой темп, чем у kodeksdetstva,
// там 1/день). Обновляет posted-social.json — коммитит и пушит уже сам
// workflow, не этот скрипт.
//
// Использование: node scripts/social/daily-social-post.mjs [--slug=<slug>] [--count=3] [--dry-run]
// --slug=<slug> — принудительно взять конкретную тему вместо очереди (тогда
//   --count игнорируется, публикуется только она).
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOPICS } from '../../content/index.mjs'
import { renderTopicVideo } from './generate-video-topic.mjs'
import { postToFacebook } from './post-facebook.mjs'
import { postToYoutube } from './post-youtube.mjs'
import { postToTiktok } from './post-tiktok.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const STATE_PATH = path.join(__dirname, 'posted-social.json')

async function loadPosted() {
  try {
    return JSON.parse(await readFile(STATE_PATH, 'utf8'))
  } catch {
    return []
  }
}

async function savePosted(list) {
  await writeFile(STATE_PATH, JSON.stringify(list, null, 2) + '\n', 'utf8')
}

async function postOneTopic(topic, { dryRun, outDir }) {
  console.log(`\n=== Тема: ${topic.slug} — «${topic.title}» ===`)
  const rendered = await renderTopicVideo(topic.slug, outDir)
  console.log(`Ролик готов: ${rendered.video} (${rendered.duration}с)`)

  if (dryRun) {
    console.log('--dry-run: публикацию пропускаю.')
    return { slug: topic.slug, youtube: null, facebook: null, tiktok: null }
  }

  let ytResult = null
  if (process.env.YT_CLIENT_ID && process.env.YT_CLIENT_SECRET && process.env.YT_REFRESH_TOKEN) {
    try {
      ytResult = await postToYoutube(rendered)
    } catch (e) {
      console.warn('YouTube: публикация не удалась —', e.message)
    }
  } else {
    console.log('YouTube: YT_* секреты не заданы — пропускаю.')
  }

  let fbResult = null
  if (process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN) {
    try {
      fbResult = await postToFacebook(rendered)
    } catch (e) {
      console.warn('Facebook: публикация не удалась —', e.message)
    }
  } else {
    console.log('Facebook: FB_PAGE_ID/FB_PAGE_TOKEN не заданы — пропускаю.')
  }

  // TikTok тоже (15.09.2026, Ник: «посмотрим что смотреть будут больше») —
  // общий аккаунт @kodeksrazuma, черновиком, тот же принцип, что уже
  // подключён к вечернему комедийному формату.
  let tiktokResult = null
  if (process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN) {
    try {
      tiktokResult = await postToTiktok(rendered)
    } catch (e) {
      console.warn('TikTok: публикация не удалась —', e.message)
    }
  } else {
    console.log('TikTok: TIKTOK_* секреты не заданы — пропускаю.')
  }

  return { slug: topic.slug, youtube: ytResult, facebook: fbResult, tiktok: tiktokResult }
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))
  const posted = await loadPosted()
  const outDir = path.join(ROOT, 'dist-social')
  await mkdir(outDir, { recursive: true })
  const results = []

  if (args.slug) {
    const topic = TOPICS.find((t) => t.slug === args.slug)
    if (!topic) throw new Error(`тема не найдена: ${args.slug}`)
    const result = await postOneTopic(topic, { dryRun: args['dry-run'], outDir })
    results.push(result)
    if (!args['dry-run'] && !posted.includes(topic.slug)) {
      posted.push(topic.slug)
      await savePosted(posted)
    }
  } else {
    const count = args.count ? Number(args.count) : 3
    for (let i = 0; i < count; i++) {
      const topic = TOPICS.find((t) => !posted.includes(t.slug))
      if (!topic) {
        console.log(`Все ${TOPICS.length} тем уже опубликованы — новых нет.`)
        break
      }
      const result = await postOneTopic(topic, { dryRun: args['dry-run'], outDir })
      results.push(result)
      if (!args['dry-run']) {
        posted.push(topic.slug)
        await savePosted(posted) // сохраняем после каждой темы — если прогон упадёт на 2-й, 1-я не потеряется
      }
    }
  }

  console.log('\n' + JSON.stringify(results, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
