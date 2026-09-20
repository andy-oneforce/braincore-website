"""a11y_audit.py — axe-core accessibility scan of the built site over real Chrome (CDP).

[[260908-015-activity]] R01, step 8.1 of [[260907-009-gitbook-website-build-recommendation]] §6.
Serves `../data/asios/dist` on a free local port, drives a debug Chrome via
`APP/browser/code/browser_session.py` + `SYSTEM/APP/code/browser-use/code/costar_cdp.py`'s `CDP`
class, injects the built `axe-core` (npm devDependency, `node_modules/axe-core/axe.min.js`) into
each page and runs `axe.run()`, once in light theme and once with `data-theme="dark"` set on
`<html>` (the mechanism `src/scripts/theme.js` itself uses).

Usage: python3 a11y_audit.py <route> [<route> ...]   (routes relative to dist/, e.g. /docs/guide/style-guide.html)
Prints one JSON object per route+theme: {route, theme, violations: [{id, impact, help, count, selectors}, ...]}.
"""
import asyncio
import http.server
import json
import socket
import sys
import threading
from pathlib import Path

CODE_DIR = Path(__file__).resolve().parent
DIST_DIR = CODE_DIR.parent / "data" / "asios" / "dist"
AXE_MIN_JS = CODE_DIR / "node_modules" / "axe-core" / "axe.min.js"

sys.path.insert(0, str(CODE_DIR.parents[2] / "APP" / "browser" / "code"))
sys.path.insert(0, str(CODE_DIR.parents[2] / "SYSTEM" / "APP" / "code" / "browser-use" / "code"))
from browser_session import ensure_browser, open_new_tab  # noqa: E402
import websockets  # noqa: E402
from costar_cdp import CDP  # noqa: E402

CHROME_PORT = 9333
CHROME_PROFILE = "~/.asios-a11y-audit-chrome-debug"


def free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve(port):
    handler = lambda *a, **kw: http.server.SimpleHTTPRequestHandler(*a, directory=str(DIST_DIR), **kw)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd


async def scan_route(port, route, theme="light"):
    url = f"http://localhost:{port}{route}"
    ws_url = open_new_tab(CHROME_PORT, url)
    async with websockets.connect(ws_url, max_size=None) as ws:
        cdp = CDP(ws)
        await cdp.send("Page.enable")
        await cdp.send("Page.navigate", {"url": url})
        await asyncio.sleep(1.5)
        # Force the theme explicitly rather than relying on the no-override default, which
        # follows this machine's OS `prefers-color-scheme` (dark here) and would silently
        # re-test dark twice under the "light" label.
        await cdp.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}')")
        axe_src = AXE_MIN_JS.read_text()
        await cdp.evaluate(axe_src)
        result = await cdp.evaluate(
            "(async () => { const r = await axe.run(); "
            "return r.violations.map(v => ({id: v.id, impact: v.impact, "
            "help: v.help, count: v.nodes.length, "
            "selectors: v.nodes.map(n => n.target.join(' ')).slice(0, 5)})); })()"
        )
        return {"route": route, "theme": theme, "violations": result}


async def main(routes):
    port = free_port()
    httpd = serve(port)
    ensure_browser(CHROME_PORT, CHROME_PROFILE, label="a11y-audit")
    try:
        results = []
        for route in routes:
            for theme in ("light", "dark"):
                results.append(await scan_route(port, route, theme))
        print(json.dumps(results, indent=2))
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    routes = sys.argv[1:] or ["/index.html"]
    asyncio.run(main(routes))
