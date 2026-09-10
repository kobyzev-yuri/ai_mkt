#!/usr/bin/env python3
"""Build an importable Langflow flow JSON from the Atrium component files.

Executable DAG (no cycles — reverse protocol edges deadlock the runner):

  Chat Input → Оркестратор → Парсер → Поиск → Закупка → Поставка
  → Мандат → Человек → Исполнение → Инциденты → Арбитр
  → Qwen (Ollama qwen2.5:14b) → Chat Output
"""

from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path

from lfx.components.input_output import ChatInput, ChatOutput
from lfx.custom.directory_reader.directory_reader import DirectoryReader
from lfx.custom.utils import build_custom_component_template, create_component_template

ROOT = Path(__file__).resolve().parent
COMPONENTS = ROOT / "components"
OUT = ROOT / "flows" / "Atrium.json"

# Same layout as src/lib/langflow-graph.ts (without the text "need" node).
LAYOUT = {
    "orchestrator": (240, 48, "plan"),
    "parser": (240, 220, "need"),
    "matcher": (480, 140, "lots"),
    "buyer": (720, 48, "rfq"),
    "seller": (720, 280, "offer"),
    "mandate": (960, 164, "deal"),
    "human": (1200, 48, "signed"),
    "fulfillment": (1200, 220, "order"),
    "ops": (960, 400, "remedy"),
    "arbiter": (1200, 400, "ruling"),
    "qwen": (1440, 220, "message"),
}

# Left-to-right only. Reverse edges (seller→buyer, ops→human, …) hang Playground.
EDGES = [
    ("orchestrator", "parser"),
    ("parser", "matcher"),
    ("matcher", "buyer"),
    ("buyer", "seller"),
    ("seller", "mandate"),
    ("mandate", "human"),
    ("human", "fulfillment"),
    ("fulfillment", "ops"),
    ("ops", "arbiter"),
    ("arbiter", "qwen"),
]


def _handle_id(data_type: str, node_id: str, name: str, output_types: list[str]) -> str:
    inner = json.dumps(
        {"dataType": data_type, "id": node_id, "name": name, "output_types": output_types},
        ensure_ascii=False,
        separators=(", ", ": "),
    )
    return inner.replace('"', "œ")


def _target_id(field: str, node_id: str, input_types: list[str], typ: str) -> str:
    inner = json.dumps(
        {"fieldName": field, "id": node_id, "inputTypes": input_types, "type": typ},
        ensure_ascii=False,
        separators=(", ", ": "),
    )
    return inner.replace('"', "œ")


def _edge(
    source: str,
    target: str,
    *,
    src_type: str,
    out_name: str,
    out_types: list[str],
    field: str,
    in_types: list[str],
    in_typ: str,
) -> dict:
    return {
        "id": f"{source}-{target}",
        "source": source,
        "target": target,
        "sourceHandle": _handle_id(src_type, source, out_name, out_types),
        "targetHandle": _target_id(field, target, in_types, in_typ),
        "data": {
            "sourceHandle": {
                "dataType": src_type,
                "id": source,
                "name": out_name,
                "output_types": out_types,
            },
            "targetHandle": {
                "fieldName": field,
                "id": target,
                "inputTypes": in_types,
                "type": in_typ,
            },
        },
    }


async def main() -> None:
    reader = DirectoryReader(str(COMPONENTS))
    files = reader.get_files()
    menu = await reader.abuild_component_menu_list(files)
    by_file: dict[str, dict] = {}
    for item in menu["menu"]:
        for component in item["components"]:
            if component.get("error"):
                raise SystemExit(f"{component['file']}: {component['error']}")
            by_file[Path(component["file"]).stem] = component

    nodes = []
    ids: dict[str, str] = {}
    types: dict[str, str] = {}
    outputs: dict[str, str] = {}

    for stem, (x, y, out_name) in LAYOUT.items():
        raw = by_file[stem]
        template, instance = create_component_template(raw)
        node_id = f"{instance.name}-{uuid.uuid4().hex[:5]}"
        ids[stem] = node_id
        types[stem] = instance.name
        outputs[stem] = out_name
        nodes.append(
            {
                "id": node_id,
                "type": "genericNode",
                "position": {"x": x, "y": y},
                "data": {
                    "id": node_id,
                    "type": instance.name,
                    "node": template,
                    "showNode": True,
                },
            }
        )

    # Data() serializes as JSON on the canvas; DataInput accepts Data and JSON.
    edges = [_edge(
        ids[src],
        ids[dst],
        src_type=types[src],
        out_name=outputs[src],
        out_types=["JSON"],
        field="bus",
        in_types=["Data", "JSON"],
        in_typ="other",
    ) for src, dst in EDGES]

    def add_builtin(instance, node_id: str, x: int, y: int) -> None:
        template, _ = build_custom_component_template(instance)
        nodes.append(
            {
                "id": node_id,
                "type": "genericNode",
                "position": {"x": x, "y": y},
                "data": {
                    "id": node_id,
                    "type": instance.name,
                    "node": template,
                    "showNode": True,
                },
            }
        )

    chat_in_id = "ChatInput-atrium"
    chat_out_id = "ChatOutput-atrium"
    add_builtin(ChatInput(), chat_in_id, 20, 48)
    add_builtin(ChatOutput(), chat_out_id, 1720, 220)

    orch_id = ids["orchestrator"]
    qwen_id = ids["qwen"]
    edges.append(
        _edge(
            chat_in_id,
            orch_id,
            src_type="ChatInput",
            out_name="message",
            out_types=["Message"],
            field="need_text",
            in_types=["Message"],
            in_typ="str",
        )
    )
    edges.append(
        _edge(
            qwen_id,
            chat_out_id,
            src_type=types["qwen"],
            out_name="message",
            out_types=["Message"],
            field="input_value",
            in_types=["Data", "JSON", "DataFrame", "Table", "Message"],
            in_typ="other",
        )
    )

    flow = {
        "id": "8f3c1a2e-6b47-4d91-9c0a-7e2b18d4a9c1",
        "name": "Atrium · шина агентов S1–S3",
        "description": "Шина S1–S3, затем Atrium · Qwen (Ollama qwen2.5:14b) озвучивает итог.",
        "is_component": False,
        "endpoint_name": "atrium",
        "data": {
            "nodes": nodes,
            "edges": edges,
            "viewport": {"x": 0, "y": 0, "zoom": 0.75},
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(flow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT, "nodes", len(nodes), "edges", len(edges))


if __name__ == "__main__":
    asyncio.run(main())
