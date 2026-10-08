// node --test 'scripts/resumo-youtube/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseISODuration, buscarDuracoes, MAX_IDS_POR_CHAMADA } from './duracoes.mjs';

test('converte duração ISO-8601 em segundos', () => {
  assert.equal(parseISODuration('PT45S'), 45);
  assert.equal(parseISODuration('PT28M'), 1680);
  assert.equal(parseISODuration('PT1H'), 3600);
  assert.equal(parseISODuration('PT1H5M3S'), 3903);
  assert.equal(parseISODuration('P1DT2H'), 93600);
  assert.equal(parseISODuration('P0D'), 0); // transmissão ao vivo
});

test('recusa entrada que não é duração', () => {
  for (const ruim of ['', null, undefined, 'PT', 'P', '28min', '1:05', 'XPT1M', 'P1W']) {
    assert.equal(parseISODuration(ruim), null, `aceitou ${JSON.stringify(ruim)}`);
  }
});

const resposta = (items) => ({ ok: true, json: async () => ({ items }) });

test('monta uma chamada só e devolve as durações', async () => {
  const chamadas = [];
  const { duracoes, erros } = await buscarDuracoes(['aaa', 'bbb'], 'K', {
    fetchImpl: async (url) => {
      chamadas.push(url);
      return resposta([
        { id: 'aaa', contentDetails: { duration: 'PT10M' } },
        { id: 'bbb', contentDetails: { duration: 'PT1H2M3S' } },
      ]);
    },
  });
  assert.equal(chamadas.length, 1);
  assert.match(chamadas[0], /part=contentDetails/);
  assert.match(chamadas[0], /[?&]id=aaa,bbb/);
  assert.match(chamadas[0], /key=K/);
  assert.deepEqual([...duracoes], [['aaa', 600], ['bbb', 3723]]);
  assert.deepEqual(erros, []);
});

test('quebra em lotes de 50 e não repete id', async () => {
  const lotes = [];
  const ids = Array.from({ length: 120 }, (_, i) => `v${i}`);
  await buscarDuracoes([...ids, 'v0', 'v1'], 'K', {
    fetchImpl: async (url) => {
      lotes.push(new URL(url).searchParams.get('id').split(','));
      return resposta([]);
    },
  });
  assert.deepEqual(lotes.map((l) => l.length), [50, 50, 20]);
  assert.equal(lotes.flat().length, 120, 'mandou id repetido');
  assert.equal(MAX_IDS_POR_CHAMADA, 50);
});

test('live (P0D) fica SEM duração, para o corte de curtos não derrubá-la', async () => {
  const { duracoes } = await buscarDuracoes(['live', 'normal'], 'K', {
    fetchImpl: async () =>
      resposta([
        { id: 'live', contentDetails: { duration: 'P0D' } },
        { id: 'normal', contentDetails: { duration: 'PT20M' } },
      ]),
  });
  assert.equal(duracoes.has('live'), false);
  assert.equal(duracoes.get('normal'), 1200);
});

test('vídeo ausente da resposta (apagado/privado) simplesmente não entra', async () => {
  const { duracoes, erros } = await buscarDuracoes(['existe', 'sumiu'], 'K', {
    fetchImpl: async () => resposta([{ id: 'existe', contentDetails: { duration: 'PT5M' } }]),
  });
  assert.deepEqual([...duracoes.keys()], ['existe']);
  assert.deepEqual(erros, []);
});

test('sem chave: não chama a rede e avisa', async () => {
  let chamou = false;
  const { duracoes, erros } = await buscarDuracoes(['aaa'], '', {
    fetchImpl: async () => { chamou = true; return resposta([]); },
  });
  assert.equal(chamou, false);
  assert.equal(duracoes.size, 0);
  assert.deepEqual(erros, ['YOUTUBE_API_KEY ausente']);
});

test('erro da API vira aviso legível, sem lançar', async () => {
  const { duracoes, erros } = await buscarDuracoes(['aaa'], 'RUIM', {
    fetchImpl: async () => ({
      ok: false, status: 400,
      json: async () => ({ error: { message: 'API key not valid. Please pass a valid API key.' } }),
    }),
  });
  assert.equal(duracoes.size, 0);
  assert.equal(erros.length, 1);
  assert.match(erros[0], /API key not valid/);
});

test('rede caindo num lote não impede os outros', async () => {
  const ids = Array.from({ length: 60 }, (_, i) => `v${i}`);
  let n = 0;
  const { duracoes, erros } = await buscarDuracoes(ids, 'K', {
    fetchImpl: async () => {
      if (++n === 1) throw new Error('ECONNRESET');
      return resposta([{ id: 'v55', contentDetails: { duration: 'PT7M' } }]);
    },
  });
  assert.equal(duracoes.get('v55'), 420);
  assert.equal(erros.length, 1);
  assert.match(erros[0], /ECONNRESET/);
});

test('lista vazia não gera chamada', async () => {
  let chamou = false;
  const { duracoes, erros } = await buscarDuracoes([], 'K', {
    fetchImpl: async () => { chamou = true; return resposta([]); },
  });
  assert.equal(chamou, false);
  assert.equal(duracoes.size, 0);
  assert.deepEqual(erros, []);
});
