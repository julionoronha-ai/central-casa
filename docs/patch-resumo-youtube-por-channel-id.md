# Patch — skill `resumo-youtube` (Mac): casar canal por `channel_id`

Escrito em 01/10/2026 contra o código real do `~/youtube-resumo`.
Aplica-se **na skill do Cowork, no Mac** — não neste repositório.

## O problema

`_get_category()` casa a categoria pelo **nome atual** do canal no YouTube:

```python
def _get_category(config: dict, channel_title: str) -> str:
    entry = config.get(channel_title, {})
    return entry.get("category", "Outros")
```

E o laço de busca registra como "Outros" qualquer nome que não reconheça:

```python
if ch_title not in channels_config:
    channels_config[ch_title] = {"channelId": ch_id, "category": "Outros"}
```

Então **canal renomeado perde a classificação em silêncio**: o nome novo não está
no config, entra como "Outros", e a entrada antiga fica para trás com o mesmo
`channelId`. Foi assim que surgiram as 3 entradas do Rafa Voss, as 2 do Amable
Edits e o conflito do Rafael Milagre (mesmo id em IA e em Outros ao mesmo tempo).

Há um terceiro ponto que casa por nome, no `fila_ingestao.py` — se um canal com
`"ingerir": true` for renomeado, a ingestão para sem avisar.

## O que o patch faz

Casa por `channelId` com o nome como fallback, e trata rename como rename:
quando o id já é conhecido sob outro nome, **renomeia a chave e preserva a
categoria** em vez de criar entrada nova. Isso também colapsa as duplicatas
existentes na primeira execução.

O formato do `channels_config.json` **não muda** (dicionário com o nome na chave),
então nada mais precisa ser migrado. O patch não introduz chaves `_...`, que o
`_save_channels_config()` descartaria.

---

## 1. `scripts/generate_resumo.py`

### 1a. Depois de `_save_channels_config()`, acrescentar o índice por id

```python
def _index_by_id(config: dict) -> dict:
    """channelId -> (chave, entry).

    Em caso de duplicata (mesmo id em mais de uma chave), vence a entrada
    classificada: 'Outros' nunca sobrepõe IA/Investimentos. Foi o lado errado
    que venceu no caso do Rafael Milagre.
    """
    index: dict = {}
    for key, entry in config.items():
        if not isinstance(entry, dict):
            continue
        cid = entry.get("channelId")
        if not cid:
            continue
        atual = index.get(cid)
        if atual is None:
            index[cid] = (key, entry)
            continue
        log.warning(f"  channelId {cid} repetido: '{atual[0]}' e '{key}'")
        if atual[1].get("category", "Outros") == "Outros" and entry.get("category", "Outros") != "Outros":
            index[cid] = (key, entry)
    return index
```

### 1b. Substituir `_get_category()`

```python
def _get_category(config: dict, channel_title: str,
                  channel_id: str | None = None,
                  index: dict | None = None) -> str:
    """Categoria do canal. Casa por channelId; cai no nome quando o vídeo não
    traz id (vídeos antigos vindos do state.json, p.ex. lives represadas)."""
    if channel_id:
        if index is None:
            index = _index_by_id(config)
        hit = index.get(channel_id)
        if hit is not None:
            return hit[1].get("category", "Outros")
    entry = config.get(channel_title, {})
    return entry.get("category", "Outros")
```

A assinatura antiga `_get_category(config, titulo)` continua válida.

### 1c. No bloco de carga do config (perto da linha 180), construir o índice

```python
    channels_config = _load_channels_config()
    id_index = _index_by_id(channels_config)
```

### 1d. Substituir o registro de canal novo, dentro do laço `for sub in subscriptions`

Troque este trecho:

```python
        # Registrar canal novo automaticamente como "Outros"
        if ch_title not in channels_config:
            channels_config[ch_title] = {"channelId": ch_id, "category": "Outros"}
            new_channel_titles.add(ch_title)
            log.info(f"       ⚠️  Canal novo — adicionado como 'Outros'")
```

por:

```python
        # Canal conhecido pelo id? Então só mudou de nome: renomeia a chave,
        # preserva a categoria e descarta as entradas antigas do mesmo id.
        hit = id_index.get(ch_id)
        if hit is not None:
            old_key, entry = hit
            # Normaliza para UMA entrada por channelId, sob o nome atual. A limpeza
            # fica fora do `if old_key != ch_title` de propósito: quando a entrada
            # vencedora do índice já é o nome atual, as duplicatas de nome antigo
            # continuariam no arquivo para sempre.
            for k in [k for k, e in list(channels_config.items())
                      if isinstance(e, dict) and e.get("channelId") == ch_id and k != ch_title]:
                channels_config.pop(k, None)
            channels_config[ch_title] = entry
            id_index[ch_id] = (ch_title, entry)
            if old_key != ch_title:
                log.info(f"       ↻ Renomeado: '{old_key}' → '{ch_title}' "
                         f"(categoria '{entry.get('category', 'Outros')}' preservada)")
        elif ch_title in channels_config and isinstance(channels_config[ch_title], dict):
            # entrada antiga sem channelId: completa o id, sem mexer na categoria
            entry = channels_config[ch_title]
            entry["channelId"] = ch_id
            id_index[ch_id] = (ch_title, entry)
        else:
            entry = {"channelId": ch_id, "category": "Outros"}
            channels_config[ch_title] = entry
            id_index[ch_id] = (ch_title, entry)
            new_channel_titles.add(ch_title)
            log.info(f"       ⚠️  Canal novo — adicionado como 'Outros'")
```

