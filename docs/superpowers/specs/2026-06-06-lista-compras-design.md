# Design — Lista de Compras Colaborativa (Módulo 1 da Central de Casa)

**Data:** 2026-06-06
**Autor:** Júlio + Claude (sessão de brainstorming)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto e escopo

A "Central de Casa" é dividida em **três módulos independentes**, construídos em sequência:

1. **Lista de Compras colaborativa** ← *este spec*
2. Cardápio semanal inteligente (futuro)
3. OCR de notas fiscais → dashboard de preços (futuro)

Este documento cobre **só o Módulo 1**. Restrição mestra do projeto: **sem hospedagem paga e sem site próprio** por enquanto.

### O que o Módulo 1 entrega
- Uma página web onde **Ester, Aline, Lilian e Júlio** marcam, por seção, os itens que estão faltando em casa.
- Cada pessoa acessa por um **link próprio** (recebido no WhatsApp), que a identifica.
- Um **modo compras** (para Júlio e Lilian) que mostra só as pendências, permite dar baixa item a item e zerar o ciclo.
- Entrega das pendências **(a)** na própria página, **(b)** sob demanda no WhatsApp e **(c)** automaticamente toda **sexta às 20:30** (WhatsApp + e-mail).

### Fora de escopo (não fazer agora)
- Sugestão de cardápio, leitura de notas fiscais, dashboard de preços (módulos 2 e 3).
- Robô de WhatsApp sempre ligado (24h). Os envios saem de uma sessão do Claude / tarefa agendada.

---

## 2. Arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| **Frontend** | Página estática (HTML/CSS/JS puro) hospedada no **GitHub Pages** (grátis) | Sem servidor, sem custo, controle total do visual; Júlio já tem GitHub |
| **Backend / dados** | **Supabase** (plano grátis): Postgres + REST + **Realtime** | Banco de verdade, sincronização em tempo real entre celulares, fácil de o Claude ler/escrever; cresce p/ os módulos 2 e 3 |
| **Cliente Supabase** | `@supabase/supabase-js` via CDN | Sem etapa de build — compatível com GitHub Pages |
| **Entrega WhatsApp/e-mail** | Sessão do Claude (MCP do WhatsApp + Gmail/Composio) e tarefa agendada | Sem servidor 24h; honesto quanto à limitação |

**Fluxo de sincronização:** o navegador escreve em tabelas do Supabase; assinaturas Realtime propagam as mudanças para os outros aparelhos abertos, sem precisar atualizar a tela.

---

## 3. Identidade e acesso

- **Decisão (pergunta 2a): cada pessoa tem seu próprio link.** O link carrega um **token opaco** (`?u=<token>`), que o frontend resolve para o usuário correspondente.
- **Decisão (pergunta 2b): registra-se quem marcou cada item** (gravado no banco; aparece só no modo compras, não na tela de marcar).
- **Papéis:**
  - `marcar` — Ester, Aline (só veem a tela de marcar).
  - `comprar` — Júlio, Lilian (veem a tela de marcar **e** um botão para alternar para o **modo compras**).
  - **Zerar / nova semana:** somente **Júlio** (controlado por uma flag no usuário, ex.: `can_reset`).
- **Segurança (pragmática, dado doméstico não sensível):** tokens longos e opacos; Row Level Security no Supabase liberando leitura do catálogo e leitura/escrita das necessidades, mas bloqueando exclusão em massa (zerar passa por função/flag). Assumimos que o link é "semi-secreto" — risco aceitável para lista de compras. Documentar essa premissa.

---

## 4. Modelo de dados (Supabase / Postgres)

**`users`**
| campo | tipo | nota |
|---|---|---|
| id | uuid PK | |
| nome | text | "Ester", "Aline", "Lilian", "Júlio" |
| papel | text | `marcar` \| `comprar` |
| can_reset | bool | true só p/ Júlio |
| token | text unique | usado no link `?u=<token>` |
| whatsapp | text null | p/ envios futuros |

**`secoes`**
| id | nome | emoji | ordem |
Seções: Legumes & Horta, Frutas, Grãos & Farinha, Carne, Lácteos, Doces, Outros, Limpeza, **Higiene**, **Bebê**.

**`itens`** (catálogo-mãe)
| id | secao_id FK | nome | medida | ativo (bool) | ordem |
Semente em [`docs/catalogo-semente.md`](../../catalogo-semente.md) (~90 itens). Higiene e Bebê a completar com o Júlio.

**`necessidades`** (o que está faltando no ciclo atual)
| campo | tipo | nota |
|---|---|---|
| id | uuid PK | |
| item_id | FK null | null se for item avulso digitado |
| nome_avulso | text null | quando criado via "adicionar item novo" antes de virar catálogo |
| qtd | int default 1 | quantidade opcional (pergunta 4 → opção ii) |
| status | text | `pendente` \| `comprado` |
| marcado_por | FK users | quem marcou |
| marcado_em | timestamptz | |
| baixado_por | FK users null | quem deu baixa |
| baixado_em | timestamptz null | |

**`historico`** (arquivo dos ciclos zerados) — mesma forma de `necessidades` + `ciclo_fechado_em`. Permite consultar "quem marcou o quê" no passado.

**"Adicionar item novo":** cria um `item` ativo na seção escolhida **e** uma `necessidade` apontando para ele — assim o item fica disponível nas próximas vezes (comportamento híbrido, pergunta 1 → opção C).

---

## 5. Telas e UX (design aprovado)

