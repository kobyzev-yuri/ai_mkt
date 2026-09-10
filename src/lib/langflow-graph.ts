import { AGENT_ROLES, type AgentRoleId } from "./scenarios";

export type FlowScenario = "S0" | "S1" | "S2" | "S3";
export type FlowLane = "input" | "platform" | "party" | "engine" | "gate";

export interface FlowNode {
  id: string;
  role?: AgentRoleId;
  label: string;
  lane: FlowLane;
  job: string;
  x: number;
  y: number;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  act: string;
  scenarios: FlowScenario[];
}

const role = (id: AgentRoleId) => AGENT_ROLES.find((r) => r.id === id)!;

/** Canonical Langflow graph: agents do not call each other as services — they publish acts on the deal bus. */
export const FLOW_NODES: FlowNode[] = [
  {
    id: "need",
    label: "Потребность",
    lane: "input",
    job: "Свободный текст закупщика. Вход в граф, не агент.",
    x: 24,
    y: 168,
  },
  {
    id: "lots",
    label: "Партии 1С",
    lane: "input",
    job: "Выгрузка остатков поставщика. Адаптер, не агент: на витрину только партии с полом и SKU.",
    x: 24,
    y: 360,
  },
  {
    id: "orchestrator",
    role: "orchestrator",
    label: role("orchestrator").name,
    lane: "platform",
    job: role("orchestrator").job,
    x: 240,
    y: 48,
  },
  {
    id: "parser",
    role: "parser",
    label: role("parser").name,
    lane: "platform",
    job: role("parser").job,
    x: 240,
    y: 220,
  },
  {
    id: "matcher",
    role: "matcher",
    label: role("matcher").name,
    lane: "platform",
    job: role("matcher").job,
    x: 480,
    y: 140,
  },
  {
    id: "buyer-agent",
    role: "buyer-agent",
    label: role("buyer-agent").name,
    lane: "party",
    job: role("buyer-agent").job,
    x: 720,
    y: 48,
  },
  {
    id: "seller-agent",
    role: "seller-agent",
    label: role("seller-agent").name,
    lane: "party",
    job: role("seller-agent").job,
    x: 720,
    y: 280,
  },
  {
    id: "mandate",
    role: "mandate",
    label: role("mandate").name,
    lane: "engine",
    job: role("mandate").job,
    x: 960,
    y: 164,
  },
  {
    id: "human",
    role: "human",
    label: role("human").name,
    lane: "gate",
    job: role("human").job,
    x: 1200,
    y: 48,
  },
  {
    id: "fulfillment",
    role: "fulfillment",
    label: role("fulfillment").name,
    lane: "engine",
    job: role("fulfillment").job,
    x: 1200,
    y: 220,
  },
  {
    id: "ops",
    role: "ops",
    label: role("ops").name,
    lane: "platform",
    job: role("ops").job,
    x: 960,
    y: 400,
  },
  {
    id: "platform",
    role: "platform",
    label: role("platform").name,
    lane: "gate",
    job: role("platform").job,
    x: 1200,
    y: 400,
  },
];

export const FLOW_EDGES: FlowEdge[] = [
  { id: "e-lots-seller", from: "lots", to: "seller-agent", act: "пол · свободный qty", scenarios: ["S0"] },
  { id: "e-lots-match", from: "lots", to: "matcher", act: "витрина", scenarios: ["S0", "S1"] },
  { id: "e-need-orch", from: "need", to: "orchestrator", act: "сценарий", scenarios: ["S1"] },
  { id: "e-need-parse", from: "need", to: "parser", act: "текст", scenarios: ["S1"] },
  { id: "e-orch-parse", from: "orchestrator", to: "parser", act: "задача: разбор", scenarios: ["S1"] },
  { id: "e-parse-human", from: "parser", to: "human", act: "страховка разбора", scenarios: ["S1"] },
  { id: "e-human-match", from: "human", to: "matcher", act: "полка подтверждена", scenarios: ["S1"] },
  { id: "e-match-buyer", from: "matcher", to: "buyer-agent", act: "партии в мандате", scenarios: ["S1"] },
  { id: "e-match-seller", from: "matcher", to: "seller-agent", act: "свободные лоты", scenarios: ["S1"] },
  { id: "e-buyer-seller", from: "buyer-agent", to: "seller-agent", act: "Заявка", scenarios: ["S1"] },
  { id: "e-seller-buyer", from: "seller-agent", to: "buyer-agent", act: "Предложение", scenarios: ["S1"] },
  { id: "e-buyer-mandate", from: "buyer-agent", to: "mandate", act: "Встречное", scenarios: ["S1"] },
  { id: "e-seller-mandate", from: "seller-agent", to: "mandate", act: "пол маржи", scenarios: ["S1"] },
  { id: "e-mandate-human", from: "mandate", to: "human", act: "Согласие", scenarios: ["S1"] },
  { id: "e-human-fulfill", from: "human", to: "fulfillment", act: "Утверждение / оплата / приёмка", scenarios: ["S1", "S2"] },
  { id: "e-mandate-fulfill", from: "mandate", to: "fulfillment", act: "заказ", scenarios: ["S2"] },
  { id: "e-fulfill-human", from: "fulfillment", to: "human", act: "счёт · УПД", scenarios: ["S2"] },
  { id: "e-fulfill-ops", from: "fulfillment", to: "ops", act: "срыв", scenarios: ["S3"] },
  { id: "e-human-ops", from: "human", to: "ops", act: "Претензия", scenarios: ["S3"] },
  { id: "e-ops-buyer", from: "ops", to: "buyer-agent", act: "обход", scenarios: ["S3"] },
  { id: "e-ops-seller", from: "ops", to: "seller-agent", act: "обход", scenarios: ["S3"] },
  { id: "e-ops-human", from: "ops", to: "human", act: "принять обход", scenarios: ["S3"] },
  { id: "e-human-platform", from: "human", to: "platform", act: "Эскалация", scenarios: ["S3"] },
  { id: "e-ops-platform", from: "ops", to: "platform", act: "документы", scenarios: ["S3"] },
];

export const FLOW_LANES: { id: FlowLane; label: string }[] = [
  { id: "input", label: "Вход" },
  { id: "platform", label: "Площадка" },
  { id: "party", label: "Стороны" },
  { id: "engine", label: "Движок" },
  { id: "gate", label: "Подпись" },
];

export function nodeById(id: string): FlowNode | undefined {
  return FLOW_NODES.find((n) => n.id === id);
}

export function exportLangflowGraph() {
  return {
    name: "Atrium · шина агентов S1–S3",
    description:
      "Агенты публикуют действия в контур сделки. LLM не входит в граф чисел. Человек — только подпись.",
    nodes: FLOW_NODES,
    edges: FLOW_EDGES,
  };
}
