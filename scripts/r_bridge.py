#!/usr/bin/env python3
"""Small JSON bridge from Eve tools to raym33/r skills."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
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


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower()).strip("_")
    slug = re.sub(r"_+", "_", slug)
    if not slug:
        return "custom_skill"
    if slug[0].isdigit():
        return f"skill_{slug}"
    return slug[:64]


def _class_name(slug: str) -> str:
    return "".join(part.capitalize() for part in slug.split("_") if part) + "Skill"


def _infer_permission_profile(request: str) -> dict[str, Any]:
    lowered = request.lower()
    reads_files = any(word in lowered for word in ["file", "folder", "pdf", "csv", "image", "document", "path"])
    writes_files = any(
        word in lowered
        for word in ["create", "write", "save", "export", "convert", "merge", "generate", "output", "csv"]
    )
    network = any(word in lowered for word in ["web", "url", "api", "http", "download", "scrape"])
    sensitive = any(word in lowered for word in ["email", "ssh", "docker", "wifi", "power", "clipboard", "delete"])

    return {
        "readsFiles": reads_files,
        "writesFiles": writes_files,
        "networkAccess": network,
        "sensitive": sensitive,
        "defaultState": "blocked" if sensitive else "draft",
        "notes": [
            "Generated skills are not installed automatically.",
            "Review code, tests, and permissions before activation.",
            "Prefer writing to a new output path instead of mutating source files.",
        ],
    }


def _related_tools(request: str, limit: int = 8) -> list[dict[str, Any]]:
    query_terms = {term for term in re.split(r"[^a-z0-9]+", request.lower()) if len(term) >= 4}
    matches: list[tuple[int, dict[str, Any]]] = []
    blocked = _blocked_skills()
    for skill in _load_catalog():
        for tool in skill["tools"]:
            blob = f"{skill['name']} {skill['description']} {tool['name']} {tool['description']}".lower()
            score = sum(1 for term in query_terms if term in blob)
            if score:
                matches.append(
                    (
                        score,
                        {
                            "skill": skill["name"],
                            "tool": tool["name"],
                            "description": tool["description"],
                            "blocked": skill["name"] in blocked,
                        },
                    )
                )
    matches.sort(key=lambda item: item[0], reverse=True)
    return [item for _, item in matches[:limit]]


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _skill_py(slug: str, class_name: str, request: str) -> str:
    return f'''"""
Draft R skill generated by Skill Forge.

Request:
{request}

This file is intentionally conservative. Implement the handler, add fixtures,
run tests, and review permissions before installing it into raym33/r.
"""

from typing import Any, Optional

from r_cli.core.agent import Skill
from r_cli.core.config import Config
from r_cli.core.llm import Tool


class {class_name}(Skill):
    """Draft skill generated from a missing capability request."""

    name = "{slug}"
    description = "Draft skill: {request.replace('"', "'")[:140]}"

    def __init__(self, config: Optional[Config] = None):
        super().__init__(config)

    def get_tools(self) -> list[Tool]:
        return [
            Tool(
                name="run",
                description="Run the drafted capability after implementation and approval",
                parameters={{
                    "type": "object",
                    "properties": {{
                        "input_path": {{
                            "type": "string",
                            "description": "Optional input file or folder path",
                        }},
                        "output_path": {{
                            "type": "string",
                            "description": "Optional output path. Prefer a new file.",
                        }},
                        "options": {{
                            "type": "object",
                            "description": "Capability-specific options",
                            "additionalProperties": True,
                        }},
                    }},
                    "required": [],
                }},
                handler=self.run,
            ),
        ]

    def run(
        self,
        input_path: str | None = None,
        output_path: str | None = None,
        options: dict[str, Any] | None = None,
    ) -> str:
        """Implement the actual capability here."""
        raise NotImplementedError(
            "This Skill Forge draft must be implemented, tested, and approved before use."
        )


def register(agent):
    """Called by R CLI when the skill is installed."""
    agent.register_skill({class_name}(agent.config))
'''


def cmd_draft_skill(args: argparse.Namespace) -> None:
    slug = _slugify(args.suggested_name or args.request.split(".")[0])
    class_name = _class_name(slug)
    created_at = datetime.now(timezone.utc).isoformat()
    root = Path(args.output_dir).resolve() / slug
    if root.exists() and any(root.iterdir()) and not args.force:
        raise SystemExit(f"Draft already exists at {root}. Use --force to overwrite.")

    related = _related_tools(args.request)
    permissions = _infer_permission_profile(args.request)
    manifest = {
        "name": slug,
        "className": class_name,
        "status": "draft",
        "createdAt": created_at,
        "request": args.request,
        "permissionProfile": permissions,
        "relatedExistingTools": related,
        "files": ["README.md", "manifest.json", "skill.py", "tests/test_skill.py", "APPROVAL.md"],
    }

    _write_text(
        root / "manifest.json",
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    )
    _write_text(root / "skill.py", _skill_py(slug, class_name, args.request))
    _write_text(
        root / "README.md",
        f"""# {slug}

Status: draft

## Original Request

{args.request}

## Purpose

This draft was generated because no existing R skill was confirmed as a complete fit.

## Suggested Review Flow

1. Confirm the exact user workflow.
2. Review related existing tools in `manifest.json`.
3. Implement `skill.py`.
4. Add fixtures and meaningful tests.
5. Review permissions in `APPROVAL.md`.
6. Install only after approval.

## Safety Notes

- Do not overwrite source files by default.
- Prefer explicit input and output paths.
- Keep network access disabled unless the user explicitly needs it.
- Keep destructive operations out of the first implementation.
""",
    )
    _write_text(
        root / "APPROVAL.md",
        f"""# Approval Checklist

Draft: `{slug}`

## Permission Profile

- Reads files: {permissions["readsFiles"]}
- Writes files: {permissions["writesFiles"]}
- Network access: {permissions["networkAccess"]}
- Sensitive capability: {permissions["sensitive"]}
- Default state: {permissions["defaultState"]}

## Before Activation

- [ ] Code has been reviewed.
- [ ] Tests cover success and failure paths.
- [ ] Inputs and outputs are explicit.
- [ ] Original files are preserved by default.
- [ ] Any network access is justified.
- [ ] Any sensitive operation has a permission prompt.
- [ ] User approved installation.
""",
    )
    _write_text(
        root / "tests" / "test_skill.py",
        f'''import pytest

from skill import {class_name}


def test_draft_is_not_executable_before_implementation():
    skill = {class_name}()
    with pytest.raises(NotImplementedError):
        skill.run()
''',
    )

    _json_out(
        {
            "ok": True,
            "draftPath": str(root),
            "name": slug,
            "status": "draft",
            "permissionProfile": permissions,
            "relatedExistingTools": related,
            "nextSteps": [
                "Review manifest.json and APPROVAL.md.",
                "Implement skill.py.",
                "Add tests and fixtures.",
                "Install only after user approval.",
            ],
        }
    )


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

    draft_skill = subparsers.add_parser("draft-skill")
    draft_skill.add_argument("--request", required=True)
    draft_skill.add_argument("--suggested-name", default="")
    draft_skill.add_argument("--output-dir", default="skill-drafts")
    draft_skill.add_argument("--force", action="store_true")
    draft_skill.set_defaults(func=cmd_draft_skill)

    args = parser.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
