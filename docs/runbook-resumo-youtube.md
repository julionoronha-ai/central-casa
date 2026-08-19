# Runbook — Resumo YouTube diário (rotina na nuvem)

E-mail diário com os vídeos novos dos canais monitorados, categorizado em
🤖 IA / 💰 Investimentos / 📺 Outros, enviado para julionoronha@gmail.com.

## Por que esta versão existe

A skill original (`resumo-youtube`) roda no sandbox do Cowork no Mac do Júlio e
depende de scripts/credenciais em `outputs/youtube-resumo/`. Sem um agendamento
ativo (o rodapé dos e-mails dizia "Próxima execução: **manual**"), o envio só
acontecia quando alguém pedia — por isso o e-mail "diário" chegou só em dias
esparsos (15 envios entre 05/05 e 17/08/2026).

Esta versão roda 100% na nuvem (Claude Code Remote), sem depender do Mac:

1. **Rotina (Routine/trigger)** dispara todo dia ~06:10 (horário de Brasília,
   09:10 UTC) e cria uma sessão nova no ambiente "Casa" com o conector Gmail.
2. A sessão roda `node scripts/resumo-youtube/fetch-novos-videos.mjs`, que busca
   os vídeos das últimas 24h via **feeds RSS públicos** do YouTube
   (`youtube.com/feeds/videos.xml?channel_id=…`) — sem API key, sem OAuth,
   sem cota.
3. O próprio Claude escreve os bullets de resumo (a partir de título +
   descrição) e monta o HTML no formato dos resumos anteriores.
4. Envia via conector Gmail (`send_message`) para julionoronha@gmail.com com
   assunto `Resumo YouTube DD/MM/AAAA — N canal(is) com novidades`.

**Antiduplicação:** antes de enviar, a sessão procura no Gmail um e-mail com
assunto "Resumo YouTube <data de hoje>" já enviado no dia; se existir, não envia
de novo. Assim, se a skill do Cowork voltar a rodar em paralelo, não chegam dois
e-mails.

## Arquivos

- `scripts/resumo-youtube/channels.json` — fonte da verdade dos canais
  monitorados: `{nome, categoria (IA|Investimentos|Outros), channel_id}`.
  A lista foi reconstruída a partir dos resumos já enviados (a lista original,
  `channels_config.json`, vive no sandbox do Cowork e não é acessível da nuvem).
- `scripts/resumo-youtube/fetch-novos-videos.mjs` — busca os vídeos novos e
  imprime JSON no stdout. Sem dependências (Node ≥ 18). Aceita `--hours N`
  (padrão 24).

## Operações comuns

- **Rodar manualmente (preview):**
  `node scripts/resumo-youtube/fetch-novos-videos.mjs | less`
- **Adicionar/remover canal:** editar `channels.json` (o `channel_id` UC… está
  na página do canal → ver código-fonte → `"channelId"`), commitar e pushar
  para `main`. A rotina usa sempre o que está em `main`.
- **Mudar horário / pausar / reativar:** pedir ao Claude (a rotina é um trigger
  da conta; ele usa `update_trigger`). Também dá para pausar em
  claude.ai/code → Routines.
- **Janela maior (ex.: reprocessar 48h):** pedir ao Claude para rodar a rotina
  com `--hours 48`.

## Solução de problemas

- **E-mail não chegou:** procurar no Gmail `subject:"Resumo YouTube"`
  (inclusive na lixeira — em 17/08/2026 um resumo foi enviado e parou na
  lixeira, junto com a varredura de newsletters). Os resumos recebem o rótulo
  **Pessoal/AI** e podem não ficar na caixa de entrada.
- **Canal sem novidades nunca aparece:** o RSS do YouTube lista os ~15 vídeos
  mais recentes; se o canal postou há mais de 24h, não entra no resumo do dia.
- **Falha de feed:** o JSON de saída tem um campo `falhas` com os canais que
  não responderam; a rotina menciona isso no rodapé do e-mail quando ocorrer.
