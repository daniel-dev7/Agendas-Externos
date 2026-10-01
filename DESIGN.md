# DESIGN.md — Agendas Externos

## Direção visual
Dashboard operacional para gestão de agendas de Ressonância e clínicas parceiras. A interface deve transmitir precisão, confiança e velocidade de operação, evitando estética hospitalar genérica.

## Tokens
- Primary: #155EEF
- Primary dark: #0B4BC1
- Ink: #101828
- Muted: #667085
- Surface: #FFFFFF
- Canvas: #F4F7FB
- Border: #E4EAF2
- Success: #067647
- Warning: #B54708
- Danger: #B42318
- Radius: 16px cards, 11px controls
- Display/body: Inter/system sans stack
- Shadow: subtle, used for elevated operational surfaces only

## Layout
- Desktop: compact navigation rail/sidebar + wide operational content.
- Dashboard: greeting/hero, primary metrics, operational overview, quick actions.
- Mobile: navigation becomes horizontal; cards collapse to one column.

## Interaction
- Primary actions use solid blue.
- Navigation uses active blue tint, never color alone.
- Loading and errors preserve layout geometry.
- Icon-only controls require accessible labels.
- Respect reduced motion.

## Content voice
Portuguese (Brazil), concise, operational, action-oriented.
Use terms such as "Agendas", "Clínicas", "Usuários", "Abrir agenda", "Nova clínica".
