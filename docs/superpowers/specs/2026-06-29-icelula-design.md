# iCélula — Documento de Design

**Data:** 2026-06-29
**Status:** Aprovado
**Autor:** Brainstorm colaborativo (Ian + Claude)

---

## 1. Visão geral

**iCélula** é uma plataforma web responsiva (mobile-first) para gestão simples de
células cristãs. O foco é ser extremamente simples, rápida e intuitiva para três
perfis: membros, líderes de célula e administradores.

A porta de entrada principal é o **QR Code da célula**: a pessoa escaneia, cai na
landing da célula, cria conta (ou faz login) e já fica vinculada àquela célula.

### Funcionalidades centrais

- Entrada via QR Code (por célula)
- Cadastro e autenticação de membros
- Cronograma da célula com geração automática de encontros
- Registro de presença por encontro
- Pedidos de oração (CRUD do próprio membro + marcar atendido)
- Intenção de testemunho ("Quero dar testemunho") → conclusão pelo líder/admin
- Painel de Vidas Impactadas
- Painéis de membro, líder e administrador

---

## 2. Stack e justificativa

| Camada | Escolha | Justificativa |
|---|---|---|
| Frontend | **Vite + React 19 + React Router** | Mesma base do projeto Sara (familiaridade total), SPA leve, build instantâneo, mobile-first natural. |
| Estilo | **Tailwind CSS + CSS variables** | Design system com tokens (laranja + dark graphite) e dark/light via variáveis. Rápido de manter. |
| Formulários | **react-hook-form + zod** | Validação robusta, já dominada no Sara. |
| Gráficos | **Recharts** | Dashboards do admin (crescimento, engajamento). |
| Ícones | **lucide-react** | Minimalista, alinhado ao brief. |
| Backend | **Node + Fastify** | API REST enxuta e rápida, baixo overhead, separação app/API limpa. |
| ORM / DB | **Prisma + PostgreSQL** | Modelo relacional encaixa (usuário↔célula↔encontro↔presença). Postgres aguenta os relatórios agregados do admin. Prisma acelera dev e migrations. |
| Auth | **JWT próprio (bcrypt + access token)** | Controle total do fluxo QR Code (associar à célula no cadastro). Custo zero, sem vendor lock-in. |
| Ambiente local | localhost: web `:5173`, api `:3000`, Postgres via Docker `:5432` | Roda 100% offline. Deploy futuro trivial (VPS / Render / Fly / Railway). |

### Por que não Next.js / Supabase

- **Next.js**: traria SSR que um app majoritariamente logado e interativo não precisa;
  adiciona complexidade sem ganho real aqui.
- **Supabase**: prenderia o auth e o controle de papéis (RLS) a um modelo que fica mais
  limpo e flexível com JWT próprio, dado o esquema de papéis hierárquicos multi-célula.

A stack escolhida ganha em **simplicidade, custo zero, manutenção e velocidade de
desenvolvimento**, sem sacrificar escalabilidade — Postgres + API stateless escalam
horizontalmente.

### Critérios avaliados

- **Performance:** SPA leve + API stateless + Postgres indexado.
- **Escalabilidade:** API sem estado (escala horizontal); Postgres gerenciado escala vertical/réplicas.
- **Simplicidade:** monorepo com web/api/shared; sem frameworks pesados.
- **Manutenção:** tipos e schemas compartilhados (zod), Prisma para o schema do banco.
- **Velocidade de dev:** Vite + Prisma + base já conhecida do Sara.
- **Deploy futuro:** 1 container web + 1 API + 1 Postgres; trivial em qualquer PaaS.
- **Custo operacional:** zero local; faixa gratuita/baixa em produção.
- **Auth:** JWT próprio = controle total do fluxo QR Code.
- **Banco ideal:** PostgreSQL (relacional, agregações para os dashboards).

---

## 3. Arquitetura

```
icelula/
├── apps/
│   ├── web/      → Vite + React (SPA, porta 5173)
│   └── api/      → Fastify + Prisma (REST, porta 3000)
├── packages/
│   └── shared/   → tipos e schemas zod compartilhados (DTOs)
├── docker-compose.yml  → Postgres local
└── docs/superpowers/specs/  → este documento
```

