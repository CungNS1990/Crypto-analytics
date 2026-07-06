import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import uvicorn

DEFAULT_PORT = 8002
PORT_RANGE = range(DEFAULT_PORT, DEFAULT_PORT + 8)


def is_port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


def stop_port(port: int) -> None:
    script = Path(__file__).parent / "scripts" / "stop_port.py"
    subprocess.run([sys.executable, str(script), str(port)], check=False)
    time.sleep(1)


def sync_frontend_env(port: int) -> None:
    env_file = Path(__file__).parent.parent / "frontend" / ".env.local"
    env_file.write_text(f"NEXT_PUBLIC_API_URL=http://localhost:{port}\n", encoding="utf-8")


def resolve_port() -> int:
    preferred = int(os.getenv("PORT", str(DEFAULT_PORT)))

    if not is_port_free(preferred):
        print(f"Port {preferred} busy — stopping old backend...")
        stop_port(preferred)

    if is_port_free(preferred):
        return preferred

    for port in PORT_RANGE:
        if port != preferred and is_port_free(port):
            print(f"Port {preferred} still busy — using port {port}")
            return port

    print(f"ERROR: No free port in {DEFAULT_PORT}-{DEFAULT_PORT + 7}")
    print("Close other backend terminals or kill python.exe in Task Manager.")
    sys.exit(1)


if __name__ == "__main__":
    port = resolve_port()
    sync_frontend_env(port)
    print(f"\n  Backend API: http://localhost:{port}")
    print(f"  API docs:    http://localhost:{port}/docs")
    print(f"  Frontend:    restart npm run fe if port changed\n")

    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
