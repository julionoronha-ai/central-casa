# Runbook — Resumo YouTube diário (rotina na nuvem)

E-mail diário com os vídeos novos dos canais monitorados, categorizado em
🤖 IA / 💰 Investimentos / 📺 Outros, enviado para julionoronha@gmail.com.

## Papel atual: PRINCIPAL e única origem (desde 05/10/2026)

Esta rotina é a **única** origem do resumo diário. Dispara **~05:52 BRT** (cron
`CRON_TZ=America/Sao_Paulo 52 5 * * *`) para o e-mail chegar por volta das **06:00**.
A skill do Cowork no Mac (`~/youtube-resumo`) foi **aposentada** — ver "Aposentadoria
do Mac" abaixo.

O horário dispara alguns minutos antes das 06:00 de propósito: a rodada leva alguns
minutos entre buscar os feeds, escrever os bullets e enviar.

Regras do conteúdo:

- fora Shorts e vídeos com menos de 3 min;
- `⏱ duração` embaixo de cada título (ver "Limitação conhecida": na nuvem sai sempre
  como indisponível);
- **um** botão por vídeo: **▶ Assistir no YouTube**;
- todo envio recebe ⭐ **STARRED** + rótulo **Pessoal/AI** (`Label_88`).

Regras comuns ficam em `scripts/resumo-youtube/resumo-lib.mjs` (testes:
`node --test scripts/resumo-youtube/resumo-lib.test.mjs`).

**Guarda contra envio duplo:** antes de enviar, a sessão procura no Gmail um
"Resumo YouTube <data de hoje>"; se existir, não envia. Isso agora protege contra
disparo repetido da própria rotina, não mais contra o Mac.

## Por que esta rotina existe

A skill original rodava no sandbox do Cowork no Mac e dependia de
scripts/credenciais em `outputs/youtube-resumo/`. Sem agendamento ativo (o rodapé
dos e-mails dizia "Próxima execução: **manual**"), o envio só acontecia quando
alguém pedia — o e-mail "diário" chegou em apenas 15 dias entre 05/05 e 17/08/2026.

Esta versão roda 100% na nuvem (Claude Code Remote), sem depender do Mac ligado:

1. **Rotina (Routine/trigger)** dispara todo dia ~05:52 BRT e acorda a sessão
   persistente que tem o conector Gmail.
2. A sessão roda `node scripts/resumo-youtube/fetch-novos-videos.mjs`, que busca
   os vídeos das últimas 24h via **feeds RSS públicos** do YouTube
   (`youtube.com/feeds/videos.xml?channel_id=…`) — sem API key, sem OAuth, sem cota.
3. O próprio Claude escreve os bullets (a partir de título + descrição) e monta o HTML.
4. Envia via conector Gmail (`send_message`) com assunto
   `Resumo YouTube DD/MM/AAAA — N canal(is) com novidades`.

## Aposentadoria do Mac (05/10/2026)

A skill do Mac falhou em 11/09, 29/09 e depois em três dias seguidos (02, 03 e
04/10). Em 05/10 o Júlio decidiu encerrá-la e manter uma origem só. O que isso
significa na prática:

- A rotina na nuvem passou de reserva a principal, e o horário saiu de 10:30 para
  ~05:52 BRT.
- O rodapé do e-mail não menciona mais "RESERVA".
- **O `channels.json` deixou de ter um espelho.** Antes a lista do Mac servia de
  referência cruzada; agora este arquivo é a única fonte da verdade. Canal novo
  inscrito no YouTube **não entra sozinho** — precisa de commit aqui.
- **O botão "📖 Gerar resumo aprimorado" foi removido do e-mail** (05/10/2026). Quem
  atendia esses pedidos eram as rodadas de 07:30/12:30/19:30 da skill do Mac, que
  tiveram o agendamento desativado junto com o envio — o botão viraria um link morto.

  Em 06/10/2026 o campo `mailtoResumo` saiu também do código (`resumo-lib.mjs` e
  `fetch-novos-videos.mjs`): era a última referência viva ao processador do Mac.
  Para ressuscitar o botão seria preciso, antes, alguém processando os pedidos que
  chegam em `julionoronha+ytresumo@gmail.com` — hoje não existe ninguém.

