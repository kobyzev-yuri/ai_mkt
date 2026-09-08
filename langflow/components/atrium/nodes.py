"""Langflow nodes for Atrium. One class = one agent on the canvas."""

from __future__ import annotations

from typing import Any

from ._engine import fulfill, match_lots, negotiate, parse_need, remedy, trace_append

try:
    from lfx.custom.custom_component.component import Component
    from lfx.io import BoolInput, DataInput, MessageTextInput, Output
    from lfx.schema.data import Data
except ImportError:  # Langflow < 1.7
    from langflow.custom import Component
    from langflow.io import BoolInput, DataInput, MessageTextInput, Output
    from langflow.schema import Data


def _as_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    data = getattr(value, "data", None)
    return dict(data) if isinstance(data, dict) else {}


class Orchestrator(Component):
    display_name = "Atrium · Оркестратор"
    description = "Раскладывает S1→S2→S3. Не торгуется и не двигает цену."
    icon = "workflow"
    name = "atrium_orchestrator"
    inputs = [
        MessageTextInput(name="need_text", display_name="Потребность", tool_mode=True),
    ]
    outputs = [Output(display_name="План", name="plan", method="plan")]

    def plan(self) -> Data:
        text = self.need_text or ""
        payload = trace_append(
            {"need_text": text, "scenarios": ["S1", "S2", "S3"]},
            "orchestrator",
            "сценарий",
        )
        return Data(data=payload)


class Parser(Component):
    display_name = "Atrium · Парсер"
    description = "Структура заявки из свободного текста. Не выдумывает объём."
    icon = "file-text"
    name = "atrium_parser"
    inputs = [
        DataInput(name="bus", display_name="Шина"),
        MessageTextInput(name="need_text", display_name="Потребность (если шина пуста)"),
    ]
    outputs = [Output(display_name="Заявка", name="need", method="parse")]

    def parse(self) -> Data:
        bus = _as_dict(self.bus)
        text = bus.get("need_text") or self.need_text or ""
        need = parse_need(str(text))
        payload = trace_append({**bus, "need": need}, "parser", "текст")
        return Data(data=payload)


class Matcher(Component):
    display_name = "Atrium · Поиск партий"
    description = "Подбор свободных лотов. Не обещает то, чего нет."
    icon = "search"
    name = "atrium_matcher"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Лоты", name="lots", method="match")]

    def match(self) -> Data:
        bus = _as_dict(self.bus)
        lots = match_lots(bus.get("need") or {})
        payload = trace_append({**bus, "lots": lots}, "matcher", "свободные лоты")
        return Data(data=payload)


class BuyerAgent(Component):
    display_name = "Atrium · Агент закупки"
    description = "Заявка и встречное в мандате покупателя. Не платит."
    icon = "user"
    name = "atrium_buyer"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Заявка", name="rfq", method="ask")]

    def ask(self) -> Data:
        bus = _as_dict(self.bus)
        payload = trace_append({**bus, "speech": "Заявка"}, "buyer-agent", "Заявка")
        return Data(data=payload)


class SellerAgent(Component):
    display_name = "Atrium · Агент поставки"
    description = "Предложение от лотов. Уступает только до пола маржи."
    icon = "package"
    name = "atrium_seller"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Предложение", name="offer", method="offer")]

    def offer(self) -> Data:
        bus = _as_dict(self.bus)
        payload = trace_append({**bus, "speech": "Предложение"}, "seller-agent", "Предложение")
        return Data(data=payload)


class Mandate(Component):
    display_name = "Atrium · Движок мандата"
    description = "Цена, количество, статус. LLM сюда не ходит."
    icon = "gauge"
    name = "atrium_mandate"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Сделка", name="deal", method="settle")]

    def settle(self) -> Data:
        bus = _as_dict(self.bus)
        need = bus.get("need") or {}
        deal = negotiate(bus.get("lots") or [], need.get("budget"))
        payload = trace_append({**bus, "deal": deal}, "mandate", "Согласие / отказ")
        return Data(data=payload)


class HumanGate(Component):
    display_name = "Atrium · Человек"
    description = "Утвердить, оплатить, принять. Единственная необратимая подпись."
    icon = "shield"
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


class Fulfillment(Component):
    display_name = "Atrium · Исполнение"
    description = "Счёт, резерв, ТТН, УПД. Склад не едет без аванса."
    icon = "truck"
    name = "atrium_fulfillment"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Заказ", name="order", method="ship")]

    def ship(self) -> Data:
        bus = _as_dict(self.bus)
        order = fulfill(bus.get("deal") or {}, paid=bool(bus.get("human_ok")))
        payload = trace_append({**bus, "order": order}, "fulfillment", "заказ")
        return Data(data=payload)


class Ops(Component):
    display_name = "Atrium · Инциденты"
    description = "Обход по факту срыва. Рейтинг не трогает."
    icon = "alert-triangle"
    name = "atrium_ops"
    inputs = [DataInput(name="bus", display_name="Шина")]
    outputs = [Output(display_name="Обход", name="remedy", method="propose")]

    def propose(self) -> Data:
        bus = _as_dict(self.bus)
        payload = trace_append({**bus, "incident": remedy()}, "ops", "Претензия / обход")
        return Data(data=payload)


class PlatformArbiter(Component):
    display_name = "Atrium · Арбитр"
    description = "Решение по документам. Только тогда бьёт рейтинг."
    icon = "gavel"
    name = "atrium_platform"
    inputs = [
        DataInput(name="bus", display_name="Шина"),
        BoolInput(name="escalate", display_name="Эскалация", value=False),
    ]
    outputs = [Output(display_name="Решение", name="ruling", method="rule")]

    def rule(self) -> Data:
        bus = _as_dict(self.bus)
        escalate = bool(self.escalate)
        ruling = {
            "status": "arbitration" if escalate else "accepted_remedy",
            "rating_hit": escalate,
        }
        payload = trace_append({**bus, "ruling": ruling}, "platform", "Эскалация / решение")
        return Data(data=payload)
