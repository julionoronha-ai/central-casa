#!/usr/bin/env node
// Busca vídeos novos dos canais monitorados (scripts/resumo-youtube/channels.json)
// via feeds RSS públicos do YouTube — sem API key, sem OAuth, sem dependências.
//
// Uso:
//   node scripts/resumo-youtube/fetch-novos-videos.mjs            # últimas 24h
//   node scripts/resumo-youtube/fetch-novos-videos.mjs --hours 48 # janela maior
//
// Saída (stdout): JSON { geradoEm, janelaHoras, canaisMonitorados, curtosIgnorados, videos: [...] }
// Cada vídeo: { canal, categoria, videoId, titulo, url, publicado, descricao,
//               duracao (s|null), duracaoStr ("28min"|null) }
//
// Fora Shorts e vídeos < 3 min; duração lida da página pública do vídeo (sem API key).
// O HTML do e-mail é montado por build-email.mjs a partir deste JSON.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deveEntrar, formatDuration, parseLengthSeconds } from './resumo-lib.mjs';

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

// Duração pela página do vídeo; se não vier (bloqueio/consentimento), /shorts/ID responde
// 200 só para Shorts (vídeo comum redireciona com 303).
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR', Cookie: 'CONSENT=YES+1' };

// O container da rotina não recebe a página do vídeo: o YouTube responde 429 a
// partir deste IP. Sem lengthSeconds não há duração, e insistir uma vez por vídeo
// só alimenta o rate-limit. Na primeira resposta 429/403 (bloqueio do ambiente,
// não do vídeo) desiste pelo resto da execução e vai direto ao probe /shorts/.
let watchBloqueado = false;

async function detalhes(v) {
  let duracao = null;
  if (!watchBloqueado) {
    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${v.videoId}`, {
        headers: HEADERS, signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        duracao = parseLengthSeconds(await res.text());
      } else if ((res.status === 429 || res.status === 403) && !watchBloqueado) {
        // o primeiro lote roda em paralelo; só quem chegar aqui primeiro avisa
        watchBloqueado = true;
        console.error(
          `aviso: página do vídeo indisponível neste ambiente (HTTP ${res.status}). ` +
          'A duração fica indisponível; o filtro de curtos usa só o probe /shorts/.'
        );
      }
    } catch {}
  }
  let isShort = false;
  if (duracao === null) {
    try {
      const res = await fetch(`https://www.youtube.com/shorts/${v.videoId}`, {
        headers: HEADERS, redirect: 'manual', signal: AbortSignal.timeout(20000),
      });
      isShort = res.status === 200;
    } catch {}
  }
  return { ...v, duracao, isShort };
}

const enriquecidos = [];
for (let i = 0; i < videos.length; i += LOTE) {
  enriquecidos.push(...(await Promise.all(videos.slice(i, i + LOTE).map(detalhes))));
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
      canaisComNovidade: new Set(aprovados.map((v) => v.canal)).size,
      curtosIgnorados,
      falhas,
      videos: aprovados,
    },
    null,
    2
  )
);
