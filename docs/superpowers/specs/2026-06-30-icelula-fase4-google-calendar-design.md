# iCélula — Fase 4: Integração com Google Calendar (Design)

**Data:** 2026-06-30
**Status:** Aprovado
**Autor:** Brainstorm colaborativo (Ian + Claude)

---

## 1. Visão geral

Permitir que membros vinculem sua conta Google ao iCélula para que os encontros da sua
célula apareçam automaticamente no Google Calendar deles, num calendário dedicado
**"iCélula"**. A sincronização é **one-way (plataforma → Google)**: tudo que o líder/admin
cria, edita ou cancela na plataforma é refletido no calendário de **todos os membros
vinculados** daquela célula.

A integração é **invisível no front** do iCélula: a plataforma só mostra a célula. A pessoa
vê os eventos no app do Google Calendar dela (celular/computador). O front tem apenas dois
pontos de toque: "Entrar com Google" (login/cadastro) e "Conectar Google Calendar".

### Decisões aprovadas
- Vínculo: **"Entrar com Google"** (identidade + permissão de calendário num consentimento) +
  **"Conectar Google Calendar"** para contas criadas por e-mail.
- Destino: **calendário dedicado "iCélula"** criado na conta Google da pessoa.
- Sincronização: **one-way**, plataforma → Google, com propagação de alterações.

---

## 2. Pré-requisitos (responsabilidade do usuário)

A integração não funciona sem credenciais do Google Cloud, que o Ian deve provisionar:

1. Projeto no Google Cloud Console.
2. **Tela de consentimento OAuth** (externa), com os escopos abaixo; em modo "Testing" os
   e-mails de teste devem ser adicionados.
3. **OAuth Client ID** do tipo "Web application" com redirect URI
   `http://localhost:3000/auth/google/callback`.
4. API **Google Calendar** habilitada no projeto.
5. Variáveis no `.env` da API: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`, `GOOGLE_OAUTH_ENABLED` (liga/desliga a feature),
   `TOKEN_ENC_KEY` (chave para cifrar refresh tokens), `WEB_URL` (origem do front para o
   redirect final, ex.: `http://localhost:5173`).

**Escopos solicitados:** `openid`, `email`, `profile`,
`https://www.googleapis.com/auth/calendar` (criar/gerenciar o calendário e seus eventos).

Enquanto `GOOGLE_OAUTH_ENABLED` for `false`/ausente, os botões de Google ficam ocultos no
front e as rotas retornam `503 { erro: 'Integração Google não configurada' }`. Isso permite
construir, testar e mergear a Fase 4 antes de o Ian enviar as credenciais.

---

## 3. Arquitetura

Tudo no backend (`apps/api`), seguindo os padrões existentes (Fastify, Prisma, ESM):

```
apps/api/src/
├── lib/
│   ├── google/
│   │   ├── oauth.js          # monta authUrl, troca code→tokens, refresh
│   │   ├── calendar.js       # cria calendário "iCélula", CRUD de eventos
│   │   ├── client.js         # fábrica do cliente Google (injetável p/ testes/mock)
│   │   └── cripto.js         # cifra/decifra refresh token (AES-256-GCM, TOKEN_ENC_KEY)
│   └── sync/
│       └── calendarSync.js   # orquestra backfill e propagação por encontro/membro
└── routes/
    ├── googleAuth.js         # GET /auth/google, GET /auth/google/callback, POST /google/conectar, DELETE /google
    └── (encontros.js, celulas.js, presenca.js — disparam o sync após mutações)
```

**Princípio de isolamento:** `oauth.js`/`calendar.js` falam com a API do Google;
`calendarSync.js` contém a lógica de "o que sincronizar" e é testável com um cliente
Google **mockado** (injetado por `client.js`). As rotas de encontro/célula chamam
`calendarSync` após a escrita no banco — best-effort e assíncrono, com log de erro (uma
falha no Google nunca quebra a operação principal na plataforma).

---

## 4. Modelo de dados (Prisma)

