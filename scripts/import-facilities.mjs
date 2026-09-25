// Bulk-import VERIFIED blood banks / hospitals into Firestore (marked verified: true).
// Usage:
//   cd scripts && npm install
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json   (Console > Project settings > Service accounts)
//   node import-facilities.mjs my-facilities.json
// Only import numbers you have personally confirmed. Entries whose name starts with "EXAMPLE" are rejected.
import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const file = process.argv[2];
if (!file) { console.error("Usage: node import-facilities.mjs <file.json>"); process.exit(1); }
initializeApp({ credential: applicationDefault(), projectId: "roktosetu-17f6d" });
const db = getFirestore();
const TYPES = ["Blood Bank", "Hospital", "Voluntary Org"];
const list = JSON.parse(readFileSync(file, "utf8"));
let ok = 0;
for (const f of list) {
  if (!f.name || /^EXAMPLE/i.test(f.name) || !TYPES.includes(f.type) || !f.d || !f.ph) { console.warn("Skipped:", f.name || "(no name)"); continue; }
  const doc = { name: f.name, type: f.type, d: f.d, addr: f.addr || "", ph: String(f.ph), h24: !!f.h24, hours: f.hours || "", verified: true, uid: "import", t: FieldValue.serverTimestamp() };
  if (typeof f.lat === "number" && typeof f.lng === "number") { doc.lat = f.lat; doc.lng = f.lng; }
  await db.collection("facilities").add(doc); ok++;
}
console.log(`Imported ${ok} of ${list.length}`);
