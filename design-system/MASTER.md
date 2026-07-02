# Painel de Célula — Design System (MASTER)

> Destilado da UI reformada (jul/2026). Fonte de verdade visual. Tokens em
> `apps/web/src/index.css` (CSS vars + Tailwind v4 `@theme inline`). Primitivos em
> `apps/web/src/components/ui/`. Referência de sofisticação: Nexus Insights.

## Marca — prata cromada
- `--brand` **#64748b** (light) / **#b9c1cd** (dark) — cinza-prata (slate). **Não** usar laranja/violeta.
- Acabamento **cromado** (`.chrome` no index.css): gradiente metálico multi-stop + brilho especular
  (`inset` highlight no topo + sombra na base). Usado com parcimônia: CTA primário, logo, segmento
  ativo do ContextSwitcher, chip Super Admin. Hover desliza o sheen (respeita `prefers-reduced-motion`).
- `--brand-grad` para superfícies de marca suaves (botão primário).

## Tema
| Token | Light | Dark |
|---|---|---|
| `--background` | #ffffff | #141417 |
| `--surface` | #f8f8f8 | #1c1c21 |
| `--card` | #ffffff | #212127 |
| `--border` | #ececec | #2f2f38 |
| `--text` | #1a1a1a | #ffffff |
| `--text-muted` | #666666 | #b4b4be |

Dark por classe `.dark` no `<html>` (ThemeContext; persiste; respeita `prefers-color-scheme`).
Fontes: **Sora** (`font-display`, títulos) + **Inter** (corpo). Base 16px, line-height 1.5.

## Paleta semântica de PAPÉIS e STATUS (`lib/papeis.js`)
Chip = `bg-{cor}-500/10 border border-{cor}-500/30 text-{cor}-700 dark:text-{cor}-400` + ícone + texto.
`-700` no light garante contraste AA (amber/emerald/red no `-600` reprovam).
| Papel | cor / ícone | Status | cor / ícone |
|---|---|---|---|
| Membro | zinc / Eye | Em aprovação | amber / Clock |
| Líder | amber / Shield | Ativo | emerald / UserCheck |
| Administrador | blue / ShieldCheck | Inativo | red / UserX |
| Super Admin | **chrome** / Crown | | |

## Primitivos (`components/ui/`)
- **Layout/estados:** `Card` (ring-1, rounded-16), `Skeleton`/`SkeletonLinhas`, `EmptyState`, `ErrorState` (retry), `Toast` (provider global, aria-live, auto-dismiss 4s).
- **Navegação:** `Tabs` (pill, teclado ←→/Home/End), `ContextSwitcher` (segmented, ativo cromado, colapsa `<sm`).
- **Overlays:** `Modal` + `Sheet` (compartilham `hooks/useOverlayDismiss` — lock/trap/Esc/restore), `Popover` (outside-click/Esc). Scrim `bg-black/60 backdrop-blur-sm`.
- **Entrada:** `Input`, `Select`, `Combobox` (busca + allowCustom), `Checkbox`, `RoleSelect` (chip-trigger ≥44px, Popover), `DateTimePicker`.
- **Badges:** `RoleBadge`, `StatusBadge`. **Avatar** + `lib/avatarCor` (cor determinística por nome para quem não tem foto).
- **Máscaras:** `lib/mascaras` (CEP/telefone). **Cidades:** `lib/cidades` (curada + digitável).

## Assinaturas de layout
- **Header de página:** ícone-em-caixinha `h-10 w-10 rounded-xl bg-brand/10 text-brand` + título `font-display text-2xl font-bold` + subtítulo `text-sm text-text-muted`.
- **Largura por área** (`AppLayout` decide pela rota): Administração `max-w-6xl` (listas densas); participante/forms `max-w-3xl`.
- **Lista densa (admin):** linhas com `divide-y`, `hover:bg-surface/50`, altura confortável; empilha em card no mobile (nunca scroll horizontal).
- **Sub-nav admin:** rail lateral em `lg+`, barra rolável em `<lg`.

## Interação & a11y
- Foco único: classe `.foco` ou `focus-visible:ring-2 ring-brand ring-offset-2 ring-offset-background`.
- Toque ≥44px; `cursor-pointer` em clicáveis; micro-interações 150–300ms; `prefers-reduced-motion` desliga animações (bloco global no index.css).
- Contraste AA (light e dark testados). Cor nunca é o único indicador (chip = cor+ícone+texto).
- Ações destrutivas (Recusar/Excluir/Desativar) em `--danger`, com confirmação (`ConfirmDialog`).
- `framer-motion` para entrada (fade+y) e overlays; `role`/`aria` corretos em Tabs/Combobox/RoleSelect/Modal/Popover.

## Formulários (fugir do "Google Forms")
Seções com título; labels visíveis + placeholder de exemplo; máscara (CEP/telefone); helper text;
um CTA primário por tela; `Checkbox` para revelar seções (progressive disclosure); `Toast` de sucesso.

## Anti-padrões (proibido)
Emoji como ícone; hex cru em componente; placeholder como único label; scroll horizontal no mobile;
remover focus ring; chip sem ícone/texto; formulão sem seções; trocar a marca prata; trocar Inter/Sora.
