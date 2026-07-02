# iCélula — Design System (MASTER)

Fonte de verdade visual. Tokens implementados em `apps/web/src/index.css` (CSS variables + Tailwind v4 `@theme inline`).

## Marca
- Primary Orange: `#E56A22` (`--brand`)
- Hover Orange: `#C95518` (`--brand-hover`)
- Soft Orange: `#F59A63` (`--brand-soft`)
- On Brand (texto sobre laranja): `#FFFFFF`

## Light Mode
| Token | Hex |
|---|---|
| `--background` | #FFFFFF |
| `--surface` | #F8F8F8 |
| `--card` | #FFFFFF |
| `--border` | #ECECEC |
| `--text` | #1A1A1A |
| `--text-muted` | #666666 |

## Dark Mode (Deep Graphite Purple)
| Token | Hex |
|---|---|
| `--background` | #1B1824 |
| `--surface` | #242031 |
| `--card` | #2D2838 |
| `--border` | #3A3448 |
| `--text` | #FFFFFF |
| `--text-muted` | #B9B3C9 |

Accent laranja em ambos os temas. Alternância por classe `.dark` no `<html>` (ThemeContext, persiste em localStorage, respeita `prefers-color-scheme`).

## Tipografia
- Títulos: **Sora** (`--font-display`)
- Corpo: **Inter** (`--font-sans`)
- Base 16px, line-height 1.5.

## Componentes
- Cards arredondados 16px (`--radius-card`), sombra suave.
- Botões: altura 48px, raio 12px, variantes `primary` / `secondary` / `ghost`, micro-scale no active, foco visível (ring laranja).
- Inputs: 48px, foco com ring, toggle de mostrar/ocultar senha, erro abaixo do campo (role="alert").
- Ícones: **lucide-react** (stroke consistente), nunca emoji estrutural.
- Estados: skeleton loading (landing), empty/"Em breve" tags, transições 150–300ms.

## Princípios (estilo "Accessible & Ethical")
- Contraste AA (4.5:1), focus rings visíveis, navegação por teclado, `prefers-reduced-motion` respeitado.
- Mobile-first; breakpoints 375 / 768 / 1024 / 1440.
- Cor nunca é o único indicador de estado.

## Estética
SaaS moderno, acolhedor e caloroso — inspirado no app "Sara". Brilho sutil da marca no topo das telas de auth.
