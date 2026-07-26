export const SUPPORTED = ['en', 'ru', 'es'] as const
export type Lang = (typeof SUPPORTED)[number]
// English is the platform default (matches the first sim + thermostat): shown when
// no ?lang= is given. ?lang= and the set-locale bridge override it.
export const DEFAULT: Lang = 'en'

/** Params passed to template-style dictionary values. */
export type TParams = Record<string, string | number>
type Entry = string | ((p: TParams) => string)

/** Coerces any input to a supported locale, falling back to DEFAULT. */
export function normalize(l: string | null | undefined): Lang {
  return (SUPPORTED as readonly string[]).includes(l ?? '') ? (l as Lang) : DEFAULT
}

// Flat dotted keys. Values are plain strings, or functions for templates with
// substitutions. supply/return terms ("подача"/"возврат") are ordinary values
// here so they can be reworded later without touching code.
const dict: Record<Lang, Record<string, Entry>> = {
  en: {
    'state.overview.hint': 'The client says the system runs, but the house will not cool down.',
    'state.overview.btn': 'Check the supply',
    'state.measure_low.hint': 'Measure the airflow at the supply.',
    'state.measure.btn': 'Measure',
    'state.locate_block.hint': 'Airflow is weak. Look around — something is blocking the supply.',
    'state.locate_block.btn': 'Look around',
    'state.move_wardrobe.hint': 'The wardrobe is blocking the supply. Move it aside.',
    'state.move_wardrobe.btn': 'Move the wardrobe',
    'state.measure_ok.hint': 'Measure the airflow again.',
    'state.complete.hint': 'Great! The supply is clear and airflow is back to normal. Problem solved.',
    'hud.continue': 'Continue',
    'hud.overview': 'Overview',
    'hud.step': (p: TParams) => `Step ${p.n} of ${p.total}`,
    'hud.airflow': (p: TParams) => `${p.value} m/s`,
    'hud.norm': (p: TParams) => `Normal: ${p.min}–${p.max}`,
    'anem.unit': 'm/s',
    'label.supply': 'Supply',
    'label.wardrobe': 'Wardrobe',
    'ui.docTitle': 'Blocked Supply Simulation',
    'overlay.title': 'Level complete!',
    'overlay.sub': 'You moved the wardrobe aside and restored airflow',
    'overlay.rating': 'Perfect!',
    'overlay.points': '+100 points',
    'overlay.progress': 'Airflow restored to 2.5 m/s',
    'overlay.replay': 'Restart',
    'camera.panel': 'Cameras',
    'camera.system_overview': 'Overview',
    'camera.supply_air': 'Supply',
    'camera.return_air': 'Return',
    'camera.air_filter': 'Filter',
  },
  ru: {
    'state.overview.hint': 'Клиент жалуется: система работает, но в доме не холодает.',
    'state.overview.btn': 'Проверить подачу',
    'state.measure_low.hint': 'Замерьте поток воздуха у подачи.',
    'state.measure.btn': 'Замерить',
    'state.locate_block.hint': 'Поток слабый. Осмотритесь — что-то перекрывает подачу.',
    'state.locate_block.btn': 'Осмотреть',
    'state.move_wardrobe.hint': 'Шкаф перекрывает подачу. Отодвиньте его.',
    'state.move_wardrobe.btn': 'Отодвинуть шкаф',
    'state.measure_ok.hint': 'Замерьте поток снова.',
    'state.complete.hint': 'Отлично! Подача свободна, поток в норме. Проблема решена.',
    'hud.continue': 'Далее',
    'hud.overview': 'Обзор',
    'hud.step': (p: TParams) => `Шаг ${p.n} из ${p.total}`,
    'hud.airflow': (p: TParams) => `${p.value} м/с`,
    'hud.norm': (p: TParams) => `Норма: ${p.min}–${p.max}`,
    'anem.unit': 'м/с',
    'label.supply': 'Подача',
    'label.wardrobe': 'Шкаф',
    'ui.docTitle': 'Симуляция: перекрытая подача',
    'overlay.title': 'Уровень пройден!',
    'overlay.sub': 'Вы отодвинули шкаф и восстановили поток',
    'overlay.rating': 'Отлично!',
    'overlay.points': '+100 очков',
    'overlay.progress': 'Поток восстановлен: 2.5 м/с',
    'overlay.replay': 'Заново',
    'camera.panel': 'Камеры',
    'camera.system_overview': 'Обзор',
    'camera.supply_air': 'Подача',
    'camera.return_air': 'Возврат',
    'camera.air_filter': 'Фильтр',
  },
  es: {
    'state.overview.hint': 'El cliente dice que el sistema funciona, pero la casa no se enfría.',
    'state.overview.btn': 'Revisar el suministro',
    'state.measure_low.hint': 'Mide el flujo de aire en el suministro.',
    'state.measure.btn': 'Medir',
    'state.locate_block.hint': 'El flujo es débil. Observa alrededor: algo bloquea el suministro.',
    'state.locate_block.btn': 'Observar',
    'state.move_wardrobe.hint': 'El armario bloquea el suministro. Apártalo.',
    'state.move_wardrobe.btn': 'Apartar el armario',
    'state.measure_ok.hint': 'Mide el flujo de aire de nuevo.',
    'state.complete.hint': '¡Genial! El suministro está libre y el flujo volvió a la normalidad. Problema resuelto.',
    'hud.continue': 'Continuar',
    'hud.overview': 'Vista general',
    'hud.step': (p: TParams) => `Paso ${p.n} de ${p.total}`,
    'hud.airflow': (p: TParams) => `${p.value} m/s`,
    'hud.norm': (p: TParams) => `Normal: ${p.min}–${p.max}`,
    'anem.unit': 'm/s',
    'label.supply': 'Suministro',
    'label.wardrobe': 'Armario',
    'ui.docTitle': 'Simulación: suministro bloqueado',
    'overlay.title': '¡Nivel completado!',
    'overlay.sub': 'Apartaste el armario y restauraste el flujo',
    'overlay.rating': '¡Perfecto!',
    'overlay.points': '+100 puntos',
    'overlay.progress': 'Flujo restaurado a 2.5 m/s',
    'overlay.replay': 'Reiniciar',
    'camera.panel': 'Cámaras',
    'camera.system_overview': 'Vista general',
    'camera.supply_air': 'Suministro',
    'camera.return_air': 'Retorno',
    'camera.air_filter': 'Filtro',
  },
}

