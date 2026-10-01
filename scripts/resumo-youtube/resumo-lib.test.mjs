// node --test scripts/resumo-youtube/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, parseLengthSeconds, deveEntrar, mailtoResumo } from './resumo-lib.mjs';

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

test('link do botão no formato que o processador do Mac lê', () => {
  const link = mailtoResumo({ videoId: 'IGO_C5slyP0', titulo: 'Título & teste', canal: 'Os Traders Podcast',
    url: 'https://www.youtube.com/watch?v=IGO_C5slyP0' });
  const u = new URL(link);
  assert.equal(u.protocol + u.pathname, 'mailto:julionoronha+ytresumo@gmail.com');
  const subject = decodeURIComponent(/subject=([^&]+)/.exec(link)[1]);
  const body = decodeURIComponent(/body=([^&]+)/.exec(link)[1]);
  assert.equal(subject, 'RESUMO-YT: IGO_C5slyP0 | Título & teste');
  assert.match(body, /^Vídeo: {2}Título & teste$/m);
  assert.match(body, /^Canal: {2}Os Traders Podcast$/m);
  assert.match(body, /^ID: {5}IGO_C5slyP0$/m);
});
