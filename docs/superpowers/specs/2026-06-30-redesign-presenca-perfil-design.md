# Spec — Redesenho imersivo da presença + perfil/menu do membro (Hineni)

> Versão: **v3 (final)** · Data: 2026-06-30 · Status: aprovada para planejamento
>
> **v1→v2:** projeção sem avatar; DELETE liberado; critério de próxima reunião por dia-local; `usePresenca` sem refetch total; migração sem TTY; validação de avatar; E.164; a11y do sheet; home do admin; pin do framer-motion.
> **v2→v3:** extração dos helpers `comCelula`/`COM_CELULA`; **fonte de verdade compartilhada via `EncontrosProvider` + layout route `<Outlet>`** (resolve "refletir entre telas" sem piscar); comando de migração real (sem placeholders); avatar valida **só JPEG** (magic-bytes no handler); **EXIF auto-orient**; **rate-limit cortado** (só `bodyLimit`); `marcadaEm` na projeção; POST/DELETE devolvem novo `_count`; `publicoLeve` também em `celulas.js`; check do herói **CSS puro** (framer-motion só no Sheet); microcopy e contratos fixados; testes do gate nomeados.

## 1. Contexto e objetivo

A área do membro (`AppHome`) hoje é uma lista de cards com botões — fria. O cabeçalho (`AppShell`) está sobrecarregado e não há identidade pessoal. Objetivo: experiência **imersiva, moderna e encantadora**, mobile-first, em três pilares:

1. **Check-in imersivo da próxima reunião** (herói animado, reversível).
2. **Calendário-mapa de presença** (fui/faltei de relance + marcação retroativa).
3. **Cabeçalho/menu remodelado + perfil** (top bar enxuta, nav inferior, foto/nome/WhatsApp).

> Vocabulário: "célula" = "reunião" = "encontro". Na UI: "reunião" + nome configurado da célula.

## 2. Princípios de design (UI/UX Pro Max)

Padrão **Habit Tracker**: streak laranja + progresso verde, micro-interações, sucesso explícito.
- **Marca/streak:** `--brand #E56A22`. **Presença/sucesso:** `--success`. **Falta:** `--text-muted` + ícone (nunca vermelho).
- Sora/Inter; dark grafite mantido; light/dark juntos. lucide-react (sem emojis).
- Animação 150–300ms; spring no sheet; só `transform`/`opacity`; `prefers-reduced-motion`; haptic `navigator.vibrate`.
- Toque ≥44px, gap ≥8px, feedback ≤100ms, sem hover-only.
- A11y: AA; `focus-visible`; `aria-live` em confirmações; cor + ícone + texto sempre.

## 3. Regras de negócio (backend)

### 3.1 Janela de marcação — instante absoluto, marcar ≠ desmarcar

`encontros.service.js`:
```
podeMarcarPresenca(encontro, agora):        // POST
  CANCELADO            -> { ok:false, motivo:'Reunião cancelada' }
  agora < encontro.data-> { ok:false, motivo:'Disponível a partir de <data/hora>' }
  senão                -> { ok:true }

podeDesmarcarPresenca(): { ok:true }        // DELETE — remover é sempre seguro
```
- Bloqueia futuro e hoje-antes-do-horário; libera no horário e retroativo. **DELETE nunca bloqueia** (evita presença-fantasma em cancelamento/reagendamento).
- **REALIZADO é irrelevante** ao gate (só `data` + `CANCELADO`).
- **Sem teto de retroatividade** (decisão de produto).
- **Pré-marcação no mesmo dia antes do horário foi removida** (intencional).
- Imune a fuso (compara instantes). `diferencaEmDiasDeCalendario` permanece para outros usos, sai do gate.
- Se `dataPrimeiroEncontro` for meia-noite, LOCKED não aparece naquele dia (aceitável). Reafirmar `TZ=America/Sao_Paulo` em produção.
- `presenca.js`: POST chama `podeMarcarPresenca`; **DELETE não chama gate** (remove sempre, mantendo as validações de existência/membership).

### 3.2 Próxima reunião (featured) — critério único de dia-local

