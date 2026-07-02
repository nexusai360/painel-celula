# Fatia 3 — Vidas (painel de vidas + modo foco do QR)

**Data:** 2026-07-01
**Status:** aprovado no brainstorm, pronto para plano de implementação

## 1. Contexto e objetivo

Terceira e última fatia do bloco social do Hineni. Entrega duas partes de um mesmo
cenário de uso (apresentação numa TV durante a célula):

- **Tela "Vidas"** (só líder): as fotos + nomes dos membros ativos da célula flutuando
  suavemente, espalhados sem sobreposição, com atualização **ao vivo** — quem se
  cadastra na célula "brota" na tela em poucos segundos.
- **Modo foco do QR Code**: na aba Informações de "Minha Célula", o líder clica no QR
  e ele entra em modo apresentação (fundo escurecido + blur, QR ampliado), para as
  pessoas escanearem sem ver o resto das informações.

Cenário: numa TV, o líder abre o QR em foco → as pessoas escaneiam e se cadastram →
troca para a tela Vidas → os nomes brotam ao vivo conforme os cadastros são concluídos.

**Sem backend novo:** reusa `GET /celulas/:id/membros` (Fatia 2), que já retorna os
membros ativos da célula do líder (incluindo o próprio líder).

## 2. Escopo

**Entra:**
- Tela Vidas (`/app/vidas`, gate de líder), espalhamento, animação de flutuar, polling ao vivo.
- Modo foco do QR (overlay na aba Informações do `CelulaDetalhe`).
- Item de menu "Vidas" (líder).

**NÃO entra:**
- Backend novo / real-time via SSE ou WebSocket (decisão: polling).
- Interação/clique nas fotos da tela Vidas (é contemplativa).

## 3. Decisões de produto (do brainstorm)

1. **Quem aparece:** todos os membros **ativos** da célula, **incluindo o líder** (é o que a rota já retorna para o líder).
2. **Muitos membros:** reduzir o tamanho de todas as fotos (mantendo todas iguais) para caberem sem sobrepor; abaixo de um **piso legível**, fixa o piso e a tela **rola**.
3. **Posições:** **reembaralha a cada visita** (novo arranjo ao montar a tela).
4. **Empty state:** tela **simplesmente vazia** (sem mensagem) — esperando alguém "brotar".
5. **Ao vivo:** **polling leve** (~4s). Novos cadastros brotam; removidos/inativados somem.
6. **Sem clique** nas fotos (decorativo).
7. **QR foco:** clique no QR → overlay escuro + blur + QR ampliado + nome da célula; fecha ao tocar fora / Esc.

## 4. Frontend — Tela Vidas

### 4.1 Rota e acesso
- Rota `/app/vidas` dentro do bloco protegido de `App.jsx`, envolta no gate `SoLider`
  (papel `LIDER`; demais → redireciona a `/app`). Fundo padrão (`bg-background`).
- Item de menu **"Vidas"** em `linksPorPapel` (`TopBar.jsx`), só para `LIDER`, ícone
  `Heart` (lucide), rota `/app/vidas` — ao lado de Testemunhos.

### 4.2 Algoritmo de espalhamento (`apps/web/src/lib/vidas.js`, puro/testável)
```
disporVidas({ largura, altura, n, raio, gap, rng })
  → [{ x, y }]  // centros, comprimento n, sem sobreposição
```
- Cada pessoa é um círculo de raio `raio` (cobre foto + nome). Duas pessoas não
  colidem se a distância entre centros ≥ `2*raio + gap`.
- **Dardos com rejeição, do centro para fora:** candidatos gerados em anéis de raio
  crescente a partir do centro do container; um candidato é aceito se não colide com
  os já colocados e respeita os limites (margem das bordas). O **centro exato fica
  vazio** (raio dos candidatos começa acima de um mínimo).
- `rng` é injetável (função `() => [0,1)`, default `Math.random`) — o teste passa um
  gerador semeado determinístico; o uso real passa `Math.random` (reembaralha).
- Função auxiliar `calcularRaio({ largura, altura, n, raioMax, raioMin, gap })` →
  escolhe o maior `raio ≤ raioMax` que permita `n` círculos na área (fator de
  empacotamento ~0.62); nunca abaixo de `raioMin`.
