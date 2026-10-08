// Funções puras do Resumo YouTube. O corte de duração e o formato da duração vêm do
// projeto do Mac (~/youtube-resumo), aposentado em 05/10/2026, e seguem valendo aqui.

export const MIN_DURATION_SECS = 180;

// Igual a format_duration() do Mac: 45s · 28min · 2h · 2h05min
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}min` : `${h}h`;
}

// Decide se o vídeo entra. duracao null = desconhecida: entra, salvo se for Short.
export function deveEntrar({ titulo, duracao, isShort }) {
  if (isShort || /#shorts?\b/i.test(titulo || '')) return false;
  if (duracao !== null && duracao < MIN_DURATION_SECS) return false;
  return true;
}