Helper único em `lib/datas.js`:
```
chaveDiaLocal(d):
  const x = new Date(d)
  return `${x.getFullYear()}-${pad2(x.getMonth()+1)}-${pad2(x.getDate())}`   // componentes LOCAIS
```
(Não reutilizar `paraInputDate`, que usa truque de offset/ISO.)

- **Featured** = primeiro encontro (ordem crescente de `data`) com `chaveDiaLocal(data) >= chaveDiaLocal(agora)` **e** `status !== CANCELADO`.
  - No dia: mostra o de hoje (após o horário = markável; antes = travado com contagem). Após meia-noite local seguinte, rola para o próximo. Cancelado do dia → pula.
- **Vazio:** sem encontro hoje/futuro → estado vazio.
- **Guard:** `celulaId` nulo → não chama `apiListarEncontros` (mantém guards atuais).
- Cálculo no frontend; sem novo endpoint.

### 3.3 Perfil — novos campos no `User`

- `avatar String? @db.Text` — data URL **`data:image/jpeg;base64,…`** (cliente sempre exporta JPEG 256²).
- `whatsapp String?` — **E.164 só dígitos** (ex.: `5562999999999`).

**Anti-inflação de payload — auditoria completa de `publico()`:**
- Criar `publicoLeve(user)` (sem `avatar`) em `lib/usuarios.js`.
- Substituir `publico()` por `publicoLeve()` em **`routes/presenca.js`** (`GET /encontros/:id/presencas`, por presente) **e** **`routes/celulas.js`** (`lider: publicoLeve(celula.lider)`). `routes/usuarios.js` já usa `select` sem avatar (seguro).
- Avatar só viaja em `/auth/me`, `/perfil` (GET implícito via /me) e `PUT /perfil`.
- **Avatar não entra no JWT** (`assinarToken` segue `{id,papel,celulaId}`).

### 3.4 Refator de helpers (pré-requisito)

`comCelula`, `COM_CELULA` e (opcional) `assinarToken` hoje são **privados em `routes/auth.js`** — não exportados. Extrair `COM_CELULA` + `comCelula` para **`lib/usuarios.js`** (junto de `publico`/`publicoLeve`), trocar o import em `auth.js`, e `perfil.js` passa a importar dali. `assinarToken` permanece em `auth.js` (perfil não assina token).

### 3.5 Endpoint `PUT /perfil`

`routes/perfil.js` (novo, registrado em `app.js`), `preHandler requireRole('MEMBRO')`, edita sempre `request.usuario.id`.
- **`bodyLimit` explícito na rota: 700 KB.** (Rate-limit **fora do v1** — followup; mantém só `bodyLimit`.)
- Body (zod `perfilUpdateSchema` em **`packages/shared/src/perfil.schemas.js`**, re-exportado por `index.js`):
  - `nome?: string().min(1).max(80)`
  - `whatsapp?: string | null` — normalizar dígitos; E.164: se 10–11 dígitos, prefixar `55`; aceitar 12–13; `null`/`""` limpa.
  - `avatar?: string | null` — zod valida **prefixo** `^data:image/jpeg;base64,` **+ tamanho** ≤ 400 KB; `null`/`""` limpa.
- **Validação de magic-bytes no handler** (não no zod): `Buffer.from(b64,'base64')` e conferir os 3 primeiros bytes = `FF D8 FF` (JPEG). Falha → `400 { erro:'Imagem inválida' }`. (Só JPEG; PNG/WEBP brutos morrem no canvas do cliente.)
- Atualiza só os campos enviados, com `...COM_CELULA` no `update`; retorna `{ usuario: comCelula(atualizado) }` (shape de `/auth/me`, com `celulaNome`).
- **Front:** `apiAtualizarPerfil({nome,whatsapp,avatar}) → data.usuario`; `AuthContext.aplicarUsuario(usuario)` faz `setUsuario(usuario)` (sem refetch).
- Armazenamento base64 em `Text` (sem storage externo).

### 3.6 Endpoints de presença devolvem `_count` + projeção `marcadaEm`

- `GET /celulas/:id/encontros`: adicionar `marcadaEm` à projeção — `presencas:{ where:{userId}, select:{ marcadaEm:true } }` → expor `marcadoPorMim` (bool) **e** `marcadaEm` (datetime|null).
- `POST /encontros/:id/presenca` → retorna `{ presenca, totalPresencas }` (novo count do encontro). `DELETE` → **200** `{ totalPresencas }` (deixa de ser 204) para o cliente reconciliar o próprio delta. (Concorrência de outros usuários só reflete no próximo load — `_count` é aproximado entre loads; documentado.)

