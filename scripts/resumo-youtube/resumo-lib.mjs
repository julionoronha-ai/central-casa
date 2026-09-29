// Funções puras do Resumo YouTube (reserva na nuvem). Espelham o projeto do Mac
// (~/youtube-resumo): mesmo corte de duração, mesmo formato de duração e o MESMO link
// do botão "📖 Gerar resumo aprimorado" — o processador de pedidos do Mac lê esse formato.

// Igual a MIN_DURATION_SECS em ~/youtube-resumo/scripts/youtube_client.py.
export const MIN_DURATION_SECS = 180;
export const RESUMO_PLUS_ADDRESS = 'julionoronha+ytresumo@gmail.com';

// Igual a format_duration() do Mac: 45s · 28min · 2h · 2h05min
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}min` : `${h}h`;
}

// "lengthSeconds" da página do vídeo (sem API key). null se não achar.
export function parseLengthSeconds(html) {
  const m = /"lengthSeconds":"(\d+)"/.exec(html || '');
  return m ? Number(m[1]) : null;
}

// Decide se o vídeo entra. duracao null = desconhecida: entra, salvo se for Short.
export function deveEntrar({ titulo, duracao, isShort }) {
  if (isShort || /#shorts?\b/i.test(titulo || '')) return false;
  if (duracao !== null && duracao < MIN_DURATION_SECS) return false;
  return true;
}

// Mesmo assunto/corpo de _build_enhance_mailto() em ~/youtube-resumo/scripts/email_builder.py.
export function mailtoResumo({ videoId, titulo, canal, url }) {
  const t = [...titulo];
  const tituloAssunto = t.length > 120 ? t.slice(0, 120).join('') + '…' : titulo;
  const subject = `RESUMO-YT: ${videoId} | ${tituloAssunto}`;
  const body =
    'Pedido de resumo aprimorado (Claude Sonnet) para o vídeo abaixo.\n\n' +
    `Vídeo:  ${titulo}\n` +
    `Canal:  ${canal}\n` +
    `URL:    ${url}\n` +
    `ID:     ${videoId}\n\n` +
    '--\n' +
    'Não edite as linhas acima — elas são lidas pela skill resumo-youtube.\n' +
    'O resumo aprimorado chega em um e-mail novo na próxima rodada (07:30, 12:30 ou 19:30).';
  return `mailto:${RESUMO_PLUS_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
