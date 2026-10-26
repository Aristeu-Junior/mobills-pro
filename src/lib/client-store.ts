const STORAGE_KEY = "mobills_pro_store_v1";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
}

export function getStandardCategories() {
  return [
    { id: "cat_sal", parentId: null, name: "Salário", type: "income", color: "#059669", icon: "briefcase" },
    { id: "cat_free", parentId: null, name: "Projetos & Freelance", type: "income", color: "#0D9488", icon: "laptop" },
    { id: "cat_div", parentId: null, name: "Rendimentos & Dividendos", type: "income", color: "#2563EB", icon: "trending-up" },
    { id: "cat_outras_rec", parentId: null, name: "Outras Receitas", type: "income", color: "#10B981", icon: "arrow-down-left" },
    { id: "cat_house", parentId: null, name: "Moradia", type: "expense", color: "#4F46E5", icon: "home" },
    { id: "cat_rent", parentId: "cat_house", name: "Aluguel & Condomínio", type: "expense", color: "#4F46E5", icon: "home" },
    { id: "cat_util", parentId: "cat_house", name: "Energia, Água & Fibra", type: "expense", color: "#4F46E5", icon: "zap" },
    { id: "cat_food", parentId: null, name: "Alimentação", type: "expense", color: "#E11D48", icon: "utensils" },
    { id: "cat_market", parentId: "cat_food", name: "Supermercado", type: "expense", color: "#E11D48", icon: "shopping-cart" },
    { id: "cat_rest", parentId: "cat_food", name: "Restaurantes & Delivery", type: "expense", color: "#E11D48", icon: "utensils" },
    { id: "cat_trans", parentId: null, name: "Transporte", type: "expense", color: "#D97706", icon: "car" },
    { id: "cat_fuel", parentId: "cat_trans", name: "Combustível & Pedágio", type: "expense", color: "#D97706", icon: "car" },
    { id: "cat_uber", parentId: "cat_trans", name: "Apps de Mobilidade", type: "expense", color: "#D97706", icon: "navigation" },
    { id: "cat_leisure", parentId: null, name: "Lazer & Assinaturas", type: "expense", color: "#7C3AED", icon: "film" },
    { id: "cat_stream", parentId: "cat_leisure", name: "Streaming & Software", type: "expense", color: "#7C3AED", icon: "tv" },
    { id: "cat_health", parentId: null, name: "Saúde & Bem-estar", type: "expense", color: "#0891B2", icon: "heart-pulse" },
    { id: "cat_edu", parentId: null, name: "Educação & Livros", type: "expense", color: "#2563EB", icon: "graduation-cap" },
    { id: "cat_vestuario", parentId: null, name: "Vestuário & Compras", type: "expense", color: "#DB2777", icon: "shirt" },
  ];
}

export function getCleanZeroedData() {
  return {
    user: {
      id: "usr_me",
      name: "Minha Conta Mobills",
      email: "minhasfinancas@mobills.app",
      currency: "BRL",
      hideBalances: false,
    },
    accounts: [],
    creditCards: [],
    invoices: [],
    categories: getStandardCategories(),
    tags: [
      { id: "tag_ess", name: "essencial", color: "#0F172A" },
      { id: "tag_work", name: "trabalho", color: "#2563EB" },
      { id: "tag_reemb", name: "reembolsavel", color: "#059669" },
      { id: "tag_fam", name: "familia", color: "#7C3AED" },
      { id: "tag_sub", name: "assinatura", color: "#D97706" },
    ],
    transactions: [],
    budgets: [],
    goals: [],
  };
}