## ⚠️ Dependência crítica: a sessão que hospeda a rotina

O trigger tem `persist_session: true` apontando para a sessão
`session_01RcMHgoNYRh9kBnbLZbv4Ma` e usa o **conector Gmail dessa sessão** para
enviar (`mcp_connections` vazio). Consequências:

- **Arquivar essa conversa desliga o resumo diário**, em silêncio.
- Não dá para contornar com uma rotina de sessão nova: triggers que criam sessão
  não recebem o conector Gmail, e o parâmetro `connectors` é recusado para esta
  organização.
- Para aposentar a rotina de propósito, desative o trigger antes
  (`update_trigger` com `enabled=false`), para o desligamento ser explícito.

## Arquivos

- `scripts/resumo-youtube/channels.json` — **a única** fonte da verdade dos canais
  monitorados: `{nome, categoria (IA|Investimentos|Outros), channel_id}`.
  36 canais, espelhando as **inscrições** do YouTube em 01/10/2026 (não o antigo
  `channels_config.json` do Mac, que acumulava canais já não seguidos).

  Com o Mac aposentado, **não há mais sincronização automática nem espelho**:
  canal novo que o Júlio seguir no YouTube **não entra sozinho**, e canal de que ele
  se desinscrever **continua sendo buscado**. Os dois casos exigem editar este
  arquivo e commitar. Classificar um canal também virou trabalho de um lado só:
  basta mudar `categoria` aqui.

- `scripts/resumo-youtube/fetch-novos-videos.mjs` — busca os vídeos novos e
  imprime JSON no stdout. Sem dependências (Node ≥ 18). Aceita `--hours N`
  (padrão 24).

- `scripts/resumo-youtube/build-email.mjs` — monta o HTML e o assunto do e-mail a
  partir desse JSON mais um JSON de bullets `{ videoId: ["…"] }`. Antes isso era
  remontado à mão a cada dia; virou código versionado justamente porque as regras
  de CSS que o Gmail aceita são sutis (ver *Pegadinha do CSS* abaixo) e um script
  com teste não as esquece. Também recusa montar o e-mail se faltar bullet de
  algum vídeo ou se um destaque não estiver na lista.

- `scripts/resumo-youtube/resumo-lib.mjs` — funções puras (corte de duração,
  formato da duração, leitura do `lengthSeconds`).

- Testes: `node --test 'scripts/resumo-youtube/*.test.mjs'`. (Não use
  `node --test scripts/resumo-youtube/` — nesta versão do Node ele tenta carregar
  o diretório como módulo e falha.)

## Operações comuns

- **Rodar manualmente (preview dos vídeos):**
  `npm run resumo:videos > /tmp/v.json`
- **Montar o e-mail para conferir no navegador:** escreva os bullets num
  `/tmp/b.json` (`{ "<videoId>": ["bullet 1", "bullet 2"] }`) e rode
  `npm run resumo:email -- /tmp/v.json /tmp/b.json --destaques id1,id2,id3 > /tmp/e.html`
  (o assunto sai no stderr). Acrescente `--dupla` na edição que cobre 48h.
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

## Histórico: defeito da skill do Mac (aposentada em 05/10/2026)

O `generate_resumo.py` casa a categoria do canal pelo **nome atual** no YouTube e,
ao encontrar um nome desconhecido, cria a entrada sozinho como "Outros". Então
**todo canal que se renomeia perde a classificação em silêncio** e volta a aparecer
como "canal novo aguardando classificação".

Rastros disso no `channels_config.json` (estado de 01/10/2026): Rafa Voss com 3
entradas, Amable Edits/Amabledits com 2, e o conflito do Rafael Milagre — mesmo
`channel_id` em IA e em Outros ao mesmo tempo, com a categoria do e-mail dependendo
de qual entrada fosse lida primeiro.

Esta rotina **não** tem esse problema: `channels.json` casa por `channel_id`, então
rename não quebra nada (só deixa o `nome` defasado, que é cosmético).

O conserto de raiz está escrito e testado em
**`docs/patch-resumo-youtube-por-channel-id.md`** — patch para os três arquivos que
casam por nome (`generate_resumo.py`, `set_category.py`, `fila_ingestao.py`), com
critério de desempate da migração, passo de verificação por `--dry-run` e rollback.
Falta só aplicar no Mac.

