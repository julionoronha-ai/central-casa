// Geração inteligente do cardápio — semana 2026-06-08 (regenera o rascunho existente).
// Cria 25 pratos INÉDITOS (todos Henrique-safe), apaga itens+feedback do rascunho e remonta.
// Senha do banco SÓ via env DATABASE_URL — nunca commitar.
//   DATABASE_URL='postgresql://postgres:<senha>@db.khfuxkxtojunkrcizobn.supabase.co:5432/postgres' \
//   node scripts/gerar-cardapio-2026-06-08.mjs
import pg from 'pg'

const SEMANA = '2026-06-08'
const ALERGENOS = ['amendoim', 'trigo', 'banana', 'peixe', 'nozes', 'castanha']
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const safe = ings => !ings.some(i => ALERGENOS.some(a => norm(i.item).includes(norm(a))))

// --- Banco de pratos inéditos desta geração (nome único por refeição) ---
// r(nome, refeicao, categoria, elaborado, ingredientes[], preparo?)
const r = (nome, refeicao, categoria, elaborado, ingredientes, preparo = null) =>
  ({ nome, refeicao, categoria, elaborado, ingredientes, preparo })

const SALADA = [{ item: 'Alface', qtd: 0.04, unidade: 'kg' }, { item: 'Tomate', qtd: 0.05, unidade: 'kg' }]

