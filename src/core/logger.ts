const logBuffer: string[] = [];
const MAX_LOGS = 50;

function addLog(level: string, msg: string) {
  const logEntry = `[${level.toUpperCase()}] ${new Date().toISOString()} - ${msg}`;
  console.log(logEntry);
  logBuffer.unshift(logEntry);
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

export function getRecentLogs() {
  return logBuffer;
}

export default chalkLike;
