export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; error?: string; details?: string }
    if (e.error) return e.error
    if (e.message) return e.message
    if (e.details) return e.details
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function assertNoError<T>(
  data: T | null,
  error: { message: string } | null,
  fallback = 'Request failed',
): T {
  if (error) throw new Error(error.message || fallback)
  if (data === null || data === undefined) throw new Error(fallback)
  return data
}
