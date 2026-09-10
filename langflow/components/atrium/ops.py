"""Atrium · Инциденты. Self-contained: Langflow executes this file in isolation."""

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

class Ops(Component):
    display_name = "Atrium · Инциденты"
    description = "Обход по факту срыва. Рейтинг не трогает."
    icon = "Unplug"
    name = "atrium_ops"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Обход", name="remedy", method="propose")]

    def propose(self) -> Data:
        bus = _as_dict(self.bus)
        payload = trace_append({**bus, "incident": remedy()}, "ops", "Претензия / обход")
        return Data(data=payload)
