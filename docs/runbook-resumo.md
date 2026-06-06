# Runbook — Resumo da Lista de Compras

## Decisão de entrega (2026-06-06): SOB DEMANDA

O envio automático de sexta (cron na nuvem) **não foi adotado** por limitação real da
infraestrutura gratuita:
- A rotina remota (nuvem Anthropic) **não tem o MCP do WhatsApp** (é local) → não envia WhatsApp.
- O conector Gmail do Claude **só cria rascunho** (não há ferramenta de "enviar e-mail").

Portanto a entrega é **sob demanda**, a partir de uma sessão local do Claude (que tem o
WhatsApp MCP). WhatsApp do Júlio: **+55 31 99702-7575**. E-mail: **julionoronha@gmail.com**.

## Sob demanda ("manda a lista")
Quando o Júlio pedir "manda a lista" numa sessão do Claude:
1. Buscar as pendências (rodar `node scripts/gerar-resumo.mjs` com SUPABASE_URL/ANON_KEY,
   ou ler direto via REST do Supabase).
2. Enviar o bloco `===WHATSAPP===` via MCP do WhatsApp para +55 31 99702-7575.
3. (Opcional) Deixar um rascunho no Gmail com o bloco `===EMAIL_HTML===`.

## Futuro (se quiser automatizar de verdade)
Caminhos possíveis quando fizer sentido:
- **Lembrete no Google Calendar** (evento recorrente sexta 20:30) que notifica o celular;
  o Júlio então abre o link / pede a lista.
- Envio real por e-mail via SMTP (Gmail App Password) num runner com cofre de segredos.
- Robô de WhatsApp sempre ligado (servidor próprio) — fora do escopo "sem hospedagem".
