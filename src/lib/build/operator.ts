export function isBuildOperator(ownerId: string | null, env: Record<string, string | undefined> = process.env): boolean {
  return !!ownerId && (env.KNOUX_BUILD_OPERATOR_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean).includes(ownerId);
}
