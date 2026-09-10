"""Atrium · Qwen (Ollama). Self-contained: Langflow executes this file in isolation."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from lfx.custom.custom_component.component import Component
from lfx.io import DataInput, MessageTextInput, Output
from lfx.schema.message import Message

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
DEFAULT_MODEL = "qwen2.5:14b"
SYSTEM = (
    "Ты формулируешь итог шины Atrium для человека. "
    "Не меняй цены, количества, статусы и имена поставщиков. "
    "Кратко перескажи trace и сделку по-русски."
)


def _as_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    data = getattr(value, "data", None)
    return dict(data) if isinstance(data, dict) else {}


def _prompt(bus: dict[str, Any]) -> str:
    lines = [f"{row.get('role')}: {row.get('act')}" for row in bus.get("trace") or []]
    body = "\n".join(lines) or "шина пуста"
    extra = {k: bus.get(k) for k in ("deal", "order", "incident", "ruling") if bus.get(k)}
    if extra:
        body = body + "\n\n" + json.dumps(extra, ensure_ascii=False, indent=2)
    return body


def _chat(model: str, prompt: str) -> str:
    payload = json.dumps(
        {
            "model": model,
            "stream": False,
            "options": {"temperature": 0.3, "num_ctx": 4096},
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": prompt},
            ],
        }
    ).encode()
    req = urllib.request.Request(
        OLLAMA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read().decode())
    return ((data.get("message") or {}).get("content") or "").strip()


class AtriumQwen(Component):
    display_name = "Atrium · Qwen"
    description = "Озвучивает итог шины через Ollama qwen2.5:14b. Числа не меняет."
    icon = "FileText"
    name = "atrium_qwen"
    inputs = [
        DataInput(name="bus", display_name="Шина"),
        MessageTextInput(name="model", display_name="Модель", value=DEFAULT_MODEL),
    ]
    outputs = [Output(display_name="Ответ", name="message", method="speak")]

    def speak(self) -> Message:
        bus = _as_dict(self.bus)
        prompt = _prompt(bus)
        model = (getattr(self, "model", None) or DEFAULT_MODEL).strip() or DEFAULT_MODEL
        try:
            text = _chat(model, prompt)
        except urllib.error.URLError as exc:
            text = f"Ollama не ответила ({OLLAMA_URL}): {exc}"
        except TimeoutError:
            text = f"Ollama не ответила за 180с ({model})"
        except Exception as exc:  # noqa: BLE001 — Playground must still return a Message
            text = f"Ollama ошибка: {exc}"
        return Message(text=text or prompt)
