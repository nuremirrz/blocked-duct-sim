import { createScene } from './scene'
import { loadModel } from './loader'
import { applyStartCamera, initCameraMotion, createCameraSwitcher } from './cameras'
import { createHud } from './hud'
import { createInteractions } from './interactive'
import { createWardrobe } from './wardrobe'
import { createHints } from './labels'
import { createResultOverlay } from './overlay'
import { setLang, getInitialLang, initLocaleBridge, onChange, getLang, t } from './i18n'

const container = document.getElementById('app')
if (!container) {
  throw new Error('Missing #app container in index.html')
}

// Locale first, before anything renders: ?lang=… sets the initial locale, and a
// trusted embedding parent can switch it live over postMessage.
setLang(getInitialLang())
initLocaleBridge()

// Keep the tab title and <html lang> in sync with the active locale.
const applyDocumentMeta = () => {
  document.title = t('ui.docTitle')
  document.documentElement.lang = getLang()
}
applyDocumentMeta()
onChange(applyDocumentMeta)

// Boot the scene, start on the overview camera (before the first frame), mount
// the gameplay HUD, then load the model.
const ctx = createScene(container)
initCameraMotion(ctx)
applyStartCamera(ctx)
createCameraSwitcher(ctx)
// Shared prop: the scripted button and a direct click both slide the wardrobe.
const wardrobe = createWardrobe(ctx)
// 3D labels + active-object highlight, driven by the HUD's state changes.
const hints = createHints(ctx)
// Level-complete result card (shown on the final state; Restart reloads).
const overlay = createResultOverlay()
const hud = createHud(ctx, wardrobe, hints, overlay)
createInteractions(ctx, wardrobe, hud)
loadModel(ctx, () => hud.syncModel())
