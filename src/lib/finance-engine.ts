import { getDb, ensureInvoice, uid } from "./db";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  currency: string;
  hideBalances: boolean;
}

export interface AccountDTO {
  id: string;
  name: string;
  institution: string;
  type: string;
  color: string;
  initialBalance: number;
  currentBalance: number;
  projectedBalance: number;
  includeInSummary: boolean;
  archived: boolean;
}

export interface CreditCardDTO {
  id: string;
  accountId: string | null;
  accountName: string | null;
  name: string;
  brand: string;
  color: string;
  limitAmount: number;
  usedLimit: number;
  availableLimit: number;
  closingDay: number;
  dueDay: number;
  currentInvoice: {
    id: string;
    month: number;
    year: number;
    status: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    dueDate: string;
    closingDate: string;
  };
}

export interface CategoryDTO {
  id: string;
  parentId: string | null;
  parentName: string | null;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  spentInMonth: number;
  txCountInMonth: number;
}

export interface TransactionDTO {
  id: string;
  accountId: string | null;
  accountName: string | null;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  creditCardId: string | null;
  creditCardName: string | null;
  invoiceId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  description: string;
  amount: number;
  date: string;
  competenceMonth: number;
  competenceYear: number;
  type: "income" | "expense" | "transfer" | "card_expense";
  status: "completed" | "pending";
  isFixed: boolean;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  installmentGroupId: string | null;
  tags: string[];
  notes: string | null;
}

export interface BudgetDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  month: number;
  year: number;
  amountLimit: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  alertLevel: "safe" | "warning" | "exceeded";
}

export interface GoalDTO {
  id: string;
  name: string;
  targetAmount: number;
  initialAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentage: number;
  deadline: string;
  suggestedMonthly: number;
  color: string;
  icon: string;
  status: string;
  deposits: Array<{
    id: string;
    amount: number;
    date: string;
    note: string | null;
  }>;
}

export function getDefaultUser(): UserProfile {
  const db = getDb();
  const row = db.prepare("SELECT * FROM User ORDER BY createdAt ASC LIMIT 1").get() as any;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    currency: row.currency,
    hideBalances: Boolean(row.hideBalances),
  };
}

export function getUserById(userId: string): UserProfile | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM User WHERE id = ?").get(userId) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    currency: row.currency,
    hideBalances: Boolean(row.hideBalances),
  };
}

