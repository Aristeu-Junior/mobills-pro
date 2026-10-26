import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getDb,
  uid,
  hashPassword,
  verifyPassword,
  seedUserDefaults,
  ensureInvoice,
} from "@/lib/db";
import {
  getDefaultUser,
  getUserById,
  getFinancialSnapshot,
  createTransactionWithInstallments,
} from "@/lib/finance-engine";

const COOKIE_NAME = "mobills_session_uid";

async function resolveActiveUserId(): Promise<string> {
  const cookieStore = await cookies();
  const uidCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (uidCookie) {
    const u = getUserById(uidCookie);
    if (u) return u.id;
  }
  return getDefaultUser().id;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveActiveUserId();
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = Number(searchParams.get("month")) || 10;
    const year = Number(searchParams.get("year")) || 2026;
    const snapshot = getFinancialSnapshot(userId, month, year);
    return NextResponse.json(snapshot);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro ao carregar dados financeiros." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { action } = body;
    let userId = await resolveActiveUserId();

    if (action === "auth_login") {
      const { email, password } = body;
      const userRow = db
        .prepare("SELECT * FROM User WHERE lower(email) = lower(?)")
        .get(String(email || "").trim()) as any;

      if (!userRow || !verifyPassword(String(password || ""), userRow.passwordHash)) {
        return NextResponse.json(
          { error: "E-mail ou senha incorretos. Verifique suas credenciais ou use a conta demo." },
          { status: 401 }
        );
      }

      const res = NextResponse.json({ ok: true, userId: userRow.id });
      res.cookies.set(COOKIE_NAME, userRow.id, { path: "/", httpOnly: true, sameSite: "lax" });
      return res;
    }

    if (action === "auth_register") {
      const { name, email, password, seedDemo } = body;
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!name || !cleanEmail || !password || String(password).length < 6) {
        return NextResponse.json(
          { error: "Preencha nome, e-mail válido e senha com no mínimo 6 caracteres." },
          { status: 400 }
        );
      }

      const exists = db.prepare("SELECT id FROM User WHERE lower(email) = ?").get(cleanEmail);
      if (exists) {
        return NextResponse.json(
          { error: "Já existe uma conta cadastrada com este e-mail." },
          { status: 409 }
        );
      }

      const newUserId = uid("usr");
      db.prepare(`
        INSERT INTO User (id, name, email, passwordHash, currency, hideBalances, createdAt)
        VALUES (?, ?, ?, ?, 'BRL', 0, ?)
      `).run(newUserId, String(name).trim(), cleanEmail, hashPassword(String(password)), new Date().toISOString());

      seedUserDefaults(db, newUserId, Boolean(seedDemo));

      const res = NextResponse.json({ ok: true, userId: newUserId });
      res.cookies.set(COOKIE_NAME, newUserId, { path: "/", httpOnly: true, sameSite: "lax" });
      return res;
    }

    if (action === "auth_google") {
      const { email, name } = body;
      const cleanEmail = String(email || "aristeu.google@gmail.com").trim().toLowerCase();
      const displayName = String(name || "Aristeu Junior (Google)").trim();

      let userRow = db
        .prepare("SELECT * FROM User WHERE lower(email) = ?")
        .get(cleanEmail) as any;

      if (!userRow) {
        const newUserId = uid("usr_gg");
        db.prepare(`
          INSERT INTO User (id, name, email, passwordHash, currency, hideBalances, createdAt)
          VALUES (?, ?, ?, ?, 'BRL', 0, ?)
        `).run(newUserId, displayName, cleanEmail, hashPassword(uid("oauth")), new Date().toISOString());
        seedUserDefaults(db, newUserId, true);
        userRow = { id: newUserId };
      }

      const res = NextResponse.json({ ok: true, userId: userRow.id });
      res.cookies.set(COOKIE_NAME, userRow.id, { path: "/", httpOnly: true, sameSite: "lax" });
      return res;
    }

    if (action === "toggle_hide_balances") {
      db.prepare("UPDATE User SET hideBalances = CASE WHEN hideBalances = 1 THEN 0 ELSE 1 END WHERE id = ?").run(userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "create_transaction") {
      const createdIds = createTransactionWithInstallments(userId, {
        description: String(body.description || "Lançamento"),
        amount: Math.abs(Number(body.amount || 0)),
        date: String(body.date || "2026-10-26"),
        type: body.type,
        status: body.status || "completed",
        accountId: body.accountId || null,
        destinationAccountId: body.destinationAccountId || null,
        creditCardId: body.creditCardId || null,
        categoryId: body.categoryId || null,
        isFixed: Boolean(body.isFixed),
        installments: Number(body.installments || 1),
        tags: Array.isArray(body.tags) ? body.tags : [],
        notes: body.notes || null,
      });
      return NextResponse.json({ ok: true, createdIds });
    }

    if (action === "toggle_transaction_status") {
      const { id } = body;
      db.prepare(
        "UPDATE TransactionRecord SET status = CASE WHEN status = 'completed' THEN 'pending' ELSE 'completed' END WHERE id = ? AND userId = ?"
      ).run(id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_transaction") {
      const { id, deleteGroup } = body;
      if (deleteGroup) {
        const row = db
          .prepare("SELECT installmentGroupId FROM TransactionRecord WHERE id = ? AND userId = ?")
          .get(id, userId) as { installmentGroupId?: string } | undefined;
        if (row?.installmentGroupId) {
          db.prepare("DELETE FROM TransactionRecord WHERE installmentGroupId = ? AND userId = ?").run(
            row.installmentGroupId,
            userId
          );
          return NextResponse.json({ ok: true });
        }
      }
      db.prepare("DELETE FROM TransactionRecord WHERE id = ? AND userId = ?").run(id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "create_account") {
      const id = uid("acc");
      db.prepare(`
        INSERT INTO Account (id, userId, name, institution, type, color, initialBalance, includeInSummary, archived, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        id,
        userId,
        String(body.name || "Nova Conta"),
        String(body.institution || "Banco"),
        String(body.type || "checking"),
        String(body.color || "#2563EB"),
        Number(body.initialBalance || 0),
        body.includeInSummary === false ? 0 : 1,
        new Date().toISOString()
      );
      return NextResponse.json({ ok: true, id });
    }

    if (action === "readjust_account_balance") {
      const { accountId, newBalance, month, year } = body;
      const snapshot = getFinancialSnapshot(userId, Number(month) || 10, Number(year) || 2026);
      const acc = snapshot.accounts.find((a) => a.id === accountId);
      if (!acc) {
        return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
      }
      const diff = Number((Number(newBalance) - acc.currentBalance).toFixed(2));
      if (Math.abs(diff) > 0.009) {
        createTransactionWithInstallments(userId, {
          description: "Reajuste de Saldo (Mobills)",
          amount: Math.abs(diff),
          date: `${year || 2026}-${String(month || 10).padStart(2, "0")}-26`,
          type: diff > 0 ? "income" : "expense",
          status: "completed",
          accountId,
          tags: ["reajuste"],
          notes: `Ajuste manual de R$ ${acc.currentBalance.toFixed(2)} para R$ ${Number(newBalance).toFixed(2)}`,
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_account") {
      db.prepare("DELETE FROM Account WHERE id = ? AND userId = ?").run(body.id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "create_card") {
      const id = uid("card");
      db.prepare(`
        INSERT INTO CreditCard (id, userId, accountId, name, brand, color, limitAmount, closingDay, dueDay, archived, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        id,
        userId,
        body.accountId || null,
        String(body.name || "Novo Cartão"),
        String(body.brand || "Mastercard"),
        String(body.color || "#6D28D9"),
        Math.abs(Number(body.limitAmount || 5000)),
        Math.min(31, Math.max(1, Number(body.closingDay || 20))),
        Math.min(31, Math.max(1, Number(body.dueDay || 28))),
        new Date().toISOString()
      );
      return NextResponse.json({ ok: true, id });
    }

    if (action === "pay_invoice") {
      const { creditCardId, month, year, amount, accountId } = body;
      const invId = ensureInvoice(db, creditCardId, Number(month), Number(year));
      const invRow = db.prepare("SELECT * FROM Invoice WHERE id = ?").get(invId) as any;
      const cardRow = db.prepare("SELECT * FROM CreditCard WHERE id = ?").get(creditCardId) as any;
      const sumRow = db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) as total FROM TransactionRecord WHERE invoiceId = ? AND type = 'card_expense'"
        )
        .get(invId) as { total: number };

      const payVal = Math.abs(Number(amount || sumRow.total));
      const newPaid = Number(((invRow?.paidAmount || 0) + payVal).toFixed(2));
      const newStatus = newPaid >= Number(sumRow.total) - 0.01 ? "paid" : "partial";

      db.prepare("UPDATE Invoice SET status = ?, paidAmount = ?, paidAt = ? WHERE id = ?").run(
        newStatus,
        newPaid,
        new Date().toISOString(),
        invId
      );

      db.prepare("UPDATE TransactionRecord SET status = 'completed' WHERE invoiceId = ?").run(invId);

      // Debit the bank account if selected
      const targetAccount = accountId || cardRow?.accountId;
      if (targetAccount && payVal > 0) {
        const mm = String(month).padStart(2, "0");
        db.prepare(`
          INSERT INTO TransactionRecord (
            id, userId, accountId, description, amount, date, competenceMonth, competenceYear,
            type, status, isFixed, tagsJson, notes, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'expense', 'completed', 0, ?, ?, ?)
        `).run(
          uid("tx"),
          userId,
          targetAccount,
          `Pagamento Fatura ${cardRow?.name || "Cartão"} (${mm}/${year})`,
          payVal,
          `${year}-${mm}-${String(cardRow?.dueDay || 25).padStart(2, "0")}`,
          Number(month),
          Number(year),
          JSON.stringify(["fatura"]),
          "Baixa automática de fatura de cartão de crédito",
          new Date().toISOString()
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "delete_card") {
      db.prepare("DELETE FROM CreditCard WHERE id = ? AND userId = ?").run(body.id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "create_category") {
      const id = uid("cat");
      db.prepare(`
        INSERT INTO Category (id, userId, parentId, name, type, color, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        body.parentId || null,
        String(body.name || "Nova Categoria"),
        body.type === "income" ? "income" : "expense",
        String(body.color || "#2563EB"),
        String(body.icon || "tag")
      );
      return NextResponse.json({ ok: true, id });
    }

    if (action === "delete_category") {
      db.prepare("DELETE FROM Category WHERE id = ? AND userId = ?").run(body.id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "create_tag") {
      const id = uid("tag");
      const cleanName = String(body.name || "")
        .trim()
        .replace(/^#/, "")
        .toLowerCase();
      if (cleanName) {
        db.prepare("INSERT INTO Tag (id, userId, name, color) VALUES (?, ?, ?, ?)").run(
          id,
          userId,
          cleanName,
          String(body.color || "#2563EB")
        );
      }
      return NextResponse.json({ ok: true, id });
    }

    if (action === "delete_tag") {
      db.prepare("DELETE FROM Tag WHERE id = ? AND userId = ?").run(body.id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "upsert_budget") {
      const { categoryId, month, year, amountLimit } = body;
      const existing = db
        .prepare(
          "SELECT id FROM Budget WHERE userId = ? AND categoryId = ? AND month = ? AND year = ?"
        )
        .get(userId, categoryId, Number(month), Number(year)) as { id: string } | undefined;

      if (existing) {
        db.prepare("UPDATE Budget SET amountLimit = ? WHERE id = ?").run(
          Math.abs(Number(amountLimit)),
          existing.id
        );
      } else {
        db.prepare(
          "INSERT INTO Budget (id, userId, categoryId, month, year, amountLimit) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(
          uid("bdg"),
          userId,
          categoryId,
          Number(month),
          Number(year),
          Math.abs(Number(amountLimit))
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_budget") {
      db.prepare("DELETE FROM Budget WHERE id = ? AND userId = ?").run(body.id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "create_goal") {
      const id = uid("goal");
      db.prepare(`
        INSERT INTO Goal (id, userId, name, targetAmount, initialAmount, deadline, color, icon, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(
        id,
        userId,
        String(body.name || "Novo Objetivo"),
        Math.abs(Number(body.targetAmount || 1000)),
        Math.abs(Number(body.initialAmount || 0)),
        String(body.deadline || "2027-12-31"),
        String(body.color || "#059669"),
        String(body.icon || "target"),
        new Date().toISOString()
      );
      return NextResponse.json({ ok: true, id });
    }

    if (action === "add_goal_deposit") {
      const { goalId, amount, date, note } = body;
      db.prepare(`
        INSERT INTO GoalDeposit (id, goalId, amount, date, note, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uid("gdep"),
        goalId,
        Math.abs(Number(amount || 0)),
        String(date || "2026-10-26"),
        note || null,
        new Date().toISOString()
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_goal") {
      db.prepare("DELETE FROM Goal WHERE id = ? AND userId = ?").run(body.id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "import_transactions") {
      const { items, accountId, defaultCategoryId } = body;
      if (!Array.isArray(items)) {
        return NextResponse.json({ error: "Nenhum item para importar." }, { status: 400 });
      }
      let count = 0;
      for (const item of items) {
        const amt = Number(item.amount || 0);
        if (!amt) continue;
        createTransactionWithInstallments(userId, {
          description: String(item.description || "Transação Importada"),
          amount: Math.abs(amt),
          date: String(item.date || "2026-10-26"),
          type: item.type || (amt >= 0 ? "income" : "expense"),
          status: "completed",
          accountId: accountId || null,
          categoryId: item.categoryId || defaultCategoryId || null,
          tags: ["importado"],
          notes: "Importado via extrato CSV/OFX",
        });
        count++;
      }
      return NextResponse.json({ ok: true, importedCount: count });
    }

    if (action === "reset_data") {
      const mode = body.mode || "zero";
      if (mode === "zero") {
        db.prepare("DELETE FROM TransactionRecord WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM GoalDeposit WHERE goalId IN (SELECT id FROM Goal WHERE userId = ?)").run(userId);
        db.prepare("DELETE FROM Goal WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM Budget WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM Invoice WHERE creditCardId IN (SELECT id FROM CreditCard WHERE userId = ?)").run(userId);
        db.prepare("DELETE FROM CreditCard WHERE userId = ?").run(userId);
        db.prepare("DELETE FROM Account WHERE userId = ?").run(userId);
      } else {
        seedUserDefaults(db, userId, true);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "edit_transaction") {
      const { id, description, amount, date, type, status, accountId, destinationAccountId, creditCardId, categoryId, isFixed, tags, notes } = body;
      const parsedDate = new Date(date || "2026-10-26");
      const compMonth = parsedDate.getMonth() + 1;
      const compYear = parsedDate.getFullYear();

      db.prepare(`
        UPDATE TransactionRecord SET
          description = ?,
          amount = ?,
          date = ?,
          competenceMonth = ?,
          competenceYear = ?,
          type = ?,
          status = ?,
          accountId = ?,
          destinationAccountId = ?,
          creditCardId = ?,
          categoryId = ?,
          isFixed = ?,
          tagsJson = ?,
          notes = ?
        WHERE id = ? AND userId = ?
      `).run(
        String(description || "Lançamento"),
        Math.abs(Number(amount || 0)),
        String(date || "2026-10-26"),
        compMonth,
        compYear,
        type,
        status || "completed",
        accountId || null,
        destinationAccountId || null,
        creditCardId || null,
        categoryId || null,
        isFixed ? 1 : 0,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        notes || null,
        id,
        userId
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "reopen_invoice") {
      const { invoiceId, creditCardId, month, year } = body;
      if (invoiceId) {
        db.prepare("UPDATE Invoice SET status = 'open', paidAmount = 0, paidAt = NULL WHERE id = ?").run(invoiceId);
      } else if (creditCardId && month && year) {
        db.prepare("UPDATE Invoice SET status = 'open', paidAmount = 0, paidAt = NULL WHERE creditCardId = ? AND month = ? AND year = ?").run(creditCardId, Number(month), Number(year));
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "archive_account") {
      db.prepare("UPDATE Account SET archived = CASE WHEN archived = 1 THEN 0 ELSE 1 END WHERE id = ? AND userId = ?").run(body.id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "archive_card") {
      db.prepare("UPDATE CreditCard SET archived = CASE WHEN archived = 1 THEN 0 ELSE 1 END WHERE id = ? AND userId = ?").run(body.id, userId);
      return NextResponse.json({ ok: true });
    }

    if (action === "move_category_transactions") {
      const { sourceCategoryId, targetCategoryId } = body;
      db.prepare("UPDATE TransactionRecord SET categoryId = ? WHERE categoryId = ? AND userId = ?").run(targetCategoryId, sourceCategoryId, userId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro interno ao processar operação." },
      { status: 500 }
    );
  }
}
