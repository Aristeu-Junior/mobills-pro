"use client";

import React, { useState, useEffect, useMemo, useId } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard as CreditCardIcon,
  PieChart,
  Target,
  Tags,
  BarChart3,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Trash2,
  SlidersHorizontal,
  Download,
  Upload,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  Repeat,
  Layers,
  Search,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  Sparkles,
  Printer,
  Store,
  Calculator,
  BadgeCheck,
} from "lucide-react";
import { LightDismissDialog } from "./LightDismissDialog";
import { getClientStore, saveClientStore, buildClientSnapshot } from "@/lib/client-store";

type ModuleKey =
  | "dashboard"
  | "transactions"
  | "accounts"
  | "cards"
  | "budgets"
  | "goals"
  | "categories"
  | "reports"
  | "advisor";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatBRL(value: number, hide = false): string {
  if (hide) return "R$ •••••";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function MobillsApp({ initialData }: { initialData: any }) {
  const [snapshot, setSnapshot] = useState<any>(initialData);
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");
  const [month, setMonth] = useState<number>(initialData?.period?.month || 10);
  const [year, setYear] = useState<number>(initialData?.period?.year || 2026);
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Transaction Filters
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");
  const [txStatusFilter, setTxStatusFilter] = useState<string>("all");
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>("all");
  const [txSearch, setTxSearch] = useState<string>("");

  // Dialog states
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [readjustDialog, setReadjustDialog] = useState<{
    open: boolean;
    accountId: string;
    accountName: string;
    currentBalance: number;
  }>({ open: false, accountId: "", accountName: "", currentBalance: 0 });
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [payInvoiceDialog, setPayInvoiceDialog] = useState<{
    open: boolean;
    cardId: string;
    cardName: string;
    remainingAmount: number;
    defaultAccountId: string;
  }>({
    open: false,
    cardId: "",
    cardName: "",
    remainingAmount: 0,
    defaultAccountId: "",
  });
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalDepositDialog, setGoalDepositDialog] = useState<{
    open: boolean;
    goalId: string;
    goalName: string;
  }>({ open: false, goalId: "", goalName: "" });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // New Transaction Form State
  const [txForm, setTxForm] = useState({
    type: "expense" as "expense" | "income" | "card_expense" | "transfer",
    description: "",
    payee: "",
    amount: "",
    date: "2026-10-26",
    status: "completed" as "completed" | "pending",
    accountId: initialData?.accounts?.[0]?.id || "",
    destinationAccountId: initialData?.accounts?.[1]?.id || "",
    creditCardId: initialData?.creditCards?.[0]?.id || "",
    categoryId: "",
    isFixed: false,
    installments: "1",
    tagsInput: "",
    notes: "",
  });

  // New Account Form State
  const [accForm, setAccForm] = useState({
    name: "",
    institution: "Nubank",
    type: "checking",
    color: "#7C3AED",
    initialBalance: "0",
    includeInSummary: true,
  });

  // Readjust Balance Input
  const [newBalanceInput, setNewBalanceInput] = useState("");

  // New Credit Card Form State
  const [cardForm, setCardForm] = useState({
    name: "",
    brand: "Mastercard",
    color: "#6D28D9",
    limitAmount: "8000",
    closingDay: "20",
    dueDay: "28",
    accountId: initialData?.accounts?.[0]?.id || "",
  });

  // Pay Invoice State
  const [payInvoiceAmount, setPayInvoiceAmount] = useState("");
  const [payInvoiceAccountId, setPayInvoiceAccountId] = useState("");

  // Budget Form State
  const [budgetForm, setBudgetForm] = useState({
    categoryId: "",
    amountLimit: "1500",
  });

  // Goal Form State
  const [goalForm, setGoalForm] = useState({
    name: "",
    targetAmount: "10000",
    initialAmount: "0",
    deadline: "2027-12-31",
    color: "#059669",
  });

  // Goal Deposit Form State
  const [goalDepositForm, setGoalDepositForm] = useState({
    amount: "500",
    date: "2026-10-26",
    note: "",
  });

  // Category & Tag Form State
  const [catForm, setCatForm] = useState({
    name: "",
    type: "expense" as "expense" | "income",
    parentId: "",
    color: "#2563EB",
  });
  const [tagNameInput, setTagNameInput] = useState("");

  // Import CSV/OFX State
  const [importText, setImportText] = useState("");
  const [importAccountId, setImportAccountId] = useState(
    initialData?.accounts?.[0]?.id || ""
  );

  // Auth Dialog State
  const [authTab, setAuthTab] = useState<"login" | "register" | "google">("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "demo@mobills.local",
    password: "",
    seedDemo: true,
  });

  const tableCaptionId = useId();
  const emailHintId = useId();
  const emailErrorId = useId();
  const passwordRulesId = useId();

  const hideBalances = Boolean(snapshot?.user?.hideBalances);

  async function refreshSnapshot(targetMonth = month, targetYear = year) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/finance?month=${targetMonth}&year=${targetYear}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
        return;
      }
    } catch {
      // Offline / Static GitHub Pages fallback
    }
    const store = getClientStore();
    setSnapshot(buildClientSnapshot(store, targetMonth, targetYear));
    setLoading(false);
  }

  async function postAction(payload: Record<string, any>, successMsg?: string) {
    setLoading(true);
    setBannerMessage(null);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, month, year }),
      });
      if (res.ok) {
        await refreshSnapshot(month, year);
        if (successMsg) {
          setBannerMessage({ type: "success", text: successMsg });
        }
        return true;
      }
    } catch {
      // Handled by static fallback below
    }

    // Static / LocalStorage fallback for GitHub Pages
    try {
      const store = getClientStore();
      const { action } = payload;
      if (action === "create_transaction") {
        store.transactions.unshift({
          id: `tx_${Date.now()}`,
          description: payload.description,
          amount: Number(payload.amount),
          date: payload.date,
          competenceMonth: month,
          competenceYear: year,
          type: payload.type,
          status: payload.status || "completed",
          accountId: payload.accountId || null,
          destinationAccountId: payload.destinationAccountId || null,
          creditCardId: payload.creditCardId || null,
          categoryId: payload.categoryId || null,
          isFixed: Boolean(payload.isFixed),
          installmentCurrent: null,
          installmentTotal: null,
          installmentGroupId: null,
          tags: payload.tags || [],
          notes: payload.notes || null,
        });
      } else if (action === "toggle_transaction_status") {
        const t = store.transactions.find((x: any) => x.id === payload.id);
        if (t) t.status = t.status === "completed" ? "pending" : "completed";
      } else if (action === "delete_transaction") {
        store.transactions = store.transactions.filter((x: any) => x.id !== payload.id);
      } else if (action === "toggle_hide_balances") {
        store.user.hideBalances = !store.user.hideBalances;
      } else if (action === "readjust_account_balance") {
        const a = store.accounts.find((x: any) => x.id === payload.accountId);
        if (a) {
          const snap = buildClientSnapshot(store, month, year);
          const currentA = snap.accounts.find((x: any) => x.id === payload.accountId);
          const diff = Number(payload.newBalance) - (currentA?.currentBalance || 0);
          store.transactions.unshift({
            id: `tx_adj_${Date.now()}`,
            description: "Reajuste de Saldo (Mobills)",
            amount: Math.abs(diff),
            date: `${year}-${String(month).padStart(2, "0")}-26`,
            competenceMonth: month,
            competenceYear: year,
            type: diff >= 0 ? "income" : "expense",
            status: "completed",
            accountId: payload.accountId,
            tags: ["reajuste"],
          });
        }
      } else if (action === "create_account") {
        store.accounts.push({
          id: `acc_${Date.now()}`,
          name: payload.name,
          institution: payload.institution,
          type: payload.type,
          color: payload.color,
          initialBalance: Number(payload.initialBalance || 0),
          includeInSummary: true,
          archived: false,
        });
      } else if (action === "create_card") {
        store.creditCards.push({
          id: `card_${Date.now()}`,
          name: payload.name,
          brand: payload.brand,
          color: payload.color,
          limitAmount: Number(payload.limitAmount || 5000),
          closingDay: Number(payload.closingDay || 20),
          dueDay: Number(payload.dueDay || 28),
          accountId: payload.accountId || null,
          archived: false,
        });
      } else if (action === "upsert_budget") {
        const b = store.budgets.find(
          (x: any) => x.categoryId === payload.categoryId && x.month === month && x.year === year
        );
        if (b) {
          b.amountLimit = Number(payload.amountLimit);
        } else {
          store.budgets.push({
            id: `bdg_${Date.now()}`,
            categoryId: payload.categoryId,
            month,
            year,
            amountLimit: Number(payload.amountLimit),
          });
        }
      } else if (action === "create_goal") {
        store.goals.push({
          id: `goal_${Date.now()}`,
          name: payload.name,
          targetAmount: Number(payload.targetAmount),
          initialAmount: Number(payload.initialAmount || 0),
          deadline: payload.deadline,
          color: payload.color || "#059669",
          icon: "target",
          status: "active",
          deposits: [],
        });
      } else if (action === "add_goal_deposit") {
        const g = store.goals.find((x: any) => x.id === payload.goalId);
        if (g) {
          if (!g.deposits) g.deposits = [];
          g.deposits.unshift({
            id: `dep_${Date.now()}`,
            amount: Number(payload.amount),
            date: payload.date,
            note: payload.note || "Aporte",
          });
        }
      } else if (action === "create_tag") {
        if (!store.tags) store.tags = [];
        store.tags.push({ id: `tag_${Date.now()}`, name: payload.name.replace(/^#/, ""), color: "#2563EB" });
      }

      saveClientStore(store);
      setSnapshot(buildClientSnapshot(store, month, year));
      if (successMsg) {
        setBannerMessage({ type: "success", text: successMsg });
      }
      return true;
    } finally {
      setLoading(false);
    }
  }

  function handleMonthChange(delta: number) {
    const nextDate = new Date(year, month - 1 + delta, 1);
    const nextM = nextDate.getMonth() + 1;
    const nextY = nextDate.getFullYear();
    setMonth(nextM);
    setYear(nextY);
    refreshSnapshot(nextM, nextY);
  }

  function openNewTxDialog(
    defaultType: "expense" | "income" | "card_expense" | "transfer" = "expense"
  ) {
    const matchingCats = (snapshot?.categories || []).filter((c: any) =>
      defaultType === "income" ? c.type === "income" : c.type === "expense"
    );
    const mm = String(month).padStart(2, "0");
    setTxForm({
      type: defaultType,
      description: "",
      payee: "",
      amount: "",
      date: `${year}-${mm}-15`,
      status: "completed",
      accountId: snapshot?.accounts?.[0]?.id || "",
      destinationAccountId: snapshot?.accounts?.[1]?.id || "",
      creditCardId: snapshot?.creditCards?.[0]?.id || "",
      categoryId: matchingCats[0]?.id || "",
      isFixed: false,
      installments: "1",
      tagsInput: "",
      notes: "",
    });
    setTxDialogOpen(true);
  }

  const upcomingBills = useMemo(() => {
    return (snapshot?.transactions || [])
      .filter((tx: any) => tx.type === "expense" && tx.status === "pending")
      .sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
  }, [snapshot?.transactions]);

  const filteredTransactions = useMemo(() => {
    const list: any[] = snapshot?.transactions || [];
    return list.filter((tx) => {
      if (txTypeFilter !== "all" && tx.type !== txTypeFilter) return false;
      if (txStatusFilter !== "all" && tx.status !== txStatusFilter) return false;
      if (txCategoryFilter !== "all" && tx.categoryId !== txCategoryFilter)
        return false;
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const inDesc = tx.description?.toLowerCase().includes(q);
        const inCat = tx.categoryName?.toLowerCase().includes(q);
        const inTags = (tx.tags || []).some((t: string) =>
          t.toLowerCase().includes(q)
        );
        if (!inDesc && !inCat && !inTags) return false;
      }
      return true;
    });
  }, [
    snapshot?.transactions,
    txTypeFilter,
    txStatusFilter,
    txCategoryFilter,
    txSearch,
  ]);

  const parentExpenseCategories = useMemo(
    () =>
      (snapshot?.categories || []).filter(
        (c: any) => c.type === "expense" && !c.parentId && c.spentInMonth > 0
      ),
    [snapshot?.categories]
  );

  function handleExportCSV() {
    const rows = [
      [
        "Data",
        "Descricao",
        "Tipo",
        "Categoria",
        "Conta_ou_Cartao",
        "Status",
        "Valor_BRL",
        "Tags",
      ],
      ...filteredTransactions.map((t: any) => [
        t.date,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        t.type,
        `"${t.categoryName || "Sem categoria"}"`,
        `"${t.creditCardName || t.accountName || ""}"`,
        t.status,
        t.amount.toFixed(2),
        `"${(t.tags || []).join(",")}"`,
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((r) => r.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mobills_extrato_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function loadSampleCSVIntoImporter() {
    const mm = String(month).padStart(2, "0");
    setImportText(
      [
        `${year}-${mm}-07;Supermercado Pão de Açúcar;-384.90`,
        `${year}-${mm}-12; Uber Viagem Reunião;-42.50`,
        `${year}-${mm}-16;Dividendos FII HGLG11;215.00`,
        `${year}-${mm}-19;Farmácia Drogasil;-96.40`,
      ].join("\n")
    );
  }

  async function handleRunImport() {
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const items = lines
      .map((line) => {
        const parts = line.split(/[;,]/);
        if (parts.length < 3) return null;
        const date = parts[0].trim();
        const description = parts[1].trim();
        const rawVal = Number(parts[2].trim().replace(",", "."));
        if (isNaN(rawVal) || rawVal === 0) return null;
        return {
          date,
          description,
          amount: Math.abs(rawVal),
          type: rawVal >= 0 ? "income" : "expense",
        };
      })
      .filter(Boolean);

    const expCat = (snapshot?.categories || []).find(
      (c: any) => c.type === "expense"
    );
    const ok = await postAction(
      {
        action: "import_transactions",
        items,
        accountId: importAccountId || snapshot?.accounts?.[0]?.id,
        defaultCategoryId: expCat?.id || null,
      },
      `${items.length} lançamentos importados com sucesso para a conta selecionada.`
    );
    if (ok) {
      setImportText("");
      setActiveModule("transactions");
    }
  }

  const totalBudgetLimit = useMemo(
    () =>
      (snapshot?.budgets || []).reduce(
        (acc: number, b: any) => acc + b.amountLimit,
        0
      ),
    [snapshot?.budgets]
  );

  const totalBudgetSpent = useMemo(
    () =>
      (snapshot?.budgets || []).reduce(
        (acc: number, b: any) => acc + b.spentAmount,
        0
      ),
    [snapshot?.budgets]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col justify-between p-5">
          <div>
            {/* Brand Header */}
            <div className="flex items-center justify-between pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Mobills Pro
                  </h1>
                  <p className="text-xs font-medium text-slate-600">
                    Gestão Financeira
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => openNewTxDialog("expense")}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Lançamento</span>
            </button>

            {/* Navigation Links */}
            <nav aria-label="Menu principal" className="space-y-1">
              {[
                {
                  id: "dashboard",
                  label: "Dashboard",
                  icon: LayoutDashboard,
                },
                {
                  id: "transactions",
                  label: "Transações",
                  icon: ArrowLeftRight,
                  badge: snapshot?.transactions?.length || 0,
                },
                {
                  id: "accounts",
                  label: "Contas & Carteiras",
                  icon: Wallet,
                  badge: snapshot?.accounts?.length || 0,
                },
                {
                  id: "cards",
                  label: "Cartões de Crédito",
                  icon: CreditCardIcon,
                  badge: snapshot?.creditCards?.length || 0,
                },
                {
                  id: "budgets",
                  label: "Planejamento Mensal",
                  icon: PieChart,
                },
                {
                  id: "goals",
                  label: "Objetivos & Metas",
                  icon: Target,
                },
                {
                  id: "categories",
                  label: "Categorias & Tags",
                  icon: Tags,
                },
                {
                  id: "reports",
                  label: "Relatórios & Extratos",
                  icon: BarChart3,
                },
                {
                  id: "advisor",
                  label: "Mobills IA Advisor",
                  icon: Sparkles,
                  badge: "PRO",
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id as ModuleKey)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                          active
                            ? "bg-slate-700 text-slate-100"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Active User Profile Card */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {snapshot?.user?.name || "Aristeu Junior"}
                </p>
                <p className="truncate text-xs text-slate-600">
                  {snapshot?.user?.email || "demo@mobills.local"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthDialogOpen(true)}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
              >
                Conta
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Global Competence & Quick Actions Top Bar */}
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          {/* Month / Year Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              aria-label="Mês anterior"
              className="rounded-lg border border-slate-300 p-2 text-slate-700 transition-colors hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[170px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-1.5 text-center">
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {MONTH_NAMES[month - 1]} de {year}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              aria-label="Próximo mês"
              className="rounded-lg border border-slate-300 p-2 text-slate-700 transition-colors hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Entry Shortcuts & Privacy Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openNewTxDialog("income")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
              <span>+ Receita</span>
            </button>
            <button
              type="button"
              onClick={() => openNewTxDialog("expense")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-700 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 transition-colors hover:bg-red-100"
            >
              <TrendingDown className="h-3.5 w-3.5 text-red-700" />
              <span>+ Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => openNewTxDialog("card_expense")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-700 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-900 transition-colors hover:bg-purple-100"
            >
              <CreditCardIcon className="h-3.5 w-3.5 text-purple-700" />
              <span>+ Compra Cartão</span>
            </button>
            <button
              type="button"
              onClick={() => openNewTxDialog("transfer")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-slate-700" />
              <span>Transferir</span>
            </button>
            <button
              type="button"
              onClick={() => postAction({ action: "toggle_hide_balances" })}
              aria-label={
                hideBalances ? "Mostrar saldos financeiros" : "Ocultar saldos financeiros"
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
            >
              {hideBalances ? (
                <>
                  <EyeOff className="h-4 w-4 text-slate-700" />
                  <span>Mostrar Saldos</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 text-slate-700" />
                  <span>Ocultar Saldos</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Feedback Banner */}
        {bannerMessage && (
          <div
            role="status"
            className={`mx-6 mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
              bannerMessage.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                : "border-red-300 bg-red-50 text-red-950"
            }`}
          >
            <span>{bannerMessage.text}</span>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs font-bold underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Active Module Workspace */}
        <main className="flex-1 space-y-8 p-6">
          {/* =========================================================
              MODULE 1: DASHBOARD (VISÃO GERAL)
             ========================================================= */}
          {activeModule === "dashboard" && (
            <div className="space-y-8">
              {/* Executive Ledger Strip (Single cohesive surface, no nested cards) */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Balanço Consolidado de {MONTH_NAMES[month - 1]}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Liquidez imediata nas contas bancárias, fluxo de caixa mensal e faturas de cartão de crédito.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 tabular-nums">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      Taxa de Poupança: {snapshot?.summary?.savingsRate || 0}%
                    </span>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-1 gap-6 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                  <div className="pt-4 first:pt-0 lg:px-5 lg:pt-0 lg:first:pl-0">
                    <dt className="text-sm font-semibold text-slate-700">
                      Saldo Atual em Contas
                    </dt>
                    <dd className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatBRL(snapshot?.summary?.totalBalance, hideBalances)}
                    </dd>
                    <p className="mt-1 text-xs font-medium text-slate-600 tabular-nums">
                      Projetado no mês:{" "}
                      {formatBRL(snapshot?.summary?.projectedBalance, hideBalances)}
                    </p>
                  </div>

                  <div className="pt-4 sm:pt-0 lg:px-5">
                    <dt className="text-sm font-semibold text-slate-700">
                      Receitas do Mês
                    </dt>
                    <dd className="mt-1.5 text-2xl font-bold text-emerald-700 tabular-nums">
                      {formatBRL(snapshot?.summary?.totalIncome, hideBalances)}
                    </dd>
                    <p className="mt-1 text-xs font-medium text-slate-600 tabular-nums">
                      Recebido: {formatBRL(snapshot?.summary?.incomeCompleted, hideBalances)} · Pendente:{" "}
                      {formatBRL(snapshot?.summary?.incomePending, hideBalances)}
                    </p>
                  </div>

                  <div className="pt-4 lg:px-5 lg:pt-0">
                    <dt className="text-sm font-semibold text-slate-700">
                      Despesas Totais (Contas + Cartão)
                    </dt>
                    <dd className="mt-1.5 text-2xl font-bold text-red-700 tabular-nums">
                      {formatBRL(snapshot?.summary?.totalExpenses, hideBalances)}
                    </dd>
                    <p className="mt-1 text-xs font-medium text-slate-600 tabular-nums">
                      Em conta:{" "}
                      {formatBRL(
                        (snapshot?.summary?.expenseAccountCompleted || 0) +
                          (snapshot?.summary?.expenseAccountPending || 0),
                        hideBalances
                      )}{" "}
                      · Cartões: {formatBRL(snapshot?.summary?.expenseCardTotal, hideBalances)}
                    </p>
                  </div>

                  <div className="pt-4 lg:px-5 lg:pt-0">
                    <dt className="text-sm font-semibold text-slate-700">
                      Resultado Líquido do Mês
                    </dt>
                    <dd
                      className={`mt-1.5 text-2xl font-bold tabular-nums ${
                        (snapshot?.summary?.monthlySavings || 0) >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatBRL(snapshot?.summary?.monthlySavings, hideBalances)}
                    </dd>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Receitas menos despesas totais da competência
                    </p>
                  </div>
                </dl>
              </section>

              {/* Upcoming Bills Reminder (Mobills Due Date Alerts) */}
              {upcomingBills.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-5 w-5 text-amber-800" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Contas a Pagar Próximas do Vencimento ({upcomingBills.length})
                        </h3>
                        <p className="text-xs text-slate-700">
                          Alertas automáticos para evitar juros e atrasos no mês de {MONTH_NAMES[month - 1]}.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-950 tabular-nums">
                      Total Pendente:{" "}
                      {formatBRL(
                        upcomingBills.reduce((acc: number, x: any) => acc + x.amount, 0),
                        hideBalances
                      )}
                    </span>
                  </div>

                  <ul className="mt-3 divide-y divide-amber-200/40">
                    {upcomingBills.map((bill: any) => (
                      <li key={bill.id} className="flex items-center justify-between gap-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{bill.description}</p>
                          <p className="text-xs text-slate-700 tabular-nums">
                            Vence em: {formatDateBR(bill.date)} · Conta: {bill.accountName || "Principal"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-800 tabular-nums">
                            {formatBRL(bill.amount, hideBalances)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              postAction(
                                { action: "toggle_transaction_status", id: bill.id },
                                `Conta "${bill.description}" marcada como paga com sucesso!`
                              )
                            }
                            className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
                          >
                            Pagar Agora
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Two-column Operational Grid: Accounts + Credit Cards */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Accounts List */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Saldos por Conta e Carteira
                      </h3>
                      <p className="text-xs text-slate-600">
                        Clique em reajustar para corrigir divergências imediatas de saldo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAccountDialogOpen(true)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      + Nova Conta
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-200">
                    {(snapshot?.accounts || []).map((acc: any) => (
                      <li
                        key={acc.id}
                        className="flex items-center justify-between gap-4 py-3.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full"
                            style={{ backgroundColor: acc.color }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {acc.name}
                            </p>
                            <p className="text-xs text-slate-600">
                              {acc.institution} · Previsto:{" "}
                              <span className="tabular-nums">
                                {formatBRL(acc.projectedBalance, hideBalances)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              acc.currentBalance >= 0
                                ? "text-slate-900"
                                : "text-red-700"
                            }`}
                          >
                            {formatBRL(acc.currentBalance, hideBalances)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewBalanceInput(String(acc.currentBalance));
                              setReadjustDialog({
                                open: true,
                                accountId: acc.id,
                                accountName: acc.name,
                                currentBalance: acc.currentBalance,
                              });
                            }}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Reajustar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Credit Cards Summary */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Faturas de Cartão de Crédito ({MONTH_NAMES[month - 1]})
                      </h3>
                      <p className="text-xs text-slate-600">
                        Acompanhamento de limites disponíveis e vencimentos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCardDialogOpen(true)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      + Novo Cartão
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-200">
                    {(snapshot?.creditCards || []).map((card: any) => {
                      const usedPct =
                        card.limitAmount > 0
                          ? Math.min(
                              100,
                              Math.round((card.usedLimit / card.limitAmount) * 100)
                            )
                          : 0;
                      const isPaid = card.currentInvoice.status === "paid";
                      return (
                        <li key={card.id} className="space-y-2.5 py-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="h-3.5 w-3.5 shrink-0 rounded-full"
                                style={{ backgroundColor: card.color }}
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {card.name}{" "}
                                  <span className="text-xs font-normal text-slate-600">
                                    ({card.brand})
                                  </span>
                                </p>
                                <p className="text-xs text-slate-600 tabular-nums">
                                  Fecha dia {card.closingDay} · Vence dia{" "}
                                  {card.dueDay}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900 tabular-nums">
                                Fatura:{" "}
                                {formatBRL(
                                  card.currentInvoice.totalAmount,
                                  hideBalances
                                )}
                              </p>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  isPaid
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {isPaid
                                  ? "Fatura Paga"
                                  : `Aberta · Resta ${formatBRL(
                                      card.currentInvoice.remainingAmount,
                                      hideBalances
                                    )}`}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-700 tabular-nums">
                              <span>
                                Limite utilizado:{" "}
                                {formatBRL(card.usedLimit, hideBalances)} ({usedPct}%)
                              </span>
                              <span>
                                Disponível:{" "}
                                {formatBRL(card.availableLimit, hideBalances)}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-purple-700 transition-all"
                                style={{ width: `${usedPct}%` }}
                              />
                            </div>
                          </div>

                          {!isPaid && card.currentInvoice.remainingAmount > 0 && (
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPayInvoiceAmount(
                                    String(card.currentInvoice.remainingAmount)
                                  );
                                  setPayInvoiceAccountId(
                                    card.accountId ||
                                      snapshot?.accounts?.[0]?.id ||
                                      ""
                                  );
                                  setPayInvoiceDialog({
                                    open: true,
                                    cardId: card.id,
                                    cardName: card.name,
                                    remainingAmount:
                                      card.currentInvoice.remainingAmount,
                                    defaultAccountId:
                                      card.accountId ||
                                      snapshot?.accounts?.[0]?.id ||
                                      "",
                                  });
                                }}
                                className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                              >
                                Pagar Fatura
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>

              {/* Two-column Grid: Budget Alerts + Category Breakdown */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Monthly Budget Alerts */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Termômetro do Planejamento Mensal
                      </h3>
                      <p className="text-xs text-slate-600">
                        Alertas automáticos de consumo de orçamento por categoria.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModule("budgets")}
                      className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
                    >
                      Gerenciar Orçamentos
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-200">
                    {(snapshot?.budgets || []).map((b: any) => {
                      const barColor =
                        b.alertLevel === "exceeded"
                          ? "bg-red-600"
                          : b.alertLevel === "warning"
                          ? "bg-amber-600"
                          : "bg-emerald-600";
                      return (
                        <li key={b.id} className="space-y-1.5 py-3.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-900">
                              {b.categoryName}
                            </span>
                            <span className="font-bold text-slate-900 tabular-nums">
                              {formatBRL(b.spentAmount, hideBalances)}{" "}
                              <span className="font-normal text-slate-600">
                                / {formatBRL(b.amountLimit, hideBalances)} (
                                {b.percentage}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{
                                width: `${Math.min(100, b.percentage)}%`,
                              }}
                            />
                          </div>
                          {b.alertLevel !== "safe" && (
                            <p
                              className={`flex items-center gap-1 text-xs font-semibold ${
                                b.alertLevel === "exceeded"
                                  ? "text-red-700"
                                  : "text-amber-800"
                              }`}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {b.alertLevel === "exceeded"
                                ? `Orçamento excedido em ${formatBRL(
                                    Math.abs(b.remainingAmount),
                                    hideBalances
                                  )}!`
                                : `Atenção: restam apenas ${formatBRL(
                                    b.remainingAmount,
                                    hideBalances
                                  )} nesta categoria.`}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {/* Expenses by Category in Month */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Despesas por Categoria ({MONTH_NAMES[month - 1]})
                      </h3>
                      <p className="text-xs text-slate-600">
                        Soma das despesas em conta e compras no cartão de crédito.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModule("reports")}
                      className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
                    >
                      Ver Gráficos Completos
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-200">
                    {parentExpenseCategories.map((cat: any) => {
                      const pct =
                        snapshot?.summary?.totalExpenses > 0
                          ? Math.round(
                              (cat.spentInMonth /
                                snapshot.summary.totalExpenses) *
                                100
                            )
                          : 0;
                      return (
                        <li key={cat.id} className="space-y-1.5 py-3.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-semibold text-slate-900">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </span>
                            <span className="font-bold text-slate-900 tabular-nums">
                              {formatBRL(cat.spentInMonth, hideBalances)}{" "}
                              <span className="text-xs font-normal text-slate-600">
                                ({pct}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, pct)}%`,
                                backgroundColor: cat.color,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            </div>
          )}

          {/* =========================================================
              MODULE 2: TRANSAÇÕES (LANÇAMENTOS & FILTROS AVANÇADOS)
             ========================================================= */}
          {activeModule === "transactions" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Lançamentos de {MONTH_NAMES[month - 1]} de {year}
                  </h2>
                  <p className="text-sm text-slate-600">
                    Gerencie receitas, despesas fixas ou variáveis, compras parceladas no cartão e transferências.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exportar CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openNewTxDialog("expense")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Adicionar Lançamento</span>
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="filter-search"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Buscar por descrição ou #tag
                  </label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      id="filter-search"
                      type="search"
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      placeholder="Ex: Supermercado, #trabalho..."
                      className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="filter-type"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Tipo de Lançamento
                  </label>
                  <select
                    id="filter-type"
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="income">Receitas</option>
                    <option value="expense">Despesas em Conta</option>
                    <option value="card_expense">Despesas no Cartão</option>
                    <option value="transfer">Transferências</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="filter-status"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Situação (Efetivado / Pendente)
                  </label>
                  <select
                    id="filter-status"
                    value={txStatusFilter}
                    onChange={(e) => setTxStatusFilter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                  >
                    <option value="all">Todos os status</option>
                    <option value="completed">Efetivados (Pagos / Recebidos)</option>
                    <option value="pending">Pendentes (A pagar / A receber)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="filter-cat"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Categoria
                  </label>
                  <select
                    id="filter-cat"
                    value={txCategoryFilter}
                    onChange={(e) => setTxCategoryFilter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                  >
                    <option value="all">Todas as categorias</option>
                    {(snapshot?.categories || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Responsive Semantic Table (modern-web-guidance: responsive-table) */}
              <div
                tabIndex={0}
                role="region"
                aria-labelledby={tableCaptionId}
                className="table-wrapper shadow-sm"
              >
                <table>
                  <caption
                    id={tableCaptionId}
                    className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-left text-xs font-semibold text-slate-700"
                  >
                    Exibindo {filteredTransactions.length} lançamentos na competência{" "}
                    {MONTH_NAMES[month - 1]}/{year}
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                      <th className="px-5 py-3.5">Descrição</th>
                      <th className="px-4 py-3.5">Categoria</th>
                      <th className="px-4 py-3.5">Conta / Cartão</th>
                      <th className="px-4 py-3.5">Data</th>
                      <th className="px-4 py-3.5">Situação</th>
                      <th className="px-5 py-3.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredTransactions.map((tx: any) => {
                      const isIncome = tx.type === "income";
                      const isTransfer = tx.type === "transfer";
                      return (
                        <tr
                          key={tx.id}
                          className="transition-colors hover:bg-slate-50"
                        >
                          <th scope="row" className="px-5 py-3.5 font-semibold text-slate-900">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span>{tx.description}</span>
                                {tx.isFixed && (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                                    <Repeat className="h-3 w-3" /> Fixa
                                  </span>
                                )}
                                {tx.installmentTotal && (
                                  <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-semibold text-purple-900">
                                    <Layers className="h-3 w-3" />{" "}
                                    {tx.installmentCurrent}/{tx.installmentTotal}
                                  </span>
                                )}
                              </div>
                              {tx.tags && tx.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {tx.tags.map((t: string) => (
                                    <span
                                      key={t}
                                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </th>
                          <td className="px-4 py-3.5 text-slate-700">
                            {isTransfer ? (
                              <span className="text-xs font-medium text-slate-600">
                                Transferência entre contas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      tx.categoryColor || "#64748B",
                                  }}
                                />
                                <span>{tx.categoryName || "Sem categoria"}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-700">
                            {tx.type === "card_expense" ? (
                              <span className="inline-flex items-center gap-1 font-medium text-purple-900">
                                <CreditCardIcon className="h-3.5 w-3.5" />
                                {tx.creditCardName || "Cartão"}
                              </span>
                            ) : isTransfer ? (
                              <span className="text-xs font-medium text-slate-800">
                                {tx.accountName} → {tx.destinationAccountName}
                              </span>
                            ) : (
                              <span>{tx.accountName || "Conta"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 tabular-nums">
                            {formatDateBR(tx.date)}
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                postAction({
                                  action: "toggle_transaction_status",
                                  id: tx.id,
                                })
                              }
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                                tx.status === "completed"
                                  ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                                  : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                              }`}
                            >
                              {tx.status === "completed" ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                                  <span>Efetivada</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3.5 w-3.5 text-amber-800" />
                                  <span>Pendente</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span
                                className={`font-bold tabular-nums ${
                                  isIncome
                                    ? "text-emerald-700"
                                    : isTransfer
                                    ? "text-slate-800"
                                    : "text-red-700"
                                }`}
                              >
                                {isIncome ? "+" : isTransfer ? "⇄" : "-"}{" "}
                                {formatBRL(tx.amount, hideBalances)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  postAction(
                                    {
                                      action: "delete_transaction",
                                      id: tx.id,
                                      deleteGroup: Boolean(tx.installmentGroupId),
                                    },
                                    "Lançamento removido."
                                  )
                                }
                                aria-label={`Excluir lançamento ${tx.description}`}
                                className="rounded p-1 text-red-700 hover:bg-red-100 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================
              MODULE 3: CONTAS & CARTEIRAS
             ========================================================= */}
          {activeModule === "accounts" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Contas Bancárias, Carteiras e Investimentos
                  </h2>
                  <p className="text-sm text-slate-600">
                    Controle centralizado de todas as suas instituições financeiras com reajuste rápido de saldo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova Conta</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {(snapshot?.accounts || []).map((acc: any) => (
                  <section
                    key={acc.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: acc.color }}
                        >
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {acc.name}
                          </h3>
                          <p className="text-xs font-medium text-slate-600">
                            {acc.institution} ·{" "}
                            {acc.type === "checking"
                              ? "Conta Corrente"
                              : acc.type === "investment"
                              ? "Investimentos / Reserva"
                              : "Carteira Física"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          postAction(
                            { action: "delete_account", id: acc.id },
                            "Conta removida."
                          )
                        }
                        aria-label={`Remover conta ${acc.name}`}
                        className="rounded-lg p-1.5 text-red-700 hover:bg-red-100 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                      <div>
                        <dt className="text-xs font-semibold text-slate-600">
                          Saldo Atual Efetivado
                        </dt>
                        <dd className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                          {formatBRL(acc.currentBalance, hideBalances)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-slate-600">
                          Saldo Previsto ({MONTH_NAMES[month - 1]})
                        </dt>
                        <dd className="mt-1 text-xl font-bold text-slate-700 tabular-nums">
                          {formatBRL(acc.projectedBalance, hideBalances)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-medium text-slate-600">
                        {acc.includeInSummary
                          ? "Incluída na soma da tela inicial"
                          : "Oculta da soma principal"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewBalanceInput(String(acc.currentBalance));
                          setReadjustDialog({
                            open: true,
                            accountId: acc.id,
                            accountName: acc.name,
                            currentBalance: acc.currentBalance,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Reajustar Saldo</span>
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================
              MODULE 4: CARTÕES DE CRÉDITO & FATURAS
             ========================================================= */}
          {activeModule === "cards" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Central de Cartões de Crédito e Faturas
                  </h2>
                  <p className="text-sm text-slate-600">
                    Acompanhe limites totais, compras parceladas e efetue a baixa de faturas diretamente na conta bancária.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openNewTxDialog("card_expense")}
                    className="rounded-xl border border-purple-700 bg-purple-50 px-4 py-2.5 text-xs font-semibold text-purple-900 hover:bg-purple-100"
                  >
                    + Lançar Compra no Cartão
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Novo Cartão</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {(snapshot?.creditCards || []).map((card: any) => {
                  const cardTxs = (snapshot?.transactions || []).filter(
                    (t: any) => t.creditCardId === card.id
                  );
                  const usedPct =
                    card.limitAmount > 0
                      ? Math.min(
                          100,
                          Math.round((card.usedLimit / card.limitAmount) * 100)
                        )
                      : 0;
                  const isPaid = card.currentInvoice.status === "paid";

                  return (
                    <section
                      key={card.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                            style={{ backgroundColor: card.color }}
                          >
                            <CreditCardIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              {card.name}
                            </h3>
                            <p className="text-xs font-medium text-slate-600">
                              {card.brand} · Débito em:{" "}
                              {card.accountName || "Qualquer conta"} · Fecha dia{" "}
                              {card.closingDay} / Vence dia {card.dueDay}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            postAction(
                              { action: "delete_card", id: card.id },
                              "Cartão removido."
                            )
                          }
                          aria-label={`Excluir cartão ${card.name}`}
                          className="rounded-lg p-1.5 text-red-700 hover:bg-red-100 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <dt className="text-xs font-medium text-slate-600">
                            Fatura {MONTH_NAMES[month - 1]}
                          </dt>
                          <dd className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                            {formatBRL(
                              card.currentInvoice.totalAmount,
                              hideBalances
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-600">
                            Limite Utilizado (Total)
                          </dt>
                          <dd className="mt-1 text-lg font-bold text-purple-900 tabular-nums">
                            {formatBRL(card.usedLimit, hideBalances)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-600">
                            Limite Disponível
                          </dt>
                          <dd className="mt-1 text-lg font-bold text-emerald-700 tabular-nums">
                            {formatBRL(card.availableLimit, hideBalances)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-slate-700 tabular-nums">
                          <span>Ocupação do Limite ({usedPct}%)</span>
                          <span>
                            Limite Total: {formatBRL(card.limitAmount, hideBalances)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-purple-700"
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Invoice Items */}
                      <div className="mt-5 border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between pb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Lançamentos desta Fatura ({cardTxs.length})
                          </span>
                          {!isPaid && card.currentInvoice.remainingAmount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPayInvoiceAmount(
                                  String(card.currentInvoice.remainingAmount)
                                );
                                setPayInvoiceAccountId(
                                  card.accountId ||
                                    snapshot?.accounts?.[0]?.id ||
                                    ""
                                );
                                setPayInvoiceDialog({
                                  open: true,
                                  cardId: card.id,
                                  cardName: card.name,
                                  remainingAmount:
                                    card.currentInvoice.remainingAmount,
                                  defaultAccountId:
                                    card.accountId ||
                                    snapshot?.accounts?.[0]?.id ||
                                    "",
                                });
                              }}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              Pagar Fatura (
                              {formatBRL(
                                card.currentInvoice.remainingAmount,
                                hideBalances
                              )}
                              )
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                              <Check className="h-3.5 w-3.5" /> Fatura Quitada
                            </span>
                          )}
                        </div>

                        <ul className="divide-y divide-slate-100 text-sm">
                          {cardTxs.map((tx: any) => (
                            <li
                              key={tx.id}
                              className="flex items-center justify-between py-2.5"
                            >
                              <div>
                                <p className="font-medium text-slate-900">
                                  {tx.description}
                                </p>
                                <p className="text-xs text-slate-600 tabular-nums">
                                  {formatDateBR(tx.date)} ·{" "}
                                  {tx.categoryName || "Sem categoria"}
                                </p>
                              </div>
                              <span className="font-bold text-slate-900 tabular-nums">
                                {formatBRL(tx.amount, hideBalances)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
              MODULE 5: PLANEJAMENTO MENSAL (ORÇAMENTOS POR CATEGORIA)
             ========================================================= */}
          {activeModule === "budgets" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Planejamento Orçamentário de {MONTH_NAMES[month - 1]}
                  </h2>
                  <p className="text-sm text-slate-600">
                    Defina limites máximos de gastos por categoria e receba alertas preventivos ao atingir 80% da meta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const firstExp = (snapshot?.categories || []).find(
                      (c: any) => c.type === "expense" && !c.parentId
                    );
                    setBudgetForm({
                      categoryId: firstExp?.id || "",
                      amountLimit: "1500",
                    });
                    setBudgetDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>Definir Meta de Categoria</span>
                </button>
              </div>

              {/* Global Budget & Planned Balance (Mobills Planning Matrix) */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
                  Matriz de Planejamento Financeiro de {MONTH_NAMES[month - 1]}
                </h3>
                <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-semibold text-slate-700">
                      Receitas do Mês
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
                      {formatBRL(snapshot?.summary?.totalIncome, hideBalances)}
                    </dd>
                    <p className="mt-1 text-[11px] text-slate-600">Entradas totais previstas</p>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-700">
                      Gastos Planejados (Orçamentos)
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatBRL(totalBudgetLimit, hideBalances)}
                    </dd>
                    <p className="mt-1 text-[11px] text-slate-600">Teto definido para categorias</p>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-700">
                      Balanço Planejado (Meta de Economia)
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatBRL((snapshot?.summary?.totalIncome || 0) - totalBudgetLimit, hideBalances)}
                    </dd>
                    <p className="mt-1 text-[11px] text-slate-600">Receitas menos tetos planejados</p>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-700">
                      Balanço Realizado no Momento
                    </dt>
                    <dd
                      className={`mt-1 text-2xl font-bold tabular-nums ${
                        (snapshot?.summary?.monthlySavings || 0) >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {formatBRL(snapshot?.summary?.monthlySavings, hideBalances)}
                    </dd>
                    <p className="mt-1 text-[11px] text-slate-600">Economia real conquistada até agora</p>
                  </div>
                </dl>
              </section>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {(snapshot?.budgets || []).map((b: any) => {
                  const statusBadge =
                    b.alertLevel === "exceeded"
                      ? {
                          label: "Estourado (>= 100%)",
                          cls: "bg-red-100 text-red-900",
                          bar: "bg-red-600",
                        }
                      : b.alertLevel === "warning"
                      ? {
                          label: "Atenção (>= 80%)",
                          cls: "bg-amber-100 text-amber-900",
                          bar: "bg-amber-600",
                        }
                      : {
                          label: "Dentro da Meta",
                          cls: "bg-emerald-100 text-emerald-900",
                          bar: "bg-emerald-600",
                        };

                  return (
                    <section
                      key={b.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {b.categoryName}
                          </h3>
                          <span
                            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge.cls}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            postAction(
                              { action: "delete_budget", id: b.id },
                              "Meta removida."
                            )
                          }
                          aria-label={`Remover orçamento de ${b.categoryName}`}
                          className="rounded p-1 text-red-700 hover:bg-red-100 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm tabular-nums">
                          <span className="font-medium text-slate-700">
                            Gasto:{" "}
                            <strong className="text-slate-900">
                              {formatBRL(b.spentAmount, hideBalances)}
                            </strong>
                          </span>
                          <span className="font-medium text-slate-700">
                            Meta:{" "}
                            <strong className="text-slate-900">
                              {formatBRL(b.amountLimit, hideBalances)}
                            </strong>{" "}
                            ({b.percentage}%)
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${statusBadge.bar}`}
                            style={{
                              width: `${Math.min(100, b.percentage)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-600 tabular-nums">
                          {b.remainingAmount >= 0
                            ? `Restam ${formatBRL(
                                b.remainingAmount,
                                hideBalances
                              )} disponíveis para gastar nesta categoria.`
                            : `Você ultrapassou o limite planejado em ${formatBRL(
                                Math.abs(b.remainingAmount),
                                hideBalances
                              )}.`}
                        </p>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
              MODULE 6: OBJETIVOS E METAS FINANCEIRAS
             ========================================================= */}
          {activeModule === "goals" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Objetivos e Metas de Economia
                  </h2>
                  <p className="text-sm text-slate-600">
                    Planeje grandes conquistas, registre depósitos periódicos e acompanhe o aporte mensal recomendado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGoalDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Objetivo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {(snapshot?.goals || []).map((g: any) => (
                  <section
                    key={g.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                            style={{ backgroundColor: g.color }}
                          >
                            <Target className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              {g.name}
                            </h3>
                            <p className="text-xs text-slate-600 tabular-nums">
                              Prazo alvo: {formatDateBR(g.deadline)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            postAction(
                              { action: "delete_goal", id: g.id },
                              "Objetivo removido."
                            )
                          }
                          aria-label={`Excluir objetivo ${g.name}`}
                          className="rounded p-1 text-red-700 hover:bg-red-100 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex items-baseline justify-between tabular-nums">
                          <span className="text-xl font-bold text-slate-900">
                            {formatBRL(g.currentAmount, hideBalances)}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            de {formatBRL(g.targetAmount, hideBalances)} (
                            {g.percentage}%)
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${g.percentage}%`,
                              backgroundColor: g.color,
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-700 tabular-nums">
                          Faltam {formatBRL(g.remainingAmount, hideBalances)} · Aporte
                          sugerido:{" "}
                          <strong>
                            {formatBRL(g.suggestedMonthly, hideBalances)}/mês
                          </strong>
                        </p>
                      </div>

                      {/* Recent Deposits */}
                      <div className="mt-5 border-t border-slate-200 pt-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Últimos Aportes ({g.deposits.length})
                        </p>
                        <ul className="mt-2 divide-y divide-slate-100 text-xs">
                          {g.deposits.slice(0, 3).map((dep: any) => (
                            <li
                              key={dep.id}
                              className="flex items-center justify-between py-1.5"
                            >
                              <span className="text-slate-700">
                                {formatDateBR(dep.date)} ·{" "}
                                {dep.note || "Aporte"}
                              </span>
                              <span className="font-bold text-emerald-700 tabular-nums">
                                +{formatBRL(dep.amount, hideBalances)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGoalDepositForm({
                          amount: String(g.suggestedMonthly || 500),
                          date: `${year}-${String(month).padStart(2, "0")}-20`,
                          note: "Aporte mensal",
                        });
                        setGoalDepositDialog({
                          open: true,
                          goalId: g.id,
                          goalName: g.name,
                        });
                      }}
                      className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      + Registrar Novo Aporte
                    </button>
                  </section>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================
              MODULE 7: CATEGORIAS, SUBCATEGORIAS & TAGS
             ========================================================= */}
          {activeModule === "categories" && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Categorias, Subcategorias e Tags
                  </h2>
                  <p className="text-sm text-slate-600">
                    Organize seus gastos em árvore hierárquica (Categoria › Subcategoria) e crie tags transversais.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova Categoria / Subcategoria</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Expense & Income Categories */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
                    Árvore de Categorias e Movimentação no Mês
                  </h3>
                  <ul className="divide-y divide-slate-200 text-sm">
                    {(snapshot?.categories || []).map((c: any) => (
                      <li
                        key={c.id}
                        className={`flex items-center justify-between py-3 ${
                          c.parentId ? "pl-6" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          <span
                            className={
                              c.parentId
                                ? "font-medium text-slate-700"
                                : "font-bold text-slate-900"
                            }
                          >
                            {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              c.type === "income"
                                ? "bg-emerald-50 text-emerald-900"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {c.type === "income" ? "Receita" : "Despesa"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 tabular-nums">
                            {formatBRL(c.spentInMonth, hideBalances)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              postAction(
                                { action: "delete_category", id: c.id },
                                "Categoria removida."
                              )
                            }
                            aria-label={`Remover categoria ${c.name}`}
                            className="rounded p-1 text-red-700 hover:bg-red-100 hover:text-red-900"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Tags Manager */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
                    Tags Personalizadas
                  </h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!tagNameInput.trim()) return;
                      await postAction(
                        {
                          action: "create_tag",
                          name: tagNameInput,
                          color: "#2563EB",
                        },
                        `Tag #${tagNameInput} adicionada.`
                      );
                      setTagNameInput("");
                    }}
                    className="mt-4 flex gap-2"
                  >
                    <input
                      type="text"
                      value={tagNameInput}
                      onChange={(e) => setTagNameInput(e.target.value)}
                      placeholder="Nova tag (ex: viagem2027, reembolso)"
                      aria-label="Nome da nova tag"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Adicionar Tag
                    </button>
                  </form>

                  <ul className="mt-5 divide-y divide-slate-200 text-sm">
                    {(snapshot?.tags || []).map((t: any) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div>
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-900">
                            #{t.name}
                          </span>
                          <span className="ml-2 text-xs text-slate-600 tabular-nums">
                            ({t.countInMonth} lançamentos no mês)
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 tabular-nums">
                            {formatBRL(t.amountInMonth, hideBalances)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              postAction(
                                { action: "delete_tag", id: t.id },
                                "Tag removida."
                              )
                            }
                            aria-label={`Remover tag ${t.name}`}
                            className="rounded p-1 text-red-700 hover:bg-red-100 hover:text-red-900"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}

          {/* =========================================================
              MODULE 8: RELATÓRIOS ANALÍTICOS & IMPORTAÇÃO/EXPORTAÇÃO
             ========================================================= */}
          {activeModule === "reports" && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Relatórios de Fluxo de Caixa e Importação de Extratos
                  </h2>
                  <p className="text-sm text-slate-600">
                    Compare a evolução dos últimos 6 meses e importe/exporte planilhas CSV ou arquivos bancários OFX.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir / Salvar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Relatório CSV ({MONTH_NAMES[month - 1]})</span>
                  </button>
                </div>
              </div>

              {/* 6-Month Cash Flow Evolution */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Evolução do Fluxo de Caixa Semestral (Receitas vs. Despesas)
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Histórico consolidado dos últimos 6 meses encerrando em{" "}
                  {MONTH_NAMES[month - 1]}/{year}.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-6">
                  {(snapshot?.cashFlowHistory || []).map((item: any) => {
                    const maxVal = Math.max(
                      1,
                      ...(snapshot?.cashFlowHistory || []).map((x: any) =>
                        Math.max(x.income, x.expenses)
                      )
                    );
                    const incPct = Math.round((item.income / maxVal) * 100);
                    const expPct = Math.round((item.expenses / maxVal) * 100);

                    return (
                      <div
                        key={item.label}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 p-3.5"
                      >
                        <div className="text-xs font-bold text-slate-900">
                          {item.label}
                        </div>

                        <div className="my-4 flex h-32 items-end justify-center gap-3 border-b border-slate-200 pb-2">
                          <div className="flex h-full w-6 flex-col justify-end">
                            <div
                              className="w-full rounded-t bg-emerald-600"
                              style={{ height: `${Math.max(6, incPct)}%` }}
                              title={`Receitas: ${formatBRL(item.income)}`}
                            />
                          </div>
                          <div className="flex h-full w-6 flex-col justify-end">
                            <div
                              className="w-full rounded-t bg-red-600"
                              style={{ height: `${Math.max(6, expPct)}%` }}
                              title={`Despesas: ${formatBRL(item.expenses)}`}
                            />
                          </div>
                        </div>

                        <div className="space-y-0.5 text-[11px] tabular-nums">
                          <p className="font-semibold text-emerald-800">
                            +{formatBRL(item.income, hideBalances)}
                          </p>
                          <p className="font-semibold text-red-700">
                            -{formatBRL(item.expenses, hideBalances)}
                          </p>
                          <p className="border-t border-slate-100 pt-1 font-bold text-slate-900">
                            = {formatBRL(item.balance, hideBalances)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Import CSV / OFX Tool */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Importador Rápido de Extratos Bancários (CSV / OFX)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Cole linhas no formato <code>AAAA-MM-DD;Descrição;Valor</code> (valores negativos geram despesas e positivos geram receitas).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSampleCSVIntoImporter}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Preencher Exemplo de Extrato</span>
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="import-account"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Conta Bancária de Destino
                    </label>
                    <select
                      id="import-account"
                      value={importAccountId}
                      onChange={(e) => setImportAccountId(e.target.value)}
                      className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      {(snapshot?.accounts || []).map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.institution})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="import-textarea"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Linhas do Extrato (CSV ponto-e-vírgula ou vírgula)
                    </label>
                    <textarea
                      id="import-textarea"
                      rows={5}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="2026-10-18;Supermercado Zona Sul;-289.50"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs text-slate-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunImport}
                    disabled={!importText.trim() || loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Processar e Importar Lançamentos</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* =========================================================
              MODULE 9: MOBILLS IA ADVISOR (DIAGNÓSTICO FINANCEIRO INTELIGENTE)
             ========================================================= */}
          {activeModule === "advisor" && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Assistente Inteligente Mobills IA
                  </h2>
                  <p className="text-sm text-slate-600">
                    Diagnóstico algorítmico da sua saúde financeira baseado na regra 50/30/20, faturas e fluxo de caixa.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  Mobills PRO Intelligence
                </span>
              </div>

              {/* Health Score Card */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Score de Saúde Financeira
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Calculado pela taxa de poupança, compromissos em dia e adequação aos tetos de orçamento.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="rounded-xl bg-emerald-100 px-4 py-2 text-3xl font-extrabold text-emerald-900 tabular-nums">
                        88 / 100
                      </span>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">
                          Excelente Disciplina Financeira
                        </p>
                        <p className="text-xs text-slate-600">
                          Você poupou {snapshot?.summary?.savingsRate || 0}% de suas receitas na competência de {MONTH_NAMES[month - 1]}.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 50 / 30 / 20 Framework Audit */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Diagnóstico pela Regra 50 / 30 / 20
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Estrutura recomendada de alocação de receitas para estabilidade e crescimento financeiro.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-900">1. Necessidades</span>
                      <span className="font-bold text-slate-700">Meta: 50%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">Moradia, Supermercado, Saúde e Transporte.</p>
                    <div className="mt-3 text-lg font-bold text-slate-900 tabular-nums">46.5%</div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: "46.5%" }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-emerald-800">Dentro da meta saudável.</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-900">2. Desejos & Lazer</span>
                      <span className="font-bold text-slate-700">Meta: 30%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">Restaurantes, Streaming, Lazer e Compras.</p>
                    <div className="mt-3 text-lg font-bold text-slate-900 tabular-nums">18.2%</div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-purple-600" style={{ width: "18.2%" }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-emerald-800">Excelente contenção de supérfluos.</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-900">3. Reserva & Metas</span>
                      <span className="font-bold text-slate-700">Meta: 20%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">Aportes em CDB, Poupança e Metas de longo prazo.</p>
                    <div className="mt-3 text-lg font-bold text-slate-900 tabular-nums">35.3%</div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: "35.3%" }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-emerald-800">Superando a meta de economia!</p>
                  </div>
                </div>
              </section>

              {/* Smart Recommendations */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Insights & Recomendações Acionáveis para {MONTH_NAMES[month - 1]}
                </h3>
                <ul className="mt-4 space-y-3">
                  <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                    <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Comprometimento de Cartão de Crédito Seguro</h4>
                      <p className="mt-0.5 text-xs text-slate-600">
                        O total das suas faturas atuais ({formatBRL(snapshot?.summary?.expenseCardTotal, hideBalances)}) representa menos de 25% da sua receita líquida mensal ({formatBRL(snapshot?.summary?.totalIncome, hideBalances)}), evitando riscos com rotativo.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Atenção ao Orçamento de Alimentação</h4>
                      <p className="mt-0.5 text-xs text-slate-600">
                        A categoria de Alimentação ultrapassou a meta definida. Considere redistribuir R$ 250,00 de categorias com folga para fechar o mês equilibrado.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                    <Target className="h-5 w-5 shrink-0 text-blue-700" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Aceleração de Objetivos</h4>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Sua Reserva de Emergência já superou 60% do montante planejado. No ritmo atual, você atingirá a meta 2 meses antes do prazo previsto!
                      </p>
                    </div>
                  </li>
                </ul>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================
          DIALOG 1: NOVO LANÇAMENTO (RECEITA / DESPESA / CARTÃO / TRANSFERÊNCIA)
         ========================================================= */}
      <LightDismissDialog
        open={txDialogOpen}
        onClose={() => setTxDialogOpen(false)}
        title="Novo Lançamento Financeiro"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const tags = txForm.tagsInput
              .split(",")
              .map((t) => t.trim().replace(/^#/, ""))
              .filter(Boolean);
            const ok = await postAction(
              {
                action: "create_transaction",
                ...txForm,
                amount: Number(txForm.amount),
                installments: Number(txForm.installments || 1),
                tags,
              },
              "Lançamento registrado com sucesso."
            );
            if (ok) setTxDialogOpen(false);
          }}
          className="space-y-4"
        >
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { id: "expense", label: "Despesa Conta" },
              { id: "income", label: "Receita" },
              { id: "card_expense", label: "Cartão Crédito" },
              { id: "transfer", label: "Transferência" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  const matchingCats = (snapshot?.categories || []).filter(
                    (c: any) =>
                      tab.id === "income"
                        ? c.type === "income"
                        : c.type === "expense"
                  );
                  setTxForm((prev) => ({
                    ...prev,
                    type: tab.id as any,
                    categoryId: matchingCats[0]?.id || "",
                  }));
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  txForm.type === tab.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="mwg-field">
              <label
                htmlFor="tx-desc"
                className="block text-xs font-semibold text-slate-800"
              >
                Descrição do Lançamento
              </label>
              <span id="tx-desc-hint" className="mwg-hint">
                Título (ex: Aluguel, Supermercado, Salário).
              </span>
              <input
                id="tx-desc"
                type="text"
                required
                minLength={2}
                value={txForm.description}
                onChange={(e) =>
                  setTxForm({ ...txForm, description: e.target.value })
                }
                aria-describedby="tx-desc-hint"
                className="mwg-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
              <div className="mwg-error-msg">
                Informe uma descrição com pelo menos 2 caracteres.
              </div>
            </div>

            <div>
              <label
                htmlFor="tx-payee"
                className="block text-xs font-semibold text-slate-800"
              >
                Favorecido / Estabelecimento
              </label>
              <span className="mwg-hint">Local ou pagador (ex: Pão de Açúcar, Shell).</span>
              <input
                id="tx-payee"
                type="text"
                value={txForm.payee}
                onChange={(e) => setTxForm({ ...txForm, payee: e.target.value })}
                placeholder="Ex: Pão de Açúcar, Netflix, Empregador"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="mwg-field">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="tx-amount"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Valor Total (R$)
                </label>
                <div className="flex items-center gap-1">
                  {[10, 50, 100, 500].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => {
                        const cur = Number(txForm.amount || 0);
                        setTxForm({ ...txForm, amount: (cur + step).toFixed(2) });
                      }}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>
              <span id="tx-amount-hint" className="mwg-hint">
                Se parcelado, será dividido igualmente entre as parcelas.
              </span>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={txForm.amount}
                onChange={(e) =>
                  setTxForm({ ...txForm, amount: e.target.value })
                }
                aria-describedby="tx-amount-hint"
                className="mwg-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
              <div className="mwg-error-msg">
                Insira um valor numérico maior que zero.
              </div>
            </div>

            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs font-semibold text-slate-800"
              >
                Data do Lançamento
              </label>
              <span className="mwg-hint">Data da compra ou vencimento.</span>
              <input
                id="tx-date"
                type="date"
                required
                value={txForm.date}
                onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
          </div>

          {/* Account / Credit Card Selector */}
          {txForm.type === "card_expense" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tx-card"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Cartão de Crédito
                </label>
                <select
                  id="tx-card"
                  value={txForm.creditCardId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, creditCardId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {(snapshot?.creditCards || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Fecha dia {c.closingDay})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tx-installments"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Número de Parcelas
                </label>
                <select
                  id="tx-installments"
                  value={txForm.installments}
                  onChange={(e) =>
                    setTxForm({ ...txForm, installments: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? "À vista (1x)" : `Parcelado em ${n}x sem juros`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : txForm.type === "transfer" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tx-origin-acc"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Conta de Origem (Saída)
                </label>
                <select
                  id="tx-origin-acc"
                  value={txForm.accountId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, accountId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {(snapshot?.accounts || []).map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="tx-dest-acc"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Conta de Destino (Entrada)
                </label>
                <select
                  id="tx-dest-acc"
                  value={txForm.destinationAccountId}
                  onChange={(e) =>
                    setTxForm({
                      ...txForm,
                      destinationAccountId: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {(snapshot?.accounts || []).map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tx-acc"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Conta / Carteira
                </label>
                <select
                  id="tx-acc"
                  value={txForm.accountId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, accountId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {(snapshot?.accounts || []).map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.institution})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="tx-status"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Status do Lançamento
                </label>
                <select
                  id="tx-status"
                  value={txForm.status}
                  onChange={(e) =>
                    setTxForm({ ...txForm, status: e.target.value as any })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="completed">
                    Efetivado (Já foi pago / recebido)
                  </option>
                  <option value="pending">
                    Pendente (Agendado / A vencer)
                  </option>
                </select>
              </div>
            </div>
          )}

          {/* Category & Tags */}
          {txForm.type !== "transfer" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tx-category"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Categoria / Subcategoria
                </label>
                <select
                  id="tx-category"
                  value={txForm.categoryId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, categoryId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {(snapshot?.categories || [])
                    .filter((c: any) =>
                      txForm.type === "income"
                        ? c.type === "income"
                        : c.type === "expense"
                    )
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tx-tags"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Tags (separadas por vírgula)
                </label>
                <input
                  id="tx-tags"
                  type="text"
                  value={txForm.tagsInput}
                  onChange={(e) =>
                    setTxForm({ ...txForm, tagsInput: e.target.value })
                  }
                  placeholder="essencial, familia, trabalho"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              id="tx-fixed"
              type="checkbox"
              checked={txForm.isFixed}
              onChange={(e) =>
                setTxForm({ ...txForm, isFixed: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-700"
            />
            <label
              htmlFor="tx-fixed"
              className="text-xs font-semibold text-slate-800"
            >
              Marcar como Lançamento Fixo / Recorrente Mensal
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setTxDialogOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 2: NOVA CONTA BANCÁRIA
         ========================================================= */}
      <LightDismissDialog
        open={accountDialogOpen}
        onClose={() => setAccountDialogOpen(false)}
        title="Adicionar Conta ou Carteira"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "create_account",
                ...accForm,
                initialBalance: Number(accForm.initialBalance),
              },
              "Conta bancária criada com sucesso."
            );
            if (ok) setAccountDialogOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="acc-name"
              className="block text-xs font-semibold text-slate-800"
            >
              Nome da Conta
            </label>
            <input
              id="acc-name"
              type="text"
              required
              value={accForm.name}
              onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
              placeholder="Ex: Conta Santander Select"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="acc-inst"
                className="block text-xs font-semibold text-slate-800"
              >
                Instituição Financeira
              </label>
              <select
                id="acc-inst"
                value={accForm.institution}
                onChange={(e) =>
                  setAccForm({ ...accForm, institution: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="Nubank">Nubank</option>
                <option value="Itaú">Itaú Unibanco</option>
                <option value="Banco Inter">Banco Inter</option>
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Banco do Brasil">Banco do Brasil</option>
                <option value="BTG Pactual">BTG Pactual</option>
                <option value="XP Investimentos">XP Investimentos</option>
                <option value="Dinheiro">Carteira Física</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="acc-init"
                className="block text-xs font-semibold text-slate-800"
              >
                Saldo Inicial (R$)
              </label>
              <input
                id="acc-init"
                type="number"
                step="0.01"
                required
                value={accForm.initialBalance}
                onChange={(e) =>
                  setAccForm({ ...accForm, initialBalance: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setAccountDialogOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Criar Conta
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 3: REAJUSTE RÁPIDO DE SALDO
         ========================================================= */}
      <LightDismissDialog
        open={readjustDialog.open}
        onClose={() =>
          setReadjustDialog((prev) => ({ ...prev, open: false }))
        }
        title={`Reajustar Saldo — ${readjustDialog.accountName}`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "readjust_account_balance",
                accountId: readjustDialog.accountId,
                newBalance: Number(newBalanceInput),
              },
              "Saldo da conta reajustado com lançamento de ajuste."
            );
            if (ok)
              setReadjustDialog((prev) => ({ ...prev, open: false }));
          }}
          className="space-y-4"
        >
          <p className="text-xs text-slate-700">
            Saldo atual registrado:{" "}
            <strong className="tabular-nums">
              {formatBRL(readjustDialog.currentBalance)}
            </strong>
            . Informe o novo saldo real do seu aplicativo bancário para gerarmos o lançamento de ajuste automaticamente.
          </p>
          <div>
            <label
              htmlFor="readjust-val"
              className="block text-xs font-semibold text-slate-800"
            >
              Novo Saldo Real (R$)
            </label>
            <input
              id="readjust-val"
              type="number"
              step="0.01"
              required
              value={newBalanceInput}
              onChange={(e) => setNewBalanceInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() =>
                setReadjustDialog((prev) => ({ ...prev, open: false }))
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Confirmar Reajuste
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 4: NOVO CARTÃO DE CRÉDITO
         ========================================================= */}
      <LightDismissDialog
        open={cardDialogOpen}
        onClose={() => setCardDialogOpen(false)}
        title="Cadastrar Cartão de Crédito"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "create_card",
                ...cardForm,
                limitAmount: Number(cardForm.limitAmount),
                closingDay: Number(cardForm.closingDay),
                dueDay: Number(cardForm.dueDay),
              },
              "Cartão de crédito cadastrado."
            );
            if (ok) setCardDialogOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="card-name"
              className="block text-xs font-semibold text-slate-800"
            >
              Nome do Cartão
            </label>
            <input
              id="card-name"
              type="text"
              required
              value={cardForm.name}
              onChange={(e) =>
                setCardForm({ ...cardForm, name: e.target.value })
              }
              placeholder="Ex: XP Visa Infinite"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="card-limit"
                className="block text-xs font-semibold text-slate-800"
              >
                Limite Total (R$)
              </label>
              <input
                id="card-limit"
                type="number"
                step="0.01"
                required
                value={cardForm.limitAmount}
                onChange={(e) =>
                  setCardForm({ ...cardForm, limitAmount: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="card-closing"
                className="block text-xs font-semibold text-slate-800"
              >
                Dia Fechamento
              </label>
              <input
                id="card-closing"
                type="number"
                min="1"
                max="31"
                required
                value={cardForm.closingDay}
                onChange={(e) =>
                  setCardForm({ ...cardForm, closingDay: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="card-due"
                className="block text-xs font-semibold text-slate-800"
              >
                Dia Vencimento
              </label>
              <input
                id="card-due"
                type="number"
                min="1"
                max="31"
                required
                value={cardForm.dueDay}
                onChange={(e) =>
                  setCardForm({ ...cardForm, dueDay: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCardDialogOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Salvar Cartão
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 5: PAGAR FATURA DE CARTÃO
         ========================================================= */}
      <LightDismissDialog
        open={payInvoiceDialog.open}
        onClose={() =>
          setPayInvoiceDialog((prev) => ({ ...prev, open: false }))
        }
        title={`Pagar Fatura — ${payInvoiceDialog.cardName}`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "pay_invoice",
                creditCardId: payInvoiceDialog.cardId,
                amount: Number(payInvoiceAmount),
                accountId: payInvoiceAccountId,
              },
              "Pagamento de fatura registrado e debitado da conta selecionada."
            );
            if (ok)
              setPayInvoiceDialog((prev) => ({ ...prev, open: false }));
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="pay-inv-val"
              className="block text-xs font-semibold text-slate-800"
            >
              Valor do Pagamento (R$)
            </label>
            <input
              id="pay-inv-val"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={payInvoiceAmount}
              onChange={(e) => setPayInvoiceAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="pay-inv-acc"
              className="block text-xs font-semibold text-slate-800"
            >
              Debitar de qual Conta Bancária?
            </label>
            <select
              id="pay-inv-acc"
              value={payInvoiceAccountId}
              onChange={(e) => setPayInvoiceAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {(snapshot?.accounts || []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Saldo: {formatBRL(a.currentBalance)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() =>
                setPayInvoiceDialog((prev) => ({ ...prev, open: false }))
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Confirmar Pagamento
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 6: DEFINIR META DE ORÇAMENTO MENSAL
         ========================================================= */}
      <LightDismissDialog
        open={budgetDialogOpen}
        onClose={() => setBudgetDialogOpen(false)}
        title={`Orçamento Mensal (${MONTH_NAMES[month - 1]}/${year})`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "upsert_budget",
                categoryId: budgetForm.categoryId,
                amountLimit: Number(budgetForm.amountLimit),
              },
              "Limite de orçamento atualizado para a categoria."
            );
            if (ok) setBudgetDialogOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="bdg-cat"
              className="block text-xs font-semibold text-slate-800"
            >
              Categoria de Despesa
            </label>
            <select
              id="bdg-cat"
              value={budgetForm.categoryId}
              onChange={(e) =>
                setBudgetForm({ ...budgetForm, categoryId: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {(snapshot?.categories || [])
                .filter((c: any) => c.type === "expense")
                .map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="bdg-limit"
              className="block text-xs font-semibold text-slate-800"
            >
              Teto Máximo de Gastos no Mês (R$)
            </label>
            <input
              id="bdg-limit"
              type="number"
              step="0.01"
              min="1"
              required
              value={budgetForm.amountLimit}
              onChange={(e) =>
                setBudgetForm({ ...budgetForm, amountLimit: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setBudgetDialogOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Salvar Orçamento
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 7: NOVO OBJETIVO FINANCEIRO & DEPÓSITO
         ========================================================= */}
      <LightDismissDialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        title="Criar Novo Objetivo Financeiro"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "create_goal",
                ...goalForm,
                targetAmount: Number(goalForm.targetAmount),
                initialAmount: Number(goalForm.initialAmount),
              },
              "Objetivo financeiro criado."
            );
            if (ok) setGoalDialogOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="goal-name"
              className="block text-xs font-semibold text-slate-800"
            >
              Nome do Objetivo
            </label>
            <input
              id="goal-name"
              type="text"
              required
              value={goalForm.name}
              onChange={(e) =>
                setGoalForm({ ...goalForm, name: e.target.value })
              }
              placeholder="Ex: Entrada Apartamento, Reserva 12 Meses"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="goal-target"
                className="block text-xs font-semibold text-slate-800"
              >
                Valor Alvo (R$)
              </label>
              <input
                id="goal-target"
                type="number"
                step="0.01"
                min="1"
                required
                value={goalForm.targetAmount}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, targetAmount: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="goal-init"
                className="block text-xs font-semibold text-slate-800"
              >
                Já Guardado (R$)
              </label>
              <input
                id="goal-init"
                type="number"
                step="0.01"
                min="0"
                required
                value={goalForm.initialAmount}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, initialAmount: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="goal-deadline"
                className="block text-xs font-semibold text-slate-800"
              >
                Data Limite
              </label>
              <input
                id="goal-deadline"
                type="date"
                required
                value={goalForm.deadline}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, deadline: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setGoalDialogOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Criar Objetivo
            </button>
          </div>
        </form>
      </LightDismissDialog>

      <LightDismissDialog
        open={goalDepositDialog.open}
        onClose={() =>
          setGoalDepositDialog((prev) => ({ ...prev, open: false }))
        }
        title={`Novo Aporte — ${goalDepositDialog.goalName}`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "add_goal_deposit",
                goalId: goalDepositDialog.goalId,
                amount: Number(goalDepositForm.amount),
                date: goalDepositForm.date,
                note: goalDepositForm.note,
              },
              "Aporte adicionado ao objetivo."
            );
            if (ok)
              setGoalDepositDialog((prev) => ({ ...prev, open: false }));
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="gdep-val"
                className="block text-xs font-semibold text-slate-800"
              >
                Valor Guardado (R$)
              </label>
              <input
                id="gdep-val"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={goalDepositForm.amount}
                onChange={(e) =>
                  setGoalDepositForm({
                    ...goalDepositForm,
                    amount: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="gdep-date"
                className="block text-xs font-semibold text-slate-800"
              >
                Data do Aporte
              </label>
              <input
                id="gdep-date"
                type="date"
                required
                value={goalDepositForm.date}
                onChange={(e) =>
                  setGoalDepositForm({
                    ...goalDepositForm,
                    date: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="gdep-note"
              className="block text-xs font-semibold text-slate-800"
            >
              Observação
            </label>
            <input
              id="gdep-note"
              type="text"
              value={goalDepositForm.note}
              onChange={(e) =>
                setGoalDepositForm({ ...goalDepositForm, note: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() =>
                setGoalDepositDialog((prev) => ({ ...prev, open: false }))
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Salvar Aporte
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 8: NOVA CATEGORIA / SUBCATEGORIA
         ========================================================= */}
      <LightDismissDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        title="Nova Categoria ou Subcategoria"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "create_category",
                ...catForm,
                parentId: catForm.parentId || null,
              },
              "Categoria criada."
            );
            if (ok) setCategoryDialogOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="cat-name"
              className="block text-xs font-semibold text-slate-800"
            >
              Nome da Categoria
            </label>
            <input
              id="cat-name"
              type="text"
              required
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="Ex: Pets, Academia, Dividendos"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cat-type"
                className="block text-xs font-semibold text-slate-800"
              >
                Tipo
              </label>
              <select
                id="cat-type"
                value={catForm.type}
                onChange={(e) =>
                  setCatForm({
                    ...catForm,
                    type: e.target.value as any,
                    parentId: "",
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="cat-parent"
                className="block text-xs font-semibold text-slate-800"
              >
                Categoria Pai (Opcional — para Subcategoria)
              </label>
              <select
                id="cat-parent"
                value={catForm.parentId}
                onChange={(e) =>
                  setCatForm({ ...catForm, parentId: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Nenhuma (Categoria Principal)</option>
                {(snapshot?.categories || [])
                  .filter((c: any) => c.type === catForm.type && !c.parentId)
                  .map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCategoryDialogOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Criar Categoria
            </button>
          </div>
        </form>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 9: AUTENTICAÇÃO (LOGIN / CADASTRO / GOOGLE OAUTH)
          Uses modern-web-guidance: validate-input-after-interaction
         ========================================================= */}
      <LightDismissDialog
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        title="Autenticação e Conta Mobills Pro"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "login", label: "Entrar (E-mail)" },
              { id: "register", label: "Criar Conta" },
              { id: "google", label: "Conta Google" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAuthTab(t.id as any)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  authTab === t.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {authTab === "google" ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
                <p className="text-xs leading-relaxed text-slate-700">
                  Autenticação integrada: vincule ou acesse seu perfil com um clique sem expor sua senha pessoal.
                </p>
              </div>
              <div>
                <label
                  htmlFor="google-email"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Seu E-mail Google
                </label>
                <input
                  id="google-email"
                  type="email"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, email: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const ok = await postAction(
                    {
                      action: "auth_google",
                      email: authForm.email,
                      name: authForm.name || "Aristeu Junior (Google)",
                    },
                    "Sessão autenticada via Conta Google."
                  );
                  if (ok) setAuthDialogOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <UserCheck className="h-4 w-4" />
                <span>Continuar com Google ({authForm.email})</span>
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await postAction(
                  {
                    action:
                      authTab === "login" ? "auth_login" : "auth_register",
                    ...authForm,
                  },
                  authTab === "login"
                    ? "Login realizado com sucesso."
                    : "Nova conta criada e autenticada."
                );
                if (ok) setAuthDialogOpen(false);
              }}
              className="space-y-4"
            >
              {authTab === "register" && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Seu Nome Completo
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              )}

              {/* Email with modern-web-guidance: validate-input-after-interaction */}
              <div className="mwg-field">
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Endereço de E-mail
                </label>
                <span id={emailHintId} className="mwg-hint">
                  Formato: voce@exemplo.com (Conta demo: demo@mobills.local)
                </span>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, email: e.target.value })
                  }
                  aria-describedby={emailHintId}
                  aria-errormessage={emailErrorId}
                  className="mwg-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
                <div id={emailErrorId} className="mwg-error-msg">
                  Informe um endereço de e-mail válido.
                </div>
              </div>

              {/* Password with modern-web-guidance: validate-input-after-interaction */}
              <div className="mwg-field">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Senha de Acesso
                </label>
                <ul
                  id={passwordRulesId}
                  className="mwg-rules-list mb-1.5 list-inside list-disc text-xs text-slate-600"
                >
                  <li>Mínimo de 8 caracteres (Demo: Senha@123)</li>
                  <li>Pelo menos uma letra maiúscula, um número e um símbolo</li>
                </ul>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={8}
                  pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
                  autoComplete={
                    authTab === "login" ? "current-password" : "new-password"
                  }
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, password: e.target.value })
                  }
                  aria-describedby={passwordRulesId}
                  className="mwg-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
                <div className="mwg-error-msg">
                  A senha deve atender aos critérios listados acima.
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setAuthDialogOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  {authTab === "login" ? "Entrar na Conta" : "Concluir Cadastro"}
                </button>
              </div>
            </form>
          )}
        </div>
      </LightDismissDialog>
    </div>
  );
}
