import * as THREE from 'three'
import type { SceneContext } from '@hvac/engine'

// House_final.glb calls it `closet`; the old blockout model called it `wardrobe`.
const WARDROBE_NAME = 'closet'

/**
 * How the closet rolls aside to clear the blocked supply.
 *
 * ── Re-measured for House_final.glb ──────────────────────────────────────────
 * Read off the GLB rather than dialled in by eye:
 *   • closet world AABB X[5.40..6.02] Z[-0.22..1.64], 2.74 tall;
 *   • the bedroom diffuser it stands beside: ceiling, X[6.55..7.09];
 *   • −X is open floor all the way to the far bedroom; the ceiling sits at 2.84,
 *     just above the closet, so it passes under everything on the way.
 * Sliding −X by 1.20 takes it to X[4.20..4.82] — clear of the diffuser and
 * visibly away from it, which is the whole point of the step. The camera looks
 * back along −X, so the move reads as pushing the closet away from the vent.
 *
 * To retune: `axis` is the floor axis ('x' or 'z', never 'y'); `delta` is metres,
 * sign flips direction. Keep |delta| under ~9 on −X (far wall at −5.05).
 *
 * NB: this offsets the object's LOCAL position (like grille.ts), which equals its
 * world position here (parent is identity — local == world when measured).
 */
const MOVE_OFFSET: { axis: 'x' | 'z'; delta: number } = { axis: 'x', delta: -1.2 }

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
