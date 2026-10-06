// node --test 'scripts/resumo-youtube/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarEmail, dataLonga, dataCurta, haQuanto, esc } from './build-email.mjs';

const AGORA = new Date('2026-10-06T08:56:00Z'); // 05:56 BRT

const DADOS = {
  canaisMonitorados: 36,
  curtosIgnorados: 13,
  falhas: [],
  videos: [
    { videoId: 'aaa', canal: 'Canal IA', categoria: 'IA', titulo: 'Título & "teste"',
      url: 'https://www.youtube.com/watch?v=aaa', publicado: '2026-10-06T00:00:00Z',
      duracaoStr: null },
    { videoId: 'bbb', canal: 'Canal Inv', categoria: 'Investimentos', titulo: 'Bolsa sobe',
      url: 'https://www.youtube.com/watch?v=bbb', publicado: '2026-10-05T20:00:00Z',
      duracaoStr: '28min' },
    { videoId: 'ccc', canal: 'Canal Out', categoria: 'Outros', titulo: 'Política',
      url: 'https://www.youtube.com/watch?v=ccc', publicado: '2026-10-04T08:00:00Z',
      duracaoStr: '2h05min' },
  ],
};
const BULLETS = { aaa: ['um', 'dois'], bbb: ['tres'], ccc: ['quatro'] };
const DESTAQUES = ['aaa', 'bbb', 'ccc'];
const montar = (extra) =>
  montarEmail({ dados: DADOS, bullets: BULLETS, destaques: DESTAQUES, agora: AGORA, ...extra });

test('o Gmail apaga a abreviação `background`: só pode sair background-color', () => {
  const { html } = montar();
  // procura `background` NÃO seguido de `-color`
  assert.equal(/background(?!-color)/.test(html), false, 'usou a abreviação background');
  assert.ok(html.includes('background-color:#7c5cbf'), 'botão sem fundo lilás');
});

test('assunto, data e contadores', () => {
  const { subject, html } = montar();
  assert.equal(subject, 'Resumo YouTube 06/10/2026 — 3 canal(is) com novidades');
  assert.ok(html.includes('Terça-feira, 06 de outubro de 2026'));
  assert.ok(html.includes('🤖 IA: 1 · 💰 Investimentos: 1 · 📺 Outros: 1'));
});

test('todo vídeo entra com url, bullets, duração e UM só botão', () => {
  const { html } = montar();
  for (const v of DADOS.videos) {
    assert.ok(html.includes(v.url), `faltou url de ${v.videoId}`);
    for (const b of BULLETS[v.videoId]) assert.ok(html.includes(b));
  }
  assert.equal((html.match(/▶ Assistir no YouTube/g) || []).length, DADOS.videos.length);
  assert.ok(html.includes('⏱ duração indisponível'), 'duracaoStr null sem fallback');
  assert.ok(html.includes('⏱ 28min'));
});

test('não sobrou nada do botão do Mac (aposentado)', () => {
  const { html } = montar();
  assert.equal(html.includes('mailto:'), false);
  assert.equal(html.includes('resumo aprimorado'), false);
});

test('escapa HTML do título', () => {
  const { html } = montar();
  assert.ok(html.includes('Título &amp; &quot;teste&quot;'));
  assert.equal(html.includes('"teste"</div>'), false);
});

test('edição dupla mostra o aviso de 48h', () => {
  assert.equal(montar().html.includes('Edição dupla'), false);
  assert.ok(montar({ dupla: true }).html.includes('📬 Edição dupla: cobre as últimas 48h'));
});

test('falhas de feed aparecem no rodapé', () => {
  const dados = { ...DADOS, falhas: [{ canal: 'Canal X', erro: 'HTTP 404' }] };
  const { html } = montarEmail({ dados, bullets: BULLETS, destaques: DESTAQUES, agora: AGORA });
  assert.ok(html.includes('⚠️ falhas de feed: Canal X'));
});

test('recusa montar com bullet faltando, destaque inválido ou lista vazia', () => {
  assert.throws(() => montar({ bullets: { aaa: ['um'] } }), /sem bullets para: bbb, ccc/);
  assert.throws(() => montar({ destaques: ['zzz'] }), /destaque fora da lista/);
  assert.throws(
    () => montarEmail({ dados: { ...DADOS, videos: [] }, bullets: {}, destaques: [] }),
    /está vazio/
  );
});

test('corpo em texto cobre todos os vídeos', () => {
  const { text } = montar();
  for (const v of DADOS.videos) assert.ok(text.includes(v.titulo) && text.includes(v.url));
});

test('helpers de data e idade', () => {
  assert.equal(dataCurta(AGORA), '06/10/2026');
  assert.equal(dataLonga(AGORA), 'Terça-feira, 06 de outubro de 2026');
  assert.equal(haQuanto('2026-10-06T00:00:00Z', AGORA), 'há 8h');
  assert.equal(haQuanto('2026-10-04T08:00:00Z', AGORA), 'há 2d');
  assert.equal(esc('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});
