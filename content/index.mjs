import { SECTIONS, SECTIONS_BY_ID } from './sections.mjs'
import { CONTACTS, CONTACTS_BY_ID } from './contacts.mjs'
import { TOPICS_PRISTAVY } from './topics/pristavy.mjs'
import { TOPICS_KOLLEKTORY } from './topics/kollektory.mjs'
import { TOPICS_BANKROTSTVO } from './topics/bankrotstvo.mjs'
import { TOPICS_FINANSY } from './topics/finansy.mjs'
import { TOPICS_MOSHENNICHESTVO } from './topics/moshennichestvo.mjs'
import { TOPICS_RABOTA } from './topics/rabota-i-dohod.mjs'
import { TOPICS_ZAYMY } from './topics/zaymy.mjs'
import { TOPICS_SEMYA } from './topics/semya-i-dengi.mjs'
import { TOPICS_IPOTEKA } from './topics/ipoteka.mjs'
import { TOPICS_ARENDA } from './topics/arenda-i-zhilyo.mjs'
import { TOPICS_ZDOROVE } from './topics/zdorove-i-dengi.mjs'
import { TOPICS_POTREBITEL } from './topics/potrebitelskie-prava.mjs'
import { TOPICS_ROST } from './topics/rost-i-svoboda.mjs'
import { TOPICS_AVTO } from './topics/avto-i-strahovki.mjs'
import { TOPICS_ZHIZN_ZA_GRANICEY } from './topics/zhizn-za-granicey.mjs'

export const TOPICS = [
  ...TOPICS_PRISTAVY,
  ...TOPICS_KOLLEKTORY,
  ...TOPICS_BANKROTSTVO,
  ...TOPICS_FINANSY,
  ...TOPICS_MOSHENNICHESTVO,
  ...TOPICS_RABOTA,
  ...TOPICS_ZAYMY,
  ...TOPICS_SEMYA,
  ...TOPICS_IPOTEKA,
  ...TOPICS_ARENDA,
  ...TOPICS_ZDOROVE,
  ...TOPICS_POTREBITEL,
  ...TOPICS_ROST,
  ...TOPICS_AVTO,
  ...TOPICS_ZHIZN_ZA_GRANICEY,
]

export const TOPICS_BY_SLUG = Object.fromEntries(TOPICS.map((t) => [t.slug, t]))

export function topicUrl(topic) {
  const section = SECTIONS_BY_ID[topic.sectionId]
  return `/${section.slug}/${topic.slug}/`
}

export function sectionUrl(section) {
  return `/${section.slug}/`
}

export function topicsOfSection(sectionId) {
  return TOPICS.filter((t) => t.sectionId === sectionId)
}

// Проверки целостности — падаем на сборке, если что-то не сходится.
export function validateContent() {
  const errors = []
  const slugs = new Set()
  for (const t of TOPICS) {
    if (!SECTIONS_BY_ID[t.sectionId]) errors.push(`Тема "${t.slug}": неизвестный sectionId "${t.sectionId}"`)
    if (slugs.has(t.slug)) errors.push(`Дублирующийся slug темы: "${t.slug}"`)
    slugs.add(t.slug)
    for (const c of t.contacts || []) {
      if (!CONTACTS_BY_ID[c]) errors.push(`Тема "${t.slug}": неизвестный контакт "${c}"`)
    }
    for (const r of t.related || []) {
      if (!TOPICS_BY_SLUG[r] && r !== t.slug) errors.push(`Тема "${t.slug}": неизвестный related slug "${r}"`)
    }
  }
  return errors
}

export { SECTIONS, SECTIONS_BY_ID, CONTACTS, CONTACTS_BY_ID }
