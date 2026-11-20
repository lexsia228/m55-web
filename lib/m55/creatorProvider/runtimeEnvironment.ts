export function isM55ProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL_ENV === 'production') return true;
  if (env.NODE_ENV === 'production' && env.VERCEL_ENV !== 'preview' && env.VERCEL_ENV !== 'development') {
    return true;
  }
  return false;
}
