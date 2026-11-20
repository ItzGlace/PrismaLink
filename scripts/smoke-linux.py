"""Run under dbus-run-session and Xvfb; verify actual WebKit content without a web service."""
import subprocess
import sys
import time
import pyatspi


def nodes(root, depth=0):
    if depth > 35:
        return
    yield root
    try:
        children = [root[i] for i in range(min(root.childCount, 1000))]
    except Exception:
        return
    for child in children:
        yield from nodes(child, depth + 1)


def wait_for(text, process):
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Application exited with {process.returncode}")
        for node in nodes(pyatspi.Registry.getDesktop(0)):
            try:
                if text in node.name:
                    return node
            except Exception:
                continue
        time.sleep(0.5)
    raise RuntimeError(f"Native accessibility tree never exposed: {text}")


process = subprocess.Popen([sys.argv[1]])
try:
    wait_for("Make yourself at home.", process)
    button = wait_for("Explore demo workspace", process)
    action = button.queryAction()
    if action.nActions < 1 or not action.doAction(0):
        raise RuntimeError("Demo navigation could not be activated")
    wait_for("Production gateway", process)
    print("Native WebKit first render and demo navigation passed.")
finally:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