export function getFinancialSnapshot(userId: string, month: number, year: number) {
  const db = getDb();
  const user = getUserById(userId) || getDefaultUser();

  // 1. Load Accounts & compute balances
  const rawAccounts = db
    .prepare("SELECT * FROM Account WHERE userId = ? AND archived = 0 ORDER BY createdAt ASC")
    .all(user.id) as any[];

  const allAccountTxs = db
    .prepare(
      "SELECT accountId, destinationAccountId, amount, type, status, competenceMonth, competenceYear FROM TransactionRecord WHERE userId = ? AND type IN ('income', 'expense', 'transfer')"
    )
    .all(user.id) as any[];

  const accounts: AccountDTO[] = rawAccounts.map((acc) => {
    let current = Number(acc.initialBalance);
    let projected = Number(acc.initialBalance);

    for (const tx of allAccountTxs) {
      const isUpToCurrentCompetence =
        tx.competenceYear < year || (tx.competenceYear === year && tx.competenceMonth <= month);

      if (tx.type === "income" && tx.accountId === acc.id) {
        if (tx.status === "completed") current += Number(tx.amount);
        if (tx.status === "completed" || isUpToCurrentCompetence) projected += Number(tx.amount);
      } else if (tx.type === "expense" && tx.accountId === acc.id) {
        if (tx.status === "completed") current -= Number(tx.amount);
        if (tx.status === "completed" || isUpToCurrentCompetence) projected -= Number(tx.amount);
      } else if (tx.type === "transfer") {
        if (tx.accountId === acc.id) {
          if (tx.status === "completed") current -= Number(tx.amount);
          if (tx.status === "completed" || isUpToCurrentCompetence) projected -= Number(tx.amount);
        }
        if (tx.destinationAccountId === acc.id) {
          if (tx.status === "completed") current += Number(tx.amount);
          if (tx.status === "completed" || isUpToCurrentCompetence) projected += Number(tx.amount);
        }
      }
    }

    return {
      id: acc.id,
      name: acc.name,
      institution: acc.institution,
      type: acc.type,
      color: acc.color,
      initialBalance: Number(acc.initialBalance),
      currentBalance: Number(current.toFixed(2)),
      projectedBalance: Number(projected.toFixed(2)),
      includeInSummary: Boolean(acc.includeInSummary),
      archived: Boolean(acc.archived),
    };
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // 2. Categories & Subcategories
  const rawCategories = db
    .prepare("SELECT * FROM Category WHERE userId = ? ORDER BY parentId ASC NULLS FIRST, name ASC")
    .all(user.id) as any[];
  const rawCatMap = new Map(rawCategories.map((c) => [c.id, c]));

  // 3. Credit Cards & Invoices
  const rawCards = db
    .prepare("SELECT * FROM CreditCard WHERE userId = ? AND archived = 0 ORDER BY createdAt ASC")
    .all(user.id) as any[];

  const creditCards: CreditCardDTO[] = rawCards.map((card) => {
    const invId = ensureInvoice(db, card.id, month, year);
    const invRow = db.prepare("SELECT * FROM Invoice WHERE id = ?").get(invId) as any;

    const monthInvoiceSum = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM TransactionRecord WHERE creditCardId = ? AND competenceMonth = ? AND competenceYear = ? AND type = 'card_expense'"
      )
      .get(card.id, month, year) as { total: number };

    // Total unpaid across all open/partial invoices for limit calculation
    const allCardInvoices = db
      .prepare("SELECT id, month, year, status, paidAmount FROM Invoice WHERE creditCardId = ?")
      .all(card.id) as any[];

    let usedLimit = 0;
    for (const inv of allCardInvoices) {
      if (inv.status === "paid") continue;
      const sumRow = db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) as total FROM TransactionRecord WHERE invoiceId = ? AND type = 'card_expense'"
        )
        .get(inv.id) as { total: number };
      const rem = Math.max(0, Number(sumRow.total) - Number(inv.paidAmount || 0));
      usedLimit += rem;
    }

    const totalAmount = Number(monthInvoiceSum.total.toFixed(2));
    const paidAmount = Number((invRow?.paidAmount || 0).toFixed(2));
    const remainingAmount = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));
    const mm = String(month).padStart(2, "0");
    const dueDayStr = String(card.dueDay).padStart(2, "0");
    const closingDayStr = String(card.closingDay).padStart(2, "0");

    return {
      id: card.id,
      accountId: card.accountId,
      accountName: card.accountId ? accountMap.get(card.accountId)?.name || null : null,
      name: card.name,
      brand: card.brand,
      color: card.color,
      limitAmount: Number(card.limitAmount),
      usedLimit: Number(usedLimit.toFixed(2)),
      availableLimit: Number(Math.max(0, Number(card.limitAmount) - usedLimit).toFixed(2)),
      closingDay: Number(card.closingDay),
      dueDay: Number(card.dueDay),
      currentInvoice: {
        id: invId,
        month,
        year,
        status: invRow?.status || "open",
        totalAmount,
        paidAmount,
        remainingAmount,
        dueDate: `${year}-${mm}-${dueDayStr}`,
        closingDate: `${year}-${mm}-${closingDayStr}`,
      },
    };
  });

  const cardMap = new Map(creditCards.map((c) => [c.id, c]));

  // 4. Monthly Transactions
  const rawMonthTxs = db
    .prepare(
      `SELECT * FROM TransactionRecord
       WHERE userId = ? AND competenceMonth = ? AND competenceYear = ?
       ORDER BY date DESC, createdAt DESC`
    )
    .all(user.id, month, year) as any[];

  const transactions: TransactionDTO[] = rawMonthTxs.map((tx) => {
    const cat = tx.categoryId ? rawCatMap.get(tx.categoryId) : null;
    const parentCat = cat?.parentId ? rawCatMap.get(cat.parentId) : null;
    const fullCatName = parentCat ? `${parentCat.name} › ${cat.name}` : cat?.name || null;

    let parsedTags: string[] = [];
    try {
      parsedTags = JSON.parse(tx.tagsJson || "[]");
    } catch {
      parsedTags = [];
    }

    return {
      id: tx.id,
      accountId: tx.accountId,
      accountName: tx.accountId ? accountMap.get(tx.accountId)?.name || null : null,
      destinationAccountId: tx.destinationAccountId,
      destinationAccountName: tx.destinationAccountId
        ? accountMap.get(tx.destinationAccountId)?.name || null
        : null,
      creditCardId: tx.creditCardId,
      creditCardName: tx.creditCardId ? cardMap.get(tx.creditCardId)?.name || null : null,
      invoiceId: tx.invoiceId,
      categoryId: tx.categoryId,
      categoryName: fullCatName,
      categoryColor: cat?.color || "#64748B",
      categoryIcon: cat?.icon || "tag",
      description: tx.description,
      amount: Number(tx.amount),
      date: tx.date,
      competenceMonth: Number(tx.competenceMonth),
      competenceYear: Number(tx.competenceYear),
      type: tx.type,
      status: tx.status,
      isFixed: Boolean(tx.isFixed),
      installmentCurrent: tx.installmentCurrent ? Number(tx.installmentCurrent) : null,
      installmentTotal: tx.installmentTotal ? Number(tx.installmentTotal) : null,
      installmentGroupId: tx.installmentGroupId || null,
      tags: parsedTags,
      notes: tx.notes || null,
    };
  });

  // 5. Compute category spending in month (rolling up subcategories to parent categories as well)
  const directCatSpend = new Map<string, { amount: number; count: number }>();
  for (const tx of transactions) {
    if (!tx.categoryId) continue;
    if (tx.type === "expense" || tx.type === "card_expense" || tx.type === "income") {
      const prev = directCatSpend.get(tx.categoryId) || { amount: 0, count: 0 };
      directCatSpend.set(tx.categoryId, {
        amount: prev.amount + tx.amount,
        count: prev.count + 1,
      });
    }
  }

  const categories: CategoryDTO[] = rawCategories.map((c) => {
    const direct = directCatSpend.get(c.id) || { amount: 0, count: 0 };
    let totalAmount = direct.amount;
    let totalCount = direct.count;

    // If parent category, also sum children
    for (const child of rawCategories) {
      if (child.parentId === c.id) {
        const ch = directCatSpend.get(child.id) || { amount: 0, count: 0 };
        totalAmount += ch.amount;
        totalCount += ch.count;
      }
    }

    const parent = c.parentId ? rawCatMap.get(c.parentId) : null;
    return {
      id: c.id,
      parentId: c.parentId || null,
      parentName: parent?.name || null,
      name: c.name,
      type: c.type,
      color: c.color,
      icon: c.icon,
      spentInMonth: Number(totalAmount.toFixed(2)),
      txCountInMonth: totalCount,
    };
  });

  const catDtoMap = new Map(categories.map((c) => [c.id, c]));

  // 6. Monthly Budgets & Alerts
  const rawBudgets = db
    .prepare("SELECT * FROM Budget WHERE userId = ? AND month = ? AND year = ?")
    .all(user.id, month, year) as any[];

  const budgets: BudgetDTO[] = rawBudgets
    .map((b) => {
      const cat = catDtoMap.get(b.categoryId);
      if (!cat) return null;
      const limit = Number(b.amountLimit);
      const spent = cat.spentInMonth;
      const remaining = Number((limit - spent).toFixed(2));
      const pct = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;
      const alertLevel: "safe" | "warning" | "exceeded" =
        pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "safe";

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: cat.parentName ? `${cat.parentName} › ${cat.name}` : cat.name,
        categoryColor: cat.color,
        categoryIcon: cat.icon,
        month,
        year,
        amountLimit: limit,
        spentAmount: spent,
        remainingAmount: remaining,
        percentage: pct,
        alertLevel,
      };
    })
    .filter(Boolean) as BudgetDTO[];

  // 7. Financial Goals
  const rawGoals = db
    .prepare("SELECT * FROM Goal WHERE userId = ? ORDER BY createdAt ASC")
    .all(user.id) as any[];

  const goals: GoalDTO[] = rawGoals.map((g) => {
    const deposits = db
      .prepare("SELECT id, amount, date, note FROM GoalDeposit WHERE goalId = ? ORDER BY date DESC")
      .all(g.id) as any[];

    const depositsSum = deposits.reduce((acc, d) => acc + Number(d.amount), 0);
    const currentAmount = Number((Number(g.initialAmount) + depositsSum).toFixed(2));
    const targetAmount = Number(g.targetAmount);
    const remainingAmount = Math.max(0, Number((targetAmount - currentAmount).toFixed(2)));
    const percentage =
      targetAmount > 0 ? Math.min(100, Number(((currentAmount / targetAmount) * 100).toFixed(1))) : 0;

    const today = new Date(year, month - 1, 15);
    const deadlineDate = new Date(g.deadline + "T00:00:00");
    const monthsRemaining = Math.max(
      1,
      (deadlineDate.getFullYear() - today.getFullYear()) * 12 +
        (deadlineDate.getMonth() - today.getMonth())
    );
    const suggestedMonthly = Number((remainingAmount / monthsRemaining).toFixed(2));

    return {
      id: g.id,
      name: g.name,
      targetAmount,
      initialAmount: Number(g.initialAmount),
      currentAmount,
      remainingAmount,
      percentage,
      deadline: g.deadline,
      suggestedMonthly,
      color: g.color,
      icon: g.icon,
      status: g.status,
      deposits: deposits.map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        date: d.date,
        note: d.note || null,
      })),
    };
  });

  // 8. Tags with monthly usage
  const rawTags = db.prepare("SELECT * FROM Tag WHERE userId = ? ORDER BY name ASC").all(user.id) as any[];
  const tagUsageMap = new Map<string, { amount: number; count: number }>();
  for (const tx of transactions) {
    for (const t of tx.tags) {
      const prev = tagUsageMap.get(t) || { amount: 0, count: 0 };
      tagUsageMap.set(t, {
        amount: prev.amount + tx.amount,
        count: prev.count + 1,
      });
    }
  }
  const tags = rawTags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    amountInMonth: Number((tagUsageMap.get(t.name)?.amount || 0).toFixed(2)),
    countInMonth: tagUsageMap.get(t.name)?.count || 0,
  }));

  // 9. Summary KPIs for the selected month
  const totalBalance = accounts
    .filter((a) => a.includeInSummary)
    .reduce((acc, a) => acc + a.currentBalance, 0);

  const projectedBalance = accounts
    .filter((a) => a.includeInSummary)
    .reduce((acc, a) => acc + a.projectedBalance, 0);

  const incomeCompleted = transactions
    .filter((t) => t.type === "income" && t.status === "completed")
    .reduce((acc, t) => acc + t.amount, 0);
  const incomePending = transactions
    .filter((t) => t.type === "income" && t.status === "pending")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = incomeCompleted + incomePending;

  const expenseAccountCompleted = transactions
    .filter((t) => t.type === "expense" && t.status === "completed")
    .reduce((acc, t) => acc + t.amount, 0);
  const expenseAccountPending = transactions
    .filter((t) => t.type === "expense" && t.status === "pending")
    .reduce((acc, t) => acc + t.amount, 0);
  const expenseCardTotal = transactions
    .filter((t) => t.type === "card_expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = expenseAccountCompleted + expenseAccountPending + expenseCardTotal;
  const monthlySavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Number(((monthlySavings / totalIncome) * 100).toFixed(1)) : 0;

  // 10. 6-Month Historical Cash Flow for Reports
  const cashFlowHistory: Array<{
    label: string;
    month: number;
    year: number;
    income: number;
    expenses: number;
    balance: number;
  }> = [];

  const monthNamesShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(year, month - 1 - offset, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();

    const incRow = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM TransactionRecord WHERE userId = ? AND competenceMonth = ? AND competenceYear = ? AND type = 'income'"
      )
      .get(user.id, m, y) as { total: number };

    const expRow = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM TransactionRecord WHERE userId = ? AND competenceMonth = ? AND competenceYear = ? AND type IN ('expense', 'card_expense')"
      )
      .get(user.id, m, y) as { total: number };

    const inc = Number(incRow.total.toFixed(2));
    const exp = Number(expRow.total.toFixed(2));
    cashFlowHistory.push({
      label: `${monthNamesShort[m - 1]}/${String(y).slice(2)}`,
      month: m,
      year: y,
      income: inc,
      expenses: exp,
      balance: Number((inc - exp).toFixed(2)),
    });
  }

  return {
    user,
    period: { month, year },
    summary: {
      totalBalance: Number(totalBalance.toFixed(2)),
      projectedBalance: Number(projectedBalance.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      incomeCompleted: Number(incomeCompleted.toFixed(2)),
      incomePending: Number(incomePending.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      expenseAccountCompleted: Number(expenseAccountCompleted.toFixed(2)),
      expenseAccountPending: Number(expenseAccountPending.toFixed(2)),
      expenseCardTotal: Number(expenseCardTotal.toFixed(2)),
      monthlySavings: Number(monthlySavings.toFixed(2)),
      savingsRate,
    },
    accounts,
    creditCards,
    categories,
    transactions,
    budgets,
    goals,
    tags,
    cashFlowHistory,
  };
}

export function createTransactionWithInstallments(
  userId: string,
  payload: {
    description: string;
    amount: number;
    date: string;
    type: "income" | "expense" | "transfer" | "card_expense";
    status?: "completed" | "pending";
    accountId?: string | null;
    destinationAccountId?: string | null;
    creditCardId?: string | null;
    categoryId?: string | null;
    isFixed?: boolean;
    installments?: number;
    tags?: string[];
    notes?: string | null;
  }
) {
  const db = getDb();
  const now = new Date().toISOString();
  const baseDate = new Date(payload.date + "T12:00:00");
  const totalInstallments = Math.max(1, Math.min(48, Number(payload.installments || 1)));
  const groupId = totalInstallments > 1 ? uid("grp") : null;
  const tagsJson = JSON.stringify(payload.tags || []);

  // Determine initial competence month/year (for credit cards, if purchase day >= closingDay, shift to next month's invoice)
  let startMonth = baseDate.getMonth() + 1;
  let startYear = baseDate.getFullYear();

  if (payload.type === "card_expense" && payload.creditCardId) {
    const card = db
      .prepare("SELECT closingDay FROM CreditCard WHERE id = ?")
      .get(payload.creditCardId) as { closingDay: number } | undefined;
    if (card && baseDate.getDate() > card.closingDay) {
      const next = new Date(startYear, startMonth, 1);
      startMonth = next.getMonth() + 1;
      startYear = next.getFullYear();
    }
  }

  const insertStmt = db.prepare(`
    INSERT INTO TransactionRecord (
      id, userId, accountId, destinationAccountId, creditCardId, invoiceId, categoryId,
      description, amount, date, competenceMonth, competenceYear, type, status,
      isFixed, installmentCurrent, installmentTotal, installmentGroupId, tagsJson, notes, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const installmentAmount = Number((Number(payload.amount) / totalInstallments).toFixed(2));
  const createdIds: string[] = [];

  for (let i = 0; i < totalInstallments; i++) {
    const compDate = new Date(startYear, startMonth - 1 + i, Math.min(28, baseDate.getDate()));
    const cMonth = compDate.getMonth() + 1;
    const cYear = compDate.getFullYear();
    const txDateStr =
      i === 0
        ? payload.date
        : `${cYear}-${String(cMonth).padStart(2, "0")}-${String(Math.min(28, baseDate.getDate())).padStart(2, "0")}`;

    let invoiceId: string | null = null;
    if (payload.type === "card_expense" && payload.creditCardId) {
      invoiceId = ensureInvoice(db, payload.creditCardId, cMonth, cYear);
    }

    const desc =
      totalInstallments > 1
        ? `${payload.description} (${i + 1}/${totalInstallments})`
        : payload.description;

    const status =
      i === 0 ? payload.status || "completed" : payload.type === "card_expense" ? "pending" : "pending";

    const id = uid("tx");
    insertStmt.run(
      id,
      userId,
      payload.type === "card_expense" ? null : payload.accountId || null,
      payload.type === "transfer" ? payload.destinationAccountId || null : null,
      payload.type === "card_expense" ? payload.creditCardId || null : null,
      invoiceId,
      payload.categoryId || null,
      desc,
      installmentAmount,
      txDateStr,
      cMonth,
      cYear,
      payload.type,
      status,
      payload.isFixed ? 1 : 0,
      totalInstallments > 1 ? i + 1 : null,
      totalInstallments > 1 ? totalInstallments : null,
      groupId,
      tagsJson,
      payload.notes || null,
      now
    );
    createdIds.push(id);
  }

  return createdIds;
}
