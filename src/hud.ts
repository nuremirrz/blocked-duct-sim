import type { SceneContext } from './scene'
import {
  StateMachine,
  AIRFLOW_LOW,
  AIRFLOW_OK,
  MEASURING_STATES,
  AIRFLOW_NORM_MIN,
  AIRFLOW_NORM_MAX,
  type GameState,
  type StateData,
} from './state'
import { flyToCameraPresetByName, activeCameraPreset } from './cameras'
import { createAnemometer } from './anemometer'
import { createInfoPanel } from './infopanel'
import type { WardrobeApi } from './wardrobe'
import type { HintsApi } from './labels'
import type { OverlayApi } from './overlay'
import { t, onChange } from './i18n'

export interface HudApi {
  /** Re-applies model-dependent state; call once the GLB has finished loading. */
  syncModel: () => void
  /** Takes the reading, as pressing the device's own button would. */
  takeReading: () => void
  /** True while a reading is waiting to be taken on this step. */
  canTakeReading: () => boolean
}

/**
 * Drives the Problem 2 state machine and the UI that reflects it: the left info
 * panel (level, task checklist, hint, reading), the anemometer LCD, and the
 * action button. Camera cuts and the level-complete postMessage fire on the
 * relevant state entries.
 */
export function createHud(
  ctx: SceneContext,
  wardrobe: WardrobeApi,
  hints: HintsApi,
  overlay: OverlayApi,
): HudApi {
  // --- Left info panel: level, task checklist, hint, reading ---
  const infoPanel = createInfoPanel()

  // --- Bottom-center: action button (temporary flow bridge) ---
  const actionBtn = document.createElement('button')
  actionBtn.id = 'hud-action'
  actionBtn.style.cssText = [
    'position:fixed',
    'bottom:140px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:20',
    'padding:12px 24px',
    'font-size:15px',
    'font-family:inherit',
    'background:#2f6df6',
    'color:#fff',
    'border:none',
    'border-radius:10px',
    'cursor:pointer',
    'box-shadow:0 4px 14px rgba(47,109,246,0.35)',
  ].join(';')

  document.body.appendChild(actionBtn)

  // --- State machine wiring ---
  const anemometer = createAnemometer(ctx)

  // On a measuring step the reading is not handed over on arrival: the player
  // has to press "Замерить" first, and only the press after that moves on.
  let measured = false

  // Latched accomplishments for the checklist — kept independent of the flow's
  // position so the panel always reflects what has actually been done.
  let supplyMeasured = false
  let airflowRechecked = false

  const paint = (state: GameState, data: StateData) => {
    // The reading is physical: a clear supply reads healthy, a blocked one reads
    // low. The step only decides whether the device is out to read at all.
    const airflow = MEASURING_STATES.has(state)
      ? wardrobe.isMovedAway()
        ? AIRFLOW_OK
        : AIRFLOW_LOW
      : undefined
    const revealed = measured ? airflow : undefined
    const reading =
      revealed === undefined
        ? null
        : { value: revealed, ok: revealed >= AIRFLOW_NORM_MIN && revealed <= AIRFLOW_NORM_MAX }
    infoPanel.update(state, reading, {
      supplyMeasured,
      blockCleared: wardrobe.isMovedAway(),
      airflowRechecked,
    })

    // Once the reading is on screen, the button's job changes to "move on".
    const label =
      airflow !== undefined && measured
        ? t('hud.continue')
        : data.btnKey
          ? t(data.btnKey)
          : undefined
    if (label) {
      actionBtn.textContent = label
      actionBtn.style.display = 'block'
    } else {
      actionBtn.style.display = 'none'
    }

    anemometer.setState(airflow, revealed)
  }

  const machine = new StateMachine((state, data) => {
    measured = false
    paint(state, data)
    hints.update(state) // move the 3D label + highlight onto this step's object

    if (data.cameraPreset) flyToCameraPresetByName(ctx, data.cameraPreset)

    if (state === 'complete') {
      notifyParentComplete()
      overlay.show() // banner (this hint) → 600 ms → result card
    }
  })

  // A step is done when the world says so, not when a button was pressed. Both
  // the button and a direct click on the object only touch the world, so the two
  // routes cannot disagree — and a goal already met is simply skipped.
  const objectives: Partial<Record<GameState, () => boolean>> = {
    overview: () => activeCameraPreset() === 'supply_air',
    move_wardrobe: () => wardrobe.isMovedAway(),
  }

  // Advance on met objectives; also watch the wardrobe, since sliding it by a
  // direct click while the flow sits on another step changes no game state — so
  // repaint (the reading + checklist track its position) and note a healthy read.
  let lastMoved = false
  ctx.onFrame(() => {
    if (objectives[machine.state]?.()) machine.advance()
    if (wardrobe.isMovedAway() !== lastMoved) {
      lastMoved = wardrobe.isMovedAway()
      if (measured && wardrobe.isMovedAway()) airflowRechecked = true
      paint(machine.state, machine.data)
    }
  })

  // Taking the reading is one action with two triggers — this button and a click
  // on the device itself — so they cannot drift apart.
  const canTakeReading = () => MEASURING_STATES.has(machine.state) && !measured
  const takeReading = () => {
    if (!canTakeReading()) return
    measured = true
    supplyMeasured = true
    // A healthy reading (supply cleared) also confirms the airflow is restored.
    if (wardrobe.isMovedAway()) airflowRechecked = true
    paint(machine.state, machine.data)
  }

  actionBtn.addEventListener('click', () => {
    // First press on a measuring step takes the reading and stays put.
    if (canTakeReading()) {
      takeReading()
      return
    }
    // The button is a shortcut for the same world change a click would make; the
    // objective above is what actually moves the flow on.
    switch (machine.state) {
      case 'overview':
        flyToCameraPresetByName(ctx, 'supply_air')
        break
      case 'move_wardrobe':
        wardrobe.moveAway()
        break
      case 'measure_low':
        // Airflow already healthy (wardrobe cleared early) → problem solved, so
        // skip the diagnose/clear steps straight to the finish.
        if (wardrobe.isMovedAway()) machine.jumpTo('complete')
        else machine.advance()
        break
      case 'measure_ok':
        // Only finish once the airflow actually reads healthy; if the wardrobe
        // was put back the supply is blocked again, so wait until it's cleared.
        if (wardrobe.isMovedAway()) machine.advance()
        break
      // 'locate_block' ("Look around") just acknowledges and steps the flow on.
      default:
        machine.advance()
    }
  })
  machine.start()

  // Re-render on locale change: paint() re-reads every string through t(), and
  // repaints the LCD via anemometer.setState — so nothing stays "baked in".
  onChange(() => paint(machine.state, machine.data))

  return {
    syncModel: () => paint(machine.state, machine.data),
    takeReading,
    canTakeReading,
  }
}

/** Notifies the embedding platform (iframe host) that the level is done. */
function notifyParentComplete(): void {
  if (window.parent === window) return
  window.parent.postMessage(
    { source: 'hvac-sim', type: 'level-complete', slug: 'blocked-duct' },
    '*',
  )
}
