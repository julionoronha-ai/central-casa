// Gerador algorítmico do cardápio (roda no navegador, sem Claude/servidor).
// Escolhe receitas Henrique-safe do banco. Regras (rígidas):
// - café e lanche: 2 opções por semana → A em seg/qua/sex (1,3,5), B em ter/qui (2,4).
// - merenda, almoço, jantar: 1 por dia, sem repetir na semana.
const ORDEM = ['merenda', 'cafe', 'almoco', 'lanche', 'jantar']
const PADRAO_2 = new Set(['cafe', 'lanche'])     // mesma opção em dias alternados
const DIAS_A = [1, 3, 5], DIAS_B = [2, 4]
const aleatorio = arr => arr[Math.floor(Math.random() * arr.length)]

function poolDe(receitas, refeicao) {
  return (receitas ?? []).filter(r => r.refeicao === refeicao && r.henrique_safe && r.ativo !== false)
}

function add(itens, dias, ref, id) {
  for (const dia of dias) itens.push({ dia, refeicao: ref, receita_id: id, eh_variante_henrique: false, ordem: 0 })
}

// Sorteio com rodízio (evita repetir até esgotar o pool).
function rodizio(pool, usados, pick) {
  let disp = pool.filter(r => !usados.has(r.id))
  if (!disp.length) { usados.clear(); disp = pool }
  const e = pick(disp); usados.add(e.id); return e
}

// Almoço é MONTADO por componentes: arroz + feijão (fixos) + especial★ + legume + salada + verdura.
function montarAlmoco(receitas, pick) {
  const cat = c => poolDe(receitas, 'almoco').filter(r => r.categoria === c)
  const arroz = cat('arroz')[0], feijao = cat('feijao')[0]
  const especiais = cat('especial'), legumes = cat('legume'), saladas = cat('salada'), verduras = cat('verdura')
  const uE = new Set(), uL = new Set(), uS = new Set(), uV = new Set()
  const itens = []
  for (let dia = 1; dia <= 5; dia++) {
    const linha = []
    if (arroz) linha.push(arroz.id)
    if (feijao) linha.push(feijao.id)
    if (especiais.length) linha.push(rodizio(especiais, uE, pick).id)
    if (legumes.length) linha.push(rodizio(legumes, uL, pick).id)
    if (saladas.length) linha.push(rodizio(saladas, uS, pick).id)
    if (verduras.length) linha.push(rodizio(verduras, uV, pick).id)
    linha.forEach((id, ordem) => itens.push({ dia, refeicao: 'almoco', receita_id: id, eh_variante_henrique: false, ordem }))
  }
  return itens
}

// Gera os itens de uma semana. pick é injetável p/ testes.
export function gerarSemana(receitas, opts = {}) {
  const pick = opts.pick ?? aleatorio
  const itens = []
  for (const ref of ORDEM) {
    if (ref === 'almoco') { itens.push(...montarAlmoco(receitas, pick)); continue }
    const pool = poolDe(receitas, ref)
    if (!pool.length) continue
    if (PADRAO_2.has(ref)) {
      const a = pick(pool)
      const restantes = pool.filter(r => r.id !== a.id)
      const b = pick(restantes.length ? restantes : pool)
      add(itens, DIAS_A, ref, a.id)
      add(itens, DIAS_B, ref, b.id)
    } else {
      const usados = new Set()
      for (let dia = 1; dia <= 5; dia++) {
        let disp = pool.filter(r => !usados.has(r.id))
        if (!disp.length) { usados.clear(); disp = pool }
        const escolha = pick(disp)
        usados.add(escolha.id)
        add(itens, [dia], ref, escolha.id)
      }
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
