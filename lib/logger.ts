// Structured error logging utility.
// Single swap point — replace console calls with an external service (e.g. Sentry) when ready.

export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString()
  const details = error instanceof Error
    ? { message: error.message, stack: error.stack }
    : error
  console.error(`[${timestamp}] [ERROR] [${context}]`, details)
}

export function logWarn(context: string, message: string): void {
  const timestamp = new Date().toISOString()
  console.warn(`[${timestamp}] [WARN] [${context}]`, message)
}
