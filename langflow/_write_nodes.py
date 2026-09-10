#!/usr/bin/env python3
"""Emit one self-contained Langflow component file per Atrium agent."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent / "components" / "atrium"
ENGINE = (ROOT / "__engine.py").read_text(encoding="utf-8")
ENGINE_BODY = ENGINE.split("def trace_append", 1)[1]
ENGINE_BODY = "def trace_append" + ENGINE_BODY

HEADER = '''"""{doc} Self-contained: Langflow executes this file in isolation."""

from __future__ import annotations

import json
from typing import Any

from lfx.custom.custom_component.component import Component
from lfx.io import BoolInput, DataInput, MessageTextInput, Output
from lfx.schema.data import Data
from lfx.schema.message import Message


def _as_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {{}}
    if isinstance(value, dict):
        return value
    data = getattr(value, "data", None)
    return dict(data) if isinstance(data, dict) else {{}}


def _text(value: Any) -> str:
    if value is None:
        return ""
    text = getattr(value, "text", None)
    if isinstance(text, str) and text:
        return text
    return str(value)

'''

NODES: list[tuple[str, str]] = [
    (
        "orchestrator.py",
        '''
class Orchestrator(Component):
    display_name = "Atrium · Оркестратор"
    description = "Раскладывает S1→S2→S3. Не торгуется и не двигает цену."
    icon = "Workflow"
    name = "atrium_orchestrator"
    inputs = [MessageTextInput(name="need_text", display_name="Потребность", tool_mode=True)]
    outputs = [Output(display_name="План", name="plan", method="plan")]

    def plan(self) -> Data:
        text = _text(self.need_text)
        payload = trace_append({"need_text": text, "scenarios": ["S1", "S2", "S3"]}, "orchestrator", "сценарий")
        return Data(data=payload)
''',
    ),
    (
        "parser.py",
        '''
class Parser(Component):
    display_name = "Atrium · Парсер"
    description = "Структура заявки из свободного текста. Не выдумывает объём."
    icon = "FileText"
    name = "atrium_parser"
    inputs = [
        DataInput(name="bus", display_name="Шина"),
        MessageTextInput(name="need_text", display_name="Потребность (если шина пуста)"),
    ]
    outputs = [Output(display_name="Заявка", name="need", method="parse")]

    def parse(self) -> Data:
        bus = _as_dict(self.bus)
        text = bus.get("need_text") or _text(self.need_text)
        need = parse_need(str(text))
        payload = trace_append({**bus, "need": need}, "parser", "текст")
        return Data(data=payload)
''',
    ),
    (
        "matcher.py",
        '''
class Matcher(Component):
    display_name = "Atrium · Поиск партий"
    description = "Подбор свободных лотов. Не обещает то, чего нет."
    icon = "ScanSearch"
    name = "atrium_matcher"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Лоты", name="lots", method="match")]

    def match(self) -> Data:
        bus = _as_dict(self.bus)
        lots = match_lots(bus.get("need") or {})
        payload = trace_append({**bus, "lots": lots}, "matcher", "свободные лоты")
        return Data(data=payload)
''',
    ),
    (
        "buyer.py",
        '''
class BuyerAgent(Component):
    display_name = "Atrium · Агент закупки"
    description = "Заявка и встречное в мандате покупателя. Не платит."
    icon = "User"
    name = "atrium_buyer"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Заявка", name="rfq", method="ask")]

    def ask(self) -> Data:
        bus = _as_dict(self.bus)
        payload = trace_append({**bus, "speech": "Заявка"}, "buyer-agent", "Заявка")
        return Data(data=payload)
''',
    ),
    (
        "seller.py",
        '''
class SellerAgent(Component):
    display_name = "Atrium · Агент поставки"
    description = "Предложение от лотов. Уступает только до пола маржи."
    icon = "Package"
    name = "atrium_seller"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Предложение", name="offer", method="offer")]

    def offer(self) -> Data:
        bus = _as_dict(self.bus)
        payload = trace_append({**bus, "speech": "Предложение"}, "seller-agent", "Предложение")
        return Data(data=payload)
''',
    ),
    (
        "mandate.py",
        '''
class Mandate(Component):
    display_name = "Atrium · Движок мандата"
    description = "Цена, количество, статус. LLM сюда не ходит."
    icon = "Gauge"
    name = "atrium_mandate"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Сделка", name="deal", method="settle")]

    def settle(self) -> Data:
        bus = _as_dict(self.bus)
        need = bus.get("need") or {}
        deal = negotiate(bus.get("lots") or [], need.get("budget"))
        payload = trace_append({**bus, "deal": deal}, "mandate", "Согласие / отказ")
        return Data(data=payload)
''',
    ),
    (
        "human.py",
        '''
class HumanGate(Component):
    display_name = "Atrium · Человек"
    description = "Утвердить, оплатить, принять. Единственная необратимая подпись."
    icon = "Shield"
    name = "atrium_human"
    inputs = [
        DataInput(name="bus", display_name="Шина"),
        BoolInput(name="approve", display_name="Утвердить / оплатить", value=True),
    ]
    outputs = [Output(display_name="Подпись", name="signed", method="sign")]

    def sign(self) -> Data:
        bus = _as_dict(self.bus)
        ok = bool(self.approve)
        payload = trace_append(
            {**bus, "human_ok": ok},
            "human",
            "Утверждение / оплата / приёмка" if ok else "отказ человека",
        )
        return Data(data=payload)
''',
    ),
    (
        "fulfillment.py",
        '''
class Fulfillment(Component):
    display_name = "Atrium · Исполнение"
    description = "Счёт, резерв, ТТН, УПД. Склад не едет без аванса."
    icon = "Truck"
    name = "atrium_fulfillment"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Заказ", name="order", method="ship")]

    def ship(self) -> Data:
        bus = _as_dict(self.bus)
        order = fulfill(bus.get("deal") or {}, paid=bool(bus.get("human_ok")))
        payload = trace_append({**bus, "order": order}, "fulfillment", "заказ")
        return Data(data=payload)
''',
    ),
    (
        "ops.py",
        '''
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
''',
    ),
    (
        "arbiter.py",
        '''
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
        body = "\\n".join(lines) or "шина пуста"
        extra = {k: bus.get(k) for k in ("deal", "order", "incident", "ruling") if bus.get(k)}
        if extra:
            body = body + "\\n\\n" + json.dumps(extra, ensure_ascii=False, indent=2)
        return Message(text=body)
''',
    ),
    (
        "reply.py",
        '''
class PlaygroundReply(Component):
    display_name = "Atrium · Ответ в чат"
    description = "Текст для Playground / Chat Output. Не двигает цену."
    icon = "FileText"
    name = "atrium_reply"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Ответ", name="message", method="speak")]

    def speak(self) -> Message:
        bus = _as_dict(self.bus)
        lines = [f"{row.get('role')}: {row.get('act')}" for row in bus.get("trace") or []]
        body = "\\n".join(lines) or "шина пуста"
        extra = {k: bus.get(k) for k in ("deal", "order", "incident", "ruling") if bus.get(k)}
        if extra:
            body = body + "\\n\\n" + json.dumps(extra, ensure_ascii=False, indent=2)
        return Message(text=body)
''',
    ),
]


def main() -> None:
    docs = {
        "orchestrator.py": "Atrium · Оркестратор.",
        "parser.py": "Atrium · Парсер.",
        "matcher.py": "Atrium · Поиск партий.",
        "buyer.py": "Atrium · Агент закупки.",
        "seller.py": "Atrium · Агент поставки.",
        "mandate.py": "Atrium · Движок мандата.",
        "human.py": "Atrium · Человек.",
        "fulfillment.py": "Atrium · Исполнение.",
        "ops.py": "Atrium · Инциденты.",
        "arbiter.py": "Atrium · Арбитр.",
        "reply.py": "Atrium · Ответ в чат.",
    }
    for name, body in NODES:
        text = HEADER.format(doc=docs[name]) + ENGINE_BODY + "\n" + body.strip() + "\n"
        (ROOT / name).write_text(text, encoding="utf-8")
        print("wrote", name)


if __name__ == "__main__":
    main()
