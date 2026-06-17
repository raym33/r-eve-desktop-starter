#!/usr/bin/env python3
"""Small JSON bridge from Eve tools to raym33/r skills."""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any


DEFAULT_BLOCKED_SKILLS = {
    "android",
    "bluetooth",
    "clipboard",
    "docker",
    "email",
    "gpio",
    "power",
    "realtime_voice",
    "screenshot",
    "social",
    "ssh",
    "voice",
    "wifi",
}


def _json_out(payload: Any) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2, default=str))


def _load_catalog() -> list[dict[str, Any]]:
    from r_cli.core.config import Config
    from r_cli.skills import get_all_skills

    config = Config()
    catalog: list[dict[str, Any]] = []
    for skill_class in get_all_skills():
        skill = skill_class(config)
        tools = skill.get_tools()
        catalog.append(
            {
                "name": skill.name,
                "description": getattr(skill, "description", "") or "",
                "tools": [
                    {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.parameters,
                    }
                    for tool in tools
                ],
            }
        )
    return catalog


def _blocked_skills() -> set[str]:
    configured = os.environ.get("R_BRIDGE_BLOCKED_SKILLS")
    if configured is not None:
        return {item.strip() for item in configured.split(",") if item.strip()}
    if os.environ.get("R_BRIDGE_ALLOW_DANGEROUS") == "1":
        return set()
    return DEFAULT_BLOCKED_SKILLS


def cmd_catalog(args: argparse.Namespace) -> None:
    catalog = _load_catalog()
    blocked = _blocked_skills()
    skills = [
        {
            "name": skill["name"],
            "description": skill["description"],
            "toolCount": len(skill["tools"]),
            "blocked": skill["name"] in blocked,
        }
        for skill in catalog
    ]
    _json_out(
        {
            "skillCount": len(skills),
            "toolCount": sum(skill["toolCount"] for skill in skills),
            "blockedSkills": sorted(blocked),
            "skills": skills[: args.limit],
        }
    )


def cmd_export_catalog(args: argparse.Namespace) -> None:
    catalog = _load_catalog()
    blocked = _blocked_skills()
    payload = {
        "skillCount": len(catalog),
        "toolCount": sum(len(skill["tools"]) for skill in catalog),
        "blockedSkills": sorted(blocked),
        "skills": [
            {
                **skill,
                "blocked": skill["name"] in blocked,
                "toolCount": len(skill["tools"]),
            }
            for skill in catalog
        ],
    }
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, default=str)
        handle.write("\n")
    _json_out({"output": args.output, "skillCount": payload["skillCount"], "toolCount": payload["toolCount"]})


def cmd_search(args: argparse.Namespace) -> None:
    query = args.query.lower()
    catalog = _load_catalog()
    blocked = _blocked_skills()
    matches: list[dict[str, Any]] = []

    for skill in catalog:
        skill_blob = f"{skill['name']} {skill['description']}".lower()
        for tool in skill["tools"]:
            tool_blob = f"{tool['name']} {tool['description']}".lower()
            if query in skill_blob or query in tool_blob:
                matches.append(
                    {
                        "skill": skill["name"],
                        "tool": tool["name"],
                        "description": tool["description"],
                        "parameters": tool["parameters"],
                        "blocked": skill["name"] in blocked,
                    }
                )

    _json_out({"query": args.query, "matches": matches[: args.limit]})


def cmd_call(args: argparse.Namespace) -> None:
    if args.skill in _blocked_skills():
        raise SystemExit(
            f"Skill '{args.skill}' is blocked by the Eve R bridge. "
            "Set R_BRIDGE_ALLOW_DANGEROUS=1 or R_BRIDGE_BLOCKED_SKILLS to override."
        )

    from r_cli.tool_runner import execute_tool, normalize_result

    try:
        params = json.loads(args.params)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid params JSON: {exc.msg}") from exc
    if not isinstance(params, dict):
        raise SystemExit("params must be a JSON object")

    result = execute_tool(
        args.skill,
        args.tool,
        params,
        auto_approve=True,
        source="eve-r-bridge",
    )
    _json_out(
        {
            "skill": args.skill,
            "tool": args.tool,
            "result": normalize_result(result),
        }
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(required=True)

    catalog = subparsers.add_parser("catalog")
    catalog.add_argument("--limit", type=int, default=100)
    catalog.set_defaults(func=cmd_catalog)

    export_catalog = subparsers.add_parser("export-catalog")
    export_catalog.add_argument("--output", default="public/r-catalog.json")
    export_catalog.set_defaults(func=cmd_export_catalog)

    search = subparsers.add_parser("search")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=20)
    search.set_defaults(func=cmd_search)

    call = subparsers.add_parser("call")
    call.add_argument("skill")
    call.add_argument("tool")
    call.add_argument("--params", default="{}")
    call.set_defaults(func=cmd_call)

    args = parser.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
