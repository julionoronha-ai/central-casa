# Disparo remoto do cardápio — 2 caminhos

A rotina remota do claude.ai/code **clona o repo (GitHub ok)** mas **não alcança o Supabase**:
o ambiente remoto tem uma **allowlist de rede** e o host do Supabase não está liberado.

## ✅ Opção A (recomendada) — liberar o Supabase na allowlist do ambiente Claude
Mantém a rotina já criada ("Gerar cardápio da próxima semana", segunda 10h, manual).
1. Abrir **claude.ai/code** → configurações do **ambiente** usado pela rotina (env "Default").
2. Em **rede / allowlist**, adicionar o host: `khfuxkxtojunkrcizobn.supabase.co`
3. Salvar. Disparar a rotina de novo (botão **Run**). Pronto — passa a gravar no Supabase.

## ✅ Opção B (alternativa robusta) — GitHub Action de disparo manual
Roda nos runners do GitHub (rede aberta → alcança o Supabase). Sem senha (chave anon pública).
Disparo manual pelo GitHub (web/app) em **Actions → "Gerar cardápio" → Run workflow**.

Para instalar, criar o arquivo `.github/workflows/gerar-cardapio.yml` no GitHub
(Actions → New workflow → set up a workflow yourself → colar o conteúdo abaixo → Commit).
> O push por token só funciona se o token tiver permissão **Workflows**; por isso o caminho
> mais simples é colar pela UI do GitHub.

```yaml
name: Gerar cardápio
on:
  workflow_dispatch:
    inputs:
      semana:
        description: 'Segunda-feira da semana (YYYY-MM-DD). Vazio = próxima semana.'
        required: false
        default: ''
jobs:
  gerar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install --no-audit --no-fund
      - run: node scripts/gerar-cardapio.mjs ${{ github.event.inputs.semana }}
```
