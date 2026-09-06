import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hello } from './index.js';

test('hello 返回问候语（占位测试，TDD 时替换为真实用例）', () => {
  assert.match(hello(), /^hello from .+/);
});
