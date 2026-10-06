// node --test 'scripts/resumo-youtube/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, parseLengthSeconds, deveEntrar } from './resumo-lib.mjs';

test('formato de duração igual ao do Mac', () => {
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(1710), '28min');
  assert.equal(formatDuration(3600), '1h');
  assert.equal(formatDuration(3903), '1h05min');
});

test('lê lengthSeconds da página do vídeo', () => {
  assert.equal(parseLengthSeconds('..."lengthSeconds":"692",...'), 692);
  assert.equal(parseLengthSeconds('<html>consentimento</html>'), null);
});

test('corta Shorts e vídeos com menos de 3 min', () => {
  assert.equal(deveEntrar({ titulo: 'x', duracao: 64, isShort: false }), false);
  assert.equal(deveEntrar({ titulo: 'x', duracao: 179, isShort: false }), false);
  assert.equal(deveEntrar({ titulo: 'x', duracao: 180, isShort: false }), true);
  assert.equal(deveEntrar({ titulo: 'x', duracao: 900, isShort: true }), false);
  assert.equal(deveEntrar({ titulo: 'DRONE #shorts', duracao: null, isShort: false }), false);
  assert.equal(deveEntrar({ titulo: 'longo', duracao: null, isShort: false }), true);
});
