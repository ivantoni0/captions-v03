import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", "releases", "node_modules", ".venv", "__pycache__"]);
const blockedNames = new Set([".env", ".DS_Store"]);
const allowedMediaPrefix = `panel${path.sep}CaptionsV03${path.sep}mogrts${path.sep}`;
const blockedMediaExtensions = new Set([".mp3", ".m4a", ".wav", ".srt", ".vtt"]);
const secretPattern =
  /(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|[0-9]{8,10}:[A-Za-z0-9_-]{35}|sk-[A-Za-z0-9_-]{20,}|BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY)/;

const problems = [];

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(root, full);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      if (!ignoredDirs.has(entry)) {
        walk(full);
      }
      continue;
    }

    const ext = path.extname(entry).toLowerCase();
    if (blockedNames.has(entry) || blockedMediaExtensions.has(ext)) {
      problems.push(`Blocked file: ${rel}`);
      continue;
    }

    if ((ext === ".mp4" || ext === ".mov") && !rel.startsWith(allowedMediaPrefix)) {
      problems.push(`Unexpected media file: ${rel}`);
      continue;
    }

    if (stat.size > 50_000_000) {
      problems.push(`Large file: ${rel}`);
      continue;
    }

    if (["", ".go", ".js", ".jsx", ".mjs", ".json", ".md", ".html", ".css", ".xml", ".sh", ".command", ".py"].includes(ext)) {
      const content = readFileSync(full, "utf8");
      if (secretPattern.test(content)) {
        problems.push(`Possible secret: ${rel}`);
      }
    }
  }
};

walk(root);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log("Public-ready check passed.");
