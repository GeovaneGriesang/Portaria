---
name: deploy-portaria
description: Deploy or restart the Portarias IFSul app on the production VM (movaci.com.br/portaria), and diagnose issues there, without breaking the pre-existing PDIAP and Matriz sites that share the same machine. Use whenever the user asks to deploy, restart, check logs, or debug something "na VM" / "em produção" / "no servidor" for this project.
---

# Deploy da Portarias IFSul na VM de produção

Este skill documenta a topologia real da VM validada em sessão anterior — leia antes de agir, a VM
hospeda **três sites independentes** e um erro de escopo pode derrubar o PDIAP (dados reais em
MongoDB) ou a Matriz (dados reais em MySQL), nenhum deles relacionado a este projeto.

## Acesso

```
ssh -i ~/.ssh/matriz_vm root@147.93.191.79
```

A chave `~/.ssh/matriz_vm` (ed25519) já está autorizada — não pedir/usar senha em texto puro. Se a
chave não existir na máquina atual, avise o usuário antes de tentar qualquer alternativa (nunca peça
a senha por chat). Mesma chave usada pelo projeto irmão Matriz (`Cursor/Matriz/.claude/skills/deploy-matriz/SKILL.md`).

## Topologia (não mexer sem entender isto primeiro)

| Serviço | Path/porta pública | Porta interna | Gerenciado por |
|---|---|---|---|
| **Portarias IFSul** (este projeto) | `movaci.com.br/portaria` e `/portaria/*` | `localhost:3003` | PM2, processo `portaria`, cwd `/opt/portaria` |
| **Matriz** (projeto irmão) | `movaci.com.br/matriz` e `/matriz/*` | `localhost:3002` | PM2, processo `matriz`, cwd `/opt/matriz` |
| **PDIAP** (site pré-existente, não é deste projeto) | `movaci.com.br/` (raiz) | `localhost:3000` | usuário `geovane`, nodemon/babel-node direto (NÃO é PM2), cwd `/home/geovane/PDIAP` |
| Reverse proxy + TLS | Caddy | — | `/etc/caddy/Caddyfile` |

**Nunca tocar na porta 3000** (não fazer `kill` em nenhum PID rodando como `geovane`, não reaproveitar
a porta) — é o processo do PDIAP em si, não um processo órfão. Confirmado por `ss -tlnp` + `ps aux` +
leitura do Caddyfile em 2026-08-14: PDIAP escuta em 3000, não 3001 (uma versão anterior deste skill
tinha essa porta errada e ainda descrevia o processo da 3000 como "não relacionado" — não é).

O `Caddyfile` (bloco `movaci.com.br, www.movaci.com.br`) usa matchers `@matriz path /matriz /matriz/*`
e `@portaria path /portaria /portaria/*` apontando para `:3002`/`:3003` respectivamente; todo o resto
cai no `reverse_proxy localhost:3000` (PDIAP). Editar esse arquivo é uma ação de alto risco (pode
derrubar os três sites) — **sempre mostrar o diff e pedir confirmação explícita antes de qualquer
`caddy reload`**.

## Sem banco de dados — mas com PDFs pesados fora do git

Este projeto não usa banco (dados ficam em `data/portarias/<ano>.json`, versionados no git). Os PDFs
reais dos boletins (`public/portarias/<ano>/<mes>/*.pdf`, ~1 GB) são **gitignored** — não fazem parte
de nenhum histórico git, nem local nem remoto. Não há um repositório GitHub configurado como remote
para transferência de código; o código chega na VM por transferência direta (tar via ssh) a partir da
máquina local, cobrindo código + `data/` + `public/portarias/` de uma vez só. Atualizações futuras
(código novo ou boletins novos) repetem essa mesma transferência — não é um fluxo `git pull`.

## `.env` de produção (`/opt/portaria/.env`)

Só uma variável: `NEXT_PUBLIC_BASE_PATH=/portaria`. Sem segredos (sem banco, sem senha admin).

## Passos de deploy

1. **Antes de mexer em qualquer coisa**: `pm2 list` para confirmar o estado atual dos três serviços —
   não assumir que o processo `portaria` já existe se já faz tempo desde a última sessão.
2. **Levar o código+dados novos para `/opt/portaria`**: a partir da raiz do projeto local,
   ```
   tar --exclude='node_modules' --exclude='.next' --exclude='.git' -cf - . | \
     ssh -i ~/.ssh/matriz_vm root@147.93.191.79 "tar -xf - -C /opt/portaria"
   ```
   Isso pode demorar (o corpus de PDFs cresce a cada boletim novo) — rodar em background e monitorar.
3. `npm install` (sempre, não só se o lockfile mudou — não há garantia de `node_modules` já existir).
4. `npm run build`.
5. Primeira vez: `pm2 start npm --name portaria --cwd /opt/portaria -- start` com `PORT=3003` no
   ambiente (confirmar com `pm2 jlist` que a env `PORT` ficou setada, do jeito que `matriz`/`pdiap`
   já fazem). Depois: `pm2 restart portaria`.
6. `pm2 save` (persiste a lista de processos pro `pm2-root` systemd service já habilitado).
7. **Sempre validar depois, nunca assumir sucesso**:
   ```
   pm2 logs portaria --lines 50 --nostream
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3003/portaria
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3002/matriz   # confirma que a Matriz não foi afetada
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000         # confirma que o PDIAP não foi afetado
   ```

## O que NUNCA fazer sem pedir confirmação primeiro

`pm2 delete`, `kill` em qualquer PID, `ufw`/firewall, editar o `Caddyfile`, reiniciar os processos do
PDIAP ou da Matriz, qualquer coisa na porta 3000. Mostrar o comando exato antes de rodar, mesmo que o
usuário já tenha autorizado algo parecido antes nesta sessão.
