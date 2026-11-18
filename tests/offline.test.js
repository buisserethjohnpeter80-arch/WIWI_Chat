import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('entry HTML uses no remote CDN fonts or runtime scripts', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<script[^>]*src=["']https?:/i);
  assert.doesNotMatch(html, /<link[^>]*href=["']https?:/i);
  assert.match(html, /\/src\/main\.js/);
});