- Função auxiliar `alturaNecessaria({ largura, n, raio, gap, raioMin })` → quando no
  piso `raioMin` a área não comporta `n`, retorna a altura estendida (a tela rola).

### 4.3 Orquestração (`apps/web/src/pages/Vidas.jsx`)
- Mede o container com `ResizeObserver` (largura/altura disponíveis abaixo do título).
- Carrega `apiListarMembros(celulaId)`; ao montar, calcula posições do zero (reembaralha).
- **Polling:** `setInterval(~4000ms)` refazendo `apiListarMembros`; diff por `id`:
  - ids novos → posicionados numa vaga livre mantendo as posições atuais (dardos de
    rejeição contra as existentes); se não houver vaga (ou já no piso), recalcula tudo
    reduzindo o raio.
  - ids que sumiram → removidos (fade-out).
  - Intervalo limpo no unmount. (Otimização opcional: pausar em `document.hidden`.)
- Estado guarda `[{ id, nome, avatar, x, y }]`. Erros de rede no polling são engolidos
  (mantém o estado atual; não quebra a tela).

### 4.4 Bolha (`apps/web/src/components/VidaBolha.jsx`)
- `<Avatar src nome size>` + nome abaixo (centralizado, truncado), posicionada
  absolutamente em `{x, y}`.
- **Flutuar:** `motion.div` animando `y: [0, -7, 0]` em loop, `duration` ~3.5–5s e
  `delay` levemente aleatórios por bolha (dessincroniza). **Brotar:** `initial {scale:0,
  opacity:0}` → `animate {scale:1, opacity:1}` via `AnimatePresence`; **sair:** fade-out.
- `prefers-reduced-motion`: sem flutuar; brotar/sair viram fade simples.

## 5. Frontend — Modo foco do QR

### 5.1 `apps/web/src/components/QrFocusOverlay.jsx`
- `<QrFocusOverlay open, valorQr, nomeCelula, onClose />`: `fixed inset-0 z-50`, fundo
  `bg-black/70` + `backdrop-blur`, centralizado um `QRCodeCanvas` grande (~280px) num
  cartão claro + o `nomeCelula`. Fecha ao clicar no fundo e ao pressionar `Esc`
  (listener de teclado enquanto aberto). framer-motion (fade/scale).
- Renderizado a partir do `QrCard` (dentro de `<main>`, sem ancestral com
  `backdrop-filter`/`transform`), então o `fixed` cobre a viewport corretamente.

### 5.2 `QrCard` em `CelulaDetalhe.jsx`
- O QR (ou um botão "Ampliar") passa a abrir o overlay (estado `focoAberto`). O
  `valorQr` é a mesma URL/token já usada no QR atual; `nomeCelula = celula.nome`.

## 6. Regras e segurança
- Tela Vidas só para líder (gate de front `SoLider` + a rota `GET /celulas/:id/membros`
  já é `requireRole('LIDER')` e escopada à célula do líder). Sem dado sensível novo.
- Sem escrita no backend nesta fatia.

## 7. Tratamento de erros
- Carregamento inicial de Vidas com falha → tela vazia (sem quebrar); o polling tenta
  de novo no próximo ciclo. Erros do polling são silenciosos (mantêm o estado atual).

## 8. Testes
- **`apps/web/test/vidas.test.js`** (função pura, `rng` semeado):
  - `disporVidas` retorna `n` posições; **nenhum par** com distância < `2*raio + gap`
    (sem sobreposição); todas **dentro dos limites**; **nenhuma no centro exato**.
  - Posicionamento **incremental** preserva as posições passadas como existentes.
  - `calcularRaio` reduz o raio conforme `n` cresce e nunca fica abaixo de `raioMin`.
- Componentes (`Vidas`, `VidaBolha`, `QrFocusOverlay`) e a integração no `QrCard`/menu
  verificados por **build** (o projeto não tem teste de componente — node-only).
- Meta: suítes verdes (web 14 → + `vidas`).

## 9. Fora de escopo / futuro
- Real-time por SSE/WebSocket (fica o polling).
- "Vidas impactadas" com histórico/decisões (só o painel de presença de membros por ora).
- Modo foco do QR fora da tela da célula (só na aba Informações).
