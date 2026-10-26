import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "mobills.sqlite");

const globalForDb = globalThis as unknown as {
  __mobillsDb?: DatabaseSync;
};

export function hashPassword(password: string): string {
  const salt = "mobills_pro_salt_v1";
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  const computed = Buffer.from(hashPassword(password), "hex");
  const stored = Buffer.from(hash, "hex");
  if (computed.length !== stored.length) return false;
  return crypto.timingSafeEqual(computed, stored);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function getDb(): DatabaseSync {
  if (globalForDb.__mobillsDb) {
    return globalForDb.__mobillsDb;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  initSchema(db);
  seedIfEmpty(db);

  globalForDb.__mobillsDb = db;
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BRL',
      hideBalances INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Account (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      institution TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      initialBalance REAL NOT NULL DEFAULT 0,
      includeInSummary INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CreditCard (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      accountId TEXT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      color TEXT NOT NULL,
      limitAmount REAL NOT NULL,
      closingDay INTEGER NOT NULL,
      dueDay INTEGER NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Invoice (
      id TEXT PRIMARY KEY,
      creditCardId TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      paidAmount REAL NOT NULL DEFAULT 0,
      paidAt TEXT,
      UNIQUE(creditCardId, month, year),
      FOREIGN KEY (creditCardId) REFERENCES CreditCard(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Category (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      parentId TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (parentId) REFERENCES Category(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Tag (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#475569',
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS TransactionRecord (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      accountId TEXT,
      destinationAccountId TEXT,
      creditCardId TEXT,
      invoiceId TEXT,
      categoryId TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      competenceMonth INTEGER NOT NULL,
      competenceYear INTEGER NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      isFixed INTEGER NOT NULL DEFAULT 0,
      installmentCurrent INTEGER,
      installmentTotal INTEGER,
      installmentGroupId TEXT,
      tagsJson TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE SET NULL,
      FOREIGN KEY (creditCardId) REFERENCES CreditCard(id) ON DELETE SET NULL,
      FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE SET NULL,
      FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Budget (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amountLimit REAL NOT NULL,
      UNIQUE(userId, categoryId, month, year),
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Goal (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      targetAmount REAL NOT NULL,
      initialAmount REAL NOT NULL DEFAULT 0,
      deadline TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS GoalDeposit (
      id TEXT PRIMARY KEY,
      goalId TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (goalId) REFERENCES Goal(id) ON DELETE CASCADE
    );
  `);
}

export function ensureInvoice(
  db: DatabaseSync,
  creditCardId: string,
  month: number,
  year: number
): string {
  const existing = db
    .prepare("SELECT id FROM Invoice WHERE creditCardId = ? AND month = ? AND year = ?")
    .get(creditCardId, month, year) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = uid("inv");
  db.prepare(
    "INSERT INTO Invoice (id, creditCardId, month, year, status, paidAmount) VALUES (?, ?, ?, ?, 'open', 0)"
  ).run(id, creditCardId, month, year);
  return id;
}

export function seedUserDefaults(db: DatabaseSync, userId: string, withDemoTransactions = true) {
  const now = new Date().toISOString();

  // Accounts
  const accNubank = uid("acc");
  const accItau = uid("acc");
  const accInter = uid("acc");
  const accWallet = uid("acc");

  const insertAccount = db.prepare(`
    INSERT INTO Account (id, userId, name, institution, type, color, initialBalance, includeInSummary, archived, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  insertAccount.run(accNubank, userId, "Conta Nubank", "Nubank", "checking", "#7C3AED", 4850.0, 1, now);
  insertAccount.run(accItau, userId, "Itaú Uniclass", "Itaú", "checking", "#EA580C", 3200.0, 1, now);
  insertAccount.run(accInter, userId, "Reserva CDB Inter", "Banco Inter", "investment", "#D97706", 15000.0, 1, now);
  insertAccount.run(accWallet, userId, "Carteira Física", "Dinheiro", "wallet", "#059669", 280.0, 1, now);

  // Credit Cards
  const cardNubank = uid("card");
  const cardItau = uid("card");

  const insertCard = db.prepare(`
    INSERT INTO CreditCard (id, userId, accountId, name, brand, color, limitAmount, closingDay, dueDay, archived, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  insertCard.run(cardNubank, userId, accNubank, "Nubank Ultravioleta", "Mastercard", "#6D28D9", 12000.0, 25, 2, now);
  insertCard.run(cardItau, userId, accItau, "Itaú Personnalité Visa", "Visa", "#C2410C", 18000.0, 18, 25, now);

  // Categories & Subcategories
  const catSalary = uid("cat");
  const catFreelance = uid("cat");
  const catDividends = uid("cat");
  const catHousing = uid("cat");
  const catSubRent = uid("cat");
  const catSubUtilities = uid("cat");
  const catFood = uid("cat");
  const catSubMarket = uid("cat");
  const catSubRestaurant = uid("cat");
  const catTransport = uid("cat");
  const catSubFuel = uid("cat");
  const catSubUber = uid("cat");
  const catLeisure = uid("cat");
  const catSubStreaming = uid("cat");
  const catHealth = uid("cat");
  const catEducation = uid("cat");

  const insertCat = db.prepare(`
    INSERT INTO Category (id, userId, parentId, name, type, color, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Income Categories
  insertCat.run(catSalary, userId, null, "Salário", "income", "#059669", "briefcase");
  insertCat.run(catFreelance, userId, null, "Projetos & Freelance", "income", "#0D9488", "laptop");
  insertCat.run(catDividends, userId, null, "Rendimentos & Dividendos", "income", "#2563EB", "trending-up");

  // Expense Categories + Subcategories
  insertCat.run(catHousing, userId, null, "Moradia", "expense", "#4F46E5", "home");
  insertCat.run(catSubRent, userId, catHousing, "Aluguel & Condomínio", "expense", "#4F46E5", "home");
  insertCat.run(catSubUtilities, userId, catHousing, "Energia, Água & Fibra", "expense", "#4F46E5", "zap");

  insertCat.run(catFood, userId, null, "Alimentação", "expense", "#E11D48", "utensils");
  insertCat.run(catSubMarket, userId, catFood, "Supermercado", "expense", "#E11D48", "shopping-cart");
  insertCat.run(catSubRestaurant, userId, catFood, "Restaurantes & Delivery", "expense", "#E11D48", "utensils");

  insertCat.run(catTransport, userId, null, "Transporte", "expense", "#D97706", "car");
  insertCat.run(catSubFuel, userId, catTransport, "Combustível & Pedágio", "expense", "#D97706", "car");
  insertCat.run(catSubUber, userId, catTransport, "Apps de Mobilidade", "expense", "#D97706", "navigation");

  insertCat.run(catLeisure, userId, null, "Lazer & Assinaturas", "expense", "#7C3AED", "film");
  insertCat.run(catSubStreaming, userId, catLeisure, "Streaming & Software", "expense", "#7C3AED", "tv");

  insertCat.run(catHealth, userId, null, "Saúde & Bem-estar", "expense", "#0891B2", "heart-pulse");
  insertCat.run(catEducation, userId, null, "Educação & Livros", "expense", "#2563EB", "graduation-cap");

  // Tags
  const insertTag = db.prepare(`INSERT INTO Tag (id, userId, name, color) VALUES (?, ?, ?, ?)`);
  insertTag.run(uid("tag"), userId, "essencial", "#0F172A");
  insertTag.run(uid("tag"), userId, "trabalho", "#2563EB");
  insertTag.run(uid("tag"), userId, "reembolsavel", "#059669");
  insertTag.run(uid("tag"), userId, "familia", "#7C3AED");
  insertTag.run(uid("tag"), userId, "assinatura", "#D97706");

  if (!withDemoTransactions) return;

  const insertTx = db.prepare(`
    INSERT INTO TransactionRecord (
      id, userId, accountId, destinationAccountId, creditCardId, invoiceId, categoryId,
      description, amount, date, competenceMonth, competenceYear, type, status,
      isFixed, installmentCurrent, installmentTotal, installmentGroupId, tagsJson, notes, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seed historical months (May 2026 to Sep 2026) + Current month (Oct 2026)
  const historyMonths = [
    { m: 5, y: 2026, sal: 11800, free: 1800, rent: 3100, food: 1650, trans: 620, card: 1940 },
    { m: 6, y: 2026, sal: 11800, free: 2400, rent: 3100, food: 1820, trans: 590, card: 2210 },
    { m: 7, y: 2026, sal: 12500, free: 1500, rent: 3100, food: 1790, trans: 710, card: 2680 },
    { m: 8, y: 2026, sal: 12500, free: 2900, rent: 3150, food: 1910, trans: 640, card: 2150 },
    { m: 9, y: 2026, sal: 12500, free: 2200, rent: 3150, food: 1740, trans: 680, card: 2390 },
  ];

  for (const h of historyMonths) {
    const mm = String(h.m).padStart(2, "0");
    insertTx.run(
      uid("tx"), userId, accItau, null, null, null, catSalary,
      "Salário Mensal CLT", h.sal, `${h.y}-${mm}-05`, h.m, h.y,
      "income", "completed", 1, null, null, null, JSON.stringify(["trabalho"]), "Folha mensal", now
    );
    insertTx.run(
      uid("tx"), userId, accNubank, null, null, null, catFreelance,
      "Consultoria de Arquitetura", h.free, `${h.y}-${mm}-15`, h.m, h.y,
      "income", "completed", 0, null, null, null, JSON.stringify(["trabalho"]), null, now
    );
    insertTx.run(
      uid("tx"), userId, accItau, null, null, null, catSubRent,
      "Aluguel + Condomínio", h.rent, `${h.y}-${mm}-10`, h.m, h.y,
      "expense", "completed", 1, null, null, null, JSON.stringify(["essencial", "familia"]), null, now
    );
    insertTx.run(
      uid("tx"), userId, accNubank, null, null, null, catSubMarket,
      "Compras Supermercado do Mês", h.food, `${h.y}-${mm}-12`, h.m, h.y,
      "expense", "completed", 0, null, null, null, JSON.stringify(["essencial", "familia"]), null, now
    );
    insertTx.run(
      uid("tx"), userId, accNubank, null, null, null, catSubFuel,
      "Combustível & Deslocamento", h.trans, `${h.y}-${mm}-18`, h.m, h.y,
      "expense", "completed", 0, null, null, null, JSON.stringify(["essencial"]), null, now
    );

    const invHist = ensureInvoice(db, cardNubank, h.m, h.y);
    db.prepare("UPDATE Invoice SET status = 'paid', paidAmount = ?, paidAt = ? WHERE id = ?").run(
      h.card, `${h.y}-${mm}-28`, invHist
    );
    insertTx.run(
      uid("tx"), userId, null, null, cardNubank, invHist, catLeisure,
      "Despesas Concentradas Cartão", h.card, `${h.y}-${mm}-14`, h.m, h.y,
      "card_expense", "completed", 0, null, null, null, JSON.stringify(["assinatura"]), null, now
    );
  }

  // Current Month: October 2026 (10/2026)
  const curM = 10;
  const curY = 2026;

  // Incomes in Oct 2026
  insertTx.run(
    uid("tx"), userId, accItau, null, null, null, catSalary,
    "Salário Outubro (Líquido)", 12500.0, "2026-10-05", curM, curY,
    "income", "completed", 1, null, null, null, JSON.stringify(["trabalho"]), "Depósito em conta", now
  );
  insertTx.run(
    uid("tx"), userId, accNubank, null, null, null, catFreelance,
    "Projeto Plataforma Web (Parcela 2/2)", 3400.0, "2026-10-18", curM, curY,
    "income", "completed", 0, null, null, null, JSON.stringify(["trabalho"]), "NF emitida", now
  );
  insertTx.run(
    uid("tx"), userId, accInter, null, null, null, catDividends,
    "Dividendos FIIs & Rendimento CDB", 645.8, "2026-10-20", curM, curY,
    "income", "completed", 1, null, null, null, JSON.stringify(["essencial"]), null, now
  );
  insertTx.run(
    uid("tx"), userId, accNubank, null, null, null, catFreelance,
    "Reembolso Deslocamento Cliente", 480.0, "2026-10-29", curM, curY,
    "income", "pending", 0, null, null, null, JSON.stringify(["reembolsavel", "trabalho"]), "Aguardando depósito", now
  );

  // Expenses in Oct 2026 (Account debits)
  insertTx.run(
    uid("tx"), userId, accItau, null, null, null, catSubRent,
    "Aluguel + Condomínio Outubro", 3150.0, "2026-10-10", curM, curY,
    "expense", "completed", 1, null, null, null, JSON.stringify(["essencial", "familia"]), null, now
  );
  insertTx.run(
    uid("tx"), userId, accItau, null, null, null, catSubUtilities,
    "Energia Elétrica + Internet Fibra 1Gb", 412.9, "2026-10-14", curM, curY,
    "expense", "completed", 1, null, null, null, JSON.stringify(["essencial"]), null, now
  );
  insertTx.run(
    uid("tx"), userId, accNubank, null, null, null, catSubMarket,
    "Atacadão & Feira Semanal", 1420.5, "2026-10-16", curM, curY,
    "expense", "completed", 0, null, null, null, JSON.stringify(["essencial", "familia"]), null, now
  );
  insertTx.run(
    uid("tx"), userId, accNubank, null, null, null, catHealth,
    "Plano de Saúde Unimed + Farmácia", 890.0, "2026-10-28", curM, curY,
    "expense", "pending", 1, null, null, null, JSON.stringify(["essencial", "familia"]), "Vence dia 28", now
  );
  insertTx.run(
    uid("tx"), userId, accWallet, null, null, null, catSubRestaurant,
    "Padaria & Cafés da Semana", 145.0, "2026-10-21", curM, curY,
    "expense", "completed", 0, null, null, null, JSON.stringify(["essencial"]), null, now
  );

  // Transfer between accounts
  insertTx.run(
    uid("tx"), userId, accItau, accInter, null, null, null,
    "Aporte Mensal para Reserva CDB", 2000.0, "2026-10-08", curM, curY,
    "transfer", "completed", 0, null, null, null, JSON.stringify(["essencial"]), "Transferência PIX", now
  );

  // Credit Card Invoices & Installments (Oct, Nov, Dec 2026)
  const invNuOct = ensureInvoice(db, cardNubank, 10, 2026);
  const invNuNov = ensureInvoice(db, cardNubank, 11, 2026);
  const invNuDec = ensureInvoice(db, cardNubank, 12, 2026);

  const invItauOct = ensureInvoice(db, cardItau, 10, 2026);
  const invItauNov = ensureInvoice(db, cardItau, 11, 2026);

  const macbookGroup = uid("grp");
  insertTx.run(
    uid("tx"), userId, null, null, cardNubank, invNuOct, catEducation,
    "MacBook Air M3 (Parcela 4/10)", 849.9, "2026-10-11", 10, 2026,
    "card_expense", "completed", 0, 4, 10, macbookGroup, JSON.stringify(["trabalho"]), "Compra parcelada sem juros", now
  );
  insertTx.run(
    uid("tx"), userId, null, null, cardNubank, invNuNov, catEducation,
    "MacBook Air M3 (Parcela 5/10)", 849.9, "2026-11-11", 11, 2026,
    "card_expense", "pending", 0, 5, 10, macbookGroup, JSON.stringify(["trabalho"]), "Compra parcelada sem juros", now
  );
  insertTx.run(
    uid("tx"), userId, null, null, cardNubank, invNuDec, catEducation,
    "MacBook Air M3 (Parcela 6/10)", 849.9, "2026-12-11", 12, 2026,
    "card_expense", "pending", 0, 6, 10, macbookGroup, JSON.stringify(["trabalho"]), "Compra parcelada sem juros", now
  );

  insertTx.run(
    uid("tx"), userId, null, null, cardNubank, invNuOct, catSubRestaurant,
    "Jantar Aniversário & iFood", 468.0, "2026-10-19", 10, 2026,
    "card_expense", "completed", 0, null, null, null, JSON.stringify(["familia"]), null, now
  );
  insertTx.run(
    uid("tx"), userId, null, null, cardNubank, invNuOct, catSubStreaming,
    "Spotify Duo + Netflix + GitHub Copilot", 184.9, "2026-10-20", 10, 2026,
    "card_expense", "completed", 1, null, null, null, JSON.stringify(["assinatura", "trabalho"]), null, now
  );
  insertTx.run(
    uid("tx"), userId, null, null, cardNubank, invNuOct, catSubUber,
    "Uber Aeroporto & Viagens Urbanas", 236.4, "2026-10-22", 10, 2026,
    "card_expense", "completed", 0, null, null, null, JSON.stringify(["reembolsavel", "trabalho"]), null, now
  );

  const seguroGroup = uid("grp");
  insertTx.run(
    uid("tx"), userId, null, null, cardItau, invItauOct, catSubFuel,
    "Seguro Auto Porto Seguro (2/6)", 540.0, "2026-10-09", 10, 2026,
    "card_expense", "completed", 0, 2, 6, seguroGroup, JSON.stringify(["essencial"]), null, now
  );
  insertTx.run(
    uid("tx"), userId, null, null, cardItau, invItauNov, catSubFuel,
    "Seguro Auto Porto Seguro (3/6)", 540.0, "2026-11-09", 11, 2026,
    "card_expense", "pending", 0, 3, 6, seguroGroup, JSON.stringify(["essencial"]), null, now
  );
  insertTx.run(
    uid("tx"), userId, null, null, cardItau, invItauOct, catSubMarket,
    "Sam's Club Importados & Adega", 615.0, "2026-10-15", 10, 2026,
    "card_expense", "completed", 0, null, null, null, JSON.stringify(["familia"]), null, now
  );

  // Budgets for Oct 2026 (including normal, warning >=80%, and exceeded >=100%)
  const insertBudget = db.prepare(`
    INSERT INTO Budget (id, userId, categoryId, month, year, amountLimit)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertBudget.run(uid("bdg"), userId, catHousing, 10, 2026, 3800.0); // 3562.90 spent -> 93.7% (Warning)
  insertBudget.run(uid("bdg"), userId, catFood, 10, 2026, 2400.0);    // 2648.50 spent -> 110.3% (Exceeded!)
  insertBudget.run(uid("bdg"), userId, catTransport, 10, 2026, 1200.0); // 776.40 spent -> 64.7% (Safe)
  insertBudget.run(uid("bdg"), userId, catLeisure, 10, 2026, 450.0);   // 184.90 spent -> 41.1% (Safe)
  insertBudget.run(uid("bdg"), userId, catHealth, 10, 2026, 1000.0);   // 890.00 spent -> 89.0% (Warning)
  insertBudget.run(uid("bdg"), userId, catEducation, 10, 2026, 900.0); // 849.90 spent -> 94.4% (Warning)

  // Financial Goals & Deposits
  const insertGoal = db.prepare(`
    INSERT INTO Goal (id, userId, name, targetAmount, initialAmount, deadline, color, icon, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `);
  const insertGoalDep = db.prepare(`
    INSERT INTO GoalDeposit (id, goalId, amount, date, note, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const goalEmergency = uid("goal");
  const goalTrip = uid("goal");
  const goalCar = uid("goal");

  insertGoal.run(goalEmergency, userId, "Reserva de Emergência (6 Meses)", 36000.0, 18000.0, "2027-04-30", "#059669", "shield", now);
  insertGoalDep.run(uid("gdep"), goalEmergency, 2000.0, "2026-09-10", "Aporte mensal CDB Liquidez Diária", now);
  insertGoalDep.run(uid("gdep"), goalEmergency, 2500.0, "2026-10-08", "Aporte Outubro + Dividendos", now);

  insertGoal.run(goalTrip, userId, "Viagem Europa Outono", 24000.0, 6500.0, "2027-09-15", "#2563EB", "plane", now);
  insertGoalDep.run(uid("gdep"), goalTrip, 1500.0, "2026-09-20", "Compra de Euros Wise", now);
  insertGoalDep.run(uid("gdep"), goalTrip, 1800.0, "2026-10-18", "Parte do Freelance Outubro", now);

  insertGoal.run(goalCar, userId, "Troca de Veículo (Entrada)", 45000.0, 12000.0, "2027-12-31", "#7C3AED", "car", now);
  insertGoalDep.run(uid("gdep"), goalCar, 3000.0, "2026-10-05", "Aplicação Tesouro Selic", now);
}

function seedIfEmpty(db: DatabaseSync) {
  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM User").get() as { cnt: number };
  if (countRow.cnt > 0) return;

  const userId = "usr_demo_mobills";
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO User (id, name, email, passwordHash, currency, hideBalances, createdAt)
    VALUES (?, ?, ?, ?, 'BRL', 0, ?)
  `).run(userId, "Aristeu Junior", "demo@mobills.local", hashPassword("Senha@123"), now);

  seedUserDefaults(db, userId, true);
}
