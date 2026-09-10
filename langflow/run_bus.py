#!/usr/bin/env python3
"""Walk S1 → S2 → S3 on the Atrium bus without Langflow installed."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "components"))

from atrium.__engine import fulfill, match_lots, negotiate, parse_need, remedy, trace_append

QUERY = "Нужно 50 000 коробок 300×200×150, крафт, доставка в Казань за 14 дней, бюджет до 2,1 млн"


def walk() -> dict:
    bus: dict = {"need_text": QUERY, "scenarios": ["S1", "S2", "S3"]}
    bus = trace_append(bus, "orchestrator", "сценарий")
    bus["need"] = parse_need(QUERY)
    bus = trace_append(bus, "parser", "текст")
    bus["lots"] = match_lots(bus["need"])
    bus = trace_append(bus, "matcher", "свободные лоты")
    bus = trace_append({**bus, "speech": "Заявка"}, "buyer-agent", "Заявка")
    bus = trace_append({**bus, "speech": "Предложение"}, "seller-agent", "Предложение")
    bus["deal"] = negotiate(bus["lots"], bus["need"].get("budget"))
    bus = trace_append(bus, "mandate", "Согласие / отказ")
    bus["human_ok"] = True
    bus = trace_append(bus, "human", "Утверждение / оплата / приёмка")
    bus["order"] = fulfill(bus["deal"], paid=True)
    bus = trace_append(bus, "fulfillment", "заказ")
    bus["incident"] = remedy()
    bus = trace_append(bus, "ops", "Претензия / обход")
    bus["ruling"] = {"status": "accepted_remedy", "rating_hit": False}
    bus = trace_append(bus, "platform", "Эскалация / решение")
    return bus


if __name__ == "__main__":
    payload = walk()
    print(json.dumps(payload["trace"], ensure_ascii=False, indent=2))
    print("---")
    print(json.dumps({"deal": payload["deal"], "order": payload["order"], "incident": payload["incident"]}, ensure_ascii=False, indent=2))