- **web** consome **api** via axios, enviando o JWT no header `Authorization`.
- **api** é stateless; toda regra de permissão e o cálculo do cronograma ficam no servidor.
- **shared** evita duplicar schemas de validação entre frontend e backend.

### Princípios de isolamento

- Cada módulo da API (auth, células, encontros, presença, pedidos, testemunhos, usuários,
  dashboards) tem rotas, serviço e validação próprios, comunicando-se por interfaces claras.
- O frontend espelha esses domínios em features isoladas, cada uma testável de forma independente.

---

## 4. Modelo de dados (Prisma)

### User
- `id`, `nome`, `email` (único), `senhaHash`
- `papel`: `MEMBRO | LIDER | ADMIN`
- `celulaId` (membro e líder pertencem a 1 célula; admin é global → pode ser nulo)
- `ativo` (boolean), `criadoEm`, `ultimoAcesso`

### Celula
- `id`, `nome`, `descricao`
- `liderId` (referência a User)
- `qrToken` (slug único usado na URL do QR Code)
- `diaSemana` (0–6), `frequenciaDias` (ex: 7, 14), `dataPrimeiroEncontro`
- `ativa` (boolean)

### Encontro
- `id`, `celulaId`, `data`
- `status`: `AGENDADO | REALIZADO | CANCELADO`
- `observacao`
- Gerados a partir do cronograma da célula; individualmente editáveis.

### Presenca
- `id`, `encontroId`, `userId`, `marcadaEm`
- Único por (`encontroId`, `userId`).

### PedidoOracao
- `id`, `userId`, `celulaId`, `texto`
- `status`: `ATIVO | ATENDIDO`
- `criadoEm`, `atualizadoEm`

### Testemunho
- `id`, `userId`, `celulaId`
- `status`: `PENDENTE | CONCLUIDO`
- `criadoEm`, `concluidoEm`

### Sobre o cronograma

O **cronograma não é uma tabela**: é a regra (`diaSemana` + `frequenciaDias` +
`dataPrimeiroEncontro`) armazenada na `Celula`, que **projeta** os registros de `Encontro`.
O sistema materializa encontros futuros (ex: próximos 90 dias) e o líder pode
editar/cancelar/adicionar qualquer encontro individualmente, para cobrir exceções.

---

## 5. Papéis e permissões

Hierarquia: **Admin ⊃ Líder ⊃ Membro**. O Admin pode tudo que o líder pode, em qualquer
célula, mais a gestão global.

| Ação | Membro | Líder (sua célula) | Admin (todas) |
|---|:--:|:--:|:--:|
| Marcar própria presença | ✅ | ✅ | ✅ |
| CRUD próprios pedidos / marcar atendido | ✅ | ✅ | ✅ |
| Marcar "Quero dar testemunho" | ✅ | ✅ | ✅ |
| Ver próprio histórico | ✅ | ✅ | ✅ |
| Criar/editar cronograma e encontros | ❌ | ✅ | ✅ |
| Concluir testemunho de um membro | ❌ | ✅ | ✅ |
| Ver presença/pedidos/membros da célula | ❌ | ✅ | ✅ |
| CRUD global de usuários, promover, resetar senha | ❌ | ❌ | ✅ |
| Ativar/desativar usuários, alterar permissões | ❌ | ❌ | ✅ |
| CRUD global de pedidos / testemunhos | ❌ | ❌ | ✅ |
| Dashboard global + gestão de células | ❌ | ❌ | ✅ |

A autorização é aplicada **no servidor** em cada rota (middleware por papel + verificação
de escopo de célula).

---

## 6. Fluxo de entrada via QR Code

1. Líder/Admin abre a célula → a tela exibe o **QR Code**, que aponta para `/c/:qrToken`.
2. A pessoa escaneia → cai na **landing da célula** (nome da célula visível, tom acolhedor).
3. **Sem conta** → cria conta ali (nome, email, senha) → fica vinculada àquela `celulaId`
   como `MEMBRO`.
4. **Com conta** → faz login → vai para o painel do membro.
5. Pós-login → área do membro: próximos encontros, presença, pedidos, testemunho, histórico.

O cadastro de usuários acontece **principalmente** por esse fluxo. O Admin também pode
criar usuários manualmente.

---

