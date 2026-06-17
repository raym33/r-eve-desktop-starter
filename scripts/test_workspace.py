import argparse
import json
import sys
import types
from pathlib import Path
from typing import Any

import pytest

from scripts import r_bridge


def _call(capsys: pytest.CaptureFixture[str], func, **kwargs: Any) -> dict[str, Any]:
    func(argparse.Namespace(**kwargs))
    out = capsys.readouterr().out
    return json.loads(out)


def _install_fake_runner(monkeypatch: pytest.MonkeyPatch, *, fail: bool = False) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []
    package = types.ModuleType("r_cli")
    runner = types.ModuleType("r_cli.tool_runner")

    def execute_tool(
        skill: str,
        tool: str,
        params: dict[str, Any],
        *,
        auto_approve: bool,
        source: str,
    ) -> dict[str, Any]:
        call = {
            "skill": skill,
            "tool": tool,
            "params": params,
            "auto_approve": auto_approve,
            "source": source,
        }
        calls.append(call)
        if fail:
            raise RuntimeError("boom")
        return {"ok": True, "call": call}

    def normalize_result(result: Any) -> Any:
        return result

    runner.execute_tool = execute_tool
    runner.normalize_result = normalize_result
    monkeypatch.setitem(sys.modules, "r_cli", package)
    monkeypatch.setitem(sys.modules, "r_cli.tool_runner", runner)
    return calls


def _read_receipt(root: Path) -> dict[str, Any]:
    receipts = sorted((root / "Receipts").glob("*.json"))
    assert len(receipts) == 1
    return json.loads(receipts[0].read_text(encoding="utf-8"))


def test_workspace_info_creates_subfolders_and_reports_them(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("AI_NATIVE_OS_WORKSPACE", str(workspace))

    payload = _call(capsys, r_bridge.cmd_workspace_info)

    assert payload["ok"] is True
    assert payload["root"] == str(workspace.resolve())
    for name, path in payload["subfolders"].items():
        assert name in {"Inbox", "Outputs", "Reports", "OCR", "Receipts", "Drafts", "Logs"}
        assert Path(path).is_dir()
    assert payload["receipts"] == 0
    assert payload["receiptsEnabled"] is True
    assert payload["workspaceOnly"] is False


def test_successful_call_writes_receipt_file_and_jsonl_line(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("AI_NATIVE_OS_WORKSPACE", str(workspace))
    _install_fake_runner(monkeypatch)

    payload = _call(
        capsys,
        r_bridge.cmd_call,
        skill="email",
        tool="send_email",
        params=json.dumps({"to": "client@example.com", "subject": "Invoice"}),
        confirm=True,
    )

    assert payload["confirmed"] is True
    receipt = _read_receipt(workspace)
    assert receipt["skill"] == "email"
    assert receipt["tool"] == "send_email"
    assert receipt["confirmed"] is True
    assert receipt["status"] == "success"
    assert "client@example.com" in receipt["output"]
    jsonl_lines = (workspace / "Logs" / "receipts.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(jsonl_lines) == 1
    assert json.loads(jsonl_lines[0])["status"] == "success"


def test_execute_error_writes_error_receipt_and_reraises(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("AI_NATIVE_OS_WORKSPACE", str(workspace))
    _install_fake_runner(monkeypatch, fail=True)

    with pytest.raises(RuntimeError, match="boom"):
        r_bridge.cmd_call(
            argparse.Namespace(
                skill="math",
                tool="add",
                params=json.dumps({"a": 1, "b": 2}),
                confirm=False,
            )
        )

    receipt = _read_receipt(workspace)
    assert receipt["status"] == "error"
    assert receipt["error"] == "boom"
    jsonl_lines = (workspace / "Logs" / "receipts.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(jsonl_lines) == 1
    assert json.loads(jsonl_lines[0])["status"] == "error"


def test_receipts_disabled_writes_nothing(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    monkeypatch.setenv("AI_NATIVE_OS_WORKSPACE", str(workspace))
    monkeypatch.setenv("R_BRIDGE_RECEIPTS", "0")
    _install_fake_runner(monkeypatch)

    _call(
        capsys,
        r_bridge.cmd_call,
        skill="math",
        tool="add",
        params=json.dumps({"a": 1, "b": 2}),
        confirm=False,
    )

    assert not (workspace / "Receipts").exists()
    assert not (workspace / "Logs" / "receipts.jsonl").exists()


def test_workspace_only_refuses_path_outside_workspace(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    outside = tmp_path / "outside" / "input.txt"
    monkeypatch.setenv("AI_NATIVE_OS_WORKSPACE", str(workspace))
    monkeypatch.setenv("R_BRIDGE_WORKSPACE_ONLY", "1")
    calls = _install_fake_runner(monkeypatch)

    with pytest.raises(SystemExit, match="outside the AI Native OS workspace"):
        r_bridge.cmd_call(
            argparse.Namespace(
                skill="files",
                tool="read",
                params=json.dumps({"path": str(outside)}),
                confirm=False,
            )
        )

    assert calls == []


def test_workspace_only_allows_path_inside_workspace(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    inside = workspace / "Inbox" / "input.txt"
    monkeypatch.setenv("AI_NATIVE_OS_WORKSPACE", str(workspace))
    monkeypatch.setenv("R_BRIDGE_WORKSPACE_ONLY", "1")
    calls = _install_fake_runner(monkeypatch)

    _call(
        capsys,
        r_bridge.cmd_call,
        skill="files",
        tool="read",
        params=json.dumps({"path": str(inside)}),
        confirm=False,
    )

    assert len(calls) == 1


def test_workspace_allow_permits_extra_dir(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    extra = tmp_path / "extra"
    target = extra / "input.txt"
    monkeypatch.setenv("AI_NATIVE_OS_WORKSPACE", str(workspace))
    monkeypatch.setenv("R_BRIDGE_WORKSPACE_ONLY", "1")
    monkeypatch.setenv("R_BRIDGE_WORKSPACE_ALLOW", str(extra))
    calls = _install_fake_runner(monkeypatch)

    _call(
        capsys,
        r_bridge.cmd_call,
        skill="files",
        tool="read",
        params=json.dumps({"path": str(target)}),
        confirm=False,
    )

    assert len(calls) == 1


def test_looks_like_path_returns_false_for_http_url() -> None:
    assert r_bridge._looks_like_path("http://example.com/file.txt") is False
