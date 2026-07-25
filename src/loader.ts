import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Object3D } from 'three'
import type { SceneContext } from './scene'

// BASE_URL keeps the path relative (base: './') so it works when embedded in an iframe.
const MODEL_URL = import.meta.env.BASE_URL + 'house_hvac.glb'

// Objects Problem 2 relies on (adds `wardrobe` vs Problem 1). TEMPORARY skeleton
// check below logs ✅/❌ per name — remove once the model is confirmed.
const REQUIRED_OBJECTS = [
  'house_shell',
  'supply_duct',
  'return_grille',
  'filter',
  'anemometer',
  'wardrobe',
]

/**
 * Loads house_hvac.glb (plain GLTFLoader, no Draco) and adds it to the scene.
 * Camera framing is handled by the overview preset.
 */
export function loadModel(ctx: SceneContext, onLoaded?: () => void): void {
  const loader = new GLTFLoader()

  loader.load(
    MODEL_URL,
    (gltf) => {
      ctx.scene.add(gltf.scene)
      // Refresh world matrices so getWorldPosition queries are accurate at once.
      ctx.scene.updateMatrixWorld(true)
      checkRequiredObjects(gltf.scene)
      onLoaded?.()
    },
    undefined,
    (error) => {
      console.error(`Failed to load model at "${MODEL_URL}"`)
      console.error(error)
    },
  )
}

/** TEMPORARY skeleton check — logs ✅ found / ❌ MISSING for each required object. */
function checkRequiredObjects(root: Object3D): void {
  console.log('--- Required object check ---')
  for (const name of REQUIRED_OBJECTS) {
    if (root.getObjectByName(name)) console.log(`✅ found: ${name}`)
    else console.error(`❌ MISSING: ${name}`)
  }
}
