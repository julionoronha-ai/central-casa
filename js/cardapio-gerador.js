// Gerador algorítmico do cardápio (roda no navegador, sem Claude/servidor).
// Escolhe receitas Henrique-safe do banco, 1 por refeição/dia, evitando repetir na semana.
const ORDEM = ['merenda', 'cafe', 'almoco', 'lanche', 'jantar']
const aleatorio = arr => arr[Math.floor(Math.random() * arr.length)]

function poolDe(receitas, refeicao) {
  return (receitas ?? []).filter(r => r.refeicao === refeicao && r.henrique_safe && r.ativo !== false)
}

// Gera os itens de uma semana (5 dias × 5 refeições). pick é injetável p/ testes.
export function gerarSemana(receitas, opts = {}) {
  const pick = opts.pick ?? aleatorio
  const itens = []
  for (const ref of ORDEM) {
    const pool = poolDe(receitas, ref)
    if (!pool.length) continue
    const usados = new Set()
    for (let dia = 1; dia <= 5; dia++) {
      let disp = pool.filter(r => !usados.has(r.id))
      if (!disp.length) { usados.clear(); disp = pool } // banco menor que 5: recomeça o rodízio
      const escolha = pick(disp)
      usados.add(escolha.id)
      itens.push({ dia, refeicao: ref, receita_id: escolha.id, eh_variante_henrique: false, ordem: 0 })
    }
  }
  return itens
}

// Uma nova sugestão para uma refeição, evitando ids já usados (ex.: na semana).
export function novaSugestao(receitas, refeicao, evitarIds = [], opts = {}) {
  const pick = opts.pick ?? aleatorio
  const evit = new Set(evitarIds)
  const pool = poolDe(receitas, refeicao)
  const disp = pool.filter(r => !evit.has(r.id))
  const fonte = disp.length ? disp : pool
  return fonte.length ? pick(fonte).id : null
}
