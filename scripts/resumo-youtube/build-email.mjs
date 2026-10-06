#!/usr/bin/env node
// Monta o e-mail do resumo diário a partir da saída de fetch-novos-videos.mjs
// e de um JSON de bullets { videoId: ["…", "…"] } escrito pela sessão da rotina.
//
// Uso:
//   node scripts/resumo-youtube/build-email.mjs videos.json bullets.json \
//        --destaques id1,id2,id3 [--dupla] > email.html
//   (o assunto vai para stderr, prefixado com "subject: ")
//
// Existe para que o HTML não seja remontado à mão a cada dia: as regras de estilo que
// o Gmail aceita são sutis (ver NOTA CSS) e um gerador versionado as preserva.

import { readFileSync } from 'node:fs';

// NOTA CSS — o Gmail REMOVE a propriedade abreviada `background` de style inline,
// mas preserva `background-color`. Com `background:#7c5cbf` o botão lilás perdia o
// fundo e ficava texto branco sobre branco (invisível). Use SEMPRE background-color.
const LILAS = '#7c5cbf';
const BORDA = '#e6e1f2';
const TINTA = '#1d1b20';
const FRACO = '#6b6673';
const FUNDO_CAIXA = '#f5f1fb';

const SECOES = [
  ['🤖 Inteligência Artificial', 'IA', '🤖'],
  ['💰 Investimentos', 'Investimentos', '💰'],
  ['📺 Outros', 'Outros', '📺'],
];

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// "Terça-feira, 06 de outubro de 2026" — primeira letra maiúscula, fuso de São Paulo.
export function dataLonga(d) {
  const f = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export function dataCurta(d) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
  }).format(d);
}

export function haQuanto(publicado, agora) {
  const h = Math.floor((agora.getTime() - new Date(publicado).getTime()) / 3600000);
  return h < 24 ? `há ${h}h` : `há ${Math.floor(h / 24)}d`;
}

function botao(href, texto) {
  return (
    `<a href="${esc(href)}" style="display:inline-block;background-color:${LILAS};color:#ffffff;` +
    'text-decoration:none;font-size:13px;font-weight:600;padding:9px 14px;border-radius:8px;' +
    `margin-right:8px">${texto}</a>`
  );
}

function bloco(v, bullets, agora) {
  const dur = v.duracaoStr || 'duração indisponível';
  const bs = bullets.map((b) => `<li style="margin-bottom:6px">${esc(b)}</li>`).join('');
  return (
    `<div style="padding:16px 0;border-bottom:1px solid ${BORDA}">` +
    `<div style="font-size:16px;font-weight:700;line-height:1.35;margin-bottom:4px">${esc(v.titulo)}</div>` +
    `<div style="font-size:13px;color:${FRACO};margin-bottom:10px">` +
    `${esc(v.canal)} · ⏱ ${esc(dur)} · ${haQuanto(v.publicado, agora)}</div>` +
    `<ul style="font-size:14px;line-height:1.5;margin:0 0 12px;padding-left:18px">${bs}</ul>` +
    `<div>${botao(v.url, '▶ Assistir no YouTube')}</div></div>`
  );
}

/**
 * @param {object} o
 * @param {object} o.dados     saída de fetch-novos-videos.mjs
 * @param {object} o.bullets   { videoId: string[] } — precisa cobrir todos os vídeos
 * @param {string[]} o.destaques  3 videoIds para o bloco "⭐ destaques de hoje"
 * @param {Date} [o.agora]     referência de data/hora (default: now)
 * @param {boolean} [o.dupla]  edição que cobre 48h
 * @returns {{subject: string, html: string, text: string}}
 */
