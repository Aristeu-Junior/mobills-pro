export interface ImportedTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  categoryName: string;
  selected: boolean;
  memo?: string;
  rawType?: string;
}

// Smart auto-categorizer dictionary based on Brazilian banking habits
export function detectCategory(description: string, type: "income" | "expense"): { id: string; name: string } {
  const desc = (description || "").toLowerCase();

  if (type === "income") {
    if (desc.includes("salario") || desc.includes("folha") || desc.includes("pagamento sal") || desc.includes("remuneracao")) {
      return { id: "cat_sal", name: "Salário" };
    }
    if (desc.includes("rendimento") || desc.includes("dividendo") || desc.includes("cdb") || desc.includes("lci") || desc.includes("selic") || desc.includes("juros")) {
      return { id: "cat_div", name: "Rendimentos & Dividendos" };
    }
    if (desc.includes("freela") || desc.includes("projeto") || desc.includes("prestacao serv")) {
      return { id: "cat_free", name: "Projetos & Freelance" };
    }
    return { id: "cat_outras_rec", name: "Outras Receitas" };
  }

  // Expenses
  if (desc.includes("supermercado") || desc.includes("mercado") || desc.includes("carrefour") || desc.includes("pao de acucar") || desc.includes("assai") || desc.includes("atacadao") || desc.includes("extra") || desc.includes("hortifruti")) {
    return { id: "cat_market", name: "Supermercado" };
  }
  if (desc.includes("ifood") || desc.includes("restaurante") || desc.includes("mcdonald") || desc.includes("burger") || desc.includes("burguer") || desc.includes("padaria") || desc.includes("bar ") || desc.includes("lanchonete") || desc.includes("pizzaria") || desc.includes("habib")) {
    return { id: "cat_rest", name: "Restaurantes & Delivery" };
  }
  if (desc.includes("uber") || desc.includes("99app") || desc.includes("99 tecnologia") || desc.includes("mobilidade")) {
    return { id: "cat_uber", name: "Apps de Mobilidade" };
  }
  if (desc.includes("posto") || desc.includes("combustivel") || desc.includes("gasolina") || desc.includes("ipiranga") || desc.includes("shell") || desc.includes("br distribuidora") || desc.includes("etanol") || desc.includes("sem parar") || desc.includes("veloe") || desc.includes("pedagio")) {
    return { id: "cat_fuel", name: "Combustível & Pedágio" };
  }
  if (desc.includes("netflix") || desc.includes("spotify") || desc.includes("prime video") || desc.includes("disney") || desc.includes("hbo") || desc.includes("max") || desc.includes("youtube") || desc.includes("apple.com") || desc.includes("google cloud") || desc.includes("openai") || desc.includes("chatgpt")) {
    return { id: "cat_stream", name: "Streaming & Software" };
  }
  if (desc.includes("farmacia") || desc.includes("droga") || desc.includes("drogaria") || desc.includes("raia") || desc.includes("drogasil") || desc.includes("pacheco") || desc.includes("sao paulo") || desc.includes("medico") || desc.includes("hospital") || desc.includes("laboratorio") || desc.includes("odonto") || desc.includes("dentista") || desc.includes("psico")) {
    return { id: "cat_health", name: "Saúde & Bem-estar" };
  }
  if (desc.includes("aluguel") || desc.includes("condominio") || desc.includes("iptu") || desc.includes("imobiliaria")) {
    return { id: "cat_rent", name: "Aluguel & Condomínio" };
  }
  if (desc.includes("enel") || desc.includes("cpfl") || desc.includes("sabesp") || desc.includes("copasa") || desc.includes("energia") || desc.includes("luz") || desc.includes("agua") || desc.includes("gas") || desc.includes("claro") || desc.includes("vivo") || desc.includes("tim") || desc.includes("fibra") || desc.includes("internet")) {
    return { id: "cat_util", name: "Energia, Água & Fibra" };
  }
  if (desc.includes("faculdade") || desc.includes("escola") || desc.includes("curso") || desc.includes("udemy") || desc.includes("alura") || desc.includes("livraria") || desc.includes("livro") || desc.includes("educacao")) {
    return { id: "cat_edu", name: "Educação & Livros" };
  }
  if (desc.includes("zara") || desc.includes("renner") || desc.includes("c&a") || desc.includes("riachuelo") || desc.includes("centauro") || desc.includes("decathlon") || desc.includes("roupa") || desc.includes("calcado") || desc.includes("nike") || desc.includes("adidas")) {
    return { id: "cat_vestuario", name: "Vestuário & Compras" };
  }

  // Fallback generic food or house
  return { id: "cat_food", name: "Alimentação" };
}

