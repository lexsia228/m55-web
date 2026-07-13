export function isPaidCompatibilityPreviewBlocked(args: {
  nodeEnv: string | undefined;
  vercelEnv: string | undefined;
}): boolean {
  return args.nodeEnv === 'production' || args.vercelEnv === 'production';
}
