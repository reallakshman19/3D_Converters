# Fresh Runner B — offline execution instructions

1. A trusted controller obtains this snapshot **by immutable commit/archive identifier**, validates all files with `python3 verify_package.py`, and copies only the extracted package into a fresh isolated environment. Do not mount Git repository history or package-preparation logs.
2. Instantiate a genuinely new Runner B model session, with no prior Agent A conversations, memory retrieval, implementation evidence, old tool context, or contaminated system prompt. The controller must attest to that session isolation; a textual promise is insufficient.
3. Disable the GitHub connector and ALL web/network tools for Runner B. Deny outbound network at the runtime layer (`--network none` in an appropriately confined container or equivalent egress firewall). Disable shell commands that can access host secrets/sockets. Make the extracted package read-only; no production credentials or git remote are mounted.
4. Give the model read access ONLY to package files. It may use local computation for fixture/source verification. Prevent reading anything outside the package, including local copies of current repositories, private storage, PRs or Stage 2.
5. Runner B writes a *local draft* `STAGE1_RUNNER_B_RESPONSE.md` into a distinct controller-owned scratch/output surface, not into the package or a live repository. Only the trusted controller may publish that single response to `Common/relay/AGENT_A_LFJ_20261009/STAGE1_RUNNER_B_RESPONSE.md` **after** separately checking authorization, output structure, and allowed scope. No other repo or branch writes are granted.
6. On publication, the controller reads the exact newly committed response back, verifies the independent-plan-region SHA-256 and the Git blob SHA, and records Stage 1 status. Stop: Stage 2 access and promotion require separate authorization.
7. Fail closed: if prior Agent A exposure or inadequate technical read isolation is detected, report `STAGE1_CONTAMINATED` or `STAGE1_ISOLATION_NOT_ENFORCED`, do not claim `STAGE1_PLAN_FROZEN`.

Example container restriction for a **local read-only source reader**, not a complete LLM security boundary:

```sh
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --mount type=bind,src="$PWD/package",dst=/stage1,readonly \
  --tmpfs /tmp:rw,nosuid,noexec,size=64m \
  trusted-runner-image@sha256:PINNED_IMAGE_DIGEST \
  python3 /stage1/verify_package.py
```

A pinned offline image must already be present and independently audited. The placeholder image digest must be replaced by the controller. The controller must ensure the model itself runs behind the same effective read/network/tool restrictions.
