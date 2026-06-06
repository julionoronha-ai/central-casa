# Runbook — Resumo da Lista de Compras

## Sob demanda ("manda a lista")
Quando o Júlio pedir "manda a lista" numa sessão do Claude:
1. Rodar `node scripts/gerar-resumo.mjs` com as variáveis SUPABASE_URL/ANON_KEY.
2. Pegar o bloco `===WHATSAPP===` e enviar via MCP do WhatsApp para o Júlio.

## Automático — sexta 20:30 (só Júlio)
Rotina agendada (skill `schedule`) que:
1. Roda o script e captura os dois blocos.
2. Envia o e-mail (Gmail/Composio) para julionoronha@gmail.com com o HTML.
3. Envia o texto no WhatsApp do Júlio **se** o MCP do WhatsApp estiver disponível no ambiente da rotina; senão, o e-mail garante a entrega e o WhatsApp sai sob demanda.