### 1e. Na categorização dos vídeos, passar o id

```python
    id_index = _index_by_id(channels_config)   # reconstruir: o laço acima alterou o config
    videos_by_category: dict = {"IA": [], "Investimentos": [], "Outros": []}
    for video in sorted(all_new_videos, key=lambda v: v["published_at"], reverse=True):
        cat = _get_category(channels_config, video["channelTitle"],
                            video.get("channelId"), id_index)
        videos_by_category[cat].append(video)
```

`video.get("channelId")` é tolerante de propósito: vídeo sem id cai no nome, que é
o comportamento de hoje.

> Efeito colateral bom: `total_channels=len(channels_config)` passa a ser o número
> real de canais, porque rename deixa de inflar o config com chaves mortas.

---

## 2. `scripts/set_category.py` — aceitar nome **ou** id

```python
def find_channel_key(config: dict, name: str) -> str | None:
    """Busca por nome exato e, se não achar, por channelId."""
    for key in config:
        if key.startswith("_"):
            continue
        if key == name:
            return key
    if name.startswith("UC"):
        for key, entry in config.items():
            if key.startswith("_") or not isinstance(entry, dict):
                continue
            if entry.get("channelId") == name:
                return key
    return None
```

---

## 3. `scripts/fila_ingestao.py` — não perder a ingestão no rename

Guardar id **e** nome no mesmo set mantém a assinatura e o tipo de retorno, então
nenhum outro call site precisa mudar:

```python
def channels_to_ingest(config: dict) -> set:
    """Identificadores dos canais com ingerir=true: channelId E nome.
    Guardar os dois faz a ingestão sobreviver a uma renomeação."""
    out = set()
    for name, entry in config.items():
        if name.startswith("_") or not isinstance(entry, dict) or not entry.get("ingerir"):
            continue
        out.add(name)
        cid = entry.get("channelId")
        if cid:
            out.add(cid)
    return out
```

E em `new_catalog_rows()`, trocar o teste de pertinência:

```python
        # antes:  if v["channelTitle"] not in channels: continue
        if v.get("channelId") not in channels and v["channelTitle"] not in channels:
            continue
```

---

## O que já foi testado

A lógica acima foi exercitada fora da skill, com o cenário real de duplicatas do
`channels_config.json` (Rafa Voss ×3, Amable Edits ×2, Rafael Milagre em IA **e**
em Outros). Resultados:

| Caso | Resultado |
|---|---|
| Conflito Rafael Milagre (IA vs Outros) | resolve para **IA** — "Outros" nunca vence |
| Execução com os nomes atuais | 8 entradas → **4**, duplicatas colapsadas |
| Categoria após o colapso | preservada (IA continua IA) |
| Nenhum canal marcado como "novo" | confirmado — o aviso de não classificado não dispara |
| Rename inédito de canal já classificado | categoria preservada, não vira "Outros" |
| Vídeo **sem** `channelId` | cai no nome, como hoje |
| Ingestão com canal renomeado | continua entrando (casa pelo id) |

Um detalhe que só apareceu no teste: a limpeza de duplicatas **precisa** ficar
fora do `if old_key != ch_title`. Na primeira versão ela estava dentro, e por isso
o `Amabledits` sobrevivia — quando a entrada vencedora do índice já é o nome atual,
as duplicatas de nome antigo nunca seriam removidas.

## Verificação (obrigatória, antes de considerar aplicado)

```bash
YTDIR=$(ls -d /sessions/*/mnt/outputs/youtube-resumo 2>/dev/null | head -1)
[ -z "$YTDIR" ] && YTDIR=~/youtube-resumo
cd "$YTDIR"
cp channels_config.json "channels_config.antes-do-patch-$(date +%F).json"

# 1. baseline ANTES de editar o código
./venv/bin/python3 scripts/generate_resumo.py --dry-run 2>&1 | tee /tmp/antes.txt

# 2. aplicar o patch, depois:
./venv/bin/python3 scripts/generate_resumo.py --dry-run 2>&1 | tee /tmp/depois.txt
diff /tmp/antes.txt /tmp/depois.txt
```

Critérios:

- O número de **não classificados** não pode subir. Se subir, a migração errou —
  restaure o backup e pare.
- As contagens por categoria devem bater, exceto onde uma duplicata foi
  colapsada (aí o log traz a linha `↻ Renomeado:`).
- `channels_config.json` deve **encolher** de 49 para 46 entradas, perdendo as 2
  duplicatas do Rafa Voss e a 1 do Amable Edits.
- Nenhum canal pode sumir: compare `scripts/list_channels.py` antes e depois.

Rollback: `cp channels_config.antes-do-patch-*.json channels_config.json` e
`git checkout` (ou o backup) dos três `.py`.

## Depois de aplicar

A reserva na nuvem (`scripts/resumo-youtube/`) já casa por `channel_id` desde o
início e não precisa de nada. Com o patch, os dois lados passam a ter a mesma
propriedade e param de divergir sozinhos a cada rename de canal.
