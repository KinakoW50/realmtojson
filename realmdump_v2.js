#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const Realm = require("realm");

if (process.argv.length !== 3) {
  const name = path.basename(process.argv[1]);
  console.error(`Usage: ${name} <input.realm>`);
  console.error(`Realm Contents -> Stdout`);
  process.exit(1);
}

const inputRealm = process.argv[2];
if (!fs.existsSync(inputRealm)) {
  console.error(`Input file not found: ${inputRealm}`);
  process.exit(1);
}

const PRIMS = new Set([
  "bool", "int", "float", "double", "string", "date", "data",
  "decimal128", "objectId", "uuid", "mixed",
]);

const prim = (v) => {
  if (v == null || typeof v !== "object") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v.toHexString === "function") return v.toHexString();
  return v.constructor?.name === "UUID" ? String(v) : v;
};

const parse = (spec) => {
  if (typeof spec === "string") {
    const t = spec.endsWith("?") ? spec.slice(0, -1) : spec;
    if (t.endsWith("[]")) {
      const inner = t.slice(0, -2);
      return PRIMS.has(inner) ? ["lp"] : ["lo", inner];
    }
    return PRIMS.has(t) ? ["p"] : ["o", t];
  }
  const { type: t, objectType: inner } = spec;
  if (t === "list" || t === "set" || t === "linkingObjects") {
    return PRIMS.has(inner) ? ["lp"] : ["lo", inner];
  }
  return t === "object" ? ["o", inner] : ["p"];
};

try {
  const realm = new Realm({ path: inputRealm });
  const pkOf = Object.fromEntries(realm.schema.map((s) => [s.name, s.primaryKey]));
  const link = (v, cls) => {
    if (!v) return null;
    const pk = pkOf[cls];
    return pk ? prim(v[pk]) : null;
  };

  const result = {};
  for (const schema of realm.schema) {
    console.error(`Dumping: ${schema.name}`);
    const fields = Object.entries(schema.properties).map(([k, spec]) => {
      const [kind, cls] = parse(spec);
      if (kind === "o") return (o, out) => { out[k] = link(o[k], cls); };
      if (kind === "lo" || kind === "lp") {
        const item = kind === "lo" ? (x) => link(x, cls) : prim;
        return (o, out) => {
          const list = o[k];
          const n = list ? list.length : 0;
          const a = new Array(n);
          for (let i = 0; i < n; i++) a[i] = item(list[i]);
          out[k] = a;
        };
      }
      return (o, out) => { out[k] = prim(o[k]); };
    });

    const rows = realm.objects(schema.name);
    const n = rows.length;
    const arr = new Array(n);
    for (let i = 0; i < n; i++) {
      const out = {};
      const row = rows[i];
      for (let j = 0; j < fields.length; j++) fields[j](row, out);
      arr[i] = out;
    }
    result[schema.name] = arr;
  }

  process.stdout.write(JSON.stringify(result));
  console.error("Dump completed (stdout)");
  realm.close();
  process.exit(0);
} catch (err) {
  console.error("Failed to dump realm:");
  console.error(err.message);
  process.exit(1);
}