// Format OFX raw date "YYYYMMDDHHMMSS..." to "YYYY-MM-DD"
function parseOfxDate(rawDate: string): string {
  if (!rawDate) {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }
  const clean = rawDate.trim();
  if (clean.length >= 8) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().split("T")[0];
}

// Parse OFX files (SGML / XML format widely generated by Banco Inter, Nubank, Itaú, etc.)
export function parseOFX(ofxContent: string): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];
  
  // Clean up content
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(ofxContent)) !== null) {
    const block = match[1];

    // Extract TRNTYPE (DEBIT or CREDIT)
    const typeMatch = /<TRNTYPE>([^\r\n<]+)/i.exec(block);
    const rawType = typeMatch ? typeMatch[1].trim().toUpperCase() : "DEBIT";

    // Extract DTPOSTED (YYYYMMDD...)
    const dateMatch = /<DTPOSTED>([^\r\n<]+)/i.exec(block);
    const date = parseOfxDate(dateMatch ? dateMatch[1].trim() : "");

    // Extract TRNAMT
    const amtMatch = /<TRNAMT>([^\r\n<]+)/i.exec(block);
    let amount = amtMatch ? parseFloat(amtMatch[1].replace(",", ".").trim()) : 0;

    // Extract MEMO or NAME
    const memoMatch = /<MEMO>([^\r\n<]+)/i.exec(block);
    const nameMatch = /<NAME>([^\r\n<]+)/i.exec(block);
    let description = (memoMatch ? memoMatch[1].trim() : "") || (nameMatch ? nameMatch[1].trim() : "Transação Bancária");

    // Clean up description HTML entities
    description = description.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

    const isIncome = amount > 0 || rawType === "CREDIT" || rawType === "DEP";
    const absAmount = Math.abs(amount);
    const txType: "income" | "expense" = isIncome ? "income" : "expense";
    const cat = detectCategory(description, txType);

    transactions.push({
      id: `ofx_${Math.random().toString(36).substring(2, 9)}`,
      date,
      description,
      amount: Number(absAmount.toFixed(2)),
      type: txType,
      categoryId: cat.id,
      categoryName: cat.name,
      selected: true,
      rawType,
    });
  }

  // Sort descending by date
  return transactions.sort((a, b) => (a.date > b.date ? -1 : 1));
}

// Parse CSV format (common bank export: Data, Descrição, Valor)
export function parseCSV(csvContent: string): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) return transactions;

  // Detect delimiter (, or ;)
  const firstLine = lines[0];
  const delim = firstLine.includes(";") ? ";" : ",";

  // Skip header if first line looks like header
  let startIndex = 0;
  if (/data|date|desc|valor|amount/i.test(firstLine)) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const row = lines[i].split(delim).map((c) => c.replace(/^["']|["']$/g, "").trim());
    if (row.length < 3) continue;

    // Attempt to parse Date, Description, Amount
    let rawDate = row[0];
    let description = row[1];
    let rawAmount = row[2];

    // If description is 1st and date is 2nd
    if (/\d{2,4}[-\/]\d{2}[-\/]\d{2,4}/.test(row[1]) && !/\d{2,4}/.test(row[0])) {
      rawDate = row[1];
      description = row[0];
    }

    // Convert date DD/MM/YYYY to YYYY-MM-DD if needed
    let date = rawDate;
    if (rawDate.includes("/")) {
      const parts = rawDate.split("/");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          date = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else {
          date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    }

    // Clean amount (e.g. "R$ -45,90" -> -45.90)
    const cleanedAmt = rawAmount.replace(/R\$|\s|\./g, "").replace(",", ".");
    const amt = parseFloat(cleanedAmt);
    if (isNaN(amt) || amt === 0) continue;

    const isIncome = amt > 0;
    const absAmount = Math.abs(amt);
    const txType: "income" | "expense" = isIncome ? "income" : "expense";
    const cat = detectCategory(description, txType);

    transactions.push({
      id: `csv_${Math.random().toString(36).substring(2, 9)}`,
      date,
      description: description || "Lançamento Importado",
      amount: Number(absAmount.toFixed(2)),
      type: txType,
      categoryId: cat.id,
      categoryName: cat.name,
      selected: true,
    });
  }

  return transactions.sort((a, b) => (a.date > b.date ? -1 : 1));
}