## 4. Experiência (frontend)

### 4.1 Arquitetura do shell — layout route + EncontrosProvider

**Decisão estrutural (resolve "refletir entre telas sem piscar"):**
- Em `App.jsx`, agrupar as rotas autenticadas do app num **layout route**: `<Route element={<AppLayout/>}>` com filhos `/app`, `/app/calendario`, `/app/perfil`, `/app/celulas`, `/app/celula/:id`. `AppLayout` renderiza **TopBar + `<Outlet/>` + BottomNav** (montagem única) e envolve o `<Outlet/>` num **`EncontrosProvider`**.
- **`EncontrosProvider`** (context): ao montar, se `usuario.celulaId`, busca `apiListarEncontros(celulaId)` **uma vez**; expõe `{ encontros, carregando, erro, recarregar, atualizarPresenca(encontroId, marcado, totalPresencas) }`. `atualizarPresenca` faz update **local** do encontro afetado (`marcadoPorMim`, `marcadaEm`, `_count.presencas`). Início e Calendário **consomem o mesmo estado** → marcar em um reflete no outro **sem refetch e sem piscar**, e ao trocar de aba não há spinner.
- Telas de líder/admin (`Celulas`, `CelulaDetalhe`) entram no mesmo layout route e herdam TopBar/BottomNav.

### 4.2 Navegação por papel (mobile <768px / desktop ≥768px)

- **TopBar** (todas as telas, sempre): `Logo` à esquerda; à direita `ThemeToggle` + **botão de avatar** (`Avatar` foto/iniciais) → `/app/perfil`. **O avatar aparece para todos os papéis, com ou sem célula.** Sem tag de papel, sem logout aqui.
- **BottomNav** (mobile, só quando `usuario.celulaId`):
  - **Membro:** Início `/app` · Calendário `/app/calendario` · Perfil `/app/perfil` (3).
  - **Líder:** Início · Calendário · Minha Célula `/app/celula/${celulaId}` · Perfil (4).
  - Ícone+rótulo, ativo destacado, safe-area inferior.
- **Desktop (≥768px):** links migram para a TopBar; BottomNav some.
- **Admin (celulaId null):** sem BottomNav; TopBar com link "Células" + avatar (perfil/logout via perfil). `/app` **redireciona admin para `/app/celulas`**.
- **Líder/membro sem célula:** Início = estado vazio "Você ainda não está em uma célula"; navegação por TopBar+avatar.

### 4.3 Início (`AppHome`)

1. **Saudação:** `Olá, <primeiro nome> 👋` + subtítulo `Marque sua presença na <nome da célula>!` (mantém a copy atual aprovada).
2. **CheckInHero** (4.4) — consome `featured` do `EncontrosProvider`.
3. **MinhaFrequencia** (4.7).
4. **Atalho:** `Ver todas as reuniões` → `/app/calendario`.

Remove a lista de cards atual.

### 4.4 CheckInHero (estados) — estável por `encontro.id`

Mostra: nome da célula, dia relativo, horário em destaque (figuras tabulares), `_count.presencas`.
- **Dia relativo:** "Hoje" · "Amanhã" · "Em N dias" (N≤6) · senão "Quinta-feira, 3 de julho".
- **LOCKED** (`agora < data`): ação desabilitada + cadeado; "Abre <dia> às <hora>"; se <24h, contagem regressiva ao vivo "Abre em 3h 12min" (granularidade minuto; sem segundos).
- **OPEN** (`agora >= data`, não marcado): **`<button aria-pressed="false">`** grande "Toque para confirmar presença" (teclado/foco ok).
- **CONFIRMED** (marcado): check verde + "Presença confirmada" + (se houver `marcadaEm`) "às <hora>"; toque remove → OPEN.
- **CANCELLED** (status CANCELADO, só por borda): selo "Reunião cancelada", sem ação.
- **Estabilidade:** componente keyed por `encontro.id`; effects dependem de **primitivos** (`encontro.id`, `marcadoPorMim`, `_count.presencas`), nunca do objeto — featured não troca de identidade num toggle e a animação não re-dispara sozinha.

