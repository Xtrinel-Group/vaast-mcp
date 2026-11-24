import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterToolList, isAllowedTool } from './tools.js';

test('only the four read-only tools are allowed', () => {
  for (const name of ['list_workspaces', 'get_findings', 'get_scan_status', 'list_targets']) {
    assert.equal(isAllowedTool(name), true, name);
  }
  for (const name of ['start_scan', 'delete_workspace', '', 'LIST_TARGETS', undefined, 42]) {
    assert.equal(isAllowedTool(name), false, String(name));
  }
});

test('filterToolList drops tools that are not allowed', () => {
  const result = filterToolList({
    tools: [
      { name: 'list_workspaces' },
      { name: 'start_scan' },
      { name: 'get_findings' },
      { name: 'delete_workspace' },
      null,
    ],
    nextCursor: 'abc',
  });
  assert.deepEqual(result.tools, [{ name: 'list_workspaces' }, { name: 'get_findings' }]);
  assert.equal(result.nextCursor, 'abc');
});

test('filterToolList handles a malformed response', () => {
  assert.deepEqual(filterToolList({} as { tools?: unknown }).tools, []);
  assert.deepEqual(filterToolList({ tools: 'nope' }).tools, []);
});
