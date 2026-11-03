"""Run unchanged Git-pinned pre-Final modules in installed Chrome, without mocks.

Only writes ignored scratch/output. No dependency installation or production edits.
"""
import hashlib
import json
import argparse
import mimetypes
import os
from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
PIN = "5c39dd7bdbb7f2f63a686823b72bdb81909d52af"
SCRATCH = ROOT / ".local-test-tmp/xml229-prefinal-repro-20261102"
OUTPUT = ROOT / "output/playwright/xml229-prefinal-repro-20261102"
ENTRY = "tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs"
ENTRIES = [ENTRY]
HARNESS = Path(__file__).with_name("xml229-prefinal-repro-20261102.mjs")
FIXTURE = ROOT / "Benchmarks/EF-05-PRO.TEST.xml"
CHROME = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
IMPORT = re.compile(r'''(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]''')


def git_blob(path):
    return subprocess.check_output(["git", "show", f"{PIN}:{path}"], cwd=ROOT)


def export_source():
    pending, records = list(ENTRIES), {}
    while pending:
        path = pending.pop()
        if path in records:
            continue
        raw = git_blob(path)
        records[path] = {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
        dest = SCRATCH / "source" / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(raw)
        for relative in IMPORT.findall(raw.decode("utf-8-sig")):
            if relative.startswith("."):
                dependency = posixpath.normpath(str(PurePosixPath(path).parent / relative.split("?")[0]))
                if dependency.startswith("../"):
                    raise ValueError("Module escapes pinned source")
                pending.append(dependency)
    return records


INDEX = b'''<!doctype html><meta charset="utf-8"><title>XML229 boundary reproduction</title>
<pre id="result">PENDING</pre><script type="module">
import {runReproduction} from '/harness.mjs';
try { document.querySelector('#result').textContent=JSON.stringify(await runReproduction()); }
catch(error) { document.querySelector('#result').textContent=JSON.stringify({fatal:error.message,stack:error.stack}); }
</script>'''


class Handler(BaseHTTPRequestHandler):
    requests = []

    def do_GET(self):
        route = unquote(urlsplit(self.path).path)
        self.requests.append(route)
        fixed = {"/": (INDEX, "text/html"), "/harness.mjs": (HARNESS.read_bytes(), "text/javascript"),
                 "/fixture.xml": (FIXTURE.read_bytes(), "application/xml")}
        if route in fixed:
            raw, content_type = fixed[route]
        elif route.startswith("/source/"):
            base = (SCRATCH / "source").resolve()
            target = (base / route.removeprefix("/source/")).resolve()
            if not target.is_relative_to(base) or not target.is_file():
                self.send_error(404)
                return
            raw = target.read_bytes()
            content_type = "text/javascript" if target.suffix in [".js", ".mjs"] else mimetypes.guess_type(target)[0]
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *_args):
        pass


def run_browser(port):
    args = [str(CHROME), "--headless", "--dump-dom", "--no-first-run", "--no-default-browser-check",
            "--disable-background-networking", "--virtual-time-budget=15000",
            f"--user-data-dir={SCRATCH / 'chrome-profile'}", f"http://127.0.0.1:{port}/"]
    return subprocess.run(args, capture_output=True, timeout=50,
                          creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)


def main():
    SCRATCH.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = export_source()
    fixture_raw = FIXTURE.read_bytes()
    expected_raw = git_blob("Benchmarks/EF-05-PRO.TEST.xml")
    if fixture_raw != expected_raw:
        raise ValueError("Original benchmark bytes differ from pinned Git blob")
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        browser = run_browser(server.server_port)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    (OUTPUT / "browser-dom.html").write_bytes(browser.stdout)
    (OUTPUT / "browser-stderr.txt").write_bytes(browser.stderr)
    import html
    match = re.search(r'<pre id="result">(.*?)</pre>', browser.stdout.decode("utf-8"), re.S)
    result = json.loads(html.unescape(match.group(1))) if match else {"fatal": "No result DOM", "exit": browser.returncode}
    result["provenance"] = {"candidate": PIN, "fixtureSha256": hashlib.sha256(fixture_raw).hexdigest(),
                            "sourceModules": source, "requests": Handler.requests,
                            "harnessSha256": hashlib.sha256(HARNESS.read_bytes()).hexdigest(),
                            "chromeExecutable": str(CHROME), "browserExit": browser.returncode}
    (OUTPUT / "result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT / "result.json"), "fatal": result.get("fatal"),
                      "cases": [{k: c.get(k) for k in ["id", "status", "actualMemberCount", "error"]}
                                for c in result.get("cases", [])]}))
    if result.get("fatal"):
        raise SystemExit(2)


def configure():
    global HARNESS, ENTRIES, SCRATCH, OUTPUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--harness", type=Path)
    parser.add_argument("--entry", action="append")
    parser.add_argument("--name", default="xml229-prefinal-repro-20261102")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9-]+", args.name):
        parser.error("Output name must use lowercase letters, digits and hyphens")
    if args.harness:
        HARNESS = (ROOT / args.harness).resolve()
        if not HARNESS.is_relative_to(ROOT) or not HARNESS.is_file():
            parser.error("Harness must be an existing repository file")
    if args.entry:
        ENTRIES = args.entry
    if any(PurePosixPath(p).is_absolute() or ".." in PurePosixPath(p).parts for p in ENTRIES):
        parser.error("Source entries must be repository-relative Git paths")
    SCRATCH = ROOT / ".local-test-tmp" / args.name
    OUTPUT = ROOT / "output/playwright" / args.name


if __name__ == "__main__":
    configure()
    main()