## Limitação conhecida: sem duração de vídeo

O e-mail mostra `⏱ duração indisponível` em todos os vídeos. Não é bug:
a duração só existe no `lengthSeconds` da página do vídeo, e o YouTube responde
**HTTP 429 a este IP** (container da nuvem). Testado em 01/10/2026 sem sucesso por
todas as rotas sem autenticação: página do vídeo (com e sem `bpctr`), `/embed/`,
e oEmbed — o oEmbed responde 200 mas não traz duração. O feed RSS também não tem
o campo.

O que **continua funcionando**: o filtro de Shorts/<3 min, via probe em
`/shorts/<id>` (200 só para Short; vídeo comum devolve 303). Verificado contra
vídeos longos conhecidos.

O script detecta o 429 na primeira resposta e para de tentar pelo resto da
execução — insistir por vídeo só alimentaria o rate-limit. Uma rodada de 24h caiu
de ~7,0 s para ~4,2 s, com saída idêntica.

O e-mail do Mac mostrava a duração porque usava a YouTube Data API autenticada —
mas o Mac foi aposentado, então hoje não há de onde tirar esse dado.

## Pegadinha do CSS: o Gmail apaga `background`

O Gmail **remove a propriedade abreviada `background`** dos atributos `style` e
**preserva `background-color`**. Entre 02/10 e 06/10/2026 os e-mails saíram com
`background:#7c5cbf` no botão: o fundo lilás era descartado e sobrava
`color:#fff` — texto branco sobre branco, botão invisível. O mesmo valia para o
fundo da caixa de contadores e do corpo.

Comprovado criando um rascunho com as duas formas e lendo o HTML de volta pela
API: `background:` voltou removido, `background-color:` voltou intacto.

- Em CSS inline de e-mail use **sempre `background-color`**.
- `build-email.test.mjs` tem um teste que falha se a abreviação reaparecer.
- Para checar o que o Gmail realmente guardou, crie um rascunho
  (`create_draft`), leia com `get_draft` e apague (`delete_draft`) — o HTML que
  volta já passou pelo sanitizador.

## Solução de problemas

- **E-mail não chegou:** procurar no Gmail `subject:"Resumo YouTube"`
  (inclusive na lixeira — em 17/08/2026 um resumo foi enviado e parou na
  lixeira, junto com a varredura de newsletters). Os resumos recebem o rótulo
  **Pessoal/AI** e podem não ficar na caixa de entrada.
- **Canal sem novidades nunca aparece:** o RSS do YouTube lista os ~15 vídeos
  mais recentes; se o canal postou há mais de 24h, não entra no resumo do dia.
- **Falha de feed:** o JSON de saída tem um campo `falhas` com os canais que
  não responderam; a rotina menciona isso no rodapé do e-mail quando ocorrer.
- **O índice de busca do Gmail atrasa.** Em 06/10/2026 uma busca por
  `label:Label_88 newer_than:14d` voltou vazia **com o resumo daquele mesmo dia já
  na caixa de entrada e com o rótulo**. Conclusão prática: busca vazia **não** prova
  que a mensagem não existe. Antes de concluir qualquer coisa, confirme por ID com
  `get_message` — esse não depende do índice.
- **Resumos antigos desaparecem (apagados de verdade).** Os resumos de 03, 04 e
  05/10/2026 foram confirmados inexistentes por `get_message` (não é atraso de
  índice, não é lixeira: `in:trash` também não os encontra). Ou seja: o ⭐ STARRED
  aplicado em todo envio **não impede a exclusão permanente**, e a autocura do passo 6
  — que restaura só o que está em `TRASH` *e* `UNREAD` — não alcança esses casos,
  porque nunca houve nada na lixeira para restaurar.

  Não há como distinguir, de dentro da rotina, limpeza deliberada do Júlio de uma
  varredura automática. Se o histórico passar a importar, o caminho é guardar o HTML
  fora do Gmail (ex.: commit num diretório do repo ou arquivo no Drive) em vez de
  tentar proteger a mensagem.
