import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ACCOUNTS } from "../accounts";
import { uid } from "../ids";
import { packingOf } from "../packing";
import {
  CATEGORIES,
  companies as seedCompanies,
  products as seedProducts,
  seedDeals,
  seedOrders,
  seedRfqs,
} from "../seed";
import type { Account } from "../accounts";
import type { AgentProfile, Company, Deal, Order, Product, Rfq } from "../types";
import type { CreateCompanyInput, CreateSkuInput, DbSnapshot, DirectoryRow, PlatformSku } from "./types";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS directory (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (kind, id)
) STRICT;

CREATE TABLE IF NOT EXISTS company (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  city TEXT NOT NULL,
  industry TEXT NOT NULL,
  inn TEXT NOT NULL,
  rating REAL NOT NULL,
  deals_closed INTEGER NOT NULL,
  role TEXT NOT NULL,
  blurb TEXT NOT NULL,
  since INTEGER NOT NULL,
  agent_json TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  pin TEXT NOT NULL UNIQUE,
  desk TEXT NOT NULL,
  company_id TEXT,
  org TEXT NOT NULL,
  person TEXT NOT NULL,
  blurb TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS sku (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  moq REAL NOT NULL,
  pack_size REAL NOT NULL,
  pack_unit TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  specs_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE IF NOT EXISTS listing (
  id TEXT PRIMARY KEY,
  sku_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  article TEXT NOT NULL,
  price REAL NOT NULL,
  stock REAL NOT NULL,
  lead_days INTEGER NOT NULL,
  UNIQUE (seller_id, article)
) STRICT;

CREATE TABLE IF NOT EXISTS rfq (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS deal (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  qty REAL NOT NULL,
  current_price REAL NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS trade_order (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  total REAL NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
) STRICT;
`;

type GlobalDb = typeof globalThis & { __atriumSqlite?: DatabaseSync };

function dbPath(): string {
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return path.join(dir, "atrium.sqlite");
}

export function getDb(): DatabaseSync {
  const g = globalThis as GlobalDb;
  if (!g.__atriumSqlite) {
    g.__atriumSqlite = new DatabaseSync(dbPath());
  }
  g.__atriumSqlite.exec(SCHEMA);
  seedIfEmpty(g.__atriumSqlite);
  return g.__atriumSqlite;
}

function seedIfEmpty(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM company").get() as { n: number };
  if (row.n === 0) {
    db.exec("BEGIN");
    try {
      seedMaster(db);
      replaceTrades(db, seedRfqs, seedDeals, seedOrders, new Date().toISOString());
      db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("schema", "1");
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    return;
  }
  const deals = db.prepare("SELECT COUNT(*) AS n FROM deal").get() as { n: number };
  if (deals.n === 0) {
    replaceTrades(db, seedRfqs, seedDeals, seedOrders, new Date().toISOString());
  }
  ensureSeedRoster(db);
}

function seedMaster(db: DatabaseSync) {
  const insDir = db.prepare("INSERT INTO directory (kind, id, label) VALUES (?, ?, ?)");
  const insCo = db.prepare(
    `INSERT INTO company (id, name, short, city, industry, inn, rating, deals_closed, role, blurb, since, agent_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insSku = db.prepare(
    `INSERT INTO sku (id, code, name, category, unit, moq, pack_size, pack_unit, description, tags_json, specs_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insList = db.prepare(
    `INSERT INTO listing (id, sku_id, seller_id, article, price, stock, lead_days)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const label of CATEGORIES) {
    insDir.run("category", label, label);
  }
  const units = new Set(seedProducts.map((p) => p.unit));
  for (const unit of units) insDir.run("unit", unit, unit);
  const packUnits = new Set(["паллета", "связка", "короб", "бочка", "мешок", "пакет", "пачка", "партия"]);
  for (const p of seedProducts) packUnits.add(packingOf(p).packUnit);
  for (const unit of packUnits) insDir.run("pack_unit", unit, unit);

  for (const c of seedCompanies) {
    insCo.run(
      c.id,
      c.name,
      c.short,
      c.city,
      c.industry,
      c.inn,
      c.rating,
      c.dealsClosed,
      c.role,
      c.blurb,
      c.since,
      JSON.stringify(c.agent),
    );
  }

  for (const p of seedProducts) {
    const pack = packingOf(p);
    const skuId = `n-${p.id}`;
    insSku.run(
      skuId,
      `ATR-${p.sku}`,
      p.name,
      p.category,
      p.unit,
      p.moq,
      pack.packSize,
      pack.packUnit,
      p.description,
      JSON.stringify(p.tags),
      JSON.stringify(p.specs),
    );
    insList.run(p.id, skuId, p.sellerId, p.sku, p.price, p.stock, p.leadDays);
  }
  ensureSeedRoster(db);
}

function insertCompanyRow(db: DatabaseSync, c: (typeof seedCompanies)[number]) {
  db.prepare(
    `INSERT INTO company (id, name, short, city, industry, inn, rating, deals_closed, role, blurb, since, agent_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    c.id,
    c.name,
    c.short,
    c.city,
    c.industry,
    c.inn,
    c.rating,
    c.dealsClosed,
    c.role,
    c.blurb,
    c.since,
    JSON.stringify(c.agent),
  );
}

function insertAccountRow(db: DatabaseSync, a: Account) {
  db.prepare(
    `INSERT INTO account (id, pin, desk, company_id, org, person, blurb) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(a.id, a.pin, a.desk, a.companyId, a.org, a.person, a.blurb);
}

function ensureSeedRoster(db: DatabaseSync) {
  const haveCo = new Set((db.prepare("SELECT id FROM company").all() as { id: string }[]).map((r) => r.id));
  for (const c of seedCompanies) {
    if (!haveCo.has(c.id)) insertCompanyRow(db, c);
  }
  const haveAcc = new Set((db.prepare("SELECT id FROM account").all() as { id: string }[]).map((r) => r.id));
  const usedPins = new Set((db.prepare("SELECT pin FROM account").all() as { pin: string }[]).map((r) => r.pin));
  for (const a of ACCOUNTS) {
    if (haveAcc.has(a.id) || usedPins.has(a.pin)) continue;
    insertAccountRow(db, a);
    usedPins.add(a.pin);
  }
}

function accountFromRow(row: {
  id: string;
  pin: string;
  desk: Account["desk"];
  company_id: string | null;
  org: string;
  person: string;
  blurb: string;
}): Account {
  return {
    id: row.id,
    pin: row.pin,
    desk: row.desk,
    companyId: row.company_id,
    org: row.org,
    person: row.person,
    blurb: row.blurb,
  };
}

function replaceTrades(db: DatabaseSync, rfqs: Rfq[], deals: Deal[], orders: Order[], now: string) {
  db.exec("DELETE FROM rfq; DELETE FROM deal; DELETE FROM trade_order;");
  const insRfq = db.prepare("INSERT INTO rfq (id, buyer_id, status, updated_at, payload) VALUES (?, ?, ?, ?, ?)");
  const insDeal = db.prepare(
    `INSERT INTO deal (id, rfq_id, buyer_id, seller_id, product_id, status, qty, current_price, updated_at, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insOrder = db.prepare(
    `INSERT INTO trade_order (id, deal_id, buyer_id, seller_id, product_id, status, total, updated_at, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of rfqs) insRfq.run(r.id, r.buyerId, r.status, now, JSON.stringify(r));
  for (const d of deals) {
    insDeal.run(d.id, d.rfqId, d.buyerId, d.sellerId, d.productId, d.status, d.qty, d.currentPrice, now, JSON.stringify(d));
  }
  for (const o of orders) {
    insOrder.run(o.id, o.dealId, o.buyerId, o.sellerId, o.productId, o.status, o.total, now, JSON.stringify(o));
  }
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function companyFromRow(row: {
  id: string;
  name: string;
  short: string;
  city: string;
  industry: string;
  inn: string;
  rating: number;
  deals_closed: number;
  role: Company["role"];
  blurb: string;
  since: number;
  agent_json: string;
}): Company {
  return {
    id: row.id,
    name: row.name,
    short: row.short,
    city: row.city,
    industry: row.industry,
    inn: row.inn,
    rating: row.rating,
    dealsClosed: row.deals_closed,
    role: row.role,
    blurb: row.blurb,
    since: row.since,
    agent: normalizeAgent(parseJson(row.agent_json, seedCompanies[0].agent)),
  };
}

function normalizeAgent(agent: AgentProfile): AgentProfile {
  return {
    ...agent,
    controlMode: agent.controlMode ?? "threshold",
    minTrustToAuto: agent.minTrustToAuto ?? 70,
    tactic: agent.tactic ?? "market",
  };
}

function listingProduct(
  listing: { id: string; seller_id: string; article: string; price: number; stock: number; lead_days: number },
  sku: {
    name: string;
    category: string;
    unit: string;
    moq: number;
    pack_size: number;
    pack_unit: string;
    description: string;
    tags_json: string;
    specs_json: string;
  },
): Product {
  return {
    id: listing.id,
    sellerId: listing.seller_id,
    name: sku.name,
    category: sku.category,
    sku: listing.article,
    unit: sku.unit,
    moq: sku.moq,
    price: listing.price,
    stock: listing.stock,
    leadDays: listing.lead_days,
    tags: parseJson(sku.tags_json, [] as string[]),
    specs: parseJson(sku.specs_json, {} as Record<string, string>),
    description: sku.description,
    packSize: sku.pack_size,
    packUnit: sku.pack_unit,
  };
}

export function snapshot(): DbSnapshot {
  const db = getDb();
  const directories = db.prepare("SELECT kind, id, label FROM directory ORDER BY kind, label").all() as DirectoryRow[];
  const companies = (db.prepare("SELECT * FROM company ORDER BY role, name").all() as Parameters<typeof companyFromRow>[0][]).map(
    companyFromRow,
  );

  const skuRows = db.prepare("SELECT * FROM sku ORDER BY category, name").all() as {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    moq: number;
    pack_size: number;
    pack_unit: string;
    description: string;
    tags_json: string;
    specs_json: string;
  }[];
  const listRows = db.prepare("SELECT * FROM listing").all() as {
    id: string;
    sku_id: string;
    seller_id: string;
    article: string;
    price: number;
    stock: number;
    lead_days: number;
  }[];

  const bySku = new Map(skuRows.map((s) => [s.id, s]));
  const listings: Product[] = [];
  const articlesBySku = new Map<string, PlatformSku["articles"]>();
  for (const row of listRows) {
    const sku = bySku.get(row.sku_id);
    if (!sku) continue;
    listings.push(listingProduct(row, sku));
    const arts = articlesBySku.get(row.sku_id) ?? [];
    arts.push({ sellerId: row.seller_id, article: row.article, listingId: row.id, price: row.price });
    articlesBySku.set(row.sku_id, arts);
  }

  const skus: PlatformSku[] = skuRows.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    category: s.category,
    unit: s.unit,
    moq: s.moq,
    packSize: s.pack_size,
    packUnit: s.pack_unit,
    description: s.description,
    tags: parseJson(s.tags_json, [] as string[]),
    specs: parseJson(s.specs_json, {} as Record<string, string>),
    articles: articlesBySku.get(s.id) ?? [],
  }));

  const rfqs = (db.prepare("SELECT payload FROM rfq").all() as { payload: string }[]).map((r) => parseJson(r.payload, null as Rfq | null)).filter(Boolean) as Rfq[];
  const deals = (db.prepare("SELECT payload FROM deal").all() as { payload: string }[]).map((r) => parseJson(r.payload, null as Deal | null)).filter(Boolean) as Deal[];
  const orders = (db.prepare("SELECT payload FROM trade_order").all() as { payload: string }[]).map((r) =>
    parseJson(r.payload, null as Order | null),
  ).filter(Boolean) as Order[];
  const accounts = (db.prepare("SELECT * FROM account ORDER BY desk, org").all() as Parameters<typeof accountFromRow>[0][]).map(
    accountFromRow,
  );

  return { directories, companies, skus, listings, rfqs, deals, orders, accounts };
}

export function syncTrades(rfqs: Rfq[], deals: Deal[], orders: Order[]) {
  const db = getDb();
  replaceTrades(db, rfqs, deals, orders, new Date().toISOString());
}

export function resetTradesToSeed() {
  const db = getDb();
  replaceTrades(db, seedRfqs, seedDeals, seedOrders, new Date().toISOString());
}

export function roster(): { companies: Company[]; accounts: Account[] } {
  const snap = snapshot();
  return { companies: snap.companies, accounts: snap.accounts };
}

export function createCompany(input: CreateCompanyInput): { company: Company; account: Account } {
  const db = getDb();
  const name = input.name.trim();
  const inn = input.inn.trim();
  const city = input.city.trim();
  if (!name || !inn || !city) throw new Error("need name, inn and city");
  if (input.role !== "buyer" && input.role !== "seller") throw new Error("role must be buyer or seller");
  const dup = db.prepare("SELECT id FROM company WHERE inn = ?").get(inn) as { id: string } | undefined;
  if (dup) throw new Error("inn already in roster");

  const short = (input.short?.trim() || name.split(/\s+/)[0] || name).slice(0, 24);
  const person = (input.person?.trim() || (input.role === "seller" ? "Коммерция" : "Закуп")).slice(0, 40);
  let pin = (input.pin ?? "").replace(/\D/g, "").slice(0, 4);
  if (pin.length !== 4) {
    const used = new Set((db.prepare("SELECT pin FROM account").all() as { pin: string }[]).map((r) => r.pin));
    pin = "3000";
    while (used.has(pin)) pin = String(Number(pin) + 1).padStart(4, "0");
  } else if (db.prepare("SELECT id FROM account WHERE pin = ?").get(pin)) {
    throw new Error("pin already used");
  }

  const id = uid("co");
  const accId = uid("acc");
  const agent = {
    name: person.split("·")[0]?.trim() || person,
    mandate:
      input.role === "seller"
        ? "Не опускаться ниже пола маржи. Предоплата не ниже 30%."
        : "Не превышать бюджет заявки. Срок важнее бренда.",
    tone: "flexible" as const,
    tactic: "market" as const,
    priority: input.role === "seller" ? ("price" as const) : ("price" as const),
    minMarginPct: input.role === "seller" ? 12 : 0,
    autoApproveBelow: input.role === "seller" ? 400_000 : 300_000,
    minTrustToAuto: 70,
    controlMode: "threshold" as const,
    responseMin: 6,
  };
  const company: Company = {
    id,
    name,
    short,
    city,
    industry: input.industry?.trim() || (input.role === "seller" ? "Поставка" : "Закупка"),
    inn,
    rating: 4.5,
    dealsClosed: 0,
    role: input.role,
    blurb: input.blurb?.trim() || `${short}, ${city}.`,
    since: new Date().getFullYear(),
    agent,
  };
  const desk = input.role === "seller" ? "sell" : "buy";
  const account: Account = {
    id: accId,
    pin,
    desk,
    companyId: id,
    org: short,
    person: `${person} · ${city}`,
    blurb:
      input.role === "seller"
        ? "Мандат агента, выгрузка витрины, контроль сделок, закрытые, аналитика."
        : "Мандат агента, новая заявка, контроль сделок, закрытые, аналитика.",
  };

  db.prepare(
    `INSERT INTO company (id, name, short, city, industry, inn, rating, deals_closed, role, blurb, since, agent_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    company.id,
    company.name,
    company.short,
    company.city,
    company.industry,
    company.inn,
    company.rating,
    company.dealsClosed,
    company.role,
    company.blurb,
    company.since,
    JSON.stringify(company.agent),
  );
  db.prepare(
    `INSERT INTO account (id, pin, desk, company_id, org, person, blurb) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(account.id, account.pin, account.desk, account.companyId, account.org, account.person, account.blurb);

  return { company, account };
}

export function createSku(input: CreateSkuInput): { sku: PlatformSku; listing: Product } {
  const db = getDb();
  const article = input.article.trim();
  const name = input.name.trim();
  if (!article || !name) throw new Error("need name and article");
  const seller = db.prepare("SELECT id, role FROM company WHERE id = ?").get(input.sellerId) as
    | { id: string; role: string }
    | undefined;
  if (!seller || seller.role === "buyer") throw new Error("seller not in roster");

  const existing = db
    .prepare("SELECT id, sku_id FROM listing WHERE seller_id = ? AND article = ?")
    .get(input.sellerId, article) as { id: string; sku_id: string } | undefined;
  if (existing) {
    const snap = snapshot();
    const sku = snap.skus.find((s) => s.id === existing.sku_id);
    const listing = snap.listings.find((p) => p.id === existing.id);
    if (sku && listing) return { sku, listing };
  }

  const skuId = uid("n");
  const listingId = uid("p");
  let code = `ATR-${article.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || listingId}`;
  const taken = db.prepare("SELECT id FROM sku WHERE code = ?").get(code) as { id: string } | undefined;
  if (taken) code = `${code}-${listingId}`;
  const tags = input.tags ?? name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
  const specs = input.specs ?? {};
  const price = input.price ?? 0;
  const stock = input.stock ?? 0;
  const leadDays = input.leadDays ?? 7;

  db.prepare(
    `INSERT INTO sku (id, code, name, category, unit, moq, pack_size, pack_unit, description, tags_json, specs_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    skuId,
    code,
    name,
    input.category,
    input.unit,
    input.moq,
    input.packSize,
    input.packUnit,
    input.description ?? "",
    JSON.stringify(tags),
    JSON.stringify(specs),
  );
  db.prepare(
    `INSERT INTO listing (id, sku_id, seller_id, article, price, stock, lead_days) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(listingId, skuId, input.sellerId, article, price, stock, leadDays);

  return {
    sku: {
      id: skuId,
      code,
      name,
      category: input.category,
      unit: input.unit,
      moq: input.moq,
      packSize: input.packSize,
      packUnit: input.packUnit,
      description: input.description ?? "",
      tags,
      specs,
      articles: [{ sellerId: input.sellerId, article, listingId, price }],
    },
    listing: {
      id: listingId,
      sellerId: input.sellerId,
      name,
      category: input.category,
      sku: article,
      unit: input.unit,
      moq: input.moq,
      price,
      stock,
      leadDays,
      tags,
      specs,
      description: input.description ?? "",
      packSize: input.packSize,
      packUnit: input.packUnit,
    },
  };
}
