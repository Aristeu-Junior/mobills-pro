"use client";

import React from "react";
import {
  Bot,
  Send,
  MessageSquare,
  Zap,
  Sparkles,
  Smartphone,
  Check,
  CreditCard as CreditCardIcon,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Mic,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  analyzeFinancialHealth,
  simulatePurchase,
  answerConsultantQuestion,
  PurchaseSimulationResult,
  ConsultantChatMessage,
} from "@/lib/financial-advisor";

interface AdvisorModuleProps {
  snapshot: any;
  hideBalances: boolean;
  postAction: (actionData: any) => Promise<boolean>;
  setBannerMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
  advisorTab: "chat" | "simulator" | "diagnosis" | "iphone";
  setAdvisorTab: (tab: "chat" | "simulator" | "diagnosis" | "iphone") => void;
  advisorInput: string;
  setAdvisorInput: (val: string) => void;
  advisorMessages: ConsultantChatMessage[];
  setAdvisorMessages: React.Dispatch<React.SetStateAction<ConsultantChatMessage[]>>;
  simForm: {
    description: string;
    amount: number;
    paymentMethod: "cash" | "card_installments";
    installmentsCount: number;
    accountId?: string;
    cardId?: string;
  };
  setSimForm: React.Dispatch<React.SetStateAction<{
    description: string;
    amount: number;
    paymentMethod: "cash" | "card_installments";
    installmentsCount: number;
    accountId?: string;
    cardId?: string;
  }>>;
  simResult: PurchaseSimulationResult | null;
  setSimResult: (res: PurchaseSimulationResult | null) => void;
  MONTH_NAMES: string[];
  formatBRL: (val: number, hide?: boolean) => string;
}