**Estética (aprovada pela Lilian):** "Apple-clean" com **lilás como acento intencional** (nunca degradê roxo genérico). Fundo lavanda suave com leve grão; cartões brancos com sombra macia; topo em vidro fosco; cantos arredondados; muito espaço em branco; toques grandes (mobile-first).

**Tipografia:** `Fraunces` (serifa suave) para marca/saudação; `Hanken Grotesk` para a interface.

**Tokens de cor (do mockup aprovado):**
- bg `#F6F4FC`, surface `#FFFFFF`, ink `#26222E`, muted `#938EA3`, linha `#EFECF5`
- lilás `#8B7AD6`, lilás-deep `#5E4FA6`, lilás-soft `#EEE9FB`
- sálvia (item comprado) `#6FB99A`

Mockup de referência: `.superpowers/brainstorm/.../telas-v2.html`.

### Tela A — Marcar (todos)
Saudação "Oi, {nome}" + avatar; busca no topo; itens agrupados por seção (emoji em cápsula); cada linha = checkbox lilás + nome + medida + **stepper de quantidade** (− n +, opcional; vazio = repor/1); botão tracejado **"＋ adicionar item novo"**; rodapé "salva sozinho · sincroniza em tempo real". Não mostra quem marcou.

### Tela B — Modo compras (Júlio e Lilian)
Contador "N itens pendentes" + botão **"limpar · nova semana"** (visível/efetivo só p/ Júlio); só itens **pendentes**, agrupados por seção, com **quem marcou** (pílula) e quantidade; toque dá baixa → status `comprado`, item risca em **sálvia** e sai da contagem. Alterna com a Tela A por um toggle.

---

## 6. Fluxos principais

1. **Marcar item:** usuário abre seu link → tica item (opcional qtd) → cria/atualiza `necessidade` (`marcado_por`=ele) → Realtime atualiza os demais aparelhos.
2. **Desmarcar:** remove a necessidade pendente daquele item.
3. **Adicionar item novo:** nome + seção (+qtd) → cria `item` ativo + `necessidade`.
4. **Dar baixa (compras):** Júlio/Lilian tocam → `status=comprado`, grava `baixado_por/em` → some das pendências.
5. **Zerar / nova semana (só Júlio):** arquiva necessidades (pendentes + compradas) em `historico` e limpa o painel.
6. **Entrega sob demanda (WhatsApp):** Júlio pede ao Claude ("manda a lista") → Claude lê `necessidades` pendentes no Supabase → envia mensagem organizada por seção via MCP do WhatsApp.
7. **Entrega automática (sexta 20:30):** tarefa agendada lê as pendências e envia por **e-mail** (Gmail/Composio) e **WhatsApp**.

---

## 7. Entrega WhatsApp/e-mail — limitação honesta

- **Sob demanda (b)** e **automático (c)** dependem de uma **sessão/tarefa do Claude**, não de um servidor.
- **E-mail** (via Gmail/Composio) é portátil e confiável em tarefa agendada remota.
- **WhatsApp** depende do MCP local do WhatsApp estar acessível no ambiente que roda o agendamento. Se a tarefa agendada remota não tiver o MCP do WhatsApp:
  - **Fallback:** o e-mail sai garantido na sexta 20:30; o WhatsApp sai sob demanda de uma sessão local, ou de um agendamento que rode onde o MCP exista.
  - Decidir o ambiente da tarefa agendada é uma **questão de implementação** (ver §10).

---

## 8. Tratamento de erros / casos de borda

- **Offline / sem rede:** a tela mostra estado "salvando…" e tenta de novo; nada some sem confirmar gravação.
- **Token inválido/ausente no link:** página mostra "link inválido, peça um novo ao Júlio" (não abre genérico).
- **Marcações simultâneas no mesmo item:** uma única `necessidade` pendente por item; segunda marcação só atualiza qtd/quem — sem duplicar.
- **Item duplicado no "adicionar novo":** se já existir item igual na seção, reaproveita em vez de criar cópia.
- **Zerar acidental:** confirmação ("Zerar a lista e começar nova semana?") antes de arquivar.

---

## 9. Como verificar (testes)

- **Catálogo:** todas as seções e itens-semente aparecem corretamente agrupados.
- **Identidade:** abrir o link da Ester mostra "Oi, Ester"; marcação grava `marcado_por`=Ester.
- **Realtime:** marcar num aparelho reflete em outro aberto, sem refresh.
- **Quantidade:** stepper grava e exibe qtd; vazio conta como 1.
- **Modo compras:** só pendentes; baixa risca e remove da contagem; "limpar" só funciona para Júlio.
- **Adicionar novo:** item passa a existir no catálogo para a próxima vez.
- **Entrega:** comando "manda a lista" produz mensagem por seção; teste do agendamento de sexta (e-mail garantido; WhatsApp conforme ambiente).

---

## 10. Parâmetros e questões em aberto (resolver na implementação)

1. **Conta Supabase** (grátis) a criar; guardar URL do projeto + chave `anon`.
2. **Repositório GitHub Pages** (público ou privado c/ Pages) e a URL final; **encurtar** o link de cada usuário para o WhatsApp.
3. **Tokens** dos 4 usuários (gerar) e **números de WhatsApp** de cada um (para envios futuros).
4. **Completar catálogo:** seções **Higiene** e **Bebê** com o Júlio.
5. **Ambiente da tarefa agendada** de sexta 20:30 (onde o WhatsApp MCP esteja disponível, ou só e-mail + WhatsApp sob demanda).
6. **E-mail destino** do resumo: julionoronha@gmail.com (confirmar se inclui a Lilian).
