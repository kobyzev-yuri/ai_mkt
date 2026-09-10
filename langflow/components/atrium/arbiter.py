"""Atrium · Арбитр. Self-contained: Langflow executes this file in isolation."""

from __future__ import annotations

import json
from typing import Any

from lfx.custom.custom_component.component import Component
from lfx.io import BoolInput, DataInput, MessageTextInput, Output
from lfx.schema.data import Data
from lfx.schema.message import Message


def _as_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    data = getattr(value, "data", None)
    return dict(data) if isinstance(data, dict) else {}


def _text(value: Any) -> str:
    if value is None:
        return ""
    text = getattr(value, "text", None)
    if isinstance(text, str) and text:
        return text
    return str(value)

def trace_append(payload: dict[str, Any], role: str, act: str) -> dict[str, Any]:
    data = dict(payload or {})
    trail = list(data.get("trace") or [])
    trail.append({"role": role, "act": act})
    data["trace"] = trail
    return data


def parse_need(query: str) -> dict[str, Any]:
    q = (query or "").lower()
    city = "Казань" if "казан" in q else "Москва" if "москв" in q else None
    qty = 50_000 if "50" in q or "50000" in q.replace(" ", "") else None
    budget = 2_100_000 if "2,1" in q or "2.1" in q or "млн" in q else None
    return {
        "query": query,
        "category": "Упаковка" if "короб" in q or "крафт" in q else None,
        "city": city,
        "qty": qty,
        "budget": budget,
        "unit": "шт",
    }


def match_lots(need: dict[str, Any]) -> list[dict[str, Any]]:
    qty = int(need.get("qty") or 18_000)
    return [
        {"seller": "СеверПак", "sku": "короб 300×200×150", "price": 42, "floor": 38, "qty": qty, "ready_days": 9},
        {"seller": "ВолгаКомплект", "sku": "короб 300×200×150", "price": 44, "floor": 40, "qty": qty, "ready_days": 12},
    ]


def negotiate(lots: list[dict[str, Any]], budget: float | None) -> dict[str, Any]:
    if not lots:
        return {"status": "rejected", "reason": "нет партий"}
    best = min(lots, key=lambda x: x["price"])
    price = max(float(best["floor"]), float(best["price"]) * 0.97)
    total = price * int(best["qty"])
    if budget and total > budget:
        return {"status": "rejected", "reason": "бюджет", "price": price, "total": total}
    return {
        "status": "agreed",
        "seller": best["seller"],
        "price": round(price, 2),
        "qty": best["qty"],
        "total": round(total, 2),
        "floor_ok": price >= float(best["floor"]),
    }


def fulfill(deal: dict[str, Any], *, paid: bool) -> dict[str, Any]:
    if not paid:
        return {"status": "advance_due", "note": "склад не едет без аванса"}
    return {
        "status": "shipping",
        "documents": ["счёт", "ТТН", "УПД"],
        "deal": deal,
    }


def remedy(kind: str = "delay_ship") -> dict[str, Any]:
    return {
        "kind": kind,
        "proposed": "довоз через 2 дня, рейтинг не трогаем",
        "rating_hit": False,
    }

class PlatformArbiter(Component):
    display_name = "Atrium · Арбитр"
    description = "Решение по документам. Только тогда бьёт рейтинг."
    icon = "Scale"
    name = "atrium_platform"
    inputs = [
        DataInput(name="bus", display_name="Шина"),
        BoolInput(name="escalate", display_name="Эскалация", value=False),
    ]
    outputs = [
        Output(display_name="Решение", name="ruling", method="rule"),
        Output(display_name="Для Ollama", name="message", method="as_message", types=["Message"]),
    ]

    def _payload(self) -> dict:
        bus = _as_dict(self.bus)
        escalate = bool(self.escalate)
        ruling = {"status": "arbitration" if escalate else "accepted_remedy", "rating_hit": escalate}
        return trace_append({**bus, "ruling": ruling}, "platform", "Эскалация / решение")

    def rule(self) -> Data:
        return Data(data=self._payload())

    def as_message(self) -> Message:
        bus = self._payload()
        lines = [f"{row.get('role')}: {row.get('act')}" for row in bus.get("trace") or []]
        body = "\n".join(lines) or "шина пуста"
        extra = {k: bus.get(k) for k in ("deal", "order", "incident", "ruling") if bus.get(k)}
        if extra:
            body = body + "\n\n" + json.dumps(extra, ensure_ascii=False, indent=2)
        return Message(text=body)
