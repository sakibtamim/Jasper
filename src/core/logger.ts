export interface LogEntry {
  level: string;
  timestamp: string;
  module?: string;
  message: string;
}

const logBuffer: LogEntry[] = [];
const MAX_LOGS = 50;

function addLog(level: string, msg: string) {
  // Parse module from message if present (e.g. "[WorkerPool] ...")
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
  console.log(consoleMsg);

  logBuffer.unshift(entry);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.pop();
  }
}

const chalkLike = {
  debug: (msg: string): void => addLog('debug', msg),
  info: (msg: string): void => addLog('info', msg),
  warn: (msg: string): void => addLog('warn', msg),
  error: (msg: string): void => addLog('error', msg)
};

export function getRecentLogs(): LogEntry[] {
  return logBuffer;
}

export default chalkLike;