Acréscimos ao `User`:
- `googleSub String? @unique` — id da conta Google (identidade).
- `googleRefreshTokenEnc String?` — refresh token **cifrado** (AES-256-GCM).
- `googleCalendarId String?` — id do calendário "iCélula" criado na conta.
- `googleConectado Boolean @default(false)` — flag de status do vínculo.
- `senhaHash` passa a ser **opcional** (`String?`) — contas criadas via Google podem não ter senha.

Nova tabela:
- `GoogleEventoSync` — `id`, `userId`, `encontroId`, `googleEventId`, `criadoEm`.
  `@@unique([userId, encontroId])`. Relacionada a `User` e `Encontro` com `onDelete: Cascade`.
  Mapeia qual evento do Google corresponde a (membro × encontro), para permitir update/delete.

> Migração: como `senhaHash` vira opcional, garantir no login por senha que contas sem
> `senhaHash` (criadas via Google) retornem 401 com mensagem orientando "entre com Google".

---

## 5. Fluxos de OAuth e vínculo

### 5.1 Entrar/Cadastrar com Google
1. Front chama `GET /auth/google?contexto=login` (ou com `qrToken` quando vindo da landing
   da célula) → backend monta a `authUrl` e retorna `{ url }`; front redireciona.
2. Google → `GET /auth/google/callback?code=...&state=...`. O `state` carrega CSRF token +
   contexto (qrToken, se houver) e é validado.
3. Backend troca `code` por tokens, lê o perfil (`sub`, `email`, `nome`):
   - Se existe `User` com aquele `googleSub` → login.
   - Senão, se existe `User` com aquele `email` → vincula `googleSub` a ele.
   - Senão → cria `User` (papel `MEMBRO`, sem senha; vincula à célula se veio `qrToken`).
   - Guarda o refresh token cifrado, provisiona o calendário "iCélula" (Seção 6) e marca
     `googleConectado = true`.
4. Emite o JWT do iCélula e **redireciona** o navegador para
   `${WEB_URL}/auth/google/sucesso#token=<jwt>` (token no **fragmento**, que não vai para
   logs de servidor). Uma página leve do front lê o fragmento, persiste o token no
   `AuthContext` e redireciona para `/app`. (`WEB_URL` = `http://localhost:5173` em dev.)

### 5.2 Conectar Google Calendar (conta por e-mail já logada)
1. Membro logado clica "Conectar Google Calendar" → `GET /auth/google?contexto=conectar`
   (requer JWT; o `state` referencia o usuário atual).
2. Callback igual ao acima, mas sempre **vincula ao usuário autenticado** (não cria conta),
   guarda tokens, provisiona o calendário e dispara o backfill (Seção 7).

### 5.3 Desconectar
- `DELETE /google` (membro logado) → revoga o refresh token no Google (best-effort), apaga
  `googleRefreshTokenEnc`/`googleCalendarId`, marca `googleConectado = false`. Os eventos já
  criados podem ser removidos (apaga `GoogleEventoSync` + eventos) ou deixados — **decisão:
  remover os eventos do calendário "iCélula"** para não deixar lixo.

---

## 6. Provisionamento do calendário "iCélula"

Na primeira conexão bem-sucedida, `calendar.js` cria um calendário secundário chamado
"iCélula" na conta da pessoa (`calendars.insert`) e guarda o `googleCalendarId`. Se o
usuário já tiver um (reconexão), reutiliza. Cor/timezone configurados (timezone
`America/Sao_Paulo`).

---

## 7. Motor de sincronização (`calendarSync.js`)

Interface (todas best-effort; logam e seguem em caso de erro):
- `sincronizarMembro(userId)` — **backfill**: para o membro vinculado, garante um evento no
  calendário "iCélula" para cada encontro **não-cancelado** da célula dele (cria os que
  faltam via `GoogleEventoSync`).
- `sincronizarEncontro(encontroId)` — para um encontro alterado, percorre os membros
  vinculados da célula e **cria/atualiza** o evento de cada um (e remove se o encontro virou
  `CANCELADO`).
- `removerEncontro(encontroId)` — apaga os eventos Google de todos os membros (encontro
  deletado/cancelado) e limpa o `GoogleEventoSync`.
- `removerMembro(userId)` — apaga os eventos do membro ao desconectar.

**Conteúdo do evento:** `summary = "Encontro — <nome da célula>"`; `start = encontro.data`;
`end = data + 90min`; `description` com observação (se houver); timezone `America/Sao_Paulo`.