const RECEITAS = [
  // ---------- MERENDA (1 fruta + 1 carbo, safe) ----------
  r('Melancia e pão de queijo', 'merenda', 'fruta', false,
    [{ item: 'Melancia', qtd: 0.15, unidade: 'kg' }, { item: 'Pão de queijo', qtd: 0.05, unidade: 'kg' }]),
  r('Laranja e bolinho de tapioca', 'merenda', 'fruta', false,
    [{ item: 'Laranja', qtd: 0.13, unidade: 'kg' }, { item: 'Goma de tapioca', qtd: 0.03, unidade: 'kg' }]),
  r('Abacate e biscoito de arroz', 'merenda', 'fruta', false,
    [{ item: 'Abacate', qtd: 0.08, unidade: 'kg' }, { item: 'Biscoito de arroz', qtd: 0.02, unidade: 'kg' }]),
  r('Ameixa e batata-doce assada', 'merenda', 'fruta', false,
    [{ item: 'Ameixa', qtd: 0.10, unidade: 'kg' }, { item: 'Batata-doce', qtd: 0.08, unidade: 'kg' }]),
  r('Caqui e biscoito de polvilho', 'merenda', 'fruta', false,
    [{ item: 'Caqui', qtd: 0.12, unidade: 'kg' }, { item: 'Biscoito de polvilho', qtd: 0.02, unidade: 'kg' }]),

  // ---------- CAFÉ ----------
  r('Tapioca com queijo e ovo', 'cafe', 'completo', false,
    [{ item: 'Goma de tapioca', qtd: 0.04, unidade: 'kg' }, { item: 'Queijo branco', qtd: 0.03, unidade: 'kg' }, { item: 'Ovo', qtd: 1, unidade: 'un' }],
    'Hidrate a goma e doure na frigideira; recheie com queijo e um ovo mexido.'),
  r('Cuscuz de milho com ovo', 'cafe', 'completo', false,
    [{ item: 'Flocão de milho', qtd: 0.05, unidade: 'kg' }, { item: 'Ovo', qtd: 1, unidade: 'un' }],
    'Cozinhe o flocão no vapor e sirva com ovo cozido ou mexido.'),
  r('Panqueca de ovo e queijo', 'cafe', 'completo', false,
    [{ item: 'Ovo', qtd: 2, unidade: 'un' }, { item: 'Queijo branco', qtd: 0.03, unidade: 'kg' }],
    'Bata os ovos, faça uma panqueca fina na frigideira e recheie com queijo (sem trigo).'),
  r('Iogurte natural com mamão e granola sem glúten', 'cafe', 'fruta', false,
    [{ item: 'Iogurte natural', qtd: 0.12, unidade: 'kg' }, { item: 'Mamão', qtd: 0.08, unidade: 'kg' }, { item: 'Granola sem glúten', qtd: 0.02, unidade: 'kg' }]),
  r('Crepioca com queijo e orégano', 'cafe', 'completo', false,
    [{ item: 'Ovo', qtd: 1, unidade: 'un' }, { item: 'Goma de tapioca', qtd: 0.03, unidade: 'kg' }, { item: 'Queijo branco', qtd: 0.03, unidade: 'kg' }],
    'Misture ovo e goma, doure dos dois lados e recheie com queijo e um toque de orégano.'),

  // ---------- ALMOÇO (prato completo: arroz+feijão+carne+2 legumes+salada+verdura) ----------
  r('Frango ao curry suave com arroz e feijão', 'almoco', 'completo', true,
    [{ item: 'Arroz', qtd: 0.06, unidade: 'kg' }, { item: 'Feijão carioca', qtd: 0.05, unidade: 'kg' }, { item: 'Frango (peito)', qtd: 0.15, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.06, unidade: 'kg' }, { item: 'Abobrinha', qtd: 0.06, unidade: 'kg' }, { item: 'Leite de coco', qtd: 0.03, unidade: 'kg' }, ...SALADA, { item: 'Couve', qtd: 0.05, unidade: 'kg' }],
    'Refogue o frango em cubos com um toque de curry e leite de coco; sirva com arroz, feijão, legumes, salada e couve.'),
  r('Carne assada com batata e cenoura', 'almoco', 'completo', true,
    [{ item: 'Arroz', qtd: 0.06, unidade: 'kg' }, { item: 'Feijão carioca', qtd: 0.05, unidade: 'kg' }, { item: 'Carne (patinho)', qtd: 0.15, unidade: 'kg' }, { item: 'Batata', qtd: 0.08, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.06, unidade: 'kg' }, ...SALADA, { item: 'Couve', qtd: 0.05, unidade: 'kg' }],
    'Asse a carne com batata e cenoura até macias; acompanhe arroz, feijão, salada e couve refogada.'),
  r('Frango ensopado com mandioquinha', 'almoco', 'completo', true,
    [{ item: 'Arroz', qtd: 0.06, unidade: 'kg' }, { item: 'Feijão carioca', qtd: 0.05, unidade: 'kg' }, { item: 'Frango (peito)', qtd: 0.15, unidade: 'kg' }, { item: 'Mandioquinha', qtd: 0.08, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.06, unidade: 'kg' }, ...SALADA, { item: 'Espinafre', qtd: 0.05, unidade: 'kg' }],
    'Ensope o frango com mandioquinha e cenoura; sirva com arroz, feijão, salada e espinafre refogado.'),
  r('Almôndegas de frango ao sugo com arroz e feijão', 'almoco', 'completo', true,
    [{ item: 'Arroz', qtd: 0.06, unidade: 'kg' }, { item: 'Feijão carioca', qtd: 0.05, unidade: 'kg' }, { item: 'Frango (moído)', qtd: 0.15, unidade: 'kg' }, { item: 'Tomate', qtd: 0.06, unidade: 'kg' }, { item: 'Abóbora', qtd: 0.06, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.06, unidade: 'kg' }, { item: 'Alface', qtd: 0.04, unidade: 'kg' }, { item: 'Couve', qtd: 0.05, unidade: 'kg' }],
    'Modele almôndegas de frango e cozinhe no molho de tomate; sirva com arroz, feijão, legumes, salada e couve.'),
  r('Iscas de carne acebolada com arroz e feijão', 'almoco', 'completo', true,
    [{ item: 'Arroz', qtd: 0.06, unidade: 'kg' }, { item: 'Feijão carioca', qtd: 0.05, unidade: 'kg' }, { item: 'Carne (alcatra)', qtd: 0.15, unidade: 'kg' }, { item: 'Cebola', qtd: 0.03, unidade: 'kg' }, { item: 'Abobrinha', qtd: 0.06, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.06, unidade: 'kg' }, ...SALADA, { item: 'Espinafre', qtd: 0.05, unidade: 'kg' }],
    'Grelhe as iscas de carne com cebola; acompanhe arroz, feijão, legumes, salada e espinafre.'),

  // ---------- LANCHE ----------
  r('Smoothie de manga com iogurte', 'lanche', 'bebida', false,
    [{ item: 'Manga', qtd: 0.10, unidade: 'kg' }, { item: 'Iogurte natural', qtd: 0.10, unidade: 'kg' }]),
  r('Biscoito de polvilho com requeijão', 'lanche', 'generico', false,
    [{ item: 'Biscoito de polvilho', qtd: 0.03, unidade: 'kg' }, { item: 'Requeijão', qtd: 0.02, unidade: 'kg' }]),
  r('Espetinho de queijo e tomate', 'lanche', 'generico', false,
    [{ item: 'Queijo branco', qtd: 0.05, unidade: 'kg' }, { item: 'Tomate', qtd: 0.05, unidade: 'kg' }]),
  r('Chips de batata-doce assada', 'lanche', 'generico', false,
    [{ item: 'Batata-doce', qtd: 0.10, unidade: 'kg' }]),
  r('Salada de frutas com coco', 'lanche', 'fruta', false,
    [{ item: 'Maçã', qtd: 0.06, unidade: 'kg' }, { item: 'Mamão', qtd: 0.06, unidade: 'kg' }, { item: 'Uva', qtd: 0.05, unidade: 'kg' }, { item: 'Coco ralado', qtd: 0.01, unidade: 'kg' }]),

  // ---------- JANTAR (elaborado) ----------
  r('Creme de mandioquinha com frango', 'jantar', 'elaborado', true,
    [{ item: 'Mandioquinha', qtd: 0.18, unidade: 'kg' }, { item: 'Frango (peito)', qtd: 0.10, unidade: 'kg' }, { item: 'Cebola', qtd: 0.03, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.05, unidade: 'kg' }],
    'Cozinhe a mandioquinha com cebola e cenoura, bata em creme e finalize com frango desfiado.'),
  r('Sopa de abóbora com carne', 'jantar', 'elaborado', true,
    [{ item: 'Abóbora', qtd: 0.18, unidade: 'kg' }, { item: 'Carne moída', qtd: 0.10, unidade: 'kg' }, { item: 'Cebola', qtd: 0.03, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.05, unidade: 'kg' }],
    'Cozinhe a abóbora até macia, amasse e cozinhe com a carne moída refogada e legumes.'),
  r('Caldo de legumes com frango desfiado', 'jantar', 'elaborado', true,
    [{ item: 'Batata', qtd: 0.10, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.06, unidade: 'kg' }, { item: 'Abobrinha', qtd: 0.06, unidade: 'kg' }, { item: 'Frango (peito)', qtd: 0.10, unidade: 'kg' }, { item: 'Cebola', qtd: 0.03, unidade: 'kg' }],
    'Cozinhe os legumes em caldo, junte o frango desfiado e ajuste o sal.'),
  r('Creme de couve-flor', 'jantar', 'elaborado', true,
    [{ item: 'Couve-flor', qtd: 0.18, unidade: 'kg' }, { item: 'Batata', qtd: 0.06, unidade: 'kg' }, { item: 'Cebola', qtd: 0.03, unidade: 'kg' }, { item: 'Leite', qtd: 0.05, unidade: 'kg' }],
    'Cozinhe couve-flor e batata com cebola, bata com um pouco de leite até virar creme.'),
  r('Creme de batata com frango', 'jantar', 'elaborado', true,
    [{ item: 'Batata', qtd: 0.18, unidade: 'kg' }, { item: 'Frango (peito)', qtd: 0.10, unidade: 'kg' }, { item: 'Cebola', qtd: 0.03, unidade: 'kg' }, { item: 'Cenoura', qtd: 0.05, unidade: 'kg' }],
    'Cozinhe a batata com cebola e cenoura, bata em creme e finalize com frango desfiado.'),
]