export function AdvisorModule({
  snapshot,
  hideBalances,
  postAction,
  setBannerMessage,
  advisorTab,
  setAdvisorTab,
  advisorInput,
  setAdvisorInput,
  advisorMessages,
  setAdvisorMessages,
  simForm,
  setSimForm,
  simResult,
  setSimResult,
  MONTH_NAMES,
  formatBRL,
}: AdvisorModuleProps) {
  const health = analyzeFinancialHealth(snapshot);

  const handleSendMessage = (textToSend?: string) => {
    const msg = (textToSend || advisorInput).trim();
    if (!msg) return;

    const userMsg: ConsultantChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: msg,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    const response = answerConsultantQuestion(msg, snapshot);
    setAdvisorMessages((prev) => [...prev, userMsg, response]);
    setAdvisorInput("");
  };

  const handleRunSimulation = () => {
    const res = simulatePurchase(snapshot, simForm);
    setSimResult(res);
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Consultor Financeiro Pessoal & iPhone
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Inteligência artificial contextual com visão integral dos seus saldos, faturas futuras e metas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1.5 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setAdvisorTab("chat")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              advisorTab === "chat"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Chat com Consultor</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAdvisorTab("simulator");
              if (!simResult) handleRunSimulation();
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              advisorTab === "simulator"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Simulador: Posso Comprar?</span>
          </button>
          <button
            type="button"
            onClick={() => setAdvisorTab("diagnosis")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              advisorTab === "diagnosis"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span>Diagnóstico 360°</span>
          </button>
          <button
            type="button"
            onClick={() => setAdvisorTab("iphone")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              advisorTab === "iphone"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Smartphone className="h-4 w-4 text-blue-500" />
            <span>iPhone & Telegram</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CHAT CONVERSACIONAL */}
      {advisorTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Box */}
          <div className="lg:col-span-3 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden h-[620px]">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Consultor Financeiro Conectado</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Banco Inter, Contas & Faturas Sincronizadas</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-1 text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                Gasto Seguro: R$ {health.safeToSpendDaily.toFixed(2).replace(".", ",")}/dia
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {advisorMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      m.sender === "user"
                        ? "bg-slate-900 dark:bg-slate-700 text-white"
                        : "bg-gradient-to-br from-indigo-600 to-purple-600 text-white"
                    }`}
                  >
                    {m.sender === "user" ? "Você" : <Bot className="h-4 w-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-slate-900 dark:bg-slate-800 text-white"
                        : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="whitespace-pre-line font-normal">{m.text}</div>

                    {/* Quick Action Button: Create transaction */}
                    {m.actionRequired?.type === "create_transaction" && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const defaultAcc = snapshot?.accounts?.[0]?.id || "";
                            const defaultCat =
                              snapshot?.categories?.find((c: any) =>
                                c.name.toLowerCase().includes("alimentação")
                              )?.id || snapshot?.categories?.[0]?.id || "";

                            await postAction({
                              action: "create_transaction",
                              transaction: {
                                description: m.actionRequired?.payload?.description || "Despesa aprovada",
                                amount: m.actionRequired?.payload?.amount || 0,
                                type: "expense",
                                date: new Date().toISOString().split("T")[0],
                                accountId: defaultAcc,
                                categoryId: defaultCat,
                                status: "completed",
                                tags: ["consultor-ia"],
                              },
                            });
                            setAdvisorMessages((prev) => [
                              ...prev,
                              {
                                id: `sys-${Date.now()}`,
                                sender: "advisor",
                                text: `✅ Transação de R$ ${m.actionRequired?.payload?.amount?.toFixed(2)} lançada com sucesso no seu Mobills!`,
                                timestamp: "Agora",
                              },
                            ]);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Confirmar e Lançar Agora</span>
                        </button>
                      </div>
                    )}

                    {m.actionRequired?.type === "open_simulator" && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setAdvisorTab("simulator")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-300" />
                          <span>Abrir Simulador de Compra</span>
                        </button>
                      </div>
                    )}

                    <p className={`mt-1 text-[10px] text-right ${m.sender === "user" ? "text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>
                      {m.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2"
            >
              <input
                type="text"
                value={advisorInput}
                onChange={(e) => setAdvisorInput(e.target.value)}
                placeholder="Pergunte se pode comprar algo, quanto vai pagar mês que vem, ou lance gastos..."
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </div>

          {/* Quick Suggestions & Live Metrics Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Sugestões Rápidas de Consulta
              </h4>
              <div className="mt-3 space-y-2">
                {[
                  "Posso comprar um tênis de 380 parcelado em 3x?",
                  "Quanto tenho para pagar no próximo mês?",
                  "Qual é o meu gasto diário seguro hoje?",
                  "Gastei 45 reais no almoço agora",
                  "Como está o fechamento das minhas faturas?",
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-900 dark:hover:text-indigo-200 hover:border-indigo-300 transition-colors"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Resumo da Carteira em Tempo Real
              </h4>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Saldo Líquido em Caixa:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatBRL(health.liquidBalance, hideBalances)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Gasto Diário Seguro:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    R$ {health.safeToSpendDaily.toFixed(2).replace(".", ",")}/dia
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Compromissos Mês Que Vem:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400 tabular-nums">
                    {formatBRL(health.nextMonthCommitments.totalEstimated, hideBalances)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Dias Restantes no Mês:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {health.daysRemainingInMonth} dias
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SIMULADOR DE COMPRA (POSSO COMPRAR?) */}
      {advisorTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Calculadora de Decisão: Posso Comprar?
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Simule qualquer compra antes de passar o cartão ou fazer o Pix. A IA calcula a viabilidade na hora!
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  O que você quer comprar?
                </label>
                <input
                  type="text"
                  value={simForm.description}
                  onChange={(e) => setSimForm({ ...simForm, description: e.target.value })}
                  placeholder="Ex: Fone de Ouvido, Tênis, Jantar especial..."
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Valor Total da Compra (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={simForm.amount || ""}
                  onChange={(e) => setSimForm({ ...simForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Forma de Pagamento
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimForm({ ...simForm, paymentMethod: "cash", installmentsCount: 1 })}
                    className={`rounded-xl border p-2.5 text-xs font-bold text-center transition-all ${
                      simForm.paymentMethod === "cash"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    💵 À Vista (Pix / Débito)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimForm({ ...simForm, paymentMethod: "card_installments" })}
                    className={`rounded-xl border p-2.5 text-xs font-bold text-center transition-all ${
                      simForm.paymentMethod === "card_installments"
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    💳 Cartão Parcelado
                  </button>
                </div>
              </div>

              {simForm.paymentMethod === "card_installments" && (
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Número de Parcelas:</span>
                    <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                      {simForm.installmentsCount}x de R${" "}
                      {(simForm.amount / (simForm.installmentsCount || 1)).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={simForm.installmentsCount}
                    onChange={(e) => setSimForm({ ...simForm, installmentsCount: parseInt(e.target.value) || 1 })}
                    className="mt-2 w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>1x (À vista na fatura)</span>
                    <span>6x</span>
                    <span>12x</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunSimulation}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                <Zap className="h-4 w-4 text-amber-300" />
                <span>Avaliar Viabilidade com a IA</span>
              </button>
            </div>
          </div>

          {/* Result Output */}
          <div className="lg:col-span-7 space-y-4">
            {simResult ? (
              <div
                className={`rounded-2xl border p-6 shadow-sm ${
                  simResult.verdict === "SAFE"
                    ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                    : simResult.verdict === "CAUTION"
                    ? "border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20"
                    : "border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider ${
                      simResult.verdict === "SAFE"
                        ? "bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100"
                        : simResult.verdict === "CAUTION"
                        ? "bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100"
                        : "bg-red-200 dark:bg-red-900 text-red-950 dark:text-red-100"
                    }`}
                  >
                    {simResult.verdict === "SAFE" && "🟢 COMPRA SEGURA"}
                    {simResult.verdict === "CAUTION" && "🟡 ATENÇÃO / MODERAÇÃO"}
                    {simResult.verdict === "CRITICAL" && "🔴 ALTO RISCO"}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Score de Viabilidade: <strong className="text-sm font-extrabold">{simResult.score}/100</strong>
                  </span>
                </div>

                <h4 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {simResult.verdictTitle}
                </h4>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                  {simResult.verdictDescription}
                </p>

                {/* Financial Impact Comparison */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Impacto no Mês Atual</p>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      R$ {simResult.impactCurrentMonth.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Parcela no Próximo Mês</p>
                    <p className="mt-1 text-base font-bold text-purple-700 dark:text-purple-400 tabular-nums">
                      R$ {simResult.impactNextMonth.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Gasto Diário Seguro Após</p>
                    <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      R$ {simResult.safeToSpendAfter.toFixed(2).replace(".", ",")}/dia
                    </p>
                  </div>
                </div>

                {/* Bullet Recommendations */}
                <div className="mt-5 space-y-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Recomendações Personalizadas:</p>
                  {simResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>

                {/* Quick 1-Click Register Button */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Decidiu comprar? Lance direto na sua conta:</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const defaultAcc = snapshot?.accounts?.[0]?.id || "";
                      const defaultCat =
                        snapshot?.categories?.find(
                          (c: any) =>
                            c.name.toLowerCase().includes("compras") || c.name.toLowerCase().includes("lazer")
                        )?.id || snapshot?.categories?.[0]?.id || "";

                      await postAction({
                        action: "create_transaction",
                        transaction: {
                          description: simForm.description || "Compra Simulada",
                          amount: simForm.paymentMethod === "cash" ? simForm.amount : simResult.installmentAmount,
                          type: "expense",
                          date: new Date().toISOString().split("T")[0],
                          accountId: defaultAcc,
                          categoryId: defaultCat,
                          status: "completed",
                          installments:
                            simForm.paymentMethod === "card_installments"
                              ? { total: simForm.installmentsCount, current: 1 }
                              : undefined,
                          tags: ["compra-simulada"],
                        },
                      });
                      setBannerMessage({
                        type: "success",
                        text: `Compra de "${simForm.description}" registrada com sucesso no Mobills!`,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Registrar esta Compra no Mobills</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                <Bot className="h-10 w-10 text-indigo-400 mx-auto" />
                <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">Pronto para Simular</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Preencha os dados ao lado com o item e valor desejado para receber o parecer do Consultor com base nas suas finanças reais.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNÓSTICO 360° */}
      {advisorTab === "diagnosis" && (
        <div className="space-y-6">
          {/* Score & Safe-to-Spend Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Score de Saúde Financeira</h4>
              <div className="mt-4 flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-3xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
                  {health.score}
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">{health.scoreLabel}</p>
                  <p className="text-xs text-slate-500">Taxa de poupança atual: {health.savingsRate}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gasto Diário Seguro (Safe-to-Spend)</h4>
              <div className="mt-4">
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                  R$ {health.safeToSpendDaily.toFixed(2).replace(".", ",")}<span className="text-sm font-medium text-slate-500">/dia</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Valor médio que você pode gastar livremente nos próximos {health.daysRemainingInMonth} dias sem estourar o mês.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Compromissos Mês Seguinte</h4>
              <div className="mt-4">
                <p className="text-3xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                  {formatBRL(health.nextMonthCommitments.totalEstimated, hideBalances)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Soma das faturas de cartão abertas ({formatBRL(health.nextMonthCommitments.cardsTotal, hideBalances)}) + despesas fixas.
                </p>
              </div>
            </div>
          </div>

          {/* Faturas Futuras por Cartão */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Detalhamento de Faturas Previstas para o Próximo Mês
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Acompanhamento antecipado para garantir que você não seja surpreendido no fechamento.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {health.nextMonthCommitments.cardsBreakdown.map((card, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{card.cardName}</span>
                    <span className="rounded-full bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:text-purple-300">
                      {card.dueDate}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatBRL(card.amount, hideBalances)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {card.amount <= health.liquidBalance ? "🟢 Saldo atual cobre 100%" : "🟡 Exige atenção de fluxo"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Regra 50 / 30 / 20 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Alocação Saudável: Framework 50 / 30 / 20
            </h4>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex justify-between text-xs font-bold">
                  <span>1. Necessidades</span>
                  <span className="text-slate-500">Meta: 50%</span>
                </div>
                <div className="mt-2 text-lg font-extrabold tabular-nums">{health.rule503020.needs.currentPct}%</div>
                <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.min(100, health.rule503020.needs.currentPct)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Moradia, Mercado e Contas</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex justify-between text-xs font-bold">
                  <span>2. Desejos & Lazer</span>
                  <span className="text-slate-500">Meta: 30%</span>
                </div>
                <div className="mt-2 text-lg font-extrabold tabular-nums">{health.rule503020.wants.currentPct}%</div>
                <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-600"
                    style={{ width: `${Math.min(100, health.rule503020.wants.currentPct)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-purple-700 dark:text-purple-400">Restaurantes, Compras e Streaming</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex justify-between text-xs font-bold">
                  <span>3. Reserva & Poupança</span>
                  <span className="text-slate-500">Meta: 20%</span>
                </div>
                <div className="mt-2 text-lg font-extrabold tabular-nums">{health.rule503020.savings.currentPct}%</div>
                <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${Math.min(100, health.rule503020.savings.currentPct)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Aportes e Reserva de Emergência</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURAÇÃO IPHONE (iOS) & TELEGRAM */}
      {advisorTab === "iphone" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Integração Nativa no iPhone (iOS) com Apple Atalhos
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  No iPhone, a Apple restringe a leitura de notificações de outros apps por privacidade. A solução oficial e mais rápida do mundo é utilizar o **Apple Atalhos (Shortcuts)**, permitindo registrar compras e consultar o assistente por toque ou voz!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Apple Shortcuts Options */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🍎 3 Formas de Acionar no iPhone:</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="font-bold text-slate-900 dark:text-slate-100">1. Toque Atrás (Back Tap do iPhone)</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    Dê 2 toques rápidos na traseira do iPhone para abrir a caixinha rápida do Mobills e falar ou ditar o gasto.
                  </p>
                  <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Ajustes ➔ Acessibilidade ➔ Toque ➔ Toque Atrás ➔ Escolha o Atalho Mobills.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="font-bold text-slate-900 dark:text-slate-100">2. Comando de Voz com a Siri</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    Diga: *"E aí Siri, Mobills"* e fale: *"Gastei 45 no almoço"*. O atalho envia o valor na hora para o seu app!
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="font-bold text-slate-900 dark:text-slate-100">3. Botão de Ação (Action Button)</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    No iPhone 15 Pro / 16, configure o Botão de Ação lateral para abrir instantaneamente o Consultor Mobills.
                  </p>
                </div>
              </div>
            </div>

            {/* Telegram Bot Setup */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🤖 Bot 24h no Telegram / WhatsApp:</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Converse com seu consultor a qualquer hora enviando **áudio de voz**, **fotos de comprovante Pix** ou **perguntas de compra**:
              </p>

              <div className="rounded-xl bg-slate-900 text-slate-200 p-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
                <p className="text-emerald-400"># Como ligar o Bot em seu computador/servidor:</p>
                <p className="mt-1">$env:TELEGRAM_BOT_TOKEN="SEU_TOKEN_DO_BOTFATHER"</p>
                <p>$env:GEMINI_API_KEY="SUA_CHAVE_GEMINI"</p>
                <p className="mt-1 text-amber-300">node scripts/telegram-bot.mjs</p>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Suporte nativo a áudio de WhatsApp/Telegram (transcrição imediata).</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Visão computacional para prints de comprovantes Pix.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Pareceres de compra instantâneos ("Posso comprar?").</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
