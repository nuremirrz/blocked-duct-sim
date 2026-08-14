import {
  activeCameraPreset,
  type AirflowVisual,
  type CameraPreset,
  type ClickTarget,
  type HudProgressBase,
  type LabelConfig,
  type ReadingTaker,
  type StateConfig,
  type TaskConfig,
  type Tool,
} from '@hvac/engine'
import type { WardrobeApi } from './wardrobe'

// Fixed inspection viewpoints, named for the HVAC stage each one frames. The
// coordinates belong to this level's model; the first is the starting camera.
//
// Re-aimed for House_final2.glb. The wide shot frames the whole house, which is
// deep now (7.7 across Z, was a near-flat 4.85). The supply station looks
// straight into the bedroom the diffuser feeds, so the register and the wardrobe
// standing under it are one shot — this level is about the thing in the way, and
// the two have to be seen together rather than the register alone.
export const CAMERAS: CameraPreset[] = [
  {
    name: 'system_overview',
    position: { x: 7, y: 6.5, z: -19 },
    target: { x: 3.4, y: 1.4, z: 0.7 },
  },
  {
    name: 'supply_air',
    position: { x: 7.1, y: 1.0, z: -1.7 },
    target: { x: 7.1, y: 2.4, z: 1.0 },
  },
  {
    name: 'return_air',
    position: { x: 4.0, y: 0.9, z: -1.6 },
    target: { x: 5.29, y: 2.84, z: 0.72 },
  },
]

// Stations you can look closer at — everything except the wide overview.
export const INSPECTABLE = ['supply_air', 'return_air']

/**
 * Airflow at the supply, in m/s: the wardrobe chokes it, moving it aside
 * restores it. One source of truth for the device's reading and the stream.
 */
const FLOW_HEALTHY = 2.5
const FLOW_CHOKED = 0.7

export function createFlow(wardrobe: WardrobeApi): () => number {
  return () => (wardrobe.isMovedAway() ? FLOW_HEALTHY : FLOW_CHOKED)
}

/** The one visible stream on this level, off the same flow. */
export function createAirflowConfig(flow: () => number): AirflowVisual[] {
  return [{ objectName: 'supply_bedroom1', flow }]
}

export type GameState =
  | 'overview'
  | 'measure_low'
  | 'locate_block'
  | 'move_wardrobe'
  | 'measure_ok'
  | 'complete'

/** What the player has actually done, independent of where the guided flow sits. */
export interface TaskProgress extends HudProgressBase {
  blockCleared: boolean
}

// GLB object each label rides on, its i18n key, and the steps it lights up on.
export const LABELS: LabelConfig[] = [
  {
    objectName: 'supply_bedroom1',
    labelKey: 'label.supply',
    activeOnStates: ['measure_low', 'measure_ok'],
  },
  {
    objectName: 'wardrobe',
    labelKey: 'label.wardrobe',
    activeOnStates: ['locate_block', 'move_wardrobe'],
  },
]

// The checklist is keyed to real accomplishments, not the flow's position, so a
// task done out of order still ticks the moment it actually happens.
export const TASKS: TaskConfig<TaskProgress>[] = [
  { taskKey: 'task.check_supply', done: (p) => p.supplyMeasured },
  { taskKey: 'task.move_wardrobe', done: (p) => p.blockCleared },
  { taskKey: 'task.remeasure', done: (p) => p.airflowRechecked },
]

/**
 * Ordered flow for Problem 2 (blocked supply). The whole diagnosis happens at the
 * supply: measure low → notice the wardrobe → slide it aside → measure normal.
 *
 * Each `onAction` closes over the wardrobe, changes the world and then moves the
 * flow on itself — the engine never sees the prop. `isDone` covers the other
 * route: a direct click on the object changes the same world, and the poll picks
 * it up.
 */
export function createStateConfig(wardrobe: WardrobeApi): StateConfig<GameState> {
  return {
    order: ['overview', 'measure_low', 'locate_block', 'move_wardrobe', 'measure_ok', 'complete'],
    data: {
      overview: {
        hintKey: 'state.overview.hint',
        cameraPreset: 'system_overview',
        // Getting to the supply is the step: click the register or take the
        // camera strip there.
        isDone: () => activeCameraPreset() === 'supply_air',
      },
      measure_low: {
        hintKey: 'state.measure_low.hint',
        cameraPreset: 'supply_air',
        measuring: true,
        // Airflow already healthy (wardrobe cleared early) → problem solved, so
        // skip the diagnose/clear steps straight to the finish.
        onAction: (flow) => (wardrobe.isMovedAway() ? flow.jumpTo('complete') : flow.advance()),
      },
      locate_block: {
        // No camera cut: we are already at the supply from measuring, and that
        // view frames the wardrobe — the label + highlight move onto it.
        //
        // Finding the blockage and clearing it are one act for the player, so
        // this shares move_wardrobe's goal: the vague hint stands until the
        // wardrobe actually moves, and move_wardrobe is then already met and
        // skipped. Naming the wardrobe out loud is left to that step, which the
        // player only ever sees if they slide it back and have to be told.
        hintKey: 'state.locate_block.hint',
        isDone: () => wardrobe.isMovedAway(),
      },
      move_wardrobe: {
        // Bound to the supply view for now (duct + wardrobe in frame). A dedicated
        // 'wardrobe' preset can be added later.
        hintKey: 'state.move_wardrobe.hint',
        cameraPreset: 'supply_air',
        isDone: () => wardrobe.isMovedAway(),
      },
      measure_ok: {
        hintKey: 'state.measure_ok.hint',
        cameraPreset: 'supply_air',
        measuring: true,
        // Only finish once the airflow actually reads healthy; if the wardrobe
        // was put back the supply is blocked again, so wait until it's cleared.
        onAction: (flow) => {
          if (wardrobe.isMovedAway()) flow.advance()
        },
      },
      complete: {
        hintKey: 'state.complete.hint',
      },
    },
    // Healthy band, in m/s. What the device actually reads is HudConfig.reading:
    // the wardrobe chokes the flow (0.7), moving it aside restores it (2.5).
    airflow: { normMin: 2, normMax: 3.5 },
  }
}

/** Tools in the inventory drawer; dragging one onto its object applies it. */
export function createTools(hud: ReadingTaker): Tool[] {
  return [
    {
      id: 'anemometer',
      labelKey: 'tool.anemometer',
      iconNode: 'anemometer',
      // The device parks on the supply grille while measuring, so accept either.
      targetNodes: ['supply_bedroom1', 'anemometer'],
      usable: () => hud.canTakeReading(),
      apply: () => hud.takeReading(),
    },
  ]
}

/** Clickable objects: a click travels to them, then acts once already framed. */
export function createClickTargets(wardrobe: WardrobeApi, hud: ReadingTaker): ClickTarget[] {
  return [
    { objectName: 'supply_bedroom1', preset: 'supply_air' },
    // The device only exists while measuring, and the step already parks the
    // camera on it — so a click is always its own button, never a trip.
    {
      objectName: 'anemometer',
      preset: 'supply_air',
      act: () => hud.takeReading(),
      canAct: () => hud.canTakeReading(),
    },
    // The wardrobe sits in the supply view, so from there a click is its own
    // button. It slides freely either way at any time — move it aside or put it
    // back — and the airflow reading tracks whichever side it ends up on.
    { objectName: 'wardrobe', preset: 'supply_air', act: () => wardrobe.toggle() },
  ]
}