// Layout da semana: 5 dias × 5 refeições (1 receita por slot, sem repetir).
const ORDEM = ['merenda', 'cafe', 'almoco', 'lanche', 'jantar']
const porRef = ref => RECEITAS.filter(x => x.refeicao === ref)

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Faltou DATABASE_URL no ambiente.')
    process.exit(1)
  }
  // Trava de segurança: nenhum prato pode ter alérgeno do Henrique.
  const inseguros = RECEITAS.filter(x => !safe(x.ingredientes))
  if (inseguros.length) {
    console.error('ABORTADO — receitas com alérgeno:', inseguros.map(x => x.nome))
    process.exit(1)
  }
  for (const ref of ORDEM) {
    if (porRef(ref).length !== 5) {
      console.error(`ABORTADO — ${ref} tem ${porRef(ref).length} receitas (esperado 5).`)
      process.exit(1)
    }
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query('begin')

    // 1) Garante o cardápio da semana (rascunho) e pega o id.
    const card = await client.query(
      `insert into cardapios (semana_inicio, status) values ($1,'rascunho')
       on conflict (semana_inicio) do update set status='rascunho'
       returning id`, [SEMANA])
    const cardapioId = card.rows[0].id

    // 2) Limpa o rascunho antigo (itens + feedback dessa semana).
    await client.query('delete from cardapio_itens where cardapio_id=$1', [cardapioId])
    await client.query('delete from feedback_cardapio where cardapio_id=$1', [cardapioId])
    await client.query('delete from cardapio_overrides where cardapio_id=$1', [cardapioId])

    // 3) Insere receitas inéditas (idempotente por nome+refeição) e mapeia id.
    const idByName = new Map()
    for (const rec of RECEITAS) {
      const existing = await client.query(
        'select id from receitas where nome=$1 and refeicao=$2 limit 1', [rec.nome, rec.refeicao])
      let id
      if (existing.rows.length) {
        id = existing.rows[0].id
        await client.query(
          `update receitas set categoria=$2, elaborado=$3, henrique_safe=true,
             ingredientes=$4::jsonb, preparo=$5, ativo=true where id=$1`,
          [id, rec.categoria, rec.elaborado, JSON.stringify(rec.ingredientes), rec.preparo])
      } else {
        const ins = await client.query(
          `insert into receitas (nome, refeicao, categoria, elaborado, henrique_safe, ingredientes, preparo)
           values ($1,$2,$3,$4,true,$5::jsonb,$6) returning id`,
          [rec.nome, rec.refeicao, rec.categoria, rec.elaborado, JSON.stringify(rec.ingredientes), rec.preparo])
        id = ins.rows[0].id
      }
      idByName.set(rec.nome, id)
    }

    // 4) Monta os 25 itens (dia 1..5 × refeição), 1 receita por slot.
    const itens = []
    for (const ref of ORDEM) {
      const recs = porRef(ref)
      for (let dia = 1; dia <= 5; dia++) {
        itens.push({ dia, refeicao: ref, receita_id: idByName.get(recs[dia - 1].nome) })
      }
    }
    for (const it of itens) {
      await client.query(
        `insert into cardapio_itens (cardapio_id, dia, refeicao, receita_id, eh_variante_henrique, ordem)
         values ($1,$2,$3,$4,false,0)`,
        [cardapioId, it.dia, it.refeicao, it.receita_id])
    }

    await client.query('commit')

    // 5) Resumo + token do Júlio para o link.
    const tok = await client.query("select token from users where lower(nome)='julio' or lower(nome)='júlio' limit 1")
    const token = tok.rows[0]?.token ?? '<token-julio>'
    const DIAS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex']
    console.log(`\n✅ Cardápio ${SEMANA} regenerado — ${itens.length} itens, ${RECEITAS.length} receitas inéditas.\n`)
    for (let dia = 1; dia <= 5; dia++) {
      console.log(`*${DIAS[dia]}*`)
      for (const ref of ORDEM) {
        const rec = porRef(ref)[dia - 1]
        console.log(`  ${ref}: ${rec.nome}`)
      }
    }
    console.log(`\n🔗 https://julionoronha-ai.github.io/central-casa/cardapio.html?u=${token}&semana=${SEMANA}`)
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    await client.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
