# DESIGN.md — Mobills Pro Design System

## Visual Direction & World
- **Surface Mode:** `Operate` (Financial Ledger & Personal Wealth Cockpit)
- **Aesthetic Archetype:** Editorial Swiss Ledger — inspirado em terminais financeiros modernos (Mercury, Wise, Linear). Superfícies claras de papel técnico (`#F8FAFC` / `#FFFFFF`) com tinta ardósia profunda (`#0F172A`), verde esmeralda financeiro (`#059669`) para entradas/liquidez, âmbar (`#D97706`) para alertas de orçamento e carmesim (`#DC2626`) para saídas e limites excedidos.
- **Typography:**
  - UI & Corpo: `'Plus Jakarta Sans'`, system-ui, sans-serif.
  - Dados Financeiros & Valores (`R$`): `font-variant-numeric: tabular-nums` obrigatório em todas as tabelas, saldos, faturas e indicadores.
  - Títulos diretos sem kickers/eyebrows acima de headings (`craft-floor` compliance).
- **Layout & Structure:**
  - Navegação lateral fixa no desktop (`260px`) com seletor global de competência (`Mês / Ano`) no topo e botão de ação primária (`+ Novo Lançamento`).
  - Tabelas semânticas responsivas com `@container` queries e cabeçalhos `sticky`.
  - Diálogos nativos `<dialog closedby="any">` abertos via `.showModal()` com light-dismiss e fallback de coordenadas.
  - Validação de formulários pós-interação via `:user-invalid` e `:user-valid` sincronizados com `aria-invalid`.
