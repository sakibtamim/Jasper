export interface LogEntry {
  level: string;
  timestamp: string;
  module?: string;
  message: string;
}

export interface LogOptions {
  suppressOnWebUI?: boolean;
}

const logBuffer: LogEntry[] = [];
const MAX_LOGS = 50;

function addLog(level: string, msg: string, options: LogOptions = {}) {
  // Parse module from message if present (e.g. "[workerpool] ...")
  const moduleMatch = msg.match(/^\[([a-zA-Z0-9_-]+)\]\s*(.*)/);
  let module: string | undefined;
  let message = msg;

  if (moduleMatch) {
    module = moduleMatch[1];
    message = moduleMatch[2];
  }

  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    module,
    message
  };

  // Keep console output as string for terminal readability
  const consoleMsg = `[${level.toUpperCase()}] ${entry.timestamp} - ${msg}`;
  // eslint-disable-next-line no-console
  console.log(consoleMsg);

  // Only add to buffer if not suppressed from WebUI
  if (!options.suppressOnWebUI) {
    logBuffer.unshift(entry);
    if (logBuffer.length > MAX_LOGS) {
      logBuffer.pop();
    }
  }
}

const chalkLike = {
  debug: (msg: string, options?: LogOptions): void => addLog('debug', msg, options),
  info: (msg: string, options?: LogOptions): void => addLog('info', msg, options),
  warn: (msg: string, options?: LogOptions): void => addLog('warn', msg, options),
  error: (msg: string, options?: LogOptions): void => addLog('error', msg, options)
};

export function getRecentLogs(): LogEntry[] {
  return logBuffer;
}

export default chalkLike;