**Disparo (best-effort, não bloqueia a resposta):**
- `POST /celulas/:id/encontros`, `PUT /encontros/:id`, `POST /celulas/:id/encontros/estender`
  → `sincronizarEncontro`/backfill dos novos.
- `PUT /encontros/:id` com `status=CANCELADO` → `removerEncontro` (ou update p/ cancelado).
- `PUT /celulas/:id` que re-materializa → ressincroniza os encontros afetados.
- Conectar Google (5.2) e entrar via Google numa célula (5.1) → `sincronizarMembro`.

**Renovação de token:** antes de cada chamada, `oauth.js` usa o refresh token para obter um
access token válido; se o refresh falhar (revogado/expirado), marca `googleConectado=false`
e interrompe o sync daquele usuário.

---

## 8. Segurança

- Refresh tokens **cifrados** em repouso (AES-256-GCM com `TOKEN_ENC_KEY`); nunca retornados
  em nenhuma resposta.
- `state` do OAuth com CSRF token assinado e validade curta.
- Escopos mínimos necessários; `calendar` é o suficiente para criar o calendário e eventos.
- Nenhum dado do Google Calendar é exposto no front do iCélula.
- Rotas de conexão exigem JWT (exceto o início do "Entrar com Google").

---

## 9. Tratamento de erros

- Falha em qualquer chamada ao Google **nunca** quebra a operação principal (marcar
  presença, salvar cronograma): o sync é best-effort, captura exceções e registra log.
- Token revogado → `googleConectado=false`; o membro é convidado a reconectar (front mostra
  o botão "Conectar Google Calendar" de novo).
- `GOOGLE_OAUTH_ENABLED` desligado → rotas Google retornam `503`; botões ocultos.

---

## 10. Testes

- **Unitários** com cliente Google **mockado** (injetado via `client.js`): `calendarSync`
  cria/atualiza/remove eventos conforme as transições de encontro e vínculo; `cripto.js`
  cifra/decifra ida e volta; `oauth.js` monta authUrl e processa callback (com `googleapis`
  mockado).
- **Rotas** (`fastify.inject`): `/auth/google` retorna `{ url }`; callback cria/loga/vincula
  usuário corretamente nos três casos (novo googleSub / e-mail existente / já vinculado);
  `/google` desconecta. Com `GOOGLE_OAUTH_ENABLED=false`, rotas → 503.
- **Sem rede nos testes:** nenhuma chamada real ao Google; tudo via mock. Saída pristine,
  banco limpo (cleanup FK-safe).

---

## 11. Toques no frontend (mínimos)

- Botão **"Entrar com Google"** nas telas de login e cadastro (e na landing do QR, levando o
  `qrToken`). Visível só quando `GOOGLE_OAUTH_ENABLED`.
- Botão/cartão **"Conectar Google Calendar"** na área do membro (mostra estado conectado /
  desconectar). Nenhum calendário do Google embutido.
- O front lê uma flag pública (`GET /config` → `{ googleHabilitado }`) para decidir se mostra
  os botões.

---

## 12. Escopo

### Inclui (Fase 4)
- OAuth Google (identidade + calendário), criar conta/vincular/conectar/desconectar.
- Calendário dedicado "iCélula" e CRUD de eventos.
- Sync one-way com propagação (criar/editar/cancelar encontro; backfill ao vincular).
- Cifragem de refresh token; feature-flag; testes com mock.
- Toques mínimos no front.

### Fora de escopo (YAGNI / futuro)
- Sincronização **two-way** (Google → plataforma).
- Fila de jobs / retry robusto (agora é best-effort inline assíncrono).
- Webhooks/push notifications do Google para detectar mudanças externas.
- Convites/compartilhamento de calendário entre membros.
- Outros provedores (Outlook/Apple).

---

## 13. Dependências e ambiente

- Lib: `googleapis` (cliente oficial Node) em `apps/api`.
- Apenas localhost nesta fase (redirect `http://localhost:3000/auth/google/callback`).
- A feature permanece **desligada por padrão** até o Ian fornecer as credenciais; nada
  bloqueia o uso normal do iCélula enquanto isso.