export function getInitialSeedData() {
  const now = new Date().toISOString();
  return {
    user: {
      id: "usr_demo",
      name: "Aristeu Junior",
      email: "demo@mobills.local",
      currency: "BRL",
      hideBalances: false,
    },
    accounts: [
      {
        id: "acc_nubank",
        name: "Conta Nubank",
        institution: "Nubank",
        type: "checking",
        color: "#7C3AED",
        initialBalance: 4850.0,
        includeInSummary: true,
        archived: false,
      },
      {
        id: "acc_itau",
        name: "Itaú Uniclass",
        institution: "Itaú",
        type: "checking",
        color: "#EA580C",
        initialBalance: 3200.0,
        includeInSummary: true,
        archived: false,
      },
      {
        id: "acc_inter",
        name: "Reserva CDB Inter",
        institution: "Banco Inter",
        type: "investment",
        color: "#D97706",
        initialBalance: 15000.0,
        includeInSummary: true,
        archived: false,
      },
      {
        id: "acc_wallet",
        name: "Carteira Física",
        institution: "Dinheiro",
        type: "wallet",
        color: "#059669",
        initialBalance: 280.0,
        includeInSummary: true,
        archived: false,
      },
    ],
    creditCards: [
      {
        id: "card_nubank",
        accountId: "acc_nubank",
        name: "Nubank Ultravioleta",
        brand: "Mastercard",
        color: "#6D28D9",
        limitAmount: 12000.0,
        closingDay: 25,
        dueDay: 2,
        archived: false,
      },
      {
        id: "card_itau",
        accountId: "acc_itau",
        name: "Itaú Personnalité Visa",
        brand: "Visa",
        color: "#C2410C",
        limitAmount: 18000.0,
        closingDay: 18,
        dueDay: 25,
        archived: false,
      },
    ],
    invoices: [
      {
        id: "inv_nu_10",
        creditCardId: "card_nubank",
        month: 10,
        year: 2026,
        status: "open",
        paidAmount: 0,
      },
      {
        id: "inv_itau_10",
        creditCardId: "card_itau",
        month: 10,
        year: 2026,
        status: "open",
        paidAmount: 0,
      },
    ],
    categories: [
      { id: "cat_sal", parentId: null, name: "Salário", type: "income", color: "#059669", icon: "briefcase" },
      { id: "cat_free", parentId: null, name: "Projetos & Freelance", type: "income", color: "#0D9488", icon: "laptop" },
      { id: "cat_div", parentId: null, name: "Rendimentos & Dividendos", type: "income", color: "#2563EB", icon: "trending-up" },
      { id: "cat_house", parentId: null, name: "Moradia", type: "expense", color: "#4F46E5", icon: "home" },
      { id: "cat_rent", parentId: "cat_house", name: "Aluguel & Condomínio", type: "expense", color: "#4F46E5", icon: "home" },
      { id: "cat_util", parentId: "cat_house", name: "Energia, Água & Fibra", type: "expense", color: "#4F46E5", icon: "zap" },
      { id: "cat_food", parentId: null, name: "Alimentação", type: "expense", color: "#E11D48", icon: "utensils" },
      { id: "cat_market", parentId: "cat_food", name: "Supermercado", type: "expense", color: "#E11D48", icon: "shopping-cart" },
      { id: "cat_rest", parentId: "cat_food", name: "Restaurantes & Delivery", type: "expense", color: "#E11D48", icon: "utensils" },
      { id: "cat_trans", parentId: null, name: "Transporte", type: "expense", color: "#D97706", icon: "car" },
      { id: "cat_fuel", parentId: "cat_trans", name: "Combustível & Pedágio", type: "expense", color: "#D97706", icon: "car" },
      { id: "cat_uber", parentId: "cat_trans", name: "Apps de Mobilidade", type: "expense", color: "#D97706", icon: "navigation" },
      { id: "cat_leisure", parentId: null, name: "Lazer & Assinaturas", type: "expense", color: "#7C3AED", icon: "film" },
      { id: "cat_stream", parentId: "cat_leisure", name: "Streaming & Software", type: "expense", color: "#7C3AED", icon: "tv" },
      { id: "cat_health", parentId: null, name: "Saúde & Bem-estar", type: "expense", color: "#0891B2", icon: "heart-pulse" },
      { id: "cat_edu", parentId: null, name: "Educação & Livros", type: "expense", color: "#2563EB", icon: "graduation-cap" },
    ],
    tags: [
      { id: "tag_ess", name: "essencial", color: "#0F172A" },
      { id: "tag_work", name: "trabalho", color: "#2563EB" },
      { id: "tag_reemb", name: "reembolsavel", color: "#059669" },
      { id: "tag_fam", name: "familia", color: "#7C3AED" },
      { id: "tag_sub", name: "assinatura", color: "#D97706" },
    ],
    transactions: [
      {
        id: "tx_sal_10",
        accountId: "acc_itau",
        destinationAccountId: null,
        creditCardId: null,
        invoiceId: null,
        categoryId: "cat_sal",
        description: "Salário Outubro (Líquido)",
        amount: 12500.0,
        date: "2026-10-05",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "income",
        status: "completed",
        isFixed: true,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["trabalho"],
        notes: "Depósito em conta",
      },
      {
        id: "tx_free_10",
        accountId: "acc_nubank",
        destinationAccountId: null,
        creditCardId: null,
        invoiceId: null,
        categoryId: "cat_free",
        description: "Projeto Plataforma Web (Parcela 2/2)",
        amount: 3400.0,
        date: "2026-10-18",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "income",
        status: "completed",
        isFixed: false,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["trabalho"],
        notes: "NF emitida",
      },
      {
        id: "tx_div_10",
        accountId: "acc_inter",
        destinationAccountId: null,
        creditCardId: null,
        invoiceId: null,
        categoryId: "cat_div",
        description: "Dividendos FIIs & Rendimento CDB",
        amount: 645.8,
        date: "2026-10-20",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "income",
        status: "completed",
        isFixed: true,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["essencial"],
        notes: null,
      },
      {
        id: "tx_rent_10",
        accountId: "acc_itau",
        destinationAccountId: null,
        creditCardId: null,
        invoiceId: null,
        categoryId: "cat_rent",
        description: "Aluguel + Condomínio Outubro",
        amount: 3150.0,
        date: "2026-10-10",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "expense",
        status: "completed",
        isFixed: true,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["essencial", "familia"],
        notes: null,
      },
      {
        id: "tx_util_10",
        accountId: "acc_itau",
        destinationAccountId: null,
        creditCardId: null,
        invoiceId: null,
        categoryId: "cat_util",
        description: "Energia Elétrica + Internet Fibra 1Gb",
        amount: 412.9,
        date: "2026-10-14",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "expense",
        status: "completed",
        isFixed: true,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["essencial"],
        notes: null,
      },
      {
        id: "tx_mkt_10",
        accountId: "acc_nubank",
        destinationAccountId: null,
        creditCardId: null,
        invoiceId: null,
        categoryId: "cat_market",
        description: "Atacadão & Feira Semanal",
        amount: 1420.5,
        date: "2026-10-16",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "expense",
        status: "completed",
        isFixed: false,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["essencial", "familia"],
        notes: null,
      },
      {
        id: "tx_health_10",
        accountId: "acc_nubank",
        destinationAccountId: null,
        creditCardId: null,
        invoiceId: null,
        categoryId: "cat_health",
        description: "Plano de Saúde Unimed + Farmácia",
        amount: 890.0,
        date: "2026-10-28",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "expense",
        status: "pending",
        isFixed: true,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["essencial", "familia"],
        notes: "Vence dia 28",
      },
      {
        id: "tx_transf_10",
        accountId: "acc_itau",
        destinationAccountId: "acc_inter",
        creditCardId: null,
        invoiceId: null,
        categoryId: null,
        description: "Aporte Mensal para Reserva CDB",
        amount: 2000.0,
        date: "2026-10-08",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "transfer",
        status: "completed",
        isFixed: false,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["essencial"],
        notes: "Transferência PIX",
      },
      {
        id: "tx_mac_10",
        accountId: null,
        destinationAccountId: null,
        creditCardId: "card_nubank",
        invoiceId: "inv_nu_10",
        categoryId: "cat_edu",
        description: "MacBook Air M3 (Parcela 4/10)",
        amount: 849.9,
        date: "2026-10-11",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "card_expense",
        status: "completed",
        isFixed: false,
        installmentCurrent: 4,
        installmentTotal: 10,
        installmentGroupId: "grp_mac",
        tags: ["trabalho"],
        notes: "Compra parcelada sem juros",
      },
      {
        id: "tx_rest_10",
        accountId: null,
        destinationAccountId: null,
        creditCardId: "card_nubank",
        invoiceId: "inv_nu_10",
        categoryId: "cat_rest",
        description: "Jantar Aniversário & iFood",
        amount: 468.0,
        date: "2026-10-19",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "card_expense",
        status: "completed",
        isFixed: false,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["familia"],
        notes: null,
      },
      {
        id: "tx_stream_10",
        accountId: null,
        destinationAccountId: null,
        creditCardId: "card_nubank",
        invoiceId: "inv_nu_10",
        categoryId: "cat_stream",
        description: "Spotify Duo + Netflix + GitHub Copilot",
        amount: 184.9,
        date: "2026-10-20",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "card_expense",
        status: "completed",
        isFixed: true,
        installmentCurrent: null,
        installmentTotal: null,
        installmentGroupId: null,
        tags: ["assinatura", "trabalho"],
        notes: null,
      },
      {
        id: "tx_seg_10",
        accountId: null,
        destinationAccountId: null,
        creditCardId: "card_itau",
        invoiceId: "inv_itau_10",
        categoryId: "cat_fuel",
        description: "Seguro Auto Porto Seguro (2/6)",
        amount: 540.0,
        date: "2026-10-09",
        competenceMonth: 10,
        competenceYear: 2026,
        type: "card_expense",
        status: "completed",
        isFixed: false,
        installmentCurrent: 2,
        installmentTotal: 6,
        installmentGroupId: "grp_seg",
        tags: ["essencial"],
        notes: null,
      },
    ],
    budgets: [
      { id: "bdg_house", categoryId: "cat_house", month: 10, year: 2026, amountLimit: 3800.0 },
      { id: "bdg_food", categoryId: "cat_food", month: 10, year: 2026, amountLimit: 2400.0 },
      { id: "bdg_trans", categoryId: "cat_trans", month: 10, year: 2026, amountLimit: 1200.0 },
      { id: "bdg_leisure", categoryId: "cat_leisure", month: 10, year: 2026, amountLimit: 450.0 },
      { id: "bdg_health", categoryId: "cat_health", month: 10, year: 2026, amountLimit: 1000.0 },
      { id: "bdg_edu", categoryId: "cat_edu", month: 10, year: 2026, amountLimit: 900.0 },
    ],
    goals: [
      {
        id: "goal_emerg",
        name: "Reserva de Emergência (6 Meses)",
        targetAmount: 36000.0,
        initialAmount: 18000.0,
        deadline: "2027-04-30",
        color: "#059669",
        icon: "shield",
        status: "active",
        deposits: [
          { id: "dep_1", amount: 2000.0, date: "2026-09-10", note: "Aporte mensal CDB Liquidez Diária" },
          { id: "dep_2", amount: 2500.0, date: "2026-10-08", note: "Aporte Outubro + Dividendos" },
        ],
      },
      {
        id: "goal_trip",
        name: "Viagem Europa Outono",
        targetAmount: 24000.0,
        initialAmount: 6500.0,
        deadline: "2027-09-15",
        color: "#2563EB",
        icon: "plane",
        status: "active",
        deposits: [
          { id: "dep_3", amount: 1500.0, date: "2026-09-20", note: "Compra de Euros Wise" },
          { id: "dep_4", amount: 1800.0, date: "2026-10-18", note: "Parte do Freelance Outubro" },
        ],
      },
      {
        id: "goal_car",
        name: "Troca de Veículo (Entrada)",
        targetAmount: 45000.0,
        initialAmount: 12000.0,
        deadline: "2027-12-31",
        color: "#7C3AED",
        icon: "car",
        status: "active",
        deposits: [
          { id: "dep_5", amount: 3000.0, date: "2026-10-05", note: "Aplicação Tesouro Selic" },
        ],
      },
    ],
  };
}

