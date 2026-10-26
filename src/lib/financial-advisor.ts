// ============================================================================
// MOBILLS PRO — MOTOR DE CONSULTORIA FINANCEIRA & COACH PESSOAL COM IA
// Análise contextual completa: saldos, faturas futuras, regras 50/30/20 e Safe-to-Spend
// ============================================================================

export interface FinancialHealthReport {
  score: number; // 0 a 100
  scoreLabel: string;
  liquidBalance: number;
  totalIncome: number;
  totalExpenses: number;
  currentSurplus: number;
  savingsRate: number; // %
  safeToSpendDaily: number; // R$ por dia seguro até o fim do mês
  daysRemainingInMonth: number;
  nextMonthCommitments: {
    totalEstimated: number;
    cardsTotal: number;
    cardsBreakdown: { cardName: string; amount: number; dueDate: string }[];
    fixedExpenses: number;
  };
  rule503020: {
    needs: { currentPct: number; targetPct: number; currentAmount: number; status: "ok" | "warning" | "danger" };
    wants: { currentPct: number; targetPct: number; currentAmount: number; status: "ok" | "warning" | "danger" };
    savings: { currentPct: number; targetPct: number; currentAmount: number; status: "ok" | "warning" | "danger" };
  };
  alerts: {
    id: string;
    level: "info" | "warning" | "danger" | "success";
    title: string;
    description: string;
    actionLabel?: string;
  }[];
  topSpendingCategories: {
    name: string;
    spent: number;
    budget: number;
    pct: number;
  }[];
}

export interface PurchaseSimulationInput {
  description: string;
  amount: number;
  paymentMethod: "cash" | "card_installments";
  installmentsCount: number; // 1 a 12
  selectedAccountId?: string;
  selectedCardId?: string;
  categoryId?: string;
}

export interface PurchaseSimulationResult {
  verdict: "SAFE" | "CAUTION" | "CRITICAL";
  verdictTitle: string;
  verdictDescription: string;
  score: number; // 0 to 100
  installmentAmount: number;
  impactCurrentMonth: number;
  impactNextMonth: number;
  liquidBalanceAfter: number;
  safeToSpendAfter: number;
  recommendations: string[];
}

