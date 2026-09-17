import type { Account } from "../accounts";
import type { Company, Deal, Order, Product, Rfq } from "../types";

export interface DirectoryRow {
  kind: string;
  id: string;
  label: string;
}

export interface SkuArticle {
  sellerId: string;
  article: string;
  listingId: string;
  price: number;
}

export interface PlatformSku {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  moq: number;
  packSize: number;
  packUnit: string;
  description: string;
  tags: string[];
  specs: Record<string, string>;
  articles: SkuArticle[];
}

export interface CreateSkuInput {
  name: string;
  category: string;
  unit: string;
  moq: number;
  packSize: number;
  packUnit: string;
  description?: string;
  tags?: string[];
  specs?: Record<string, string>;
  sellerId: string;
  article: string;
  price?: number;
  stock?: number;
  leadDays?: number;
}

export interface CreateCompanyInput {
  name: string;
  short?: string;
  city: string;
  inn: string;
  industry?: string;
  role: "buyer" | "seller";
  person?: string;
  pin?: string;
  blurb?: string;
}

export interface DbSnapshot {
  directories: DirectoryRow[];
  companies: Company[];
  accounts: Account[];
  skus: PlatformSku[];
  listings: Product[];
  rfqs: Rfq[];
  deals: Deal[];
  orders: Order[];
}
