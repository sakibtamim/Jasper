const chalkLike = {
  debug: (msg: string): void => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`),
  info: (msg: string): void => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: (msg: string): void => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (msg: string): void => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`)
};

export default chalkLike;