// ----------------------------------------------------------------------------
// 1. Diagnóstico Geral de Saúde Financeira (Full Context)
// ----------------------------------------------------------------------------
export function analyzeFinancialHealth(snapshot: any): FinancialHealthReport {
  const accounts: any[] = snapshot?.accounts || [];
  const creditCards: any[] = snapshot?.creditCards || [];
  const categories: any[] = snapshot?.categories || [];
  const transactions: any[] = snapshot?.transactions || [];
  const summary = snapshot?.summary || {};

  // Saldo líquido (contas bancárias e dinheiro)
  const liquidBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  const totalIncome = summary?.totalIncome || 0;
  const totalExpenses = summary?.totalExpenses || 0;
  const currentSurplus = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((currentSurplus / totalIncome) * 100)) : 0;

  // Dias restantes no mês atual
  const today = new Date();
  const year = snapshot?.period?.year || today.getFullYear();
  const month = snapshot?.period?.month || today.getMonth() + 1;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const currentDay = today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : 15;
  const daysRemaining = Math.max(1, lastDayOfMonth - currentDay + 1);

  // Faturas e compromissos futuros
  const cardsBreakdown = creditCards.map((c) => ({
    cardName: c.name,
    amount: c.currentInvoice || 0,
    dueDate: `Dia ${c.dueDay || 10}`,
  }));
  const cardsTotal = cardsBreakdown.reduce((s, c) => s + c.amount, 0);

  // Despesas fixas estimadas
  const fixedExpenses = transactions
    .filter((t) => t.type === "expense" && (t.isFixed || t.isRecurring))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const nextMonthTotal = cardsTotal + fixedExpenses;

  // Safe-to-Spend diário: sobra líquida projetada dividida pelos dias restantes
  const targetSavingsReserve = totalIncome * 0.2; // 20% guardado
  const availableToSpendUntilMonthEnd = Math.max(0, currentSurplus - targetSavingsReserve);
  const safeToSpendDaily = Math.max(0, availableToSpendUntilMonthEnd / daysRemaining);

  // Categorias que mais gastaram
  const topCategories = categories
    .filter((c) => c.type === "expense")
    .map((c) => {
      const budget = c.budget || 0;
      const spent = c.spent || 0;
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      return { name: c.name, spent, budget, pct };
    })
    .sort((a, b) => b.spent - a.spent);

  // 50/30/20 Breakdown
  const needsKeywords = ["moradia", "aluguel", "mercado", "supermercado", "alimentação", "saúde", "transporte", "contas", "energia", "água"];
  const wantsKeywords = ["lazer", "restaurante", "shopping", "compras", "viagem", "streaming", "assinatura", "bares"];

  let needsAmount = 0;
  let wantsAmount = 0;

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const catName = (t.category?.name || "").toLowerCase();
      const isNeeds = needsKeywords.some((k) => catName.includes(k));
      const isWants = wantsKeywords.some((k) => catName.includes(k));
      if (isNeeds) needsAmount += t.amount || 0;
      else if (isWants) wantsAmount += t.amount || 0;
      else needsAmount += (t.amount || 0) * 0.6; // fallback distribuído
    });

  const needsPct = totalIncome > 0 ? Math.round((needsAmount / totalIncome) * 100) : 0;
  const wantsPct = totalIncome > 0 ? Math.round((wantsAmount / totalIncome) * 100) : 0;
  const savingsPct = savingsRate;

  // Alertas proativos inteligentes
  const alerts: FinancialHealthReport["alerts"] = [];

  // Alerta 1: Faturas de cartão
  creditCards.forEach((c) => {
    if ((c.currentInvoice || 0) > 0) {
      alerts.push({
        id: `card-${c.id}`,
        level: c.currentInvoice > liquidBalance * 0.7 ? "warning" : "info",
        title: `Fatura ${c.name}: R$ ${c.currentInvoice.toFixed(2).replace(".", ",")}`,
        description: `Vencimento programado para o dia ${c.dueDay}. Saldo em conta suficiente para quitação integral sem juros rotativos.`,
      });
    }
  });

  // Alerta 2: Tetos de categoria
  topCategories.forEach((cat) => {
    if (cat.budget > 0 && cat.pct >= 85) {
      alerts.push({
        id: `cat-${cat.name}`,
        level: cat.pct >= 100 ? "danger" : "warning",
        title: `Teto de ${cat.name}: ${cat.pct}% consumido`,
        description: `Você já utilizou R$ ${cat.spent.toFixed(2).replace(".", ",")} dos R$ ${cat.budget.toFixed(2).replace(".", ",")} orçados para este mês.`,
      });
    }
  });

  // Alerta 3: Safe-to-Spend
  alerts.push({
    id: "safe-to-spend",
    level: safeToSpendDaily < 30 ? "warning" : "success",
    title: `Gasto Seguro: R$ ${safeToSpendDaily.toFixed(2).replace(".", ",")}/dia`,
    description: `Manter seus gastos diários médios abaixo deste valor garante fechamento no verde e preservação da meta de poupança (${savingsRate}%).`,
  });

  // Cálculo de Score 0 a 100
  let score = 70;
  if (savingsRate >= 20) score += 15;
  else if (savingsRate >= 10) score += 8;
  else score -= 10;

  if (cardsTotal > liquidBalance) score -= 15;
  if (topCategories.some((c) => c.pct > 105)) score -= 10;
  if (liquidBalance > totalExpenses * 2) score += 15;

  score = Math.max(15, Math.min(99, score));
  let scoreLabel = "Estabilidade Financeira Boa";
  if (score >= 85) scoreLabel = "Excelente Disciplina Financeira";
  else if (score < 60) scoreLabel = "Atenção Necessária ao Orçamento";

  return {
    score,
    scoreLabel,
    liquidBalance,
    totalIncome,
    totalExpenses,
    currentSurplus,
    savingsRate,
    safeToSpendDaily,
    daysRemainingInMonth: daysRemaining,
    nextMonthCommitments: {
      totalEstimated: nextMonthTotal,
      cardsTotal,
      cardsBreakdown,
      fixedExpenses,
    },
    rule503020: {
      needs: {
        currentPct: needsPct,
        targetPct: 50,
        currentAmount: needsAmount,
        status: needsPct > 55 ? "warning" : "ok",
      },
      wants: {
        currentPct: wantsPct,
        targetPct: 30,
        currentAmount: wantsAmount,
        status: wantsPct > 35 ? "warning" : "ok",
      },
      savings: {
        currentPct: savingsPct,
        targetPct: 20,
        currentAmount: currentSurplus,
        status: savingsPct >= 20 ? "ok" : "warning",
      },
    },
    alerts,
    topSpendingCategories: topCategories.slice(0, 5),
  };
}

