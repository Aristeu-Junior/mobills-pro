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
  Edit2,
  Archive,
  ArchiveRestore,
  RotateCcw,
  RefreshCw,
  FileText,
  Calendar,
  Sun,
  Moon,
  Smartphone,
  FileUp,
  Paperclip,
  Image as ImageIcon,
  Percent,
  CheckSquare,
  Square,
  Bot,
  Send,
  MessageSquare,
  Zap,
  HelpCircle,
  AlertOctagon,
} from "lucide-react";
import {
  analyzeFinancialHealth,
  simulatePurchase,
  answerConsultantQuestion,
  PurchaseSimulationResult,
  ConsultantChatMessage,
} from "@/lib/financial-advisor";
import { LightDismissDialog } from "./LightDismissDialog";
import { AdvisorModule } from "./AdvisorModule";
import {
  getClientStore,
  saveClientStore,
  buildClientSnapshot,
  getInitialSeedData,
  clearToZero,
  restoreDemo,
  isStoreZeroed,
  ONBOARDING_CHOICE_KEY,
} from "@/lib/client-store";
import { parseOFX, parseCSV, detectCategory, ImportedTransaction } from "@/lib/bank-importer";

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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [dashTab, setDashTab] = useState<"executive" | "accounts_cards" | "budgets_goals" | "categories">("executive");
  const [welcomeModalOpen, setWelcomeModalOpen] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");
  const [month, setMonth] = useState<number>(initialData?.period?.month || 10);
  const [year, setYear] = useState<number>(initialData?.period?.year || 2026);
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Transaction Filters & Period Presets
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");
  const [txStatusFilter, setTxStatusFilter] = useState<string>("all");
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>("all");
  const [txSearch, setTxSearch] = useState<string>("");
  const [txPeriodPreset, setTxPeriodPreset] = useState<"month" | "7d" | "15d" | "30d" | "custom">("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Archive & View Controls
  const [showArchivedAccounts, setShowArchivedAccounts] = useState<boolean>(false);
  const [showArchivedCards, setShowArchivedCards] = useState<boolean>(false);

  // Dialog states
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [advisorTab, setAdvisorTab] = useState<"chat" | "simulator" | "diagnosis" | "iphone">("chat");
  const [advisorInput, setAdvisorInput] = useState<string>("");
  const [advisorMessages, setAdvisorMessages] = useState<ConsultantChatMessage[]>([
    {
      id: "init-1",
      sender: "advisor",
      text: "👋 Olá! Sou o seu **Consultor Financeiro Pessoal Mobills** com visão 360° da sua carteira.\n\nEstou conectado ao seu **Banco Inter**, contas, cartões e faturas futuras. Posso te dizer se você pode comprar algo agora, calcular o impacto no próximo mês, ou registrar gastos automaticamente por texto ou áudio!\n\n💡 *Experimente perguntar:* **\"Posso comprar um tênis de 400?\"** ou **\"Quanto tenho para pagar mês que vem?\"**",
      timestamp: "Agora",
    },
  ]);
  const [simForm, setSimForm] = useState<{
    description: string;
    amount: number;
    paymentMethod: "cash" | "card_installments";
    installmentsCount: number;
    accountId?: string;
    cardId?: string;
  }>({
    description: "Fone de Ouvido Bluetooth",
    amount: 380,
    paymentMethod: "card_installments",
    installmentsCount: 3,
    accountId: "",
    cardId: "",
  });
  const [simResult, setSimResult] = useState<PurchaseSimulationResult | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [moveCatDialog, setMoveCatDialog] = useState<{
    open: boolean;
    sourceCatId: string;
    sourceCatName: string;
    targetCatId: string;
  }>({ open: false, sourceCatId: "", sourceCatName: "", targetCatId: "" });
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
  // Superpowers States: OFX/CSV Importer, PWA, Report PDF & Simulator
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);
  const [importTargetAccount, setImportTargetAccount] = useState<string>(initialData?.accounts?.[0]?.id || "");
  const [importedList, setImportedList] = useState<ImportedTransaction[]>([]);
  const [importFileName, setImportFileName] = useState<string>("");
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [attachmentModal, setAttachmentModal] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: "",
    title: "",
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  // Investment Simulator State (Banco Inter CDB/LCI vs Poupança)
  const [simInitial, setSimInitial] = useState<string>("5000");
  const [simMonthly, setSimMonthly] = useState<string>("500");
  const [simMonths, setSimMonths] = useState<number>(12);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // Transaction Form State (Supports Create & Edit)
  const [txForm, setTxForm] = useState({
    editingId: null as string | null,
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
    isReimbursable: false,
    notes: "",
    attachment: null as string | null,
  });

  // New Account Form State
  const [accForm, setAccForm] = useState({
    name: "Conta Inter",
    institution: "Banco Inter",
    type: "checking",
    color: "#FF7A00",
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

  // Hydration & Theme Synchronization
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Sync theme
      const savedTheme = localStorage.getItem("mobills_theme");
      if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      }

      // 2. Hydrate snapshot from client store
      const store = getClientStore();
      setSnapshot(buildClientSnapshot(store, month, year));

      // PWA Service Worker registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 3. Check first-run onboarding
      const savedChoice = localStorage.getItem(ONBOARDING_CHOICE_KEY);
      if (!savedChoice) {
        setWelcomeModalOpen(true);
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("mobills_theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const isCleanActive = useMemo(() => {
    return (
      (snapshot?.accounts || []).length === 0 &&
      (snapshot?.transactions || []).length === 0 &&
      (snapshot?.creditCards || []).length === 0
    );
  }, [snapshot?.accounts, snapshot?.transactions, snapshot?.creditCards]);

  const handleSetMode = (mode: "clean" | "demo") => {
    if (mode === "clean") {
      const zero = clearToZero();
      setSnapshot(buildClientSnapshot(zero, month, year));
      setBannerMessage({
        type: "success",
        text: "🌱 Modo Limpo ativado! Todos os dados foram zerados para seu controle real.",
      });
    } else {
      const demo = restoreDemo();
      setSnapshot(buildClientSnapshot(demo, month, year));
      setBannerMessage({
        type: "success",
        text: "📊 Modo Demonstração ativado! Dados simulados carregados com sucesso.",
      });
    }
    setWelcomeModalOpen(false);
    setResetDialogOpen(false);
  };

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
      if (action === "import_transactions") {
        for (const item of payload.transactions || []) {
          const parsed = new Date(item.date || `${year}-${String(month).padStart(2, "0")}-01`);
          const compMonth = isNaN(parsed.getMonth()) ? month : parsed.getMonth() + 1;
          const compYear = isNaN(parsed.getFullYear()) ? year : parsed.getFullYear();
          store.transactions.unshift({
            id: `tx_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            description: item.description,
            amount: Number(item.amount),
            date: item.date,
            competenceMonth: compMonth,
            competenceYear: compYear,
            type: item.type || "expense",
            status: "completed",
            accountId: payload.accountId || null,
            destinationAccountId: null,
            creditCardId: null,
            categoryId: item.categoryId || null,
            isFixed: false,
            installmentCurrent: null,
            installmentTotal: null,
            installmentGroupId: null,
            tags: ["extrato", "importado"],
            notes: "Importado via Extrato Bancário",
            attachment: null,
          });
        }
      } else if (action === "create_transaction") {
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
          attachment: payload.attachment || null,
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
      } else if (action === "reset_data") {
        if (payload.mode === "zero") {
          store.accounts = [];
          store.creditCards = [];
          store.invoices = [];
          store.transactions = [];
          store.budgets = [];
          store.goals = [];
          store.user.hideBalances = false;
        } else {
          const fresh = getInitialSeedData();
          store.accounts = fresh.accounts;
          store.creditCards = fresh.creditCards;
          store.invoices = fresh.invoices;
          store.transactions = fresh.transactions;
          store.budgets = fresh.budgets;
          store.goals = fresh.goals;
          store.categories = fresh.categories;
          store.tags = fresh.tags;
          store.user = fresh.user;
        }
      } else if (action === "edit_transaction") {
        const tx = store.transactions.find((x: any) => x.id === payload.id);
        if (tx) {
          tx.description = payload.description;
          tx.amount = Number(payload.amount);
          tx.date = payload.date;
          const parsed = new Date(payload.date || "2026-10-26");
          tx.competenceMonth = parsed.getMonth() + 1;
          tx.competenceYear = parsed.getFullYear();
          tx.type = payload.type;
          tx.status = payload.status || "completed";
          tx.accountId = payload.accountId || null;
          tx.destinationAccountId = payload.destinationAccountId || null;
          tx.creditCardId = payload.creditCardId || null;
          tx.categoryId = payload.categoryId || null;
          tx.isFixed = Boolean(payload.isFixed);
          tx.tags = payload.tags || [];
          tx.notes = payload.notes || null;
          if (payload.attachment !== undefined) tx.attachment = payload.attachment;
        }
      } else if (action === "reopen_invoice") {
        const inv = (store.invoices || []).find(
          (i: any) =>
            i.id === payload.invoiceId ||
            (i.creditCardId === payload.creditCardId && i.month === month && i.year === year)
        );
        if (inv) {
          inv.status = "open";
          inv.paidAmount = 0;
        }
      } else if (action === "archive_account") {
        const acc = store.accounts.find((a: any) => a.id === payload.id);
        if (acc) acc.archived = !acc.archived;
      } else if (action === "archive_card") {
        const c = store.creditCards.find((x: any) => x.id === payload.id);
        if (c) c.archived = !c.archived;
      } else if (action === "move_category_transactions") {
        for (const t of store.transactions) {
          if (t.categoryId === payload.sourceCategoryId) {
            t.categoryId = payload.targetCategoryId;
          }
        }
      } else if (action === "delete_account") {
        store.accounts = store.accounts.filter((a: any) => a.id !== payload.id);
      } else if (action === "delete_card") {
        store.creditCards = store.creditCards.filter((c: any) => c.id !== payload.id);
      } else if (action === "delete_category") {
        store.categories = store.categories.filter((c: any) => c.id !== payload.id);
      } else if (action === "delete_budget") {
        store.budgets = store.budgets.filter((b: any) => b.id !== payload.id);
      } else if (action === "delete_goal") {
        store.goals = store.goals.filter((g: any) => g.id !== payload.id);
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
      editingId: null,
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
      isReimbursable: false,
      notes: "",
      attachment: null,
    });
    setTxDialogOpen(true);
  }

  function openEditTxDialog(tx: any) {
    setTxForm({
      editingId: tx.id,
      type: tx.type,
      description: tx.description || "",
      payee: tx.payee || "",
      amount: String(tx.amount || ""),
      date: tx.date || `${year}-${String(month).padStart(2, "0")}-15`,
      status: tx.status || "completed",
      accountId: tx.accountId || snapshot?.accounts?.[0]?.id || "",
      destinationAccountId: tx.destinationAccountId || snapshot?.accounts?.[1]?.id || "",
      creditCardId: tx.creditCardId || snapshot?.creditCards?.[0]?.id || "",
      categoryId: tx.categoryId || "",
      isFixed: Boolean(tx.isFixed),
      installments: String(tx.installmentTotal || "1"),
      tagsInput: (tx.tags || []).join(", "),
      isReimbursable: (tx.tags || []).includes("reembolsavel"),
      notes: tx.notes || "",
      attachment: tx.attachment || null,
    });
    setTxDialogOpen(true);
  }

  const isAccountZeroed = useMemo(() => {
    return (
      (snapshot?.accounts || []).length === 0 &&
      (snapshot?.transactions || []).length === 0
    );
  }, [snapshot?.accounts, snapshot?.transactions]);

  const upcomingBills = useMemo(() => {
    return (snapshot?.transactions || [])
      .filter((tx: any) => tx.type === "expense" && tx.status === "pending")
      .sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
  }, [snapshot?.transactions]);

  const filteredTransactions = useMemo(() => {
    let list: any[] = snapshot?.transactions || [];

    if (txPeriodPreset === "7d") {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 7);
      const isoCutoff = targetDate.toISOString().slice(0, 10);
      list = list.filter((t: any) => t.date >= isoCutoff);
    } else if (txPeriodPreset === "15d") {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 15);
      const isoCutoff = targetDate.toISOString().slice(0, 10);
      list = list.filter((t: any) => t.date >= isoCutoff);
    } else if (txPeriodPreset === "30d") {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 30);
      const isoCutoff = targetDate.toISOString().slice(0, 10);
      list = list.filter((t: any) => t.date >= isoCutoff);
    } else if (txPeriodPreset === "custom") {
      if (customStartDate) {
        list = list.filter((t: any) => t.date >= customStartDate);
      }
      if (customEndDate) {
        list = list.filter((t: any) => t.date <= customEndDate);
      }
    }

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
    txPeriodPreset,
    customStartDate,
    customEndDate,
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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-800/40 dark:bg-slate-950 text-slate-900 dark:text-slate-100 lg:flex-row transition-colors">
      {/* Sidebar Navigation */}
      <aside className="w-full shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col justify-between p-5">
          <div>
            {/* Brand Header */}
            <div className="flex items-center justify-between pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Mobills Pro
                  </h1>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
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
                  label: "🤖 Consultor IA & iPhone",
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
                        ? "bg-slate-900 dark:bg-emerald-700 text-white shadow-sm"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-100"
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
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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
          <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {snapshot?.user?.name || "Aristeu Junior"}
                </p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                  {snapshot?.user?.email || "demo@mobills.local"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthDialogOpen(true)}
                className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
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
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
          {/* Left: Month Navigator & Status Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                aria-label="Mês anterior"
                className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[160px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 dark:bg-slate-800/80 px-3.5 py-1.5 text-center">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {MONTH_NAMES[month - 1]} de {year}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                aria-label="Próximo mês"
                className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Indicator Badge (Clean Mode vs Demo Mode) */}
            <div className="flex items-center">
              {isCleanActive ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-50 dark:bg-emerald-950/400 animate-pulse" />
                  <span>🌱 Modo Limpo</span>
                  <button
                    type="button"
                    onClick={() => handleSetMode("demo")}
                    className="ml-1 rounded-md bg-emerald-200/90 dark:bg-emerald-800 px-2 py-0.5 text-[11px] font-bold text-emerald-950 dark:text-emerald-100 hover:bg-emerald-300 dark:hover:bg-emerald-700"
                    title="Carregar dados de demonstração com contas e despesas simuladas"
                  >
                    Demo
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 text-xs font-semibold text-blue-900 dark:text-blue-200 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-blue-50 dark:bg-blue-950/400" />
                  <span>📊 Modo Demo</span>
                  <button
                    type="button"
                    onClick={() => setResetDialogOpen(true)}
                    className="ml-1 rounded-md bg-blue-200/90 dark:bg-blue-800 px-2 py-0.5 text-[11px] font-bold text-blue-950 dark:text-blue-100 hover:bg-blue-300 dark:hover:bg-blue-700"
                    title="Zerar para começar limpo com suas finanças reais"
                  >
                    Zerar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Entry Shortcuts, Privacy & Theme Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openNewTxDialog("income")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/60 dark:hover:bg-emerald-900/60"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>+ Receita</span>
            </button>
            <button
              type="button"
              onClick={() => openNewTxDialog("expense")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-700 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-900 dark:text-red-300 transition-colors hover:bg-red-100 dark:bg-red-900/60 dark:hover:bg-red-900/60"
            >
              <TrendingDown className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />
              <span>+ Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => openNewTxDialog("card_expense")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-700 bg-purple-50 dark:bg-purple-950/40 px-3 py-2 text-xs font-semibold text-purple-900 dark:text-purple-300 transition-colors hover:bg-purple-100 dark:bg-purple-900/60 dark:hover:bg-purple-900/60"
            >
              <CreditCardIcon className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" />
              <span>+ Cartão</span>
            </button>
            <button
              type="button"
              onClick={() => openNewTxDialog("transfer")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
              <span>Transferir</span>
            </button>
            <button
              type="button"
              onClick={() => postAction({ action: "toggle_hide_balances" })}
              aria-label={
                hideBalances ? "Mostrar saldos financeiros" : "Ocultar saldos financeiros"
              }
              title={hideBalances ? "Mostrar saldos" : "Ocultar saldos"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              {hideBalances ? (
                <>
                  <EyeOff className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  <span className="hidden sm:inline">Mostrar Saldos</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  <span className="hidden sm:inline">Ocultar Saldos</span>
                </>
              )}
            </button>
            {/* PWA Install Button */}
            <button
              type="button"
              onClick={() => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                } else {
                  alert(
                    "Para instalar no celular:\n\n📱 iPhone/iPad: Toque no botão Compartilhar do Safari e selecione 'Adicionar à Tela de Início'.\n\n🤖 Android/Chrome: Toque nos 3 pontos do menu e selecione 'Instalar aplicativo'."
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Instalar Mobills Pro no Celular ou Desktop"
            >
              <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Instalar App</span>
            </button>

            {/* Dark Mode Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
              title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
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
                ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200"
                : "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-200"
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
            <div className="space-y-6">
              {/* Segmented Sub-tab Navigation (Mobills Modular Dashboard) */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 dark:bg-slate-800/80 p-1">
                  <button
                    type="button"
                    onClick={() => setDashTab("executive")}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                      dashTab === "executive"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100"
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Visão Gerencial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashTab("accounts_cards")}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                      dashTab === "accounts_cards"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100"
                    }`}
                  >
                    <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Contas & Cartões</span>
                    <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[10px] font-bold tabular-nums">
                      {(snapshot?.accounts?.length || 0) + (snapshot?.creditCards?.length || 0)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashTab("budgets_goals")}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                      dashTab === "budgets_goals"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100"
                    }`}
                  >
                    <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>Orçamentos & Metas</span>
                    <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[10px] font-bold tabular-nums">
                      {snapshot?.budgets?.length || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashTab("categories")}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                      dashTab === "categories"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100"
                    }`}
                  >
                    <PieChart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Categorias & Análise</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Aba selecionada:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 dark:text-slate-200">
                    {dashTab === "executive" && "Cockpit e Indicadores Executivos"}
                    {dashTab === "accounts_cards" && "Saldos, Carteiras e Faturas"}
                    {dashTab === "budgets_goals" && "Termômetros de Teto e Metas"}
                    {dashTab === "categories" && "Distribuição de Despesas"}
                  </span>
                </div>
              </div>

              {/* TAB 1: VISÃO GERENCIAL (EXECUTIVE) */}
              {dashTab === "executive" && (
                <div className="space-y-6">
                  {/* PROACTIVE FINANCIAL COACH BANNER (IA CONSCIENTE) */}
                  {(() => {
                    const health = analyzeFinancialHealth(snapshot);
                    return (
                      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-emerald-900/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-emerald-950/30 p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md">
                              <Bot className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                                  Coach Financeiro Proativo
                                </span>
                                <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                                  {health.score}/100 • {health.scoreLabel}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Gasto Diário Seguro: <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">R$ {health.safeToSpendDaily.toFixed(2).replace(".", ",")}/dia</span> até o fim do mês
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Faturas e contas futuras mapeadas para o próximo mês: <strong className="text-slate-900 dark:text-slate-200 tabular-nums">R$ {health.nextMonthCommitments.totalEstimated.toFixed(2).replace(".", ",")}</strong>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveModule("advisor");
                                setAdvisorTab("simulator");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                            >
                              <Zap className="h-3.5 w-3.5 text-amber-300" />
                              <span>Posso Comprar?</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveModule("advisor");
                                setAdvisorTab("chat");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Conversar com Consultor</span>
                            </button>
                          </div>
                        </div>
                      </section>
                    );
                  })()}
              {/* Executive Ledger Strip (Single cohesive surface, no nested cards) */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Balanço Consolidado de {MONTH_NAMES[month - 1]}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Liquidez imediata nas contas bancárias, fluxo de caixa mensal e faturas de cartão de crédito.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-300 tabular-nums">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                      Taxa de Poupança: {snapshot?.summary?.savingsRate || 0}%
                    </span>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-1 gap-6 divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                  <div className="pt-4 first:pt-0 lg:px-5 lg:pt-0 lg:first:pl-0">
                    <dt className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Saldo Atual em Contas
                    </dt>
                    <dd className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatBRL(snapshot?.summary?.totalBalance, hideBalances)}
                    </dd>
                    <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                      Projetado no mês:{" "}
                      {formatBRL(snapshot?.summary?.projectedBalance, hideBalances)}
                    </p>
                  </div>

                  <div className="pt-4 sm:pt-0 lg:px-5">
                    <dt className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Receitas do Mês
                    </dt>
                    <dd className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatBRL(snapshot?.summary?.totalIncome, hideBalances)}
                    </dd>
                    <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                      Recebido: {formatBRL(snapshot?.summary?.incomeCompleted, hideBalances)} · Pendente:{" "}
                      {formatBRL(snapshot?.summary?.incomePending, hideBalances)}
                    </p>
                  </div>

                  <div className="pt-4 lg:px-5 lg:pt-0">
                    <dt className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Despesas Totais (Contas + Cartão)
                    </dt>
                    <dd className="mt-1.5 text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums">
                      {formatBRL(snapshot?.summary?.totalExpenses, hideBalances)}
                    </dd>
                    <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
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
                    <dt className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Resultado Líquido do Mês
                    </dt>
                    <dd
                      className={`mt-1.5 text-2xl font-bold tabular-nums ${
                        (snapshot?.summary?.monthlySavings || 0) >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      {formatBRL(snapshot?.summary?.monthlySavings, hideBalances)}
                    </dd>
                    <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                      Receitas menos despesas totais da competência
                    </p>
                  </div>
                </dl>
              </section>

              {/* Upcoming Bills Reminder (Mobills Due Date Alerts) */}
              {upcomingBills.length > 0 && (
                <section className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40/50 dark:bg-amber-950/40 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-200 dark:border-amber-800/60/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-5 w-5 text-amber-800 dark:text-amber-400" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Contas a Pagar Próximas do Vencimento ({upcomingBills.length})
                        </h3>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Alertas automáticos para evitar juros e atrasos no mês de {MONTH_NAMES[month - 1]}.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200 tabular-nums">
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
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{bill.description}</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                            Vence em: {formatDateBR(bill.date)} · Conta: {bill.accountName || "Principal"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-800 dark:text-red-400 tabular-nums">
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

                                {/* Mini Cashflow History Strip */}
                  {snapshot?.cashFlowHistory?.length > 0 && (
                    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Evolução do Fluxo de Caixa (Últimos 6 Meses)
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Histórico de receitas vs despesas para análise de liquidez.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveModule("reports")}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          Ver Gráficos Detalhados →
                        </button>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {snapshot.cashFlowHistory.map((item: any) => (
                          <div key={item.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 dark:bg-slate-800/50 p-3 text-center">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</p>
                            <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                              +{formatBRL(item.income, hideBalances)}
                            </p>
                            <p className="text-xs font-semibold text-red-700 dark:text-red-400 tabular-nums">
                              -{formatBRL(item.expenses, hideBalances)}
                            </p>
                            <div className="mt-2 border-t border-slate-200 dark:border-slate-800 dark:border-slate-700 pt-1.5">
                              <span className={`text-xs font-bold tabular-nums ${item.balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                                {formatBRL(item.balance, hideBalances)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Clean Mode Empty State Hero */}
                  {isCleanActive && (
                    <div className="rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-8 text-center shadow-sm">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        <Sparkles className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
                        🌱 Seu Mobills Pro está 100% limpo e pronto!
                      </h3>
                      <p className="mx-auto mt-1.5 max-w-xl text-sm text-slate-600 dark:text-slate-400">
                        Cadastre sua conta principal (como <strong>Banco Inter</strong>, Nubank, Itaú ou carteira) para iniciar o controle das suas finanças reais, ou explore os dados simulados com 1 clique.
                      </p>
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAccForm({
                              name: "Conta Inter Principal",
                              institution: "Banco Inter",
                              type: "checking",
                              color: "#FF7A00",
                              initialBalance: "0",
                              includeInSummary: true,
                            });
                            setAccountDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-[#e06b00] transition"
                        >
                          <span className="h-2 w-2 rounded-full bg-white" />
                          <span>+ Adicionar Banco Inter (Laranja)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAccForm({
                              name: "",
                              institution: "Outro Banco",
                              type: "checking",
                              color: "#2563EB",
                              initialBalance: "0",
                              includeInSummary: true,
                            });
                            setAccountDialogOpen(true);
                          }}
                          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition"
                        >
                          + Outro Banco ou Carteira
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCardForm({
                              name: "Inter Mastercard",
                              brand: "Mastercard",
                              color: "#FF7A00",
                              limitAmount: "5000",
                              closingDay: "20",
                              dueDay: "28",
                              accountId: snapshot?.accounts?.[0]?.id || "",
                            });
                            setCardDialogOpen(true);
                          }}
                          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        >
                          + Cadastrar Cartão de Crédito
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetMode("demo")}
                          className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-2.5 text-xs font-semibold text-emerald-950 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition"
                        >
                          📊 Carregar Dados de Demonstração
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Navigation Shortcut Cards to Details */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setDashTab("accounts_cards")}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left shadow-sm transition hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Contas & Cartões</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{snapshot?.accounts?.length || 0} contas · {snapshot?.creditCards?.length || 0} cartões</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDashTab("budgets_goals")}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left shadow-sm transition hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                          <Target className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Orçamentos & Metas</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{snapshot?.budgets?.length || 0} orçamentos ativos</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDashTab("categories")}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left shadow-sm transition hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                          <PieChart className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Categorias & Análise</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Distribuição mensal de despesas</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTAS & CARTÕES */}
              {dashTab === "accounts_cards" && (
                <div className="space-y-6">
                  {/* Two-column Operational Grid: Accounts + Credit Cards */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Accounts List */}
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Saldos por Conta e Carteira
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Clique em reajustar para corrigir divergências imediatas de saldo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAccountDialogOpen(true)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      + Nova Conta
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
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
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {acc.name}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
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
                                ? "text-slate-900 dark:text-slate-100"
                                : "text-red-700 dark:text-red-400"
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
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Reajustar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Credit Cards Summary */}
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Faturas de Cartão de Crédito ({MONTH_NAMES[month - 1]})
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Acompanhamento de limites disponíveis e vencimentos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCardDialogOpen(true)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      + Novo Cartão
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
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
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {card.name}{" "}
                                  <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
                                    ({card.brand})
                                  </span>
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                                  Fecha dia {card.closingDay} · Vence dia{" "}
                                  {card.dueDay}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                Fatura:{" "}
                                {formatBRL(
                                  card.currentInvoice.totalAmount,
                                  hideBalances
                                )}
                              </p>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  isPaid
                                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300"
                                    : "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300"
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
                            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                              <span>
                                Limite utilizado:{" "}
                                {formatBRL(card.usedLimit, hideBalances)} ({usedPct}%)
                              </span>
                              <span>
                                Disponível:{" "}
                                {formatBRL(card.availableLimit, hideBalances)}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
                                className="rounded-lg bg-slate-900 dark:bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-emerald-600 shadow-sm"
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

                              </div>
              )}

              {/* TAB 3: ORÇAMENTOS & METAS */}
              {dashTab === "budgets_goals" && (
                <div className="space-y-6">
                {/* Monthly Budget Alerts */}
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Termômetro do Planejamento Mensal
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Alertas automáticos de consumo de orçamento por categoria.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModule("budgets")}
                      className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 underline hover:text-emerald-950 dark:text-emerald-200"
                    >
                      Gerenciar Orçamentos
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
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
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {b.categoryName}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatBRL(b.spentAmount, hideBalances)}{" "}
                              <span className="font-normal text-slate-600 dark:text-slate-400">
                                / {formatBRL(b.amountLimit, hideBalances)} (
                                {b.percentage}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
                                  ? "text-red-700 dark:text-red-400"
                                  : "text-amber-800 dark:text-amber-400"
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

                                </div>
              )}

              {/* TAB 4: CATEGORIAS & ANÁLISE */}
              {dashTab === "categories" && (
                <div className="space-y-6">
                  {/* Expenses by Category in Month */}
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Despesas por Categoria ({MONTH_NAMES[month - 1]})
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Soma das despesas em conta e compras no cartão de crédito.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModule("reports")}
                      className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 underline hover:text-emerald-950 dark:text-emerald-200"
                    >
                      Ver Gráficos Completos
                    </button>
                  </div>

                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
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
                            <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatBRL(cat.spentInMonth, hideBalances)}{" "}
                              <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
                                ({pct}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
            )}
          </div>
        )}

          {/* =========================================================
              MODULE 2: TRANSAÇÕES (LANÇAMENTOS & FILTROS AVANÇADOS)
             ========================================================= */}
          {activeModule === "transactions" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Lançamentos de {MONTH_NAMES[month - 1]} de {year}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Gerencie receitas, despesas fixas ou variáveis, compras parceladas no cartão e transferências.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900 shadow-sm"
                  >
                    <FileUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Importar Extrato (OFX/CSV)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="filter-search"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
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
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 py-1.5 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="filter-type"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Tipo de Lançamento
                  </label>
                  <select
                    id="filter-type"
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100"
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
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Situação (Efetivado / Pendente)
                  </label>
                  <select
                    id="filter-status"
                    value={txStatusFilter}
                    onChange={(e) => setTxStatusFilter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="all">Todos os status</option>
                    <option value="completed">Efetivados (Pagos / Recebidos)</option>
                    <option value="pending">Pendentes (A pagar / A receber)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="filter-cat"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Categoria
                  </label>
                  <select
                    id="filter-cat"
                    value={txCategoryFilter}
                    onChange={(e) => setTxCategoryFilter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100"
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
                    className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-5 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Exibindo {filteredTransactions.length} lançamentos na competência{" "}
                    {MONTH_NAMES[month - 1]}/{year}
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <th className="px-5 py-3.5">Descrição</th>
                      <th className="px-4 py-3.5">Categoria</th>
                      <th className="px-4 py-3.5">Conta / Cartão</th>
                      <th className="px-4 py-3.5">Data</th>
                      <th className="px-4 py-3.5">Situação</th>
                      <th className="px-5 py-3.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {filteredTransactions.map((tx: any) => {
                      const isIncome = tx.type === "income";
                      const isTransfer = tx.type === "transfer";
                      return (
                        <tr
                          key={tx.id}
                          className="transition-colors hover:bg-slate-50 dark:bg-slate-800/40"
                        >
                          <th scope="row" className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span>{tx.description}</span>
                                {tx.attachment && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttachmentModal({
                                        open: true,
                                        url: tx.attachment,
                                        title: tx.description,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-200"
                                    title="Ver comprovante anexado"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span>Comprovante</span>
                                  </button>
                                )}
                                {tx.isFixed && (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                    <Repeat className="h-3 w-3" /> Fixa
                                  </span>
                                )}
                                {tx.installmentTotal && (
                                  <span className="inline-flex items-center gap-1 rounded bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 text-[11px] font-semibold text-purple-900 dark:text-purple-300">
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
                                      className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </th>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                            {isTransfer ? (
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
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
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                            {tx.type === "card_expense" ? (
                              <span className="inline-flex items-center gap-1 font-medium text-purple-900 dark:text-purple-300">
                                <CreditCardIcon className="h-3.5 w-3.5" />
                                {tx.creditCardName || "Cartão"}
                              </span>
                            ) : isTransfer ? (
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                {tx.accountName} → {tx.destinationAccountName}
                              </span>
                            ) : (
                              <span>{tx.accountName || "Conta"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 tabular-nums">
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
                                  ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-200"
                                  : "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 hover:bg-amber-200"
                              }`}
                            >
                              {tx.status === "completed" ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                                  <span>Efetivada</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3.5 w-3.5 text-amber-800 dark:text-amber-400" />
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
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : isTransfer
                                    ? "text-slate-800 dark:text-slate-200"
                                    : "text-red-700 dark:text-red-400"
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
                                className="rounded p-1 text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/60 hover:text-red-900 dark:text-red-300"
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Contas Bancárias, Carteiras e Investimentos
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
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
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {acc.name}
                          </h3>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
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
                        className="rounded-lg p-1.5 text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/60 hover:text-red-900 dark:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                      <div>
                        <dt className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Saldo Atual Efetivado
                        </dt>
                        <dd className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatBRL(acc.currentBalance, hideBalances)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Saldo Previsto ({MONTH_NAMES[month - 1]})
                        </dt>
                        <dd className="mt-1 text-xl font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatBRL(acc.projectedBalance, hideBalances)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Central de Cartões de Crédito e Faturas
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Acompanhe limites totais, compras parceladas e efetue a baixa de faturas diretamente na conta bancária.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openNewTxDialog("card_expense")}
                    className="rounded-xl border border-purple-700 bg-purple-50 dark:bg-purple-950/40 px-4 py-2.5 text-xs font-semibold text-purple-900 dark:text-purple-300 hover:bg-purple-100 dark:bg-purple-900/60"
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
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                            style={{ backgroundColor: card.color }}
                          >
                            <CreditCardIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                              {card.name}
                            </h3>
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
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
                          className="rounded-lg p-1.5 text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/60 hover:text-red-900 dark:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Fatura {MONTH_NAMES[month - 1]}
                          </dt>
                          <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {formatBRL(
                              card.currentInvoice.totalAmount,
                              hideBalances
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Limite Utilizado (Total)
                          </dt>
                          <dd className="mt-1 text-lg font-bold text-purple-900 dark:text-purple-300 tabular-nums">
                            {formatBRL(card.usedLimit, hideBalances)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Limite Disponível
                          </dt>
                          <dd className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatBRL(card.availableLimit, hideBalances)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                          <span>Ocupação do Limite ({usedPct}%)</span>
                          <span>
                            Limite Total: {formatBRL(card.limitAmount, hideBalances)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-purple-700"
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Invoice Items */}
                      <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-4">
                        <div className="flex items-center justify-between pb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
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
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {tx.description}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                                  {formatDateBR(tx.date)} ·{" "}
                                  {tx.categoryName || "Sem categoria"}
                                </p>
                              </div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Planejamento Orçamentário de {MONTH_NAMES[month - 1]}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="border-b border-slate-200 dark:border-slate-800 pb-3 text-base font-bold text-slate-900 dark:text-slate-100">
                  Matriz de Planejamento Financeiro de {MONTH_NAMES[month - 1]}
                </h3>
                <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Receitas do Mês
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatBRL(snapshot?.summary?.totalIncome, hideBalances)}
                    </dd>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Entradas totais previstas</p>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Gastos Planejados (Orçamentos)
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatBRL(totalBudgetLimit, hideBalances)}
                    </dd>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Teto definido para categorias</p>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Balanço Planejado (Meta de Economia)
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatBRL((snapshot?.summary?.totalIncome || 0) - totalBudgetLimit, hideBalances)}
                    </dd>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Receitas menos tetos planejados</p>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Balanço Realizado no Momento
                    </dt>
                    <dd
                      className={`mt-1 text-2xl font-bold tabular-nums ${
                        (snapshot?.summary?.monthlySavings || 0) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      {formatBRL(snapshot?.summary?.monthlySavings, hideBalances)}
                    </dd>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Economia real conquistada até agora</p>
                  </div>
                </dl>
              </section>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {(snapshot?.budgets || []).map((b: any) => {
                  const statusBadge =
                    b.alertLevel === "exceeded"
                      ? {
                          label: "Estourado (>= 100%)",
                          cls: "bg-red-100 dark:bg-red-900/60 text-red-900 dark:text-red-300",
                          bar: "bg-red-600",
                        }
                      : b.alertLevel === "warning"
                      ? {
                          label: "Atenção (>= 80%)",
                          cls: "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300",
                          bar: "bg-amber-600",
                        }
                      : {
                          label: "Dentro da Meta",
                          cls: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300",
                          bar: "bg-emerald-600",
                        };

                  return (
                    <section
                      key={b.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
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
                          className="rounded p-1 text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/60 hover:text-red-900 dark:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm tabular-nums">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Gasto:{" "}
                            <strong className="text-slate-900 dark:text-slate-100">
                              {formatBRL(b.spentAmount, hideBalances)}
                            </strong>
                          </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Meta:{" "}
                            <strong className="text-slate-900 dark:text-slate-100">
                              {formatBRL(b.amountLimit, hideBalances)}
                            </strong>{" "}
                            ({b.percentage}%)
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${statusBadge.bar}`}
                            style={{
                              width: `${Math.min(100, b.percentage)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
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
              {/* Simulador de Rendimentos Banco Inter (CDB & LCI vs Poupança) */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF7A00]">
                      <Percent className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Simulador de Rendimento Banco Inter (CDB & LCI vs. Poupança)
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Simule o rendimento da sua reserva financeira no Inter e descubra quanto ganha a mais em relação à poupança.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-3 py-1 text-xs font-bold text-[#FF7A00]">
                    Selic 10,75% a.a.
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Investimento Inicial (R$)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={simInitial}
                      onChange={(e) => setSimInitial(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Aporte Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={simMonthly}
                      onChange={(e) => setSimMonthly(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Prazo de Aplicação
                    </label>
                    <div className="mt-1 flex gap-1.5">
                      {[6, 12, 24, 36].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSimMonths(m)}
                          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                            simMonths === m
                              ? "bg-[#FF7A00] text-white shadow-sm"
                              : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(() => {
                  const p0 = parseFloat(simInitial) || 0;
                  const pm = parseFloat(simMonthly) || 0;
                  const n = simMonths;
                  const totalInvested = p0 + pm * n;

                  const rCdbMonth = 0.0085;
                  const rLciMonth = 0.0076;
                  const rPoupMonth = 0.0050;

                  const fvPoup = p0 * Math.pow(1 + rPoupMonth, n) + (pm > 0 ? pm * ((Math.pow(1 + rPoupMonth, n) - 1) / rPoupMonth) : 0);
                  const fvLci = p0 * Math.pow(1 + rLciMonth, n) + (pm > 0 ? pm * ((Math.pow(1 + rLciMonth, n) - 1) / rLciMonth) : 0);
                  
                  const fvCdbGross = p0 * Math.pow(1 + rCdbMonth, n) + (pm > 0 ? pm * ((Math.pow(1 + rCdbMonth, n) - 1) / rCdbMonth) : 0);
                  const cdbProfit = Math.max(0, fvCdbGross - totalInvested);
                  const irRate = n <= 6 ? 0.225 : n <= 12 ? 0.20 : n <= 24 ? 0.175 : 0.15;
                  const fvCdbNet = totalInvested + cdbProfit * (1 - irRate);
                  const extraCdb = fvCdbNet - fvPoup;

                  return (
                    <div className="mt-5 space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-orange-300 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-950/30 p-4">
                          <span className="text-xs font-bold text-orange-900 dark:text-orange-300">
                            CDB Banco Inter (100% CDI)
                          </span>
                          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {formatBRL(fvCdbNet)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                            Líquido com IR deduzido · Liquidez Diária
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-4">
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                            LCI Banco Inter (Isenta de IR)
                          </span>
                          <p className="mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatBRL(fvLci)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                            Zero Imposto de Renda · FGC até R$ 250k
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Poupança Tradicional
                          </span>
                          <p className="mt-2 text-xl font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                            {formatBRL(fvPoup)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            Rendimento de apenas 0,5% a.m. + TR
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 px-4 py-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                        <span>Ganho extra no Banco Inter comparado à Poupança em {n} meses:</span>
                        <span className="text-sm font-extrabold tabular-nums">
                          +{formatBRL(extraCdb)} de rentabilidade a mais
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </section>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Objetivos e Metas de Economia
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
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
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                              {g.name}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
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
                          className="rounded p-1 text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/60 hover:text-red-900 dark:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex items-baseline justify-between tabular-nums">
                          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {formatBRL(g.currentAmount, hideBalances)}
                          </span>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            de {formatBRL(g.targetAmount, hideBalances)} (
                            {g.percentage}%)
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${g.percentage}%`,
                              backgroundColor: g.color,
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                          Faltam {formatBRL(g.remainingAmount, hideBalances)} · Aporte
                          sugerido:{" "}
                          <strong>
                            {formatBRL(g.suggestedMonthly, hideBalances)}/mês
                          </strong>
                        </p>
                      </div>

                      {/* Recent Deposits */}
                      <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Últimos Aportes ({g.deposits.length})
                        </p>
                        <ul className="mt-2 divide-y divide-slate-100 text-xs">
                          {g.deposits.slice(0, 3).map((dep: any) => (
                            <li
                              key={dep.id}
                              className="flex items-center justify-between py-1.5"
                            >
                              <span className="text-slate-700 dark:text-slate-300">
                                {formatDateBR(dep.date)} ·{" "}
                                {dep.note || "Aporte"}
                              </span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Categorias, Subcategorias e Tags
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                  <h3 className="border-b border-slate-200 dark:border-slate-800 pb-3 text-base font-bold text-slate-900 dark:text-slate-100">
                    Árvore de Categorias e Movimentação no Mês
                  </h3>
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
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
                                ? "font-medium text-slate-700 dark:text-slate-300"
                                : "font-bold text-slate-900 dark:text-slate-100"
                            }
                          >
                            {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              c.type === "income"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {c.type === "income" ? "Receita" : "Despesa"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
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
                            className="rounded p-1 text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/60 hover:text-red-900 dark:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Tags Manager */}
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                  <h3 className="border-b border-slate-200 dark:border-slate-800 pb-3 text-base font-bold text-slate-900 dark:text-slate-100">
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
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Adicionar Tag
                    </button>
                  </form>

                  <ul className="mt-5 divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {(snapshot?.tags || []).map((t: any) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div>
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-900 dark:text-slate-100">
                            #{t.name}
                          </span>
                          <span className="ml-2 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                            ({t.countInMonth} lançamentos no mês)
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
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
                            className="rounded p-1 text-red-700 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/60 hover:text-red-900 dark:text-red-300"
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Relatórios de Fluxo de Caixa e Importação de Extratos
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Compare a evolução dos últimos 6 meses e importe/exporte planilhas CSV ou arquivos bancários OFX.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir / Salvar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Extrato Oficial em PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar CSV</span>
                  </button>
                </div>
              </div>

              {/* 6-Month Cash Flow Evolution */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Evolução do Fluxo de Caixa Semestral (Receitas vs. Despesas)
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
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
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.label}
                        </div>

                        <div className="my-4 flex h-32 items-end justify-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
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
                          <p className="font-semibold text-emerald-800 dark:text-emerald-400">
                            +{formatBRL(item.income, hideBalances)}
                          </p>
                          <p className="font-semibold text-red-700 dark:text-red-400">
                            -{formatBRL(item.expenses, hideBalances)}
                          </p>
                          <p className="border-t border-slate-100 pt-1 font-bold text-slate-900 dark:text-slate-100">
                            = {formatBRL(item.balance, hideBalances)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Import CSV / OFX Tool */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Importador Rápido de Extratos Bancários (CSV / OFX)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Cole linhas no formato <code>AAAA-MM-DD;Descrição;Valor</code> (valores negativos geram despesas e positivos geram receitas).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSampleCSVIntoImporter}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Preencher Exemplo de Extrato</span>
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="import-account"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Conta Bancária de Destino
                    </label>
                    <select
                      id="import-account"
                      value={importAccountId}
                      onChange={(e) => setImportAccountId(e.target.value)}
                      className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Linhas do Extrato (CSV ponto-e-vírgula ou vírgula)
                    </label>
                    <textarea
                      id="import-textarea"
                      rows={5}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="2026-10-18;Supermercado Zona Sul;-289.50"
                      className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 font-mono text-xs text-slate-900 dark:text-slate-100"
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
              MODULE 9: MOBILLS IA ADVISOR (CONSULTOR FINANCEIRO & IPHONE/TELEGRAM)
             ========================================================= */}
          {activeModule === "advisor" && (
            <AdvisorModule
              snapshot={snapshot}
              hideBalances={hideBalances}
              postAction={postAction}
              setBannerMessage={setBannerMessage}
              advisorTab={advisorTab}
              setAdvisorTab={setAdvisorTab}
              advisorInput={advisorInput}
              setAdvisorInput={setAdvisorInput}
              advisorMessages={advisorMessages}
              setAdvisorMessages={setAdvisorMessages}
              simForm={simForm}
              setSimForm={setSimForm}
              simResult={simResult}
              setSimResult={setSimResult}
              MONTH_NAMES={MONTH_NAMES}
              formatBRL={formatBRL}
            />
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
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mwg-input w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
              <div className="mwg-error-msg">
                Informe uma descrição com pelo menos 2 caracteres.
              </div>
            </div>

            <div>
              <label
                htmlFor="tx-payee"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="mwg-field">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="tx-amount"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                      className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
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
                className="mwg-input w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
              <div className="mwg-error-msg">
                Insira um valor numérico maior que zero.
              </div>
            </div>

            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
          </div>

          {/* Account / Credit Card Selector */}
          {txForm.type === "card_expense" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tx-card"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Cartão de Crédito
                </label>
                <select
                  id="tx-card"
                  value={txForm.creditCardId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, creditCardId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Número de Parcelas
                </label>
                <select
                  id="tx-installments"
                  value={txForm.installments}
                  onChange={(e) =>
                    setTxForm({ ...txForm, installments: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
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
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Conta de Origem (Saída)
                </label>
                <select
                  id="tx-origin-acc"
                  value={txForm.accountId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, accountId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Conta / Carteira
                </label>
                <select
                  id="tx-acc"
                  value={txForm.accountId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, accountId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Status do Lançamento
                </label>
                <select
                  id="tx-status"
                  value={txForm.status}
                  onChange={(e) =>
                    setTxForm({ ...txForm, status: e.target.value as any })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Categoria / Subcategoria
                </label>
                <select
                  id="tx-category"
                  value={txForm.categoryId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, categoryId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Attachment upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Comprovante / Recibo Anexo (Foto ou Print)
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              {txForm.attachment ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-2">
                  <ImageIcon className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Comprovante Anexado
                  </span>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, attachment: null })}
                    className="ml-2 rounded p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60"
                    title="Remover anexo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <Paperclip className="h-4 w-4 text-emerald-600" />
                  <span>Anexar Comprovante Pix / Nota Fiscal</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const maxDim = 800;
                          let width = img.width;
                          let height = img.height;
                          if (width > height && width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                          } else if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                          }
                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext("2d");
                          ctx?.drawImage(img, 0, 0, width, height);
                          const compressed = canvas.toDataURL("image/jpeg", 0.75);
                          setTxForm((prev) => ({ ...prev, attachment: compressed }));
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="tx-fixed"
              type="checkbox"
              checked={txForm.isFixed}
              onChange={(e) =>
                setTxForm({ ...txForm, isFixed: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400"
            />
            <label
              htmlFor="tx-fixed"
              className="text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              Marcar como Lançamento Fixo / Recorrente Mensal
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setTxDialogOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
        title="Cadastrar Nova Conta ou Carteira"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "create_account",
                ...accForm,
                initialBalance: Number(accForm.initialBalance || 0),
              },
              `Conta "${accForm.name}" cadastrada com sucesso!`
            );
            if (ok) setAccountDialogOpen(false);
          }}
          className="space-y-4"
        >
          {/* Institution Quick Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Escolha Rápida de Instituição:
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { name: "Banco Inter", defaultName: "Conta Inter", color: "#FF7A00" },
                { name: "Nubank", defaultName: "Conta Nubank", color: "#820AD1" },
                { name: "Itaú", defaultName: "Itaú Unibanco", color: "#EC7000" },
                { name: "Bradesco", defaultName: "Bradesco Prime", color: "#CC092F" },
                { name: "Santander", defaultName: "Santander", color: "#EC0000" },
                { name: "C6 Bank", defaultName: "C6 Bank", color: "#1E293B" },
                { name: "BTG Pactual", defaultName: "BTG Banking", color: "#001E62" },
                { name: "Banco do Brasil", defaultName: "Banco do Brasil", color: "#003882" },
                { name: "Caixa", defaultName: "Caixa Econômica", color: "#0066B3" },
                { name: "Mercado Pago", defaultName: "Mercado Pago", color: "#009EE3" },
                { name: "PicPay", defaultName: "PicPay", color: "#21C25E" },
                { name: "Dinheiro", defaultName: "Carteira Física", color: "#10B981" },
              ].map((inst) => (
                <button
                  key={inst.name}
                  type="button"
                  onClick={() => {
                    setAccForm({
                      ...accForm,
                      institution: inst.name,
                      name: inst.defaultName,
                      color: inst.color,
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    accForm.institution === inst.name
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: inst.color }} />
                  <span>{inst.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="acc-name"
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              Nome da Conta / Identificação
            </label>
            <input
              id="acc-name"
              type="text"
              required
              value={accForm.name}
              onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
              placeholder="Ex: Conta Inter Principal"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="acc-inst"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Instituição Financeira
              </label>
              <select
                id="acc-inst"
                value={accForm.institution}
                onChange={(e) =>
                  setAccForm({ ...accForm, institution: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="Banco Inter">Banco Inter (Laranja)</option>
                <option value="Nubank">Nubank</option>
                <option value="Itaú">Itaú Unibanco</option>
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="C6 Bank">C6 Bank</option>
                <option value="BTG Pactual">BTG Pactual</option>
                <option value="Banco do Brasil">Banco do Brasil</option>
                <option value="Caixa">Caixa Econômica</option>
                <option value="Mercado Pago">Mercado Pago</option>
                <option value="PicPay">PicPay</option>
                <option value="XP Investimentos">XP Investimentos</option>
                <option value="Dinheiro">Carteira / Dinheiro em Espécie</option>
                <option value="Outro Banco">Outro Banco / Corretora</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="acc-type"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Tipo da Conta
              </label>
              <select
                id="acc-type"
                value={accForm.type}
                onChange={(e) => setAccForm({ ...accForm, type: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="checking">Conta Corrente Principal</option>
                <option value="salary">Conta Salário</option>
                <option value="savings">Poupança</option>
                <option value="investment">Investimentos / Reserva</option>
                <option value="wallet">Carteira Física (Dinheiro)</option>
                <option value="meal">Vale Refeição / Alimentação (VR/VA)</option>
                <option value="emergency">Caixinha / Reserva de Emergência</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="acc-init"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Saldo Inicial / Atual (R$)
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="acc-color"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Cor de Identificação
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="acc-color"
                  type="color"
                  value={accForm.color}
                  onChange={(e) => setAccForm({ ...accForm, color: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-1"
                />
                <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                  {accForm.color}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="acc-summary"
              type="checkbox"
              checked={accForm.includeInSummary}
              onChange={(e) =>
                setAccForm({ ...accForm, includeInSummary: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="acc-summary"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Incluir no saldo geral do balanço da tela principal
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setAccountDialogOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm"
            >
              Salvar Conta
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
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Saldo atual registrado:{" "}
            <strong className="tabular-nums">
              {formatBRL(readjustDialog.currentBalance)}
            </strong>
            . Informe o novo saldo real do seu aplicativo bancário para gerarmos o lançamento de ajuste automaticamente.
          </p>
          <div>
            <label
              htmlFor="readjust-val"
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() =>
                setReadjustDialog((prev) => ({ ...prev, open: false }))
              }
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 dark:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-emerald-600 shadow-sm"
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
              `Cartão "${cardForm.name}" cadastrado com sucesso!`
            );
            if (ok) setCardDialogOpen(false);
          }}
          className="space-y-4"
        >
          {/* Card Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Escolha Rápida do Cartão:
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { name: "Inter Mastercard", brand: "Mastercard", color: "#FF7A00" },
                { name: "Nubank Roxinho", brand: "Mastercard", color: "#820AD1" },
                { name: "Nubank Ultravioleta", brand: "Mastercard", color: "#4C1D95" },
                { name: "Itaú Click", brand: "Visa", color: "#EC7000" },
                { name: "C6 Carbon", brand: "Mastercard", color: "#1E293B" },
                { name: "Bradesco Elo", brand: "Elo", color: "#CC092F" },
                { name: "Santander SX", brand: "Visa", color: "#EC0000" },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setCardForm({
                      ...cardForm,
                      name: preset.name,
                      brand: preset.brand,
                      color: preset.color,
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    cardForm.name === preset.name
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="card-name"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                placeholder="Ex: Inter Mastercard Black"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="card-brand"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Bandeira do Cartão
              </label>
              <select
                id="card-brand"
                value={cardForm.brand}
                onChange={(e) => setCardForm({ ...cardForm, brand: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="Mastercard">Mastercard</option>
                <option value="Visa">Visa</option>
                <option value="Elo">Elo</option>
                <option value="American Express">American Express</option>
                <option value="Hipercard">Hipercard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="card-limit"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="card-closing"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="card-due"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="card-color"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Cor do Cartão
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="card-color"
                  type="color"
                  value={cardForm.color}
                  onChange={(e) => setCardForm({ ...cardForm, color: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-1"
                />
                <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                  {cardForm.color}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="card-acc-link"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Conta de Pagamento Padrão
              </label>
              <select
                id="card-acc-link"
                value={cardForm.accountId}
                onChange={(e) => setCardForm({ ...cardForm, accountId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="">Nenhuma / Definir na hora de pagar</option>
                {(snapshot?.accounts || []).map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setCardDialogOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm"
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
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="pay-inv-acc"
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              Debitar de qual Conta Bancária?
            </label>
            <select
              id="pay-inv-acc"
              value={payInvoiceAccountId}
              onChange={(e) => setPayInvoiceAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              {(snapshot?.accounts || []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Saldo: {formatBRL(a.currentBalance)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() =>
                setPayInvoiceDialog((prev) => ({ ...prev, open: false }))
              }
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              Categoria de Despesa
            </label>
            <select
              id="bdg-cat"
              value={budgetForm.categoryId}
              onChange={(e) =>
                setBudgetForm({ ...budgetForm, categoryId: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setBudgetDialogOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="goal-target"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="goal-init"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="goal-deadline"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setGoalDialogOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="gdep-date"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="gdep-note"
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() =>
                setGoalDepositDialog((prev) => ({ ...prev, open: false }))
              }
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cat-type"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="cat-parent"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Categoria Pai (Opcional — para Subcategoria)
              </label>
              <select
                id="cat-parent"
                value={catForm.parentId}
                onChange={(e) =>
                  setCatForm({ ...catForm, parentId: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setCategoryDialogOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {authTab === "google" ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/40 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  Autenticação integrada: vincule ou acesse seu perfil com um clique sem expor sua senha pessoal.
                </p>
              </div>
              <div>
                <label
                  htmlFor="google-email"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
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
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Email with modern-web-guidance: validate-input-after-interaction */}
              <div className="mwg-field">
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
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
                  className="mwg-input w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
                <div id={emailErrorId} className="mwg-error-msg">
                  Informe um endereço de e-mail válido.
                </div>
              </div>

              {/* Password with modern-web-guidance: validate-input-after-interaction */}
              <div className="mwg-field">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Senha de Acesso
                </label>
                <ul
                  id={passwordRulesId}
                  className="mwg-rules-list mb-1.5 list-inside list-disc text-xs text-slate-600 dark:text-slate-400"
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
                  className="mwg-input w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
                <div className="mwg-error-msg">
                  A senha deve atender aos critérios listados acima.
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setAuthDialogOpen(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
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

      {/* =========================================================
          DIALOG 10: GERENCIAR DADOS (ZERAR TUDO / RESTAURAR DEMO)
         ========================================================= */}
      <LightDismissDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        title="Gerenciar Dados: Início Limpo ou Demonstração"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-800 dark:text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Deseja zerar os dados para preencher com suas finanças reais?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-amber-900 dark:text-amber-300">
                  Ao clicar em <strong>&ldquo;Zerar Tudo (Começar Limpo)&rdquo;</strong>, todas as contas bancárias, cartões de crédito, lançamentos e metas de exemplo serão removidos.
                  Suas categorias essenciais do Mobills serão preservadas para que você possa lançar seus dados reais imediatamente.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/40 p-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Escolha uma ação:</h4>
            <div className="mt-3 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleSetMode("clean")}
                className="flex items-center justify-between rounded-2xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 p-4 text-left transition hover:border-red-500 hover:bg-red-50 dark:bg-red-950/40 dark:hover:bg-red-950/20 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">🌱 Zerar Tudo (Começar no Modo Limpo)</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Remove todas as contas e transações de teste para você cadastrar seus dados reais com total controle.</p>
                </div>
                <Trash2 className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 ml-3" />
              </button>

              <button
                type="button"
                onClick={() => handleSetMode("demo")}
                className="flex items-center justify-between rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-left transition hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">📊 Restaurar Dados de Demonstração</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Recarrega contas (Nubank, Itaú), cartões, faturas e orçamentos simulados para você explorar as telas.</p>
                </div>
                <RotateCcw className="h-5 w-5 shrink-0 text-slate-700 dark:text-slate-300 ml-3" />
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setResetDialogOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 12: ESCOLHA DO MODO INICIAL (PRIMEIRO ACESSO)
         ========================================================= */}
      <LightDismissDialog
        open={welcomeModalOpen}
        onClose={() => setWelcomeModalOpen(false)}
        title="Bem-vindo ao Mobills Pro!"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40/70 dark:bg-emerald-950/40 p-5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Como você prefere iniciar seu controle?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 dark:text-slate-300">
                  Você tem total liberdade para escolher entre uma tela 100% limpa para registrar suas finanças reais, ou carregar uma conta de demonstração completa com contas e despesas simuladas.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Option 1: Clean Mode */}
            <button
              type="button"
              onClick={() => handleSetMode("clean")}
              className="flex flex-col justify-between rounded-2xl border-2 border-emerald-600 dark:border-emerald-500 bg-white dark:bg-slate-900 p-5 text-left shadow-sm transition hover:shadow-md hover:bg-emerald-50 dark:bg-emerald-950/40/30 dark:hover:bg-emerald-950/20"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Recomendado
                </div>
                <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
                  🌱 Começar do Zero (Modo Limpo)
                </h4>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sem contas ou lançamentos de teste. Tudo 100% zerado para você cadastrar seus bancos e cartões reais com precisão.
                </p>
              </div>
              <div className="mt-4 inline-flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Iniciar Zerado →
              </div>
            </button>

            {/* Option 2: Demo Mode */}
            <button
              type="button"
              onClick={() => handleSetMode("demo")}
              className="flex flex-col justify-between rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-left shadow-sm transition hover:shadow-md hover:border-slate-400 dark:hover:border-slate-600"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Para testes
                </div>
                <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
                  📊 Explorar com Demonstração
                </h4>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Carrega contas fictícias (Nubank, Itaú), cartões, orçamentos e faturas para você experimentar todos os relatórios.
                </p>
              </div>
              <div className="mt-4 inline-flex items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                Carregar Demo →
              </div>
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
            Você poderá alternar entre o Modo Limpo e o Modo Demonstração a qualquer momento pelo botão no topo da tela.
          </p>
        </div>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 14: IMPORTADOR DE EXTRATO BANCÁRIO (OFX / CSV)
         ========================================================= */}
      <LightDismissDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title="Importar Extrato Bancário (OFX / CSV)"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-4">
            <div className="flex items-start gap-3">
              <FileUp className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Importação Automática do Banco Inter, Nubank e outros bancos
                </h4>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Baixe o extrato no formato <strong>.OFX</strong> ou <strong>.CSV</strong> do internet banking e selecione abaixo. As compras serão categorizadas automaticamente com base na descrição (Uber, iFood, Farmácia, Salário, etc.).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Conta de Destino no Mobills
              </label>
              <select
                value={importTargetAccount}
                onChange={(e) => setImportTargetAccount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                {(snapshot?.accounts || []).map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Arquivo do Extrato (.OFX ou .CSV)
              </label>
              <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                <FileUp className="h-4 w-4 text-emerald-600" />
                <span className="truncate">{importFileName || "Selecionar arquivo..."}</span>
                <input
                  type="file"
                  accept=".ofx,.csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImportFileName(file.name);
                    setIsParsingFile(true);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      let parsed: ImportedTransaction[] = [];
                      if (file.name.toLowerCase().endsWith(".ofx") || text.includes("<OFX>") || text.includes("<STMTTRN>")) {
                        parsed = parseOFX(text);
                      } else {
                        parsed = parseCSV(text);
                      }
                      setImportedList(parsed);
                      setIsParsingFile(false);
                    };
                    reader.readAsText(file, "utf-8");
                  }}
                />
              </label>
            </div>
          </div>

          {/* Preview list */}
          {importedList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {importedList.filter((x) => x.selected).length} de {importedList.length} lançamentos selecionados
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = importedList.every((x) => x.selected);
                    setImportedList((prev) => prev.map((x) => ({ ...x, selected: !allSelected })));
                  }}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {importedList.every((x) => x.selected) ? "Desmarcar Todos" : "Marcar Todos"}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {importedList.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-xs transition ${
                      tx.selected
                        ? "border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={tx.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setImportedList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, selected: checked } : item))
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatDateBR(tx.date)} · Sugerido: {tx.categoryName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={tx.categoryId}
                        onChange={(e) => {
                          const catId = e.target.value;
                          const found = (snapshot?.categories || []).find((c: any) => c.id === catId);
                          setImportedList((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, categoryId: catId, categoryName: found?.name || item.categoryName } : item
                            )
                          );
                        }}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 px-2 text-[11px] text-slate-800 dark:text-slate-200"
                      >
                        {(snapshot?.categories || []).map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <span
                        className={`font-bold tabular-nums ${
                          tx.type === "income" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatBRL(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => {
                setImportDialogOpen(false);
                setImportedList([]);
                setImportFileName("");
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={importedList.filter((x) => x.selected).length === 0}
              onClick={async () => {
                const selectedTxs = importedList.filter((x) => x.selected);
                const ok = await postAction(
                  {
                    action: "import_transactions",
                    accountId: importTargetAccount || snapshot?.accounts?.[0]?.id,
                    transactions: selectedTxs,
                  },
                  `${selectedTxs.length} lançamentos importados com sucesso para o seu extrato!`
                );
                if (ok) {
                  setImportDialogOpen(false);
                  setImportedList([]);
                  setImportFileName("");
                }
              }}
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 shadow-sm"
            >
              Importar {importedList.filter((x) => x.selected).length} Lançamentos
            </button>
          </div>
        </div>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 15: EXTRATO OFICIAL CONSOLIDADO (IMPRESSÃO / PDF)
         ========================================================= */}
      <LightDismissDialog
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Extrato Oficial Consolidado (Fechamento Mensal)"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Mobills Pro — Relatório Mensal Executivo
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Competência: {MONTH_NAMES[month - 1]} de {year} · Emitido para: {snapshot?.user?.name || "Minha Conta"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 dark:hover:bg-emerald-600 transition"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
          </div>

          {/* Consolidated Numbers */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Saldo Atual Total</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatBRL(snapshot?.summary?.totalBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Receitas do Mês</p>
              <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatBRL(snapshot?.summary?.totalIncome)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Despesas Totais</p>
              <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-400 tabular-nums">
                {formatBRL(snapshot?.summary?.totalExpenses)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Economia Líquida</p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${snapshot?.summary?.monthlySavings >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                {formatBRL(snapshot?.summary?.monthlySavings)}
              </p>
            </div>
          </div>

          {/* Accounts Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Saldos por Instituição Financeira
            </h4>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {(snapshot?.accounts || []).map((acc: any) => (
                <div key={acc.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.color }} />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{acc.name} ({acc.institution})</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatBRL(acc.currentBalance)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Extrato Detalhado de Lançamentos ({snapshot?.transactions?.length || 0})
            </h4>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 border rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {(snapshot?.transactions || []).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{tx.description}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateBR(tx.date)} · {tx.categoryName || "Geral"}</p>
                  </div>
                  <span className={`font-bold tabular-nums ${tx.type === "income" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatBRL(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setReportModalOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Extrato</span>
            </button>
          </div>
        </div>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 16: VISUALIZADOR DE COMPROVANTE ANEXADO
         ========================================================= */}
      <LightDismissDialog
        open={attachmentModal.open}
        onClose={() => setAttachmentModal({ open: false, url: "", title: "" })}
        title={`Comprovante — ${attachmentModal.title}`}
      >
        <div className="space-y-4">
          <div className="flex justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 max-h-[60vh] overflow-auto">
            {attachmentModal.url && (
              <img
                src={attachmentModal.url}
                alt={attachmentModal.title}
                className="max-h-[55vh] rounded-xl object-contain shadow-sm"
              />
            )}
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-4">
            <a
              href={attachmentModal.url}
              download={`comprovante_${attachmentModal.title.replace(/\s+/g, "_")}.jpg`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Imagem</span>
            </a>
            <button
              type="button"
              onClick={() => setAttachmentModal({ open: false, url: "", title: "" })}
              className="rounded-lg bg-slate-900 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Fechar
            </button>
          </div>
        </div>
      </LightDismissDialog>

      {/* =========================================================
          DIALOG 11: MOVER LANÇAMENTOS ENTRE CATEGORIAS
         ========================================================= */}
      <LightDismissDialog
        open={moveCatDialog.open}
        onClose={() => setMoveCatDialog({ open: false, sourceCatId: "", sourceCatName: "", targetCatId: "" })}
        title="Mover Lançamentos entre Categorias"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!moveCatDialog.targetCatId) return;
            const ok = await postAction(
              {
                action: "move_category_transactions",
                sourceCategoryId: moveCatDialog.sourceCatId,
                targetCategoryId: moveCatDialog.targetCatId,
              },
              "Lançamentos movidos com sucesso para a nova categoria."
            );
            if (ok) {
              setMoveCatDialog({ open: false, sourceCatId: "", sourceCatName: "", targetCatId: "" });
            }
          }}
          className="space-y-4"
        >
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Você está transferindo todos os lançamentos de <strong>{moveCatDialog.sourceCatName}</strong> para outra categoria:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Categoria de Destino
            </label>
            <select
              value={moveCatDialog.targetCatId}
              onChange={(e) => setMoveCatDialog({ ...moveCatDialog, targetCatId: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="">Selecione a categoria de destino...</option>
              {(snapshot?.categories || [])
                .filter((c: any) => c.id !== moveCatDialog.sourceCatId)
                .map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.parentName ? `${c.parentName} › ${c.name}` : c.name} ({c.type === "income" ? "Receita" : "Despesa"})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setMoveCatDialog({ open: false, sourceCatId: "", sourceCatName: "", targetCatId: "" })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Mover Lançamentos
            </button>
          </div>
        </form>
      </LightDismissDialog>
    </div>
  );
}
