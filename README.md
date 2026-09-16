# realm -> json
<img width="2818" height="1688" alt="Top" src="https://github.com/user-attachments/assets/5e0bfb6c-c22f-444f-9a9b-4758a80847e2" />
Convert a Realm database into JSON.

This Python CLI exists because Realm Studio exports were unreliable here (array handling in particular). It runs `realmdump_v2.js` via Node and writes the stdout JSON to a file.

The output is one JSON **object**: keys are class (table) names, values are arrays of rows. Related objects are stored as primary keys, not nested documents.

## Requirements

- Python 3.10+
- Node.js 18+
- npm (ships with Node)

Python uses the standard library only. `pip install` is not required.

## Setup

```bash
npm install
```

This installs `realm` from `package.json`. `node_modules/` is not in the repository.

## Usage

```bash
python realmtojson.py <input.realm>
python realmtojson.py <input.realm> <output.json>
```

If the output path is omitted, the file is written next to this script as:

```text
<realm-name>_<YYYYMMDD_HHMMSS>.json
```

Example: `default.realm` → `default_20260916_092338.json`

## Notes

- Encrypted Realm files are not supported.
- Do not commit `.realm` files or dump JSON; they are application data.