export function montarEmail({ dados, bullets, destaques, agora = new Date(), dupla = false }) {
  const vids = dados.videos;
  if (!vids.length) throw new Error('nada a enviar: dados.videos está vazio');

  const semBullets = vids.filter((v) => !bullets[v.videoId]?.length).map((v) => v.videoId);
  if (semBullets.length) throw new Error(`sem bullets para: ${semBullets.join(', ')}`);

  const porId = new Map(vids.map((v) => [v.videoId, v]));
  const faltam = destaques.filter((id) => !porId.has(id));
  if (faltam.length) throw new Error(`destaque fora da lista de vídeos: ${faltam.join(', ')}`);

  const cont = Object.fromEntries(
    SECOES.map(([, cat]) => [cat, vids.filter((v) => v.categoria === cat).length])
  );
  const emoji = Object.fromEntries(SECOES.map(([, cat, e]) => [cat, e]));

  const dest = destaques
    .map((id) => {
      const v = porId.get(id);
      return (
        '<div style="margin-bottom:8px">' +
        `<a href="${esc(v.url)}" style="color:${LILAS};text-decoration:none;font-size:14px;` +
        `font-weight:600">${emoji[v.categoria]} ${esc(v.titulo)}</a>` +
        `<span style="color:${FRACO};font-size:13px"> — ${esc(v.canal)} · ` +
        `${haQuanto(v.publicado, agora)}</span></div>`
      );
    })
    .join('');

  let corpo = '';
  for (const [titulo, cat] of SECOES) {
    const sel = vids.filter((v) => v.categoria === cat);
    if (!sel.length) continue;
    corpo +=
      `<h2 style="font-size:17px;margin:28px 0 4px;border-top:2px solid ${LILAS};` +
      `padding-top:14px">${titulo} <span style="color:${FRACO};font-weight:400;` +
      `font-size:14px">${sel.length} vídeo(s)</span></h2>` +
      sel.map((v) => bloco(v, bullets[v.videoId], agora)).join('');
  }

  const aviso = dupla
    ? `<div style="font-size:14px;background-color:#fff6e5;border-radius:8px;padding:10px 14px;` +
      'margin-bottom:12px">📬 Edição dupla: cobre as últimas 48h</div>'
    : '';
  const falhas = dados.falhas?.length
    ? '<br>⚠️ falhas de feed: ' + esc(dados.falhas.map((f) => f.canal).join(', '))
    : '';

  const html =
    `<div style="font-family:system-ui,sans-serif;color:${TINTA};max-width:680px;margin:0 auto;` +
    'padding:24px 20px;background-color:#ffffff">' +
    `<div style="font-size:24px;font-weight:800;color:${LILAS}">Resumo YouTube</div>` +
    `<div style="font-size:14px;color:${FRACO};margin:4px 0 14px">${dataLonga(agora)}</div>` +
    aviso +
    `<div style="font-size:14px;background-color:${FUNDO_CAIXA};border-radius:8px;` +
    `padding:10px 14px;margin-bottom:20px">🤖 IA: ${cont.IA} · 💰 Investimentos: ` +
    `${cont.Investimentos} · 📺 Outros: ${cont.Outros}</div>` +
    '<div style="font-size:15px;font-weight:700;margin-bottom:10px">⭐ destaques de hoje</div>' +
    dest +
    corpo +
    `<div style="font-size:12px;line-height:1.5;color:${FRACO};margin-top:26px;` +
    `border-top:1px solid ${BORDA};padding-top:14px">📊 ${dados.canaisMonitorados} canais ` +
    `monitorados · ${dados.curtosIgnorados} curtos/Shorts ignorados · ` +
    `docs/runbook-resumo-youtube.md${falhas}</div></div>`;

  const canais = new Set(vids.map((v) => v.canal)).size;
  const subject = `Resumo YouTube ${dataCurta(agora)} — ${canais} canal(is) com novidades`;

  const text =
    `Resumo YouTube — ${dataLonga(agora)}\n\n` +
    SECOES.flatMap(([titulo, cat]) => {
      const sel = vids.filter((v) => v.categoria === cat);
      if (!sel.length) return [];
      return [
        `${titulo} (${sel.length})`,
        ...sel.map(
          (v) =>
            `- ${v.titulo} — ${v.canal}\n  ` +
            bullets[v.videoId].join('\n  ') +
            `\n  ${v.url}`
        ),
        '',
      ];
    }).join('\n');

  return { subject, html, text };
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const [videosPath, bulletsPath] = process.argv.slice(2);
  if (!videosPath || !bulletsPath) {
    console.error('uso: build-email.mjs videos.json bullets.json --destaques id1,id2,id3 [--dupla]');
    process.exit(1);
  }
  const i = process.argv.indexOf('--destaques');
  if (i === -1) {
    console.error('--destaques é obrigatório');
    process.exit(1);
  }
  const { subject, html } = montarEmail({
    dados: JSON.parse(readFileSync(videosPath, 'utf8')),
    bullets: JSON.parse(readFileSync(bulletsPath, 'utf8')),
    destaques: process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean),
    dupla: process.argv.includes('--dupla'),
  });
  console.error(`subject: ${subject}`);
  console.log(html);
}
