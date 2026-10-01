# Runbook — Resumo YouTube diário (rotina na nuvem)

E-mail diário com os vídeos novos dos canais monitorados, categorizado em
🤖 IA / 💰 Investimentos / 📺 Outros, enviado para julionoronha@gmail.com.

## Papel atual: RESERVA (desde 29/09/2026)

O digest principal roda no Mac (`~/youtube-resumo`, LaunchAgent às 06:03 e também
quando o Mac liga). Esta rotina é a **reserva**: dispara às **10:30 BRT** e só envia
se nenhum "Resumo YouTube <hoje>" existir no Gmail. Mesmas regras do Mac:

- fora Shorts e vídeos com menos de 3 min (duração lida da página pública do vídeo);
- `⏱ duração` embaixo de cada título;
- botão **📖 Gerar resumo aprimorado** com o mesmo link `mailto:` do Mac
  (`mailtoResumo` no JSON) — o processador de pedidos do Mac atende igual.

Regras comuns ficam em `scripts/resumo-youtube/resumo-lib.mjs` (testes:
`node --test scripts/resumo-youtube/resumo-lib.test.mjs`). Se mudar o corte de duração
ou o formato do botão no Mac, mude aqui também.

## Por que esta versão existe

A skill original (`resumo-youtube`) roda no sandbox do Cowork no Mac do Júlio e
depende de scripts/credenciais em `outputs/youtube-resumo/`. Sem um agendamento
ativo (o rodapé dos e-mails dizia "Próxima execução: **manual**"), o envio só
acontecia quando alguém pedia — por isso o e-mail "diário" chegou só em dias
esparsos (15 envios entre 05/05 e 17/08/2026).

Esta versão roda 100% na nuvem (Claude Code Remote), sem depender do Mac:

1. **Rotina (Routine/trigger)** dispara todo dia às 10:30 (horário de Brasília,
   13:30 UTC; até 29/09/2026 era 06:10) e cria uma sessão nova no ambiente "Casa" com o conector Gmail.
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
  Espelha o `channels_config.json` da skill do Cowork, que vive no sandbox do
  Mac e **não é acessível da nuvem** — a sincronização é manual: o Júlio roda
  `scripts/list_channels.py` lá e cola a saída aqui.

  **A lista espelha as INSCRIÇÕES atuais, não o `channels_config.json`.** O config
  do Mac nunca é limpo: ele acumula canais que o Júlio deixou de seguir (em
  01/10/2026 tinha 47 entradas para 36 inscrições). Lá isso é inofensivo, porque o
  `generate_resumo.py` percorre as inscrições e nem consulta canal não seguido.
  Aqui não: o `channels.json` é estático e a reserva busca o RSS de tudo que estiver
  nele — canal obsoleto voltaria a aparecer no e-mail. Por isso a sincronização poda
  pelo ID das inscrições, e não pelo config. Em 01/10/2026 a lista foi
  sincronizada com os 46 canais únicos do Mac; falta só **`Family facts`** —
  os dois candidatos óbvios foram descartados por evidência (`@familyfacts`
  é holandês e parou em 2012; `@thefamily_facts` não tem nenhum vídeo), então
  o `channel_id` tem que vir do Mac.

  **Classificar um canal é um trabalho de dois lados:** editar este arquivo
  cobre só a reserva; a skill do Mac precisa de
  `scripts/set_category.py "<nome exato>" <categoria>` numa sessão do Cowork.
  Enquanto só um lado muda, os dois e-mails divergem.
- `scripts/resumo-youtube/fetch-novos-videos.mjs` — busca os vídeos novos e
  imprime JSON no stdout. Sem dependências (Node ≥ 18). Aceita `--hours N`
  (padrão 24).

## Operações comuns

- **Rodar manualmente (preview):**
  `node scripts/resumo-youtube/fetch-novos-videos.mjs | less`
- **Resolver o `channel_id` de um canal novo:** pegue um vídeo dele, abra a
  página do canal e use o `UC…` canônico (`og:url`/`identifier`). **Sempre
  valide** contra `https://www.youtube.com/feeds/videos.xml?channel_id=<ID>`:
  o feed tem que responder 200 e o `<title>` tem que bater com o nome. Extração
  automática já devolveu ID inventado (404) mais de uma vez — sem a validação,
  o canal entra na lista e simplesmente nunca aparece no resumo.
- **Canal renomeado:** o YouTube muda o título do feed e o `nome` daqui fica
  defasado (a busca não quebra, pois usa o ID, mas o e-mail mostra o nome
  velho). Para auditar a lista inteira, compare cada `nome` com o `<title>` do
  feed correspondente.
- **Adicionar/remover canal:** editar `channels.json` (o `channel_id` UC… está
  na página do canal → ver código-fonte → `"channelId"`), commitar e pushar
  para `main`. A rotina usa sempre o que está em `main`.
- **Mudar horário / pausar / reativar:** pedir ao Claude (a rotina é um trigger
  da conta; ele usa `update_trigger`). Também dá para pausar em
  claude.ai/code → Routines.
- **Janela maior (ex.: reprocessar 48h):** pedir ao Claude para rodar a rotina
  com `--hours 48`.

## Defeito conhecido na skill do Mac (não afeta a reserva)

O `generate_resumo.py` casa a categoria do canal pelo **nome atual** no YouTube e,
ao encontrar um nome desconhecido, cria a entrada sozinho como "Outros". Então
**todo canal que se renomeia perde a classificação em silêncio** e volta a aparecer
como "canal novo aguardando classificação".

Rastros disso no `channels_config.json` (estado de 01/10/2026): Rafa Voss com 3
entradas, Amable Edits/Amabledits com 2, e o conflito do Rafael Milagre — mesmo
`channel_id` em IA e em Outros ao mesmo tempo, com a categoria do e-mail dependendo
de qual entrada fosse lida primeiro.

A reserva **não** tem esse problema: `channels.json` casa por `channel_id`, então
rename não quebra nada (só deixa o `nome` defasado, que é cosmético).

O conserto de raiz está escrito e testado em
**`docs/patch-resumo-youtube-por-channel-id.md`** — patch para os três arquivos que
casam por nome (`generate_resumo.py`, `set_category.py`, `fila_ingestao.py`), com
critério de desempate da migração, passo de verificação por `--dry-run` e rollback.
Falta só aplicar no Mac.

## Solução de problemas

- **E-mail não chegou:** procurar no Gmail `subject:"Resumo YouTube"`
  (inclusive na lixeira — em 17/08/2026 um resumo foi enviado e parou na
  lixeira, junto com a varredura de newsletters). Os resumos recebem o rótulo
  **Pessoal/AI** e podem não ficar na caixa de entrada.
- **Canal sem novidades nunca aparece:** o RSS do YouTube lista os ~15 vídeos
  mais recentes; se o canal postou há mais de 24h, não entra no resumo do dia.
- **Falha de feed:** o JSON de saída tem um campo `falhas` com os canais que
  não responderam; a rotina menciona isso no rodapé do e-mail quando ocorrer.
