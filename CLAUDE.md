# Central de Casa — guia do projeto (para o Claude Code)

App da casa do Júlio. Frontend estático (HTML/CSS/JS **vanilla**, sem build) hospedado no
**GitHub Pages** + **Supabase** (Postgres + RLS + Realtime) como banco. Sem hospedagem paga.

## Como abrir / trabalhar
- Pasta do projeto: `~/central-casa`. Abrir uma sessão aqui (`cd ~/central-casa && claude`,
  ou app desktop / claude.ai/code / extensão IDE apontando para esta pasta).
- Antes de mexer, leia: `docs/superpowers/specs/` (specs), `docs/superpowers/plans/` (planos),
  `docs/runbook-*.md` (procedimentos), `docs/catalogo-semente.md`.
- Git: branch de trabalho `feat/lista-compras`; o remoto **`main`** = essa branch (Pages serve de `main`).
  Commits com: `git -c user.name="julionoronha-ai" -c user.email="281168311+julionoronha-ai@users.noreply.github.com" commit`.

## Rodar / testar / publicar
- Testes unitários (Vitest): `npm test`. E2E (Playwright): `npm run e2e` (precisa de `.env.test` com tokens; backend remoto → pode ficar flaky por latência, use os retries).
- Servir local: `npm run serve` (porta 5173). `serve.json` força `cleanUrls:false` (senão o `?u=token` some no redirect).
- **Deploy:** `git push origin HEAD:main` → GitHub Pages publica em ~1 min.
  URL: https://julionoronha-ai.github.io/central-casa/
  O push precisa de um **token do GitHub** (fine-grained, repo `central-casa`, Contents: RW). Peça ao Júlio um token novo quando for publicar (ele revoga os antigos).

## Supabase (projeto "Compras casa")
- URL e chave `anon` (pública) estão em `js/config.js`. Project ref: `khfuxkxtojunkrcizobn` (região sa-east-1).
- Mudanças de schema / seeds / geração de cardápio: rodar SQL via `node` + lib `pg` com
  `DATABASE_URL='postgresql://postgres:<SENHA>@db.khfuxkxtojunkrcizobn.supabase.co:5432/postgres'`.
  **A senha do banco NÃO fica salva** — peça ao Júlio na hora; use só via env var, nunca commite.
- Tabelas criadas via SQL direto **precisam de GRANT explícito ao `anon`** (RLS controla linhas; GRANT libera a tabela).

## Usuários e acesso
- 4 usuários com link próprio `?u=<token>` (o token É a credencial; sem senha/login).
  Papéis: `comprar` (Júlio, Lilian — tudo) e `marcar` (Ester, Aline). Só Júlio tem `can_reset`.
- Tokens: ver tabela `users` no banco (`select nome, token from users`). Não commitar tokens.

## Módulos
- **Módulo 1 — Lista de Compras** (✅ no ar): `index.html` + `js/{app,ui,data,logic,util,nav,config,supabaseClient}.js`.
  Catálogo em `itens`, marcações em `necessidades` (campo `origem`: 'pessoa'|'cardapio'). Modos: Marcar/Compras/Ajustes.
- **Módulo 2 — Cardápio** (✅ no ar): `cardapio.html` + `receita.html` + `js/cardapio-*.js`.
  Banco: `receitas` (cresce), `cardapios`, `cardapio_itens`, `feedback_cardapio`, `despensa_basica`, `cardapio_overrides`.
  Dois modos de geração:
    1. **Na página (sem Claude):** `js/cardapio-gerador.js` — botões "🎲 gerar novo" (semana) e "🎲 novo" (por refeição). Escolhe receitas Henrique-safe do banco, sem repetir na semana. Banco tem **15 opções/refeição** (todas safe, em `supabase/seed-receitas.sql`); cada almoço é prato completo, jantares fáceis.
    2. **Por sessão do Claude:** geração "inteligente"/criativa (pratos inéditos, trocas específicas, crescer o banco), seguindo `docs/runbook-cardapio.md`. Disparo livre; lembrete no Calendar qua 19:30.
  Aprovar (Júlio/Lilian) empurra ingredientes p/ a lista (origem 'cardapio'). Entrega do resumo: sob demanda (`docs/runbook-resumo.md`).
  **Gerar novo cardápio por comando (sem senha):** `npm run cardapio:novo` (próxima semana) ou `npm run cardapio:novo 2026-06-22`. Usa só a chave anon pública; cria/atualiza o rascunho da semana.

### ⚠️ REGRAS RÍGIDAS DO CARDÁPIO (nunca violar — valem p/ geração manual, JS e por Claude)
1. **Alergias do Henrique:** NENHUM ingrediente com amendoim, trigo (glúten), banana, peixe/frutos do mar, nozes, castanha. Tudo que ele come deve ser seguro (validar com `isHenriqueSafe`).
2. **Almoço — MONTADO por componentes (cada um aparece na tela), nesta ordem:** **Arroz + Feijão** (fixos) + **★ prato especial com receita** (a carne — boi/frango — podendo envolver legumes/verduras) + **1 legume** sugerido + **1 salada completa** sugerida + **1 verdura escura** sugerida (couve/espinafre/etc.). NÃO é um prato único — são vários `cardapio_itens` (categorias em `receitas`: `arroz`,`feijao`,`especial`,`legume`,`salada`,`verdura`). O gerador (`js/cardapio-gerador.js` → `montarAlmoco`) monta tudo; o especial varia por dia. Bancos: `supabase/seed-almoco-componentes.sql`.
3. **Jantar:** 1 prato **fácil** (a Ester deixa pronto) com receita (★). Sem alérgenos.
4. **Merenda do Henrique — listas FECHADAS** (ampliar só quando o Júlio pedir):
   - Frutas: **uva, maçã, manga, melão, melancia, mamão, pera, mexerica**.
   - Carboidratos: **pão Belive sem glúten com queijo; pão Wickbold sem glúten com queijo; biscoito de polvilho; biscoito Papaovo; biscoito wafer Schär; biscoito maria Schär; bolo de chocolate Schär; bolo de laranja Schär; biscoito Mickey; cookies Schär; biscoito vanilla Schär**.
   - Cada merenda = 1 fruta + 1 carboidrato dessas listas.
5. **Café e Lanche (padrão semanal):** NÃO precisam variar todo dia. Usar **2 opções por semana** cada: uma para **seg/qua/sex** e outra para **ter/qui**. (O gerador `js/cardapio-gerador.js` já faz isso; ao criar manualmente, seguir igual.)
6. **Merenda, almoço e jantar:** variam por dia (1 por dia, sem repetir na semana).
- **Módulo 3 — OCR de notas → dashboard de preços** (a fazer): a planilha "Supermercado" do Júlio é o embrião.

## Convenções
- Nada de framework/build — manter vanilla. Funções puras em `*-logic.js` (testáveis); rede só em `*-data.js`; render em `*-ui.js`.
- Escapar com `esc()` tudo que vai a innerHTML; comparar nomes com `norm()` (ambos em `js/util.js`).
- Estética lilás/Apple-clean (tokens em `css/styles.css`; fontes Fraunces + Hanken Grotesk).
- Trabalhar por skills quando fizer sentido (brainstorming → writing-plans → subagent-driven-development), como foi feito hoje.
