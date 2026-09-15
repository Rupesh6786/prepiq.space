// Deterministic extraction of the MAH MCA CET 2025 paper text into question blocks.
// Produces scripts/pyq-2025.raw.json for manual answer keying.
import fs from "node:fs";

const raw = fs
  .readFileSync(process.argv[2] ?? "/tmp/pyq.txt", "utf8")
  .replace(/\(https?:\/\/[^)]*\)/g, " ")
  .replace(/MAH CET MCA[^\n]*/g, "")
  .replace(/view=(year|sub|topic)[^\n]*/g, "")
  .replace(/Go to Discussion/g, "")
  .replace(/Aspire[^\n]*/g, "");

const parts = raw.split(/\n\s*Qus\s*:?\s*(\d+)\s*\n/).slice(1);
const blocks = [];
for (let i = 0; i < parts.length; i += 2) {
  const n = Number(parts[i]);
  const body = (parts[i + 1] ?? "")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim() !== "")
    .join("\n");
  if (!blocks.some((b) => b.n === n)) blocks.push({ n, body });
}
fs.writeFileSync("scripts/pyq-2025.raw.json", JSON.stringify(blocks, null, 1));
console.log("blocks", blocks.length);