// ----------------------------------------------------------------------------
// 2. Simulador Interativo de Compra: "Posso Comprar?"
// ----------------------------------------------------------------------------
export function simulatePurchase(
  snapshot: any,
  input: PurchaseSimulationInput
): PurchaseSimulationResult {
  const health = analyzeFinancialHealth(snapshot);
  const amount = Math.max(0, input.amount);
  const installments = Math.max(1, input.installmentsCount || 1);
  const installmentAmount = amount / installments;

  const isCash = input.paymentMethod === "cash" || installments === 1;
  const impactCurrentMonth = isCash ? amount : installmentAmount;
  const impactNextMonth = isCash ? 0 : installmentAmount;

  const liquidBalanceAfter = Math.max(0, health.liquidBalance - (isCash ? amount : 0));
  const surplusAfter = health.currentSurplus - impactCurrentMonth;
  const safeToSpendAfter = Math.max(0, (surplusAfter - (health.totalIncome * 0.2)) / health.daysRemainingInMonth);

  const recommendations: string[] = [];
  let score = 85;

  // Avaliação 1: Saldo Líquido
  if (isCash) {
    if (amount > health.liquidBalance) {
      score -= 50;
      recommendations.push(`Saldo insuficiente em conta (R$ ${health.liquidBalance.toFixed(2)}). Comprar à vista levaria a saldo negativo.`);
    } else if (amount > health.liquidBalance * 0.5) {
      score -= 25;
      recommendations.push(`Esta compra à vista consome mais de 50% de todo o seu saldo líquido bancário.`);
    } else {
      recommendations.push(`Saldo em conta confortável para absorver o valor à vista de R$ ${amount.toFixed(2)}.`);
    }
  }

  // Avaliação 2: Faturas e Próximo Mês
  if (!isCash) {
    const nextMonthTotalWithPurchase = health.nextMonthCommitments.totalEstimated + installmentAmount;
    const incomeCommitmentPct = health.totalIncome > 0 ? (nextMonthTotalWithPurchase / health.totalIncome) * 100 : 0;

    if (incomeCommitmentPct > 70) {
      score -= 30;
      recommendations.push(`Atenção: A parcela de R$ ${installmentAmount.toFixed(2)} elevará o comprometimento de renda do próximo mês para ${incomeCommitmentPct.toFixed(1)}%.`);
    } else {
      recommendations.push(`A parcela de R$ ${installmentAmount.toFixed(2)} em ${installments}x cabe dentro da sua margem de cartão sem sufocar o fluxo de caixa.`);
    }
  }

  // Avaliação 3: Impacto no Safe-to-Spend diário
  if (safeToSpendAfter < 15 && health.safeToSpendDaily >= 25) {
    score -= 20;
    recommendations.push(`Seu gasto diário seguro cairia de R$ ${health.safeToSpendDaily.toFixed(2)}/dia para apenas R$ ${safeToSpendAfter.toFixed(2)}/dia até o fim do mês.`);
  }

  // Veredito
  let verdict: "SAFE" | "CAUTION" | "CRITICAL" = "SAFE";
  let verdictTitle = "Compra Segura e Aprovada!";
  let verdictDescription = "Esta despesa cabe perfeitamente no seu planejamento sem comprometer suas metas ou fluxo de caixa futuro.";

  if (score < 50 || (isCash && amount > health.liquidBalance)) {
    verdict = "CRITICAL";
    verdictTitle = "Compra de Alto Risco (Desaconselhada)";
    verdictDescription = "Esta aquisição no momento comprometerá sua liquidez imediata ou aumentará perigosamente as faturas do próximo mês.";
  } else if (score < 75) {
    verdict = "CAUTION";
    verdictTitle = "Compra Viável com Atenção";
    verdictDescription = "É possível realizar a compra, mas recomendamos contenção em outras categorias de lazer para compensar o desembolso.";
  }

  return {
    verdict,
    verdictTitle,
    verdictDescription,
    score,
    installmentAmount,
    impactCurrentMonth,
    impactNextMonth,
    liquidBalanceAfter,
    safeToSpendAfter,
    recommendations,
  };
}

