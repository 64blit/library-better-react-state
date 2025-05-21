import { getConfig } from '../config';

/**
 * Logger utility for debugging and tracing.
 */
export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  static log(message: string, ...optionalParams: any[]): void {
    const config = getConfig();
    if (config.debugMode) {
      console.log(`[LOG][${Logger.getTimestamp()}] ${message}`, ...optionalParams);
    } else {
      console.log(`[LOG] ${message}`, ...optionalParams);
    }
  }

  static warn(message: string, ...optionalParams: any[]): void {
    const config = getConfig();
    if (config.debugMode) {
      console.warn(`[WARN][${Logger.getTimestamp()}] ${message}`, ...optionalParams);
    } else {
      console.warn(`[WARN] ${message}`, ...optionalParams);
    }
  }

  static error(message: string, ...optionalParams: any[]): void {
    const config = getConfig();
    if (config.debugMode) {
      console.error(`[ERROR][${Logger.getTimestamp()}] ${message}`, ...optionalParams);
    } else {
      console.error(`[ERROR] ${message}`, ...optionalParams);
    }
  }

  static debug(message: string, ...optionalParams: any[]): void {
    const config = getConfig();
    if (config.debugMode) {
      console.debug(`[DEBUG][${Logger.getTimestamp()}] ${message}`, ...optionalParams);
    }
  }
}
