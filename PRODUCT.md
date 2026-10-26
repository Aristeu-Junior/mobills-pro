# PRODUCT.md — Mobills Pro (Gestão Financeira Pessoal Completa)

## Product Overview
Plataforma web full-stack de controle financeiro pessoal e planejamento orçamentário inspirada nas funcionalidades completas do Mobills. Permite centralizar contas bancárias, carteiras físicas, cartões de crédito e faturas, transações simples/fixas/parceladas, transferências, categorias e subcategorias, tags, planejamento mensal por categoria (orçamentos com alertas), objetivos financeiros (metas com aportes) e relatórios analíticos, além de importação e exportação CSV/OFX.

## Target Audience & Use Scene
- **Quem:** Pessoas físicas e famílias brasileiras que buscam controle rigoroso e rápido de seu fluxo de caixa mensal, limites de cartão de crédito e metas de economia.
- **Cenário de Uso:** Uso diário/semanal em desktop e mobile para lançar despesas rápidas, conferir faturas abertas, auditar estouros de orçamento por categoria e acompanhar a evolução patrimonial.
- **Modo Impeccable:** `Operate` — escaneabilidade imediata, números tabulares (`tabular-nums`), densidade informacional equilibrada, atalhos claros para lançamento rápido e zero fricção.

## Core Modules
1. **Autenticação & Perfil:** Login com E-mail/Senha (sessão JWT HTTP-only) + suporte a Login com Google OAuth, modo de privacidade (ocultar valores `R$ ••••`).
2. **Contas & Reajuste de Saldo:** Contas correntes, poupança, carteira e investimentos com saldo inicial, saldo atual calculado, soma na tela inicial e reajuste imediato.
3. **Transações (Receitas, Despesas e Transferências):** Efetivadas ou pendentes, fixas/recorrentes ou parceladas (`1/N`), categorizadas com subcategorias e múltiplas tags.
4. **Cartões de Crédito & Motor de Faturas:** Limite total, limite disponível em tempo real, fechamento e vencimento automáticos, visualização de faturas mensais e pagamento integral/parcial debitando da conta escolhida.
5. **Planejamento Mensal (Orçamentos):** Teto de gastos por categoria no mês com barra de progresso e alertas visuais (<80% normal, 80-99% atenção, >=100% estourado).
6. **Objetivos Financeiros:** Metas com valor alvo, prazo, histórico de depósitos/aportes e cálculo de economia mensal necessária.
7. **Relatórios, Gráficos & Importação/Exportação:** Fluxo de caixa semestral, distribuição por categoria/tag/conta e importação/exportação em CSV e OFX.
