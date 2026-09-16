import subprocess
import sys
import os
import json
import datetime as dt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NODE_EXE = "node"
NODE_JS = os.path.join(BASE_DIR, "realmdump_v2.js")
FILENAME = dt.datetime.now().strftime("%Y%m%d_%H%M%S")

def usage():
    name = os.path.basename(sys.argv[0])
    print(f"Usage: python {name} <input.realm> [output.json]", file=sys.stderr)
    sys.exit(1)


def run_node(realm_path):
    print("call Node.js", file=sys.stderr)
    try:
        result = subprocess.run(
            [NODE_EXE, NODE_JS, realm_path],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=True,
        )
    except FileNotFoundError:
        print("Error: node was not found in PATH.", file=sys.stderr)
        return None
    except subprocess.CalledProcessError as e:
        print("Error: Node process failed.", file=sys.stderr)
        if e.stderr:
            print(e.stderr, file=sys.stderr, end="")
        return None

    if result.stderr:
        print(result.stderr, file=sys.stderr, end="")
    return result.stdout


def parse_realm(stdout):
    try:
        return json.loads(stdout)
    except (TypeError, json.JSONDecodeError) as e:
        print(f"Error: Failed to parse JSON from Node stdout. {e}", file=sys.stderr)
        return None


def write_json(data, output_path):
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except OSError as e:
        print(f"Error: Failed to write JSON. {e}", file=sys.stderr)
        return False
    print(f"Wrote {output_path}", file=sys.stderr)
    return True


def main():
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        usage()

    realm_path = os.path.abspath(sys.argv[1])
    fname = os.path.splitext(os.path.basename(realm_path))[0]
    output_path = (
        os.path.abspath(sys.argv[2])
        if len(sys.argv) == 3
        else os.path.join(BASE_DIR, f"{fname}_{FILENAME}.json")
    )

    if not os.path.isfile(realm_path):
        print(f"Error: Realm file not found: {realm_path}", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(NODE_JS):
        print(f"Error: Dump script not found: {NODE_JS}", file=sys.stderr)
        sys.exit(1)

    print(f"start reading realm: {realm_path}", file=sys.stderr)
    stdout = run_node(realm_path)
    if stdout is None:
        sys.exit(1)

    data = parse_realm(stdout)
    if data is None:
        sys.exit(1)

    if not write_json(data, output_path):
        sys.exit(1)


if __name__ == "__main__":
    main()