// ----------------------------------------------------------------------------
// 3. Processamento de Perguntas em Linguagem Natural para o Consultor
// ----------------------------------------------------------------------------
export interface ConsultantChatMessage {
  id: string;
  sender: "user" | "advisor";
  text: string;
  timestamp: string;
  actionRequired?: {
    type: "create_transaction" | "show_report" | "open_simulator";
    payload?: any;
  };
}

export function answerConsultantQuestion(
  question: string,
  snapshot: any
): ConsultantChatMessage {
  const q = question.toLowerCase().trim();
  const health = analyzeFinancialHealth(snapshot);
  const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // 1. Dúvidas sobre "Posso comprar..."
  if (q.includes("posso comprar") || q.includes("dá para comprar") || q.includes("consigo comprar") || q.includes("devo comprar")) {
    const numbers = q.match(/\d+(?:[.,]\d{1,2})?/g);
    const amountFound = numbers ? parseFloat(numbers[0].replace(",", ".")) : 0;

    if (amountFound > 0) {
      const isInstallment = q.includes("vezes") || q.includes("parcela") || q.includes("x");
      const sim = simulatePurchase(snapshot, {
        description: "Simulação por chat",
        amount: amountFound,
        paymentMethod: isInstallment ? "card_installments" : "cash",
        installmentsCount: isInstallment ? 3 : 1,
      });

      const responseText = `🔍 **Análise do Consultor para R$ ${amountFound.toFixed(2).replace(".", ",")}:**\n\n` +
        `**Veredito:** ${sim.verdict === "SAFE" ? "🟢 Compra Segura" : sim.verdict === "CAUTION" ? "🟡 Viável com Atenção" : "🔴 Desaconselhada no Momento"}\n\n` +
        `• **Saldo Líquido:** R$ ${health.liquidBalance.toFixed(2).replace(".", ",")}\n` +
        `• **Faturas Futuras Previstas:** R$ ${health.nextMonthCommitments.totalEstimated.toFixed(2).replace(".", ",")}\n` +
        `• **Gasto Diário Seguro Atual:** R$ ${health.safeToSpendDaily.toFixed(2).replace(".", ",")}/dia\n\n` +
        `💡 *Recomendação:* ${sim.recommendations.join(" ")}`;

      return {
        id: `msg-${Date.now()}`,
        sender: "advisor",
        text: responseText,
        timestamp: now,
      };
    }

    return {
      id: `msg-${Date.now()}`,
      sender: "advisor",
      text: "Com certeza posso avaliar para você! Qual é o valor aproximado do que você quer comprar e pretende pagar à vista no Inter ou parcelar no cartão?",
      timestamp: now,
      actionRequired: { type: "open_simulator" },
    };
  }

  // 2. Registro rápido por chat ("Gastei 45 no almoço", "Paguei 120 de gasolina")
  if (q.startsWith("gastei") || q.startsWith("paguei") || q.startsWith("lancei") || q.startsWith("comprei")) {
    const numbers = q.match(/\d+(?:[.,]\d{1,2})?/g);
    const amount = numbers ? parseFloat(numbers[0].replace(",", ".")) : 0;

    if (amount > 0) {
      let description = question.replace(/^(gastei|paguei|lancei|comprei)\s+/i, "").trim();
      return {
        id: `msg-${Date.now()}`,
        sender: "advisor",
        text: `Entendido! Identifiquei um gasto de **R$ ${amount.toFixed(2).replace(".", ",")}** (${description || "Despesa"}).\n\n` +
          `Deseja que eu confirme o lançamento imediatamente no seu Banco Inter?`,
        timestamp: now,
        actionRequired: {
          type: "create_transaction",
          payload: {
            amount,
            description: description || "Despesa informada ao Consultor",
            type: "expense",
          },
        },
      };
    }
  }

  // 3. Faturas futuras / Próximo mês
  if (q.includes("próximo mês") || q.includes("proximo mes") || q.includes("fatura") || q.includes("faturas") || q.includes("quanto vou pagar")) {
    const cardsList = health.nextMonthCommitments.cardsBreakdown
      .map((c) => `• **${c.cardName}:** R$ ${c.amount.toFixed(2).replace(".", ",")} (${c.dueDate})`)
      .join("\n");

    const text = `📊 **Compromissos Mapeados para o Próximo Mês:**\n\n` +
      `${cardsList || "• Nenhuma fatura de cartão aberta no momento."}\n\n` +
      `• **Total em Cartões:** R$ ${health.nextMonthCommitments.cardsTotal.toFixed(2).replace(".", ",")}\n` +
      `• **Despesas Fixas Agendadas:** R$ ${health.nextMonthCommitments.fixedExpenses.toFixed(2).replace(".", ",")}\n` +
      `• **Comprometimento Total Estimado:** R$ ${health.nextMonthCommitments.totalEstimated.toFixed(2).replace(".", ",")}\n\n` +
      `💡 *Dica do Coach:* Seu saldo líquido atual de R$ ${health.liquidBalance.toFixed(2).replace(".", ",")} ${
        health.liquidBalance >= health.nextMonthCommitments.totalEstimated
          ? "cobre integralmente todos esses compromissos com folga!"
          : "precisará ser complementado com os próximos recebimentos antes do vencimento."
      }`;

    return {
      id: `msg-${Date.now()}`,
      sender: "advisor",
      text,
      timestamp: now,
    };
  }

  // 4. Safe-to-Spend / Quanto posso gastar
  if (q.includes("posso gastar") || q.includes("gasto diário") || q.includes("safe to spend") || q.includes("limite por dia")) {
    const text = `🎯 **Seu Gasto Seguro Atual (Safe-to-Spend):**\n\n` +
      `Você pode gastar em média **R$ ${health.safeToSpendDaily.toFixed(2).replace(".", ",")} por dia** até o final deste mês.\n\n` +
      `• **Dias restantes no mês:** ${health.daysRemainingInMonth} dias\n` +
      `• **Sobra orçamentária projetada:** R$ ${health.currentSurplus.toFixed(2).replace(".", ",")}\n` +
      `• **Reserva de Poupança (20% mantida):** R$ ${(health.totalIncome * 0.2).toFixed(2).replace(".", ",")}\n\n` +
      `Gastando dentro desta média diária, você fecha o mês 100% no azul e mantém sua taxa de economia de ${health.savingsRate}%.`;

    return {
      id: `msg-${Date.now()}`,
      sender: "advisor",
      text,
      timestamp: now,
    };
  }

  // 5. Diagnóstico geral
  const topCatSummary = health.topSpendingCategories
    .slice(0, 3)
    .map((c) => `• ${c.name}: R$ ${c.spent.toFixed(2).replace(".", ",")} (${c.pct}% do teto)`)
    .join("\n");

  const defaultText = `👋 Olá! Sou o seu **Consultor Financeiro Pessoal Mobills** com visão 360° da sua carteira.\n\n` +
    `Aqui está seu panorama em tempo real:\n` +
    `• **Score de Saúde Financeira:** ${health.score}/100 (${health.scoreLabel})\n` +
    `• **Saldo Líquido em Caixa:** R$ ${health.liquidBalance.toFixed(2).replace(".", ",")}\n` +
    `• **Gasto Diário Seguro:** R$ ${health.safeToSpendDaily.toFixed(2).replace(".", ",")}/dia\n` +
    `• **Faturas em Aberto:** R$ ${health.nextMonthCommitments.cardsTotal.toFixed(2).replace(".", ",")}\n\n` +
    `📌 **Principais Despesas:**\n${topCatSummary}\n\n` +
    `Como posso te ajudar agora? Você pode me perguntar se pode comprar algo, registrar um gasto ou pedir simulações!`;

  return {
    id: `msg-${Date.now()}`,
    sender: "advisor",
    text: defaultText,
    timestamp: now,
  };
}
