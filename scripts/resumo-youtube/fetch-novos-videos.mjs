#!/usr/bin/env node
// Busca vídeos novos dos canais monitorados (scripts/resumo-youtube/channels.json)
// via feeds RSS públicos do YouTube — sem API key, sem OAuth, sem dependências.
//
// Uso:
//   node scripts/resumo-youtube/fetch-novos-videos.mjs            # últimas 24h
//   node scripts/resumo-youtube/fetch-novos-videos.mjs --hours 48 # janela maior
//
// Saída (stdout): JSON { geradoEm, janelaHoras, canaisMonitorados, videos: [...] }
// Cada vídeo: { canal, categoria, videoId, titulo, url, publicado, descricao }

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

videos.sort((a, b) => b.publicado.localeCompare(a.publicado));

console.log(
  JSON.stringify(
    {
      geradoEm: new Date().toISOString(),
      janelaHoras: HOURS,
      canaisMonitorados: canais.length,
      canaisComNovidade: new Set(videos.map((v) => v.canal)).size,
      falhas,
      videos,
    },
    null,
    2
  )
);
