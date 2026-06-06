# Design — Cardápio Semanal Inteligente (Módulo 2 da Central de Casa)

**Data:** 2026-06-06
**Autor:** Júlio + Claude (sessão de brainstorming)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto e escopo

Módulo 2 da "Central de Casa". Reusa o stack do Módulo 1 (**GitHub Pages + Supabase**, repo `julionoronha-ai/central-casa`). Sugere o cardápio da semana (seg–sex), aprende com feedback, e empurra os ingredientes para a Lista de Compras (Módulo 1).

### Entrega
- **Página de Cardápio** (fonte da verdade) + **resumo no WhatsApp sob demanda** / botão "copiar como mensagem".
- **Banco de receitas que cresce** (curadoria): o Claude monta a semana escolhendo dele, honrando regras + feedback + variedade, e pode propor pratos novos (entram no banco quando aprovados).

### Fora de escopo
- Geração automática 24h na nuvem (a nuvem não envia WhatsApp; geração é feita por uma **sessão do Claude** sob demanda, lembrada por evento no Google Calendar).
- Módulo 3 (OCR de notas / dashboard de preços).

---

## 2. Grade do cardápio

- **Dias:** segunda a sexta.
- **Refeições, nesta ordem:** **Merenda do Henrique** (ele sai cedo p/ escola) → **Café da manhã** → **Almoço** → **Lanche da tarde** → **Jantar/lanche noturno**.
- **Porções:** ~6 pessoas (Júlio, Lilian, Henrique, Júlia [bebê, porção parcial], Ester, Aline). Config `porcoes_padrao` (default 6).

---

## 3. Regras

### Rígidas (nunca violar)
1. **Alergias do Henrique** (amendoim, trigo, banana, peixe, nozes, castanhas) **nunca nas porções dele**. Modelo **(ii)**: a família come a versão normal; quando a refeição tiver alérgeno, o Henrique recebe uma **variante segura** (exibida como "Henrique: ..."). Quando a refeição já é segura, sem variante.
2. **Merenda do Henrique** = sempre **1 fruta + 1 carboidrato** (e sempre segura).
3. **Almoço e Jantar** têm **sempre 1 prato elaborado (★)** com **receita própria** (página no app) que a Ester acessa para preparar/pré-preparar.
4. **Sem repetir** o mesmo prato dentro da semana.

### Estrutura do almoço (template fixo; itens variam)
arroz + feijão + 1 carne (branca ou vermelha) + 2 legumes + salada completa + 1 verdura escura (couve, espinafre etc.).

### Aprendizado (preferências, ajustável)
Favorece pratos com 👍, evita 👎, ajusta quantidades pela **porção** (muito/bom/pouco), busca variedade vs. semanas recentes (~3 semanas).

---

## 4. Dados (novas tabelas no Supabase)

**`receitas`** — banco de pratos/componentes (cresce)
| campo | tipo | nota |
|---|---|---|
| id | uuid PK | |
| nome | text | "Espaguete de abobrinha com frango", "Arroz", "Couve refogada" |
| refeicao | text | `merenda`\|`cafe`\|`almoco`\|`lanche`\|`jantar` |
| elaborado | bool | ★ — exige preparo/receita |
| henrique_safe | bool | true se já é seguro p/ Henrique |
| ingredientes | jsonb | `[{item, qtd, unidade}]` **por porção** |
| preparo | text null | passo a passo (para os elaborados) |
| ativo | bool default true | |

**`cardapios`** — a semana
| id | semana_inicio (date = segunda) | status (`rascunho`\|`aprovado`) | aprovado_por (FK users) | aprovado_em | criado_em |

**`cardapio_itens`** — componentes por refeição
| id | cardapio_id FK | dia (1=seg..5=sex) | refeicao | receita_id FK | eh_variante_henrique bool | ordem |

**`feedback_cardapio`** — por refeição (unidade do cartão)
| id | cardapio_id FK | dia | refeicao | usuario_id FK | gostou bool | porcao (`muito`\|`bom`\|`pouco`) | nota text | criado_em |

**`despensa_basica`** — itens que sempre têm em casa
| id | nome text |  (ex.: arroz, feijão, sal, óleo, café, açúcar) — **não** entram na compra.

**Alteração no Módulo 1:** `necessidades` ganha **`origem`** text default `'pessoa'` (valores: `pessoa` | `cardapio`). No modo compras, itens com `origem='cardapio'` aparecem com etiqueta **"Cardápio"** em vez de nome de pessoa.

**RLS/grants:** `receitas`, `cardapios`, `cardapio_itens`, `feedback_cardapio`, `despensa_basica` com select para anon; insert/update/delete conforme necessário (escrita de feedback e aprovação pelo app). Grants explícitos ao papel `anon` (como no Módulo 1).

---

## 5. Páginas (estética lilás, mesma do Módulo 1)

