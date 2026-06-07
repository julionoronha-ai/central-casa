# Runbook — Geração do Cardápio (para o Claude)

Disparo livre: "gera o cardápio da próxima semana". Sempre prepara a PRÓXIMA segunda-a-sexta
(`proximaSemanaInicio(hoje)` — usa UTC, então é estável no fuso de SP).

## Passos
1. Calcular `semana_inicio` (próxima segunda). Se já existe cardápio dessa semana, perguntar se regenera (apagar `cardapio_itens` e recriar).
2. Ler: `receitas` (ativas), `despensa_basica`, cardápios das últimas ~3 semanas (variedade),
   `feedback_cardapio` agregado (favorecer 👍, evitar 👎, ajustar porção muito/bom/pouco).
3. Montar 5 dias × 5 refeições (ordem: merenda, café, almoço, lanche, jantar) honrando as REGRAS RÍGIDAS:
   - Alérgenos do Henrique (amendoim, trigo, banana, peixe, nozes, castanhas) nunca nas porções dele;
     criar item com `eh_variante_henrique=true` quando a refeição que ele come tiver alérgeno (usar `isHenriqueSafe`).
   - Merenda = 1 fruta + 1 carboidrato, sempre segura.
   - Almoço E jantar com 1 prato `elaborado=true` (com `preparo`); validar almoço com `validateAlmoco`
     (arroz + feijão + carne + 2 legumes + salada + verdura escura).
   - Sem repetir prato na semana.
4. Inserir `cardapios` (status `rascunho`) + `cardapio_itens`. Criar receitas novas em `receitas`
   (com `ingredientes` por porção e `preparo` nos elaborados) quando propor pratos inéditos —
   assim o banco cresce.
5. Avisar o Júlio com o link `cardapio.html?u=<token-julio>&semana=<data>` e/ou o texto
   (botão "copiar como mensagem" na página).
6. Júlio revisa/ajusta ("troca o jantar de terça") e aprova na página — o push dos ingredientes
   para a lista de compras (origem "Cardápio", quantidades, menos despensa) é automático no "aprovar".

## Como aplicar inserts (sessão com a senha do banco)
Usar `node` + `pg` com `DATABASE_URL` (via env, nunca commitada). Padrão:
`postgresql://postgres:<senha>@db.khfuxkxtojunkrcizobn.supabase.co:5432/postgres`.

## Gerador na página (sem Claude) — `js/cardapio-gerador.js`
Há botões na página que geram sem mim:
- **"🎲 gerar novo"** monta a semana inteira escolhendo do banco (Henrique-safe, sem repetir).
- **"🎲 novo"** por refeição troca aquele prato por outra opção do banco.
Banco: **15 opções por refeição** em `supabase/seed-receitas.sql` (todas safe; almoço = prato completo; jantar = fácil).
Use o Claude (este runbook) quando quiser **pratos inéditos / criatividade / crescer o banco** — o gerador só escolhe do que já existe.

## Crescer o banco / trocar prato específico
- Trocar prato real no banco: atualizar `cardapio_itens` daquele (cardapio,dia,refeicao) para outro `receita_id`
  (criar a receita antes se for inédita, com ingredientes por porção + preparo, e SEM alérgenos do Henrique).
- Sempre validar segurança: nenhum ingrediente com amendoim, trigo, banana, peixe, nozes, castanha.

## Entrega
- WhatsApp do Júlio (+55 31 99702-7575): sob demanda, copiando a mensagem ou via MCP do WhatsApp numa sessão local.
- Lembrete recorrente: Google Calendar, quarta 19:30 (só um empurrão; o disparo é livre).
