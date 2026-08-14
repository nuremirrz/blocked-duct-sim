import * as THREE from 'three'
import type { SceneContext } from '@hvac/engine'

const WARDROBE_NAME = 'wardrobe'

/**
 * How the wardrobe rolls aside to clear the blocked supply.
 *
 * ── Re-measured for House_final2.glb ─────────────────────────────────────────
 * Read off the GLB rather than dialled in by eye:
 *   • wardrobe world AABB X[6.27..7.32] Z[0.79..2.46], 2.79 tall;
 *   • the bedroom diffuser it blocks: ceiling, X[6.55..7.09] Z[0.28..1.17] —
 *     entirely inside the wardrobe's span on X, so it really is in the way;
 *   • +Z is the depth of the room, open floor as far as the back wall at 4.24;
 *     the ceiling at 2.84 clears the wardrobe's 2.795 by a hair, so it passes
 *     under everything on the way.
 * Sliding +Z by 1.30 takes it to Z[2.09..3.76], past the diffuser's far edge at
 * 1.17 and well short of the back wall. The station looks into the room along
 * +Z, so the wardrobe recedes and uncovers the register instead of crossing the
 * lens — which is what a move on X or −Z would do from there.
 *
 * NB: this offsets the object's LOCAL position (like grille.ts), which equals its
 * world position here (parent is identity — local == world when measured).
 */
const MOVE_OFFSET: { axis: 'x' | 'z'; delta: number } = { axis: 'z', delta: 1.3 }

// Slide duration, matched to the grille's easing feel (~0.8s, smooth in/out).
const SLIDE_SECONDS = 0.8

const smoothstep = (t: number) => t * t * (3 - 2 * t)

export interface WardrobeApi {
  /** Rolls the wardrobe aside to uncover the supply. Idempotent while sliding. */
  moveAway: () => void
  /** Slides it the other way from where it is now: aside if home, home if aside. */
  toggle: () => void
  /** True only once it has fully slid aside — not while it is still moving. */
  isMovedAway: () => boolean
  /** Returns it to its original spot (e.g. for a restart). */
  reset: () => void
}

/**
 * Owns the wardrobe's slide-aside, by the same pattern as the grille: the object
 * belongs to the world, and both the scripted button and a direct click drive the
 * same move. Only `position` changes along the chosen axis — rotation is left
 * untouched, per spec.
 */
export function createWardrobe(ctx: SceneContext): WardrobeApi {
  let wardrobe: THREE.Object3D | null = null
  let homePos: THREE.Vector3 | null = null
  let progress = 0 // 0 = home, 1 = fully aside
  let target = 0

  // Local-space slide vector built from the tunable param above.
  const offset = new THREE.Vector3()
  offset[MOVE_OFFSET.axis] = MOVE_OFFSET.delta

  // The GLB loads asynchronously, so keep retrying until the node shows up; once
  // found we cache its home position.
  const resolve = () => {
    if (wardrobe) return
    wardrobe = ctx.scene.getObjectByName(WARDROBE_NAME) ?? null
    if (!wardrobe) return
    homePos = wardrobe.position.clone()
  }

  ctx.onFrame((dt) => {
    resolve() // resolve the node as soon as the model is in
    if (progress === target || !wardrobe || !homePos) return
    const step = dt / SLIDE_SECONDS
    progress =
      target > progress ? Math.min(target, progress + step) : Math.max(target, progress - step)
    wardrobe.position.copy(homePos).addScaledVector(offset, smoothstep(progress))
  })

  return {
    moveAway: () => {
      resolve()
      target = 1
    },
    toggle: () => {
      resolve()
      target = target === 1 ? 0 : 1
    },
    isMovedAway: () => progress >= 1,
    reset: () => {
      target = 0
    },
  }
}