### 4.5 `AnimatedCheck` (CSS puro) + `usePresenca`

**`AnimatedCheck` = CSS puro** (sem framer-motion, para o primeiro toque ser instantâneo):
- Confirmar: overlay sobre o card → círculo cresce (`transform: scale`, keyframes), **check SVG desenhado** via `stroke-dashoffset` (250–400ms), pulso de escala, 4–6 partículas (spans com `transform`/`opacity`); haptic `navigator.vibrate(12)`. Após ~1.1–1.4s, fade; card em CONFIRMED. **`aria-live="polite"` montada previamente** anuncia "Presença confirmada".
- Remover: check desfaz → OPEN.
- **`prefers-reduced-motion`:** sem overlay/partículas — crossfade + texto.

**`usePresenca(encontro)`** — usa `EncontrosProvider.atualizarPresenca`:
- **Disable-durante-inflight** + `AbortController`/ignore-on-unmount; reconcilia ao resultado do servidor (POST→marcado, `totalPresencas`; DELETE 200→não-marcado, `totalPresencas`). Update local otimista, **sem refetch da lista**.
- **Erro:** reverte e `role="alert"` junto à ação; 403 da trava mostra `motivo` do back.

### 4.6 Calendário-mapa (`AttendanceCalendar`)

> Nota: é **reescrita** de `MiniCalendario` (hoje só mês corrente sem navegação). `MiniCalendario` é importado **apenas** por `Calendario.jsx` — substituição segura.

Tela `/app/calendario` (consome `EncontrosProvider`):
- **Grade mensal**, navegação anterior/próximo **clampada**: do mês de `chaveDiaLocal` do **primeiro encontro** ao mês do **último encontro materializado** (~90d). Mês de borda sem reuniões: grade normal sem destaques.
- **Dias de reunião:** contorno na cor da marca (ring). Estados (cor **+ ícone + texto/legenda**):
  - **Presença** (passado/hoje, marcado): realce da marca + check.
  - **Falta** (passado, não-marcado, não-cancelado): contorno tracejado/ponto neutro.
  - **Futuro:** contorno tênue, sem ação.
  - **Cancelado:** riscado/acinzentado, sem ação.
  - **Hoje:** anel adicional.
- **Legenda** (cor+ícone+texto).
- **Toque num dia de reunião** → **bottom sheet** `DiaDetalheSheet` com detalhes + `usePresenca` (mesma trava: futuro desabilitado com microcopy; passado/hoje-aberto markável).
- Mesma fonte de verdade (via provider) — marcar no sheet reflete no herói **sem refetch**.
- `CartaoGoogleCalendar` permanece abaixo do calendário.

### 4.7 MinhaFrequencia (delight)

Cliente, sobre encontros **passados não-cancelados**: "Você esteve em **X** das últimas **Y** reuniões" + **sequência atual** (presenças consecutivas a partir da mais recente para trás), visual habit-tracker (barra + número). Sem backend.

### 4.8 Perfil (`/app/perfil`)

- **Avatar** grande, tappável (`AvatarUpload`): seletor → recorte central + resize 256² → JPEG ~0.8 data URL; preview; "Remover foto"; sem foto → iniciais sobre a marca.
- **Nome** editável; **WhatsApp** `type="tel"` placeholder "(62) 99999-9999" (E.164 ao salvar); **E-mail** read-only; **Papel** badge (usar `ROTULO_PAPEL` existente: Membro/Líder/Administrador).
- **Salvar** → `PUT /perfil`; sucesso (toast/realce); **erro por campo** via `mapearErroCampos(detalhes)`; atualiza `AuthContext.aplicarUsuario`.
- **Preferências:** `ThemeToggle`. **Sair:** logout separado.

### 4.9 `lib/imagem.js` — resize + EXIF

Resize via canvas a partir de **`createImageBitmap(file, { imageOrientation: 'from-image' })`** (auto-orienta fotos de celular; evita avatar deitado). Recorte central quadrado → canvas 256² → `toDataURL('image/jpeg', 0.8)`. Se a string passar de ~400 KB, reduzir qualidade até caber.

