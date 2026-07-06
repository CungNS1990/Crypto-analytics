"""Kill process listening on a given port (Windows/Linux)."""
import subprocess
import sys
import time


def kill_port(port: str) -> None:
    if sys.platform == "win32":
        for _ in range(3):
            out = subprocess.check_output(["netstat", "-ano"], text=True, errors="replace")
            pids: set[str] = set()
            for line in out.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    if parts:
                        pids.add(parts[-1])
            if not pids:
                print(f"Port {port} is free")
                return
            for pid in pids:
                if pid.isdigit() and pid != "0":
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", pid],
                        check=False,
                        capture_output=True,
                    )
                    print(f"Stopped process tree {pid} on port {port}")
            time.sleep(0.5)
        print(f"Warning: port {port} may still be in use. Close other backend terminals.")
    else:
        subprocess.run(["fuser", "-k", f"{port}/tcp"], check=False)
        print(f"Stopped processes on port {port}")


if __name__ == "__main__":
    kill_port(sys.argv[1] if len(sys.argv) > 1 else "8002")
