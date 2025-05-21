/**
 * StateInspector utility for inspecting application state.
 */
export class StateInspector {
  /**
   * Inspect the given state and log it to the console.
   * @param state The state to inspect
   */
  static inspect(state: any): void {
    console.log("[STATE INSPECTOR] Current State:", state);
  }
}