### 4.10 `ui/Sheet.jsx` — a11y

`focus-trap`, **Esc** fecha, **scroll-lock** do body, `role="dialog"`+`aria-modal="true"`+`aria-labelledby`, scrim 40–60% tap-to-dismiss, slide+fade do rodapé (framer-motion, com drag-to-dismiss), restaura foco ao gatilho, respeita reduced-motion.

### 4.11 Componentes — novos e tocados

**Novos:** `AppLayout.jsx` (layout route), `context/EncontrosContext.jsx` (`EncontrosProvider`), `TopBar.jsx`, `BottomNav.jsx`, `CheckInHero.jsx`, `AnimatedCheck.jsx`, `AttendanceCalendar.jsx`, `DiaDetalheSheet.jsx`, `ui/Sheet.jsx`, `ui/Avatar.jsx`, `AvatarUpload.jsx`, `pages/Perfil.jsx`, `hooks/usePresenca.js`, `lib/proximaReuniao.js`, `lib/imagem.js`, `lib/whatsapp.js`, `lib/erros.js` (`mapearErroCampos`), `chaveDiaLocal` em `lib/datas.js`.

**Tocados:** `App.jsx` (layout route + rota `/app/perfil` + redirect admin), `AppHome.jsx`, `Calendario.jsx`, `lib/api.js` (`apiAtualizarPerfil`), `context/AuthContext.jsx` (`aplicarUsuario`). Remove uso de `AppShell.jsx` (substituído por AppLayout/TopBar/BottomNav).

**Backend:** `schema.prisma` (+migração), `lib/usuarios.js` (`publicoLeve`, `comCelula`, `COM_CELULA`), `routes/auth.js` (importar helpers extraídos), `routes/perfil.js` (novo), `app.js` (registrar perfil), `lib/encontros.service.js` (gates), `routes/presenca.js` (gate por verbo + `publicoLeve` + `totalPresencas`), `routes/encontros.js` (`marcadaEm` na projeção), `routes/celulas.js` (`publicoLeve(lider)`), `packages/shared/src/perfil.schemas.js` + `index.js`.

### 4.12 Dependências novas

- `framer-motion` **`^12`** (React 19; SPA Vite, sem SSR) — usado **só no `Sheet`** (slide/spring/drag). Hero check é CSS. Import normal (não-lazy) — bundle ~40KB gz aceitável; evita stutter na 1ª animação.
- (Sem `@fastify/rate-limit` no v1.)

## 5. Fluxo de dados

```
AppLayout (EncontrosProvider: encontros[] keyed por celulaId)
  ├─ AppHome
  │    ├─ proximaReuniao(encontros) → featured → CheckInHero → usePresenca → atualizarPresenca(...)
  │    └─ minhaFrequencia(encontros) → MinhaFrequencia
  └─ Calendario
       └─ AttendanceCalendar → DiaDetalheSheet(encontro) → usePresenca → atualizarPresenca(...)
  (atualizarPresenca muta o estado do provider → herói e calendário refletem, sem refetch)

Perfil → apiAtualizarPerfil(...) → AuthContext.aplicarUsuario(usuario)
```

## 6. Microcopy (strings fixas)

- Saudação: `Olá, {primeiroNome} 👋` · Subtítulo: `Marque sua presença na {celulaNome || 'sua célula'}!`
- Hero OPEN: `Toque para confirmar presença` · CONFIRMED: `Presença confirmada` (+ `às {hora}` se `marcadaEm`).
- Hero LOCKED: `Abre {diaRelativo} às {hora}`; regressiva `Abre em {h}h {m}min` (ou `Abre em {m}min` se <1h).
- Dia relativo: `Hoje` · `Amanhã` · `Em {N} dias` (N≤6) · `{DiaDaSemana}, {D} de {mês}`.
- MinhaFrequencia: `Você esteve em {X} das últimas {Y} reuniões` · streak: `{S} seguidas` (oculto se S<2).
- Vazio sem reunião: `Nenhuma reunião agendada` / `Quando o líder publicar o cronograma, ela aparece aqui.`
- Vazio sem célula: `Você ainda não está em uma célula` / `Escaneie o QR Code da sua célula para participar.`
- Calendário: título `Calendário`; legenda `Presente` / `Faltou` / `Próxima` / `Cancelada`.
- BottomNav labels/aria: `Início` · `Calendário` · `Minha Célula` · `Perfil`.
- Perfil: `Trocar foto` / `Remover foto` / `Salvar` / `Salvo!` / `Sair`.
- Erros: avatar grande → `Imagem muito grande`; MIME/magic inválido → `Imagem inválida`; whatsapp inválido → `WhatsApp inválido`.
- Badge de papel: usar `ROTULO_PAPEL` existente.

