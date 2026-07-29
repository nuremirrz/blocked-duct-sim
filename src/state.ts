export type GameState =
  | 'overview'
  | 'measure_low'
  | 'locate_block'
  | 'move_wardrobe'
  | 'measure_ok'
  | 'complete'

export interface StateData {
  /** i18n key for the HUD hint; resolved by t() at render time, not baked in. */
  hintKey: string
  cameraPreset?: string
  /** i18n key for the action button; absent means the state has no button. */
  btnKey?: string
}

// Ordered flow for Problem 2 (blocked supply). The whole diagnosis happens at the
// supply: measure low → notice the wardrobe → slide it aside → measure normal.
export const STATE_ORDER: GameState[] = [
  'overview',
  'measure_low',
  'locate_block',
  'move_wardrobe',
  'measure_ok',
  'complete',
]

export const STATE_DATA: Record<GameState, StateData> = {
  overview: {
    hintKey: 'state.overview.hint',
    cameraPreset: 'system_overview',
    btnKey: 'state.overview.btn',
  },
  measure_low: {
    hintKey: 'state.measure_low.hint',
    cameraPreset: 'supply_air',
    btnKey: 'state.measure.btn',
  },
  locate_block: {
    // No camera cut: we are already at the supply from measuring, and that view
    // frames the wardrobe — the label + highlight move onto it (see labels.ts).
    hintKey: 'state.locate_block.hint',
    btnKey: 'state.locate_block.btn',
  },
  move_wardrobe: {
    // Bound to the supply view for now (duct + wardrobe in frame). A dedicated
    // 'wardrobe' preset can be added later.
    hintKey: 'state.move_wardrobe.hint',
    cameraPreset: 'supply_air',
    btnKey: 'state.move_wardrobe.btn',
  },
  measure_ok: {
    // Shares the button key with measure_low — one "Measure" label, no dupe.
    hintKey: 'state.measure_ok.hint',
    cameraPreset: 'supply_air',
    btnKey: 'state.measure.btn',
  },
  complete: {
    hintKey: 'state.complete.hint',
  },
}

// Airflow at the supply, in m/s. It depends on whether the supply is blocked,
// not on the step: the wardrobe chokes the flow (low), moving it aside restores
// it (healthy). The anemometer reads whichever is physically true when measured.
export const AIRFLOW_LOW = 0.7
export const AIRFLOW_OK = 2.5

/** Steps where the anemometer is deployed and a reading can be taken. */
export const MEASURING_STATES: ReadonlySet<GameState> = new Set<GameState>([
  'measure_low',
  'measure_ok',
])

/** Healthy airflow range, in m/s — shown as the "Норма" hint under the readout. */
export const AIRFLOW_NORM_MIN = 2
export const AIRFLOW_NORM_MAX = 3.5

/** Linear state machine over STATE_ORDER; advance() steps to the next state. */
export class StateMachine {
  private index = 0

  constructor(
    private readonly onChange: (state: GameState, data: StateData) => void,
  ) {}

  get state(): GameState {
    return STATE_ORDER[this.index]
  }

  get data(): StateData {
    return STATE_DATA[this.state]
  }

  /** Fires the current (initial) state to the listener. Call once after setup. */
  start(): void {
    this.onChange(this.state, this.data)
  }

  /** Advances to the next state (no-op at the final state). */
  advance(): void {
    if (this.index < STATE_ORDER.length - 1) {
      this.index += 1
      this.onChange(this.state, this.data)
    }
  }
}
