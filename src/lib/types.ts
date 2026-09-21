export type CompanyRole = "buyer" | "seller" | "both";
export type AgentTone = "firm" | "flexible" | "premium";
export type AgentPriority = "price" | "speed" | "quality";
export type BargainTactic = "market" | "firm" | "fast";
export type BargainFail = "floor_above_cap" | "seller_held" | "no_overlap" | "item_mismatch";
export type SpecFit = "match" | "partial" | "mismatch";
export type DealStatus = "open" | "countering" | "agreed" | "rejected" | "approved";
export type RfqStatus = "matching" | "negotiating" | "awarded" | "closed";
export type Actor = "buyer-agent" | "seller-agent" | "system" | "human";
export type RejectCard = { fact: string; nextStep: string };
/** По умолчанию threshold: агент торгует, человек — на критическом. manual/auto — выбор участника. */
export type ControlMode = "manual" | "threshold" | "auto";

export interface AgentProfile {
  name: string;
  mandate: string;
  tone: AgentTone;
  priority: AgentPriority;
  minMarginPct: number;
  autoApproveBelow: number;
  /** Порог доверия контрагента, ниже которого автопрохода нет. */
  minTrustToAuto: number;
  controlMode: ControlMode;
  tactic?: BargainTactic;
  responseMin: number;
}

export interface Company {
  id: string;
  name: string;
  short: string;
  city: string;
  industry: string;
  inn: string;
  rating: number;
  dealsClosed: number;
  role: CompanyRole;
  blurb: string;
  since: number;
  agent: AgentProfile;
}

export type Incoterm = "FCA" | "DAP" | "CPT";
export type OrderStatus =
  | "advance_due"
  | "reserving"
  | "picking"
  | "shipping"
  | "in_transit"
  | "delivered"
  | "acceptance_due"
  | "remainder_due"
  | "settled"
  | "cancelled";
export type InvoiceKind = "advance" | "remainder";
export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";
export type DocumentKind = "invoice" | "spec" | "upd" | "ttn" | "cert" | "acceptance";

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  category: string;
  sku: string;
  unit: string;
  moq: number;
  price: number;
  stock: number;
  leadDays: number;
  tags: string[];
  specs: Record<string, string>;
  description: string;
  packSize?: number;
  packUnit?: string;
}

export interface Lot {
  id: string;
  productId: string;
  sellerId: string;
  batchNo: string;
  qty: number;
  reserved: number;
  unit: string;
  packSize: number;
  packUnit: string;
  warehouse: string;
  city: string;
  readyDays: number;
  certs: string[];
  producedAt: string;
  expiresAt?: string;
  incoterm: Incoterm;
}

export interface Allocation {
  lotId: string;
  batchNo: string;
  warehouse: string;
  qty: number;
  readyDays: number;
}

export interface SpecCheck {
  fit: SpecFit;
  hits: string[];
  gaps: string[];
  clashes: string[];
}

export interface Need {
  query: string;
  category?: string;
  keywords: string[];
  qty?: number;
  unit?: string;
  budget?: number;
  city?: string;
  deadlineDays?: number;
}

export interface Message {
  id: string;
  at: string;
  delayMs: number;
  from: Actor;
  text: string;
}

export interface Offer {
  id: string;
  from: "buyer" | "seller";
  price: number;
  qty: number;
  leadDays: number;
  prepayPct: number;
  terms: string;
  at: string;
}

export interface Rfq {
  id: string;
  buyerId: string;
  createdAt: string;
  need: Need;
  status: RfqStatus;
  awardedDealId?: string;
}

export interface Deal {
  id: string;
  rfqId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  qty: number;
  packCount: number;
  status: DealStatus;
  messages: Message[];
  offers: Offer[];
  listPrice: number;
  floorPrice: number;
  currentPrice: number;
  leadDays: number;
  prepayPct: number;
  incoterm: Incoterm;
  destination: string;
  score: number;
  playback: boolean;
  matchReasons: string[];
  specFit?: SpecFit;
  specHits?: string[];
  specGaps?: string[];
  specClashes?: string[];
  specAccepted?: boolean;
  rejectReason?: BargainFail;
  orderId?: string;
  voicedBy?: string;
  /** Сделка утверждена допуском политики, а не кнопкой человека. */
  passedByPolicy?: boolean;
  policyNote?: string;
}

export interface Invoice {
  id: string;
  kind: InvoiceKind;
  number: string;
  amount: number;
  status: InvoiceStatus;
  due: string;
  paidAt?: string;
}

export interface Shipment {
  id: string;
  carrier: string;
  ttn: string;
  vehicle: string;
  from: string;
  to: string;
  etaDays: number;
  status: "planned" | "loaded" | "in_transit" | "arrived";
}

export interface TradeDocument {
  id: string;
  kind: DocumentKind;
  title: string;
  ref: string;
  at: string;
}

export type IncidentKind =
  | "delay_ship"
  | "delay_pay"
  | "shortage"
  | "quality"
  | "docs"
  | "stock_miss"
  | "force_majeure";
export type IncidentStatus = "open" | "negotiating" | "escalated" | "resolved";
export type RemedyKind = "price_cut" | "split_ship" | "replace_lot" | "credit_note" | "penalty_hold" | "extend_sla" | "reissue_docs";

export interface TrustScore {
  onTimeShipPct: number;
  onTimePayPct: number;
  claimRatePct: number;
  avgResponseHrs: number;
  abnormalFulfillPct: number;
  score: number;
}

export interface Remedy {
  kind: RemedyKind;
  text: string;
  amount?: number;
  extraDays?: number;
}

export interface Incident {
  id: string;
  orderId: string;
  kind: IncidentKind;
  raisedBy: "buyer" | "seller" | "system";
  at: string;
  status: IncidentStatus;
  fact: string;
  delayDays?: number;
  proposed: Remedy;
  resolution?: string;
}

export interface ProcessEvent {
  id: string;
  at: string;
  delayMs: number;
  stage: string;
  text: string;
}

export interface Order {
  id: string;
  dealId: string;
  rfqId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  qty: number;
  packCount: number;
  unitPrice: number;
  total: number;
  prepayPct: number;
  incoterm: Incoterm;
  destination: string;
  status: OrderStatus;
  allocations: Allocation[];
  invoices: Invoice[];
  shipments: Shipment[];
  documents: TradeDocument[];
  events: ProcessEvent[];
  incidents: Incident[];
  playback: boolean;
  createdAt: string;
}

export interface TickerEvent {
  id: string;
  text: string;
  tone: "deal" | "rfq" | "agent";
}

export type AuditActor =
  | "orchestrator"
  | "parser"
  | "matcher"
  | "buyer-agent"
  | "seller-agent"
  | "mandate"
  | "fulfillment"
  | "ops"
  | "human"
  | "platform";

export interface AuditEvent {
  id: string;
  at: string;
  actor: AuditActor;
  action: string;
  detail: string;
  constraint?: string;
  ref?: string;
}

export interface TradePolicy {
  controlMode: ControlMode;
  autoApproveBelow: number;
  minTrustToAuto: number;
}

export interface MarketplaceState {
  currentCompanyId: string;
  llmModel: string;
  rfqs: Rfq[];
  deals: Deal[];
  orders: Order[];
  lots: Lot[];
  reputations: Record<string, TrustScore>;
  auditLog: AuditEvent[];
  lastBuyerId: string;
  lastSellerId: string;
  /** Живая политика участника поверх сида. Меняет сам кабинет, не бэкофис. */
  policies: Record<string, TradePolicy>;
  tactics: Record<string, BargainTactic>;
}