## 7. Contratos de API/front

- `PUT /perfil` → `200 { usuario }` | `400 { erro, detalhes? }`. Erro de imagem: `400 { erro:'Imagem inválida' }`.
- `POST /encontros/:id/presenca` → `201 { presenca, totalPresencas }` | `200 { presenca, totalPresencas }` (idempotente) | `403 { erro }`.
- `DELETE /encontros/:id/presenca` → `200 { totalPresencas }`.
- `GET /celulas/:id/encontros` → `{ encontros:[{...,_count:{presencas},marcadoPorMim,marcadaEm}] }`.
- Front: `apiAtualizarPerfil({nome?,whatsapp?,avatar?}) → usuario`. `mapearErroCampos(detalhes)` lê `issue.path[0]`→campo. `AuthContext.aplicarUsuario(usuario)`=`setUsuario`.

## 8. Migração (sem TTY)

Colunas nullable, sem perda de dados — **não dispara prompt de TTY**:
```
# editar schema.prisma (avatar String? @db.Text, whatsapp String?)
npx prisma migrate dev --create-only --name perfil_avatar_whatsapp   # gera a pasta+SQL sem aplicar/prompt
npx prisma migrate deploy
npx prisma generate
```
Fallback (se algo pedir TTY): gerar SQL via
`npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_perfil_avatar_whatsapp/migration.sql`, depois `migrate deploy` + `generate`.

## 9. Testes

**Backend (Vitest):**
- Gate POST `podeMarcarPresenca`: futuro→bloqueia; **mesmo dia antes do horário→bloqueia (novo)**; exatamente no horário→libera; passado→libera; CANCELADO→bloqueia. **Reescrever `encontros.service.test.js`** (o caso atual "permite no dia" marca às 21:00 e passará a falhar sob instante-absoluto — ajustar a hora-base do teste).
- DELETE: sempre permite (inclui cancelado/reagendado-futuro).
- `presenca.js`: POST/DELETE retornam `totalPresencas`; respostas usam `publicoLeve` (sem avatar). `celulas.js`: lider sem avatar.
- `PUT /perfil`: atualiza nome/whatsapp/avatar; normaliza E.164; rejeita avatar grande/MIME/base64/magic inválido; limpa com null; exige auth; edita só o próprio; retorna `celulaNome`.

**Frontend:** build limpo; smoke (herói marca/desmarca animado; trocar de aba reflete sem piscar; calendário retroativo via sheet; perfil salva e reflete no avatar da TopBar). `prefers-reduced-motion`, focus-trap do sheet, light/dark, 375/768/1024.

## 10. Fora de escopo

Redesenho interno de `CelulaDetalhe`/`Celulas`; pedidos/testemunhos/dashboards; storage externo de imagem; recorte avançado; rate-limit (followup); correção definitiva de fuso na config; teto de retroatividade.

## 11. Critérios de aceite

1. Herói sempre na próxima reunião correta (hoje travado→markável→rola; cancelado pulado).
2. Marcar/desmarcar com animação encantadora, reversível, otimista, **sem piscar**, **refletindo entre Início e Calendário**.
3. Não marca antes do dia/horário; **desmarca sempre**; marca retroativo.
4. Calendário mostra de relance reunião + fui/faltei, com sheet acessível de marcação retroativa.
5. TopBar enxuta com avatar (todos os papéis); BottomNav por papel; perfil com foto/nome/WhatsApp salvando e refletindo na TopBar; admin redireciona a Células.
6. Avatar não infla listas (`publicoLeve` em presença e células) nem entra no JWT.
7. Mobile-first, responsivo, AA, focus, reduced-motion, sheet com focus-trap/Esc/scroll-lock, light/dark.
