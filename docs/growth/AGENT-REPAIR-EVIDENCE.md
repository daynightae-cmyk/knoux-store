# KNOuX Agent — Phase 2 Repair Mutation Journal

Every change made outside git, with hashes, so any of it can be reversed or
audited. `D:\KNOUX_Agent` is not a git repository, which is exactly why this file
exists.

---

## Environment

| | |
|---|---|
| Target | `D:\KNOUX_Agent` (NOT a git repo) |
| Real Python | `C:\Program Files\Python312\python.exe` — 3.12.10 |
| Backup root | `D:\KNOUX_Agent\_repair_backup\20261005-031000` |
| Repair stamp | `20261005-031000` |
| Applied by | Phase 2, on branch `feature/knoux-growth-command-center` |

---

## M1 — `agent.py`, D1 interpreter discovery

| | |
|---|---|
| File | `D:\KNOUX_Agent\agent.py` |
| Old SHA256 | `CEBE435F042ABDE2F26E38ABE95D25BEF3A7DA5C83272E84582824E505CB1C37` |
| Backup | `_repair_backup\20261005-031000\agent.py` (byte-identical, verified) |
| Reason | `CLOUDSDK_PYTHON` defaulted to `C:\Users\k7\AppData\Local\Programs\Python\Python313\python.exe`, which does not exist. Local MCP impersonation failed on every attempt. |
| Change | Replaced the hardcoded default with ordered discovery: `$CLOUDSDK_PYTHON`, then `C:\Program Files\Python312\python.exe`, then `sys.executable`. Removes the *class* of bug rather than the instance. Added `import sys`. |
| Test | Dead path form absent; `import sys` present; `py_compile` exit 0 |
| Rollback | `Copy-Item _repair_backup\20261005-031000\agent.py D:\KNOUX_Agent\agent.py -Force` |

## M2 — `agent.py`, D2 knowledge GCS fallback

| | |
|---|---|
| File | `D:\KNOUX_Agent\agent.py` (same file, same backup) |
| Reason | `if _KNOWLEDGE_LOCAL_ROOT.is_dir(): return None, "unavailable:local-missing"` made the local miss terminal, so the configured GCS source was never consulted. |
| Change | Removed the early return. A local miss now falls through to the GCS blob. If GCS also fails, *that* resource alone is marked unavailable. |
| Test | Real authenticated GCS read is now attempted — see M5 evidence |
| Rollback | Same as M1 |

## M3 — `requirements.txt`, D11 missing `mcp`

| | |
|---|---|
| File | `D:\KNOUX_Agent\requirements.txt` |
| Reason | **New defect found in Phase 2.** A real `import agent` failed with `ModuleNotFoundError: No module named 'mcp'`. `google-adk` loads the MCP toolset at module import but does not declare `mcp` as a hard dependency, so a clean install of the declared requirements cannot import the agent. |
| Change | Appended `mcp>=1.0.0` with a comment explaining why it is required. |
| Test | `import agent` → `IMPORT: PASS` |
| Rollback | Remove the appended lines |
| New SHA256 | `5B7FC09EF86A3DD803667D60BE9DA2B50533790264CAE2ED75144866A52EB31F` |

## M4 — new virtual environment `.venv-p312`

| | |
|---|---|
| Action | Created `D:\KNOUX_Agent\.venv-p312` from `C:\Program Files\Python312\python.exe` |
| Reason | **Both existing virtualenvs are dead.** See the table below. |
| Old envs | **NOT deleted**, per the brief. Both retained for rollback. |
| Test | `--version` → 3.12.10; `google.adk` imports; `import agent` passes |
| Rollback | `Remove-Item -Recurse D:\KNOUX_Agent\.venv-p312`. Nothing else depends on it. |

### Why both old venvs were unusable

| venv | `pyvenv.cfg` home | Exists? |
|---|---|---|
| `.venv` | `C:\Users\day night\AppData\Local\Programs\Python\Python312` | **No** — another user's profile |
| `.venv-k7` | `C:\Users\k7\AppData\Local\Programs\Python\Python313` | **No** — the same dead Python313 path D1 was about |

`.venv-k7` is the important one: the Python313 path D1 fixed in `agent.py` was
**also baked into the virtualenv**, so fixing `agent.py` alone would not have made
anything runnable. Neither venv can execute, which is also why the documented
proof command in `e2e_gateway_status_proof.py`
(`D:\KNOUX_Agent\.venv\Scripts\python.exe ...`) could not have worked.

## M5 — knowledge root, D2 completion

| | |
|---|---|
| Files created | `D:\KNOUX-Agent-Knowledge\06-Tool-Execution-Contract.md`, `07-Live-Diagnostics-Contract.md` |
| Reason | M2 proved the GCS fallback runs. A real authenticated read then returned **404 No such object** for both, so the artifacts exist in neither configured location. Their content does exist in `D:\KNOUX-AI-FINAL-PACK` under different filenames. |
| Source | `06-KNOUX-Tool-Execution-Contract.txt` sha `57F3C1014E4B2820…`<br>`07-KNOUX-Live-Diagnostics-and-Verification.txt` sha `6084FA5D4F6825E6…` |
| Change | Copied verbatim under the names `_KNOWLEDGE_RESOURCES` declares, each prefixed with a provenance header. **No wording altered.** |
| Test | 9/9 artifacts resolve locally; 0 unavailable |
| Rollback | `Remove-Item` the two files |

---

## Post-repair state

### Gates

| Gate | Command | Result |
|---|---|---|
| Compile | `python -m py_compile agent.py` | **PASS**, exit 0 |
| Real import | `import agent` | **PASS** |
| Root agent present | `agent.root_agent.name` | `KNOUX_Repair_Forensic_Assistant` |
| Model class | `type(root_agent.model).__name__` | `GlobalGemini` — preserved |
| Knowledge resources | `len(_KNOWLEDGE_RESOURCES)` | 9 declared, **9 resolve, 0 unavailable** |
| MCP client imports | `google.adk.tools.mcp_tool…` | imports after `mcp` installed |

### Repair capability preserved

`root_agent.name` is still `KNOUX_Repair_Forensic_Assistant`, the model class is
still `GlobalGemini`, the MCP toolset wiring is untouched, and `sub_agents` is
still empty (0) — **no Growth sub-agent has been added**. Growth intelligence was
*not* deployed, because `knoux-agent-growth.patch` requires the MCP gateway to
publish tools first and deploying it against the current tool surface would give
the model an empty tool list.

### Post-repair hash

`agent.py` new SHA256 recorded in `PHASE-2-MORNING-REVIEW.md`.

---

## What was NOT done

| Item | Why |
|---|---|
| Growth sub-agents | `knoux-agent-growth.patch` written but **not applied**. It must land after the gateway publishes tools. |
| `tool_filter` widened | Widening it against a gateway that does not publish the tools would yield an empty tool list. |
| Old venvs deleted | The brief says not to delete until a replacement is verified. The replacement is verified; the old ones are still there for rollback. |
| Any cloud mutation | None. No Agent Engine update was attempted. |
| `D3` import-time ADC | **Not repaired.** `google.auth.default()` still runs at import. It now works because a valid venv exists, but it remains a fragility. Deliberately left: repairing it changes module-init ordering, which is a larger change than this phase's evidence justifies. |
| `D6` mojibake, `D7` shell=True | **Not repaired.** Both are in the prepared patch. Neither blocks execution, and each edit carries its own risk. D6 is cosmetic-but-real; D7 is latent. |