let current: Lang = DEFAULT
const listeners = new Set<() => void>()

/** The active locale. */
export function getLang(): Lang {
  return current
}

/**
 * Translates a key, filling a template value with params. Falls back
 * current → DEFAULT → the key itself, so a missing key is never fatal.
 */
export function t(key: string, params?: TParams): string {
  const entry = dict[current][key] ?? dict[DEFAULT][key] ?? key
  return typeof entry === 'function' ? entry(params ?? {}) : entry
}

/** Switches locale (normalized). No-op if unchanged; else notifies listeners. */
export function setLang(lang: string): void {
  const next = normalize(lang)
  if (next === current) return
  current = next
  for (const cb of listeners) cb()
}

/** Subscribes to locale changes; returns an unsubscribe function. */
export function onChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Reads the initial locale from ?lang=… (normalized). */
export function getInitialLang(): Lang {
  return normalize(new URLSearchParams(location.search).get('lang'))
}

/** Origins allowed to drive the locale over postMessage. */
export function isTrustedParent(origin: string): boolean {
  if (origin === 'https://tradescamp.io' || origin === 'https://www.tradescamp.io') return true
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(origin)) return true
  if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return true
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return true
  return false
}

/** Listens for `{type:'set-locale', locale}` from a trusted embedding parent. */
export function initLocaleBridge(): void {
  window.addEventListener('message', (e) => {
    if (!isTrustedParent(e.origin)) return
    if (e.data?.type === 'set-locale') setLang(normalize(e.data.locale))
  })
}