### `cardapio.html` (acesso por token, igual ao Módulo 1)
- **Topo (vidro fosco):** "Cardápio" (Fraunces), semana + selo **Rascunho/Aprovado**; botões **📋 copiar como mensagem** e **✓ aprovar semana** (só papel `comprar`).
- **Abas de dia** (Seg–Sex).
- **Cartões por refeição** (na ordem da §2): componentes; **★ + 📖 ver receita** nos elaborados; **faixa verde "Henrique: ..."** quando há variante; **merenda** marcada "✓ sem alérgenos".
- **Feedback em TODAS as refeições:** 👍/👎 + **muito·bom·pouco** + recadinho (Júlio/Lilian).
- Mockup aprovado: `.superpowers/brainstorm/.../cardapio-v3.html`.

### `receita.html?id=...`
Mostra ingredientes + passo a passo (PT, e variante Henrique quando for dele). Aberta por link (a Ester acessa). Leitura pública por id.

---

## 6. Fluxo semanal

1. **Disparo livre** — Júlio pede "gera o cardápio da próxima semana" **a qualquer momento, qualquer dia**. O sistema sempre prepara a **semana seguinte** = a **próxima segunda-a-sexta** relativa à data do disparo (`semana_inicio` = a segunda da próxima semana). Um **lembrete no Google Calendar (quarta 19:30)** serve só de empurrão recorrente — não fixa o dia do disparo.
2. **Claude (sessão)** gera um **rascunho**: lê regras + `receitas` + feedback + cardápios recentes (variedade) + `despensa_basica`; escreve `cardapios` (rascunho) + `cardapio_itens`; cria receitas novas em `receitas` se propor pratos inéditos.
3. **Júlio revisa na página**, usa **"copiar como mensagem"** para mandar a Lilian/Ester (sugestões), e ajusta pedindo ao Claude ("troca o jantar de terça").
4. **Aprovar (Júlio ou Lilian):** status→`aprovado`. **A própria página** então calcula os ingredientes da semana, subtrai a despensa básica, faz dedupe com necessidades pendentes, e insere em `necessidades` com `origem='cardapio'` + quantidade. Resumo no WhatsApp sai sob demanda / por "copiar como mensagem".
5. Durante a semana, Júlio/Lilian dão 👍/👎 + porção + nota nas refeições.

---

## 7. Geração e cálculo

- **Geração (Claude, sessão):** procedimento documentado em `docs/runbook-cardapio.md` (como compor honrando todas as regras §3, garantir variante do Henrique, 1 elaborado em almoço e jantar, etc.). Não é código — é uma tarefa guiada do Claude sobre os dados.
- **Cálculo de ingredientes (página, JS puro, no "aprovar"):** soma `receita.ingredientes × porcoes_padrao` para cada `cardapio_item` da semana, agrega por item/unidade, **subtrai `despensa_basica`**, faz dedupe com necessidades pendentes, e insere o que falta. Lógica pura, testável.

---

## 8. Tratamento de erros / casos de borda

- **Sem cardápio da semana:** página mostra "nenhum cardápio ainda — peça ao Claude para gerar".
- **Segurança do Henrique:** a página faz uma checagem defensiva — se alguma refeição que ele come ficar sem opção segura, destaca em vermelho ("⚠ revisar Henrique"). A geração nunca deve produzir isso; a checagem é a rede de proteção.
- **Despensa:** itens da despensa básica nunca entram na compra (dedupe por nome normalizado, sem acento/caixa — mesma `norm()` do Módulo 1).
- **Aprovar duas vezes:** idempotente — não duplica necessidades já inseridas (dedupe por item+origem).
- **Receita ausente num prato elaborado:** página mostra "receita pendente" em vez de link quebrado.

---

## 9. Como verificar (testes)

- **Unit (Vitest):**
  - Agregação de ingredientes (soma × porções, dedupe, subtração da despensa).
  - `copiar como mensagem` (texto por dia/refeição).
  - Checagem Henrique-safe (rejeita alérgeno nas porções dele).
  - Validador da estrutura do almoço.
- **E2E (Playwright):** carregar página com cardápio-rascunho semeado; dar feedback (grava); **aprovar → necessidades inseridas com `origem='cardapio'`**; abrir página de receita.

---

## 10. Parâmetros e questões em aberto (resolver na implementação)

1. **Seed inicial do banco de receitas** — montar com o Júlio um conjunto inicial (favoritos + o dia-exemplo) cobrindo as 5 refeições, incl. componentes simples com quantidades por porção.
2. **Despensa básica** — definir a lista inicial com o Júlio (ex.: arroz, feijão, sal, óleo, café, açúcar, temperos).
3. **`porcoes_padrao`** — confirmar 6 (Júlia parcial) ou outro número.
4. **Lembrete no Calendar** — criar evento recorrente **quarta 19:30** "Gerar cardápio da próxima semana" via MCP do Google Calendar.
5. **Acesso de Ester/Aline ao cardápio** — leitura via token (veem o cardápio e abrem receitas); sem feedback/aprovação.
6. **Quantidades nas receitas** — preencher `ingredientes` com medida por porção para o cálculo funcionar (parte do seed).
