#!/usr/bin/env node
// Busca vídeos novos dos canais monitorados (scripts/resumo-youtube/channels.json)
// via feeds RSS públicos do YouTube — sem API key, sem OAuth, sem dependências.
//
// Uso:
//   node scripts/resumo-youtube/fetch-novos-videos.mjs            # últimas 24h
//   node scripts/resumo-youtube/fetch-novos-videos.mjs --hours 48 # janela maior
//
// Saída (stdout): JSON { geradoEm, janelaHoras, canaisMonitorados, curtosIgnorados,
//                         duracoesViaApi, semDuracao, videos: [...] }
// Cada vídeo: { canal, categoria, videoId, titulo, url, publicado, descricao,
//               duracao (s|null), duracaoStr ("28min"|null) }
//
// Fora Shorts e vídeos < 3 min. A duração vem da YouTube Data API v3 quando
// YOUTUBE_API_KEY está no ambiente (ver duracoes.mjs: é o único caminho que funciona
// deste container). Sem a chave, a duração fica indisponível e o corte de curtos usa
// só o probe /shorts/. O HTML do e-mail é montado por build-email.mjs.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deveEntrar, formatDuration } from './resumo-lib.mjs';
import { buscarDuracoes } from './duracoes.mjs';

const argHours = process.argv.indexOf('--hours');
const HOURS = argHours > -1 ? Number(process.argv[argHours + 1]) : 24;
if (!Number.isFinite(HOURS) || HOURS <= 0) {
  console.error('--hours inválido');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const { canais } = JSON.parse(readFileSync(join(here, 'channels.json'), 'utf8'));

const desde = Date.now() - HOURS * 3600 * 1000;

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : '';
}

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function feedDoCanal(canal) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${canal.channel_id}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const entries = xml.split('<entry>').slice(1);
  const videos = [];
  for (const e of entries) {
    const publicado = tag(e, 'published');
    if (!publicado || new Date(publicado).getTime() < desde) continue;
    const videoId = tag(e, 'yt:videoId');
    if (!videoId) continue;
    videos.push({
      canal: canal.nome,
      categoria: canal.categoria,
      videoId,
      titulo: decode(tag(e, 'title')),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publicado,
      descricao: decode(tag(e, 'media:description')).slice(0, 700),
    });
  }
  return videos;
}

const videos = [];
const falhas = [];
const LOTE = 6;
for (let i = 0; i < canais.length; i += LOTE) {
  const lote = canais.slice(i, i + LOTE);
  const resultados = await Promise.allSettled(lote.map(feedDoCanal));
  resultados.forEach((r, j) => {
    if (r.status === 'fulfilled') videos.push(...r.value);
    else falhas.push({ canal: lote[j].nome, erro: String(r.reason) });
  });
}

// A página do vídeo não serve mais: o YouTube devolve LOGIN_REQUIRED deste IP e tira o
// videoDetails. A duração vem da Data API; o probe /shorts/ (200 só para Short, 303 para
// vídeo comum) continua decidindo os casos sem duração.
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR', Cookie: 'CONSENT=YES+1' };

const { duracoes, erros: errosDuracao } = await buscarDuracoes(
  videos.map((v) => v.videoId),
  process.env.YOUTUBE_API_KEY
);
for (const e of errosDuracao) console.error(`aviso: duração — ${e}`);

async function ehShort(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      headers: HEADERS, redirect: 'manual', signal: AbortSignal.timeout(20000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

// Com duração conhecida o corte de < 3 min já resolve, inclusive para Short: só quem
// ficou sem duração precisa do probe (uma requisição a menos por vídeo no caso bom).
const enriquecidos = [];
for (let i = 0; i < videos.length; i += LOTE) {
  const lote = videos.slice(i, i + LOTE);
  enriquecidos.push(
    ...(await Promise.all(
      lote.map(async (v) => {
        const duracao = duracoes.get(v.videoId) ?? null;
        return { ...v, duracao, isShort: duracao === null ? await ehShort(v.videoId) : false };
      })
    ))
  );
}

const aprovados = enriquecidos
  .filter(deveEntrar)
  .map(({ isShort, ...v }) => ({
    ...v,
    duracaoStr: v.duracao === null ? null : formatDuration(v.duracao),
  }));
const curtosIgnorados = enriquecidos.length - aprovados.length;

aprovados.sort((a, b) => b.publicado.localeCompare(a.publicado));

console.log(
  JSON.stringify(
    {
      geradoEm: new Date().toISOString(),
      janelaHoras: HOURS,
      canaisMonitorados: canais.length,
      duracoesViaApi: duracoes.size,
      semDuracao: aprovados.filter((v) => v.duracao === null).length,
      canaisComNovidade: new Set(aprovados.map((v) => v.canal)).size,
      curtosIgnorados,
      falhas,
      videos: aprovados,
    },
    null,
    2
  )
);
