// Duração dos vídeos pela YouTube Data API v3 (videos.list, part=contentDetails).
//
// Por que a API e não a página do vídeo: deste container o YouTube responde
// `playabilityStatus: LOGIN_REQUIRED` ("confirme que você não é um bot") e remove o
// `videoDetails` da página, do InnerTube (web/mobile/tv/embedded), do /embed/ e até do
// yt-dlp — o bloqueio é do IP do datacenter, não da técnica. O feed RSS não traz
// duração e o oEmbed não expõe o campo. Detalhes em docs/runbook-resumo-youtube.md.
//
// Custo: videos.list aceita até 50 IDs por chamada e custa 1 unidade. Um resumo diário
// (~20 vídeos) gasta 1 unidade de uma cota diária de 10.000.
//
// Precisa de YOUTUBE_API_KEY no ambiente. Sem a chave, quem chama segue sem duração.

export const MAX_IDS_POR_CHAMADA = 50;
const ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';

// 'PT1H5M3S' → 3903 · 'PT28M' → 1680 · 'P0D' → 0 · inválido → null
export function parseISODuration(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso || '');
  if (!m) return null;
  const [, d, h, min, s] = m.map((v) => (v === undefined ? 0 : v));
  if (!/\d/.test(iso)) return null;
  return Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(s);
}

/**
 * Busca a duração de cada vídeo. Nunca lança: o resumo do dia vale mais que a duração,
 * então falha de rede/cota devolve o que deu para obter e o resto fica sem duração.
 *
 * @param {string[]} videoIds
 * @param {string} apiKey
 * @param {{fetchImpl?: typeof fetch}} [opts]
 * @returns {Promise<{duracoes: Map<string, number>, erros: string[]}>}
 */
export async function buscarDuracoes(videoIds, apiKey, { fetchImpl = fetch } = {}) {
  const duracoes = new Map();
  const erros = [];
  if (!apiKey) {
    erros.push('YOUTUBE_API_KEY ausente');
    return { duracoes, erros };
  }
  const ids = [...new Set(videoIds.filter(Boolean))];

  for (let i = 0; i < ids.length; i += MAX_IDS_POR_CHAMADA) {
    const lote = ids.slice(i, i + MAX_IDS_POR_CHAMADA);
    const url =
      `${ENDPOINT}?part=contentDetails&maxResults=${MAX_IDS_POR_CHAMADA}` +
      `&id=${lote.join(',')}&key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) {
        // a mensagem do Google diz se é chave inválida, cota estourada ou API desativada
        const motivo = corpo?.error?.message || `HTTP ${res.status}`;
        erros.push(`lote ${i / MAX_IDS_POR_CHAMADA + 1}: ${motivo}`);
        continue;
      }
      for (const item of corpo?.items || []) {
        const segundos = parseISODuration(item?.contentDetails?.duration);
        // Transmissões ao vivo (e agendadas) vêm como P0D: duração 0 não é duração.
        // Deixar passar como 0 faria o corte de vídeos curtos derrubar toda live.
        if (segundos === null || segundos === 0) continue;
        duracoes.set(item.id, segundos);
      }
    } catch (e) {
      erros.push(`lote ${i / MAX_IDS_POR_CHAMADA + 1}: ${String(e)}`);
    }
  }
  return { duracoes, erros };
}
