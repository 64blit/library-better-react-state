/**
 * PerformanceMonitor utility for tracking performance metrics.
 */
export class PerformanceMonitor {
  /**
   * Start tracking a performance metric.
   * @param label The label for the metric
   */
  static start(label: string): void {
    console.time(`[PERFORMANCE] ${label}`);
  }

  /**
   * End tracking a performance metric.
   * @param label The label for the metric
   */
  static end(label: string): void {
    console.timeEnd(`[PERFORMANCE] ${label}`);
  }
}