## 7. Cronograma, encontros e presença

- O líder define **dia da semana + frequência (em dias) + data do primeiro encontro**;
  o sistema **gera automaticamente** os próximos encontros.
- O cronograma é **editável**: mover, cancelar ou adicionar encontro avulso para exceções.
- Cada encontro exibe a **data**; o membro marca presença **daquele encontro específico**
  (ex: "Encontro de qui, 02/07 — Marcar presença").
- Relatórios derivados de `Presenca × Encontro`: frequência por pessoa, ranking de
  frequência, pessoas ausentes.

---

## 8. Pedidos de oração

- Membro: cria, edita e exclui **os seus** pedidos e marca como **atendido**.
- Líder: vê os pedidos da sua célula.
- Admin: vê e edita **todos** os pedidos, com filtros por status, pessoa e data.

---

## 9. Testemunhos e Painel de Vidas Impactadas

- Membro marca a intenção "Quero dar testemunho" → status `PENDENTE`.
- Líder/Admin marca como `CONCLUIDO` (a pessoa deu o testemunho).
- **Painel de Vidas Impactadas**: contador visual celebrativo =
  `testemunhos CONCLUIDOS + pedidos ATENDIDOS`.

---

## 10. Dashboards

### Membro
Próximos encontros, status de presença, meus pedidos, meus testemunhos, meu histórico.

### Líder (escopo da própria célula)
Membros, presença/frequência, pedidos, testemunhos pendentes, cronograma.

### Admin (global)
- Totais: membros, pedidos ativos, pedidos atendidos, testemunhos pendentes, presenças.
- Pessoas mais ativas, pessoas com mais pedidos.
- Crescimento de usuários, engajamento geral.
- CRUD global de usuários (criar, editar, excluir, ativar/desativar, resetar senha,
  alterar permissões, promover a Admin).
- Visão geral por usuário: data de cadastro, último acesso, nº de presenças, nº de
  pedidos feitos, nº de pedidos atendidos, nº de testemunhos marcados.
- Gestão global de pedidos, testemunhos e presença.
- Gestão de células.

---

## 11. Design system

- **Brand:** Primary Orange `#E56A22`, Hover `#C95518`, Soft `#F59A63`.
- **Light Mode:** Background `#FFFFFF`, Secondary `#F8F8F8`, Cards `#FFFFFF`,
  Borders `#ECECEC`, Text Primary `#1A1A1A`, Text Secondary `#666666`, Accent = laranja.
- **Dark Mode (Deep Graphite Purple):** Background `#1B1824`, Secondary `#242031`,
  Cards `#2D2838`, Borders `#3A3448`, Text Primary `#FFFFFF`, Text Secondary `#B9B3C9`,
  Accent = laranja.
- Tokens via CSS variables + toggle de tema.
- Componentes: cards arredondados (16px), botões modernos, ícones minimalistas,
  transições suaves, microinterações, tags de status, skeleton loading, empty states
  elegantes.
- Mobile-first; estética inspirada em SaaS modernos e no projeto Sara.
- A skill **ui-ux-pro-max** estrutura tokens, componentes e telas na fase de implementação.

---

## 12. Escopo

### Primeira entrega
- Estrutura monorepo (web / api / shared) + Docker Postgres.
- Design system (light + dark).
- Autenticação + fluxo QR Code.
- CRUD de usuários (admin) e cadastro via QR (membro).
- CRUD de pedidos de oração.
- Cronograma + encontros + presença.
- Testemunhos + Painel de Vidas Impactadas.
- Dashboards de membro, líder e admin.
- Controle de permissões hierárquico.
- Dark mode e light mode completos.
- Projeto versionado no GitHub (repositório `icelula`).

### Fora de escopo agora (YAGNI)
- Deploy público e configuração de domínio (virá depois, com instruções do usuário).
- Renovação automática/periódica do QR Code da célula.
- Notificações push / e-mail.
- Aplicativo nativo.

---

## 13. Ambiente e execução

- **Local apenas** (localhost), sem domínio nesta fase.
- web em `:5173`, api em `:3000`, Postgres em `:5432` (Docker).
- Deploy futuro: o usuário enviará domínio, endereço final e config de produção; só então
  conectar domínio, configurar produção e publicar.
