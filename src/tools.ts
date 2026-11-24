// The shim only exposes these tools, even if the VAAST app offers more.
// This keeps the read-only guarantee checkable from this repository alone.
export const ALLOWED_TOOLS: ReadonlySet<string> = new Set([
  'list_workspaces',
  'get_findings',
  'get_scan_status',
  'list_targets',
]);

export function isAllowedTool(name: unknown): boolean {
  return typeof name === 'string' && ALLOWED_TOOLS.has(name);
}

export function filterToolList<T extends { tools?: unknown }>(result: T): T {
  if (!result || !Array.isArray(result.tools)) {
    return { ...result, tools: [] };
  }
  return {
    ...result,
    tools: result.tools.filter((tool) => isAllowedTool(tool?.name)),
  };
}