export function getClientStore() {
  if (typeof window === "undefined") return getInitialSeedData();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = getInitialSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const seed = getInitialSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveClientStore(data: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function clearToZero() {
  const zeroData = getCleanZeroedData();
  saveClientStore(zeroData);
  return zeroData;
}

export function restoreDemo() {
  const demoData = getInitialSeedData();
  saveClientStore(demoData);
  return demoData;
}

export function buildClientSnapshot(store: any, month: number, year: number) {
  const accountMap = new Map<string, any>(store.accounts.map((a: any) => [a.id, a]));
  const catMap = new Map<string, any>(store.categories.map((c: any) => [c.id, c]));

  // 1. Calculate Account balances
  const accounts = store.accounts.map((acc: any) => {
    let current = Number(acc.initialBalance);
    let projected = Number(acc.initialBalance);

    for (const tx of store.transactions) {
      const isUpTo = tx.competenceYear < year || (tx.competenceYear === year && tx.competenceMonth <= month);
      if (tx.type === "income" && tx.accountId === acc.id) {
        if (tx.status === "completed") current += Number(tx.amount);
        if (tx.status === "completed" || isUpTo) projected += Number(tx.amount);
      } else if (tx.type === "expense" && tx.accountId === acc.id) {
        if (tx.status === "completed") current -= Number(tx.amount);
        if (tx.status === "completed" || isUpTo) projected -= Number(tx.amount);
      } else if (tx.type === "transfer") {
        if (tx.accountId === acc.id) {
          if (tx.status === "completed") current -= Number(tx.amount);
          if (tx.status === "completed" || isUpTo) projected -= Number(tx.amount);
        }
        if (tx.destinationAccountId === acc.id) {
          if (tx.status === "completed") current += Number(tx.amount);
          if (tx.status === "completed" || isUpTo) projected += Number(tx.amount);
        }
      }
    }

    return {
      ...acc,
      currentBalance: Number(current.toFixed(2)),
      projectedBalance: Number(projected.toFixed(2)),
    };
  });

  // 2. Credit Cards & Invoices
  const creditCards = store.creditCards.map((card: any) => {
    const cardTxs = store.transactions.filter(
      (tx: any) => tx.creditCardId === card.id && tx.competenceMonth === month && tx.competenceYear === year
    );
    const invoiceTotal = cardTxs.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
    const invoiceRecord = (store.invoices || []).find(
      (inv: any) => inv.creditCardId === card.id && inv.month === month && inv.year === year
    );
    const paidAmount = Number(invoiceRecord?.paidAmount || 0);
    const remainingAmount = Math.max(0, invoiceTotal - paidAmount);

    return {
      ...card,
      accountName: card.accountId ? accountMap.get(card.accountId)?.name || null : null,
      usedLimit: Number(invoiceTotal.toFixed(2)),
      availableLimit: Number(Math.max(0, card.limitAmount - invoiceTotal).toFixed(2)),
      currentInvoice: {
        id: invoiceRecord?.id || `inv_${card.id}_${month}_${year}`,
        month,
        year,
        status: remainingAmount === 0 && invoiceTotal > 0 ? "paid" : "open",
        totalAmount: Number(invoiceTotal.toFixed(2)),
        paidAmount,
        remainingAmount: Number(remainingAmount.toFixed(2)),
        dueDate: `${year}-${String(month).padStart(2, "0")}-${String(card.dueDay).padStart(2, "0")}`,
        closingDate: `${year}-${String(month).padStart(2, "0")}-${String(card.closingDay).padStart(2, "0")}`,
      },
    };
  });

  const cardMap = new Map<string, any>(creditCards.map((c: any) => [c.id, c]));

  // 3. Transactions for current month
  const transactions = store.transactions
    .filter((tx: any) => tx.competenceMonth === month && tx.competenceYear === year)
    .map((tx: any) => {
      const cat = tx.categoryId ? catMap.get(tx.categoryId) : null;
      const parentCat = cat?.parentId ? catMap.get(cat.parentId) : null;
      return {
        ...tx,
        accountName: tx.accountId ? accountMap.get(tx.accountId)?.name || null : null,
        destinationAccountName: tx.destinationAccountId ? accountMap.get(tx.destinationAccountId)?.name || null : null,
        creditCardName: tx.creditCardId ? cardMap.get(tx.creditCardId)?.name || null : null,
        categoryName: parentCat ? `${parentCat.name} › ${cat?.name}` : cat?.name || null,
        categoryColor: cat?.color || "#64748B",
        categoryIcon: cat?.icon || "tag",
      };
    })
    .sort((a: any, b: any) => (b.date > a.date ? 1 : -1));

  // 4. Categories with month spending
  const categories = store.categories.map((c: any) => {
    let spent = 0;
    let count = 0;
    for (const tx of transactions) {
      if (tx.categoryId === c.id || catMap.get(tx.categoryId)?.parentId === c.id) {
        if (tx.type === "expense" || tx.type === "card_expense" || tx.type === "income") {
          spent += Number(tx.amount);
          count++;
        }
      }
    }
    const parent = c.parentId ? catMap.get(c.parentId) : null;
    return {
      ...c,
      parentName: parent?.name || null,
      spentInMonth: Number(spent.toFixed(2)),
      txCountInMonth: count,
    };
  });

  // 5. Budgets
  const catDtoMap = new Map<string, any>(categories.map((c: any) => [c.id, c]));
  const budgets = (store.budgets || [])
    .filter((b: any) => b.month === month && b.year === year)
    .map((b: any) => {
      const cat = catDtoMap.get(b.categoryId);
      const spent = cat?.spentInMonth || 0;
      const limit = Number(b.amountLimit);
      const remaining = Number((limit - spent).toFixed(2));
      const pct = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;
      return {
        ...b,
        categoryName: cat?.parentName ? `${cat.parentName} › ${cat.name}` : cat?.name || "Categoria",
        categoryColor: cat?.color || "#2563EB",
        categoryIcon: cat?.icon || "tag",
        spentAmount: spent,
        remainingAmount: remaining,
        percentage: pct,
        alertLevel: pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "safe",
      };
    });

  // 6. Goals
  const goals = (store.goals || []).map((g: any) => {
    const depositsSum = (g.deposits || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const current = Number(g.initialAmount) + depositsSum;
    const remaining = Math.max(0, Number(g.targetAmount) - current);
    const pct = g.targetAmount > 0 ? Math.min(100, Number(((current / g.targetAmount) * 100).toFixed(1))) : 0;
    return {
      ...g,
      currentAmount: Number(current.toFixed(2)),
      remainingAmount: Number(remaining.toFixed(2)),
      percentage: pct,
      suggestedMonthly: Number((remaining / 6).toFixed(2)),
    };
  });

  // 7. Summary
  const totalBalance = accounts.filter((a: any) => a.includeInSummary).reduce((s: number, a: any) => s + a.currentBalance, 0);
  const projectedBalance = accounts.filter((a: any) => a.includeInSummary).reduce((s: number, a: any) => s + a.projectedBalance, 0);
  const totalIncome = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t: any) => t.type === "expense" || t.type === "card_expense").reduce((s: number, t: any) => s + t.amount, 0);

  return {
    user: store.user,
    period: { month, year },
    summary: {
      totalBalance: Number(totalBalance.toFixed(2)),
      projectedBalance: Number(projectedBalance.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      incomeCompleted: Number(totalIncome.toFixed(2)),
      incomePending: 0,
      totalExpenses: Number(totalExpenses.toFixed(2)),
      expenseAccountCompleted: Number(totalExpenses.toFixed(2)),
      expenseAccountPending: 0,
      expenseCardTotal: 0,
      monthlySavings: Number((totalIncome - totalExpenses).toFixed(2)),
      savingsRate: totalIncome > 0 ? Number((((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)) : 0,
    },
    accounts,
    creditCards,
    categories,
    transactions,
    budgets,
    goals,
    tags: store.tags || [],
    cashFlowHistory: (() => {
      const monthNamesShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const history = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        let inc = 0;
        let exp = 0;
        for (const tx of store.transactions || []) {
          if (tx.competenceMonth === m && tx.competenceYear === y) {
            if (tx.type === "income") inc += Number(tx.amount || 0);
            else if (tx.type === "expense" || tx.type === "card_expense") exp += Number(tx.amount || 0);
          }
        }
        history.push({
          label: `${monthNamesShort[m - 1]}/${String(y).slice(2)}`,
          month: m,
          year: y,
          income: Number(inc.toFixed(2)),
          expenses: Number(exp.toFixed(2)),
          balance: Number((inc - exp).toFixed(2)),
        });
      }
      return history;
    })(),
  };
}
