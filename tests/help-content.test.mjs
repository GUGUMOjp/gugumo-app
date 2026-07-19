import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(new URL("../", import.meta.url).pathname);
const originalResolveFilename = Module._resolveFilename;

function resolveTypeScriptFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ];

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const resolved = resolveTypeScriptFile(path.join(rootDir, request.slice(2)));
    if (resolved) return resolved;
  }

  if ((request.startsWith("./") || request.startsWith("../")) && parent?.filename) {
    const resolved = resolveTypeScriptFile(path.resolve(path.dirname(parent.filename), request));
    if (resolved) return resolved;
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });

  module._compile(output.outputText, filename);
};

const {
  HELP_FAQS,
  HELP_SECTIONS,
  helpSearchText,
} = require("../src/content/help/help-content.ts");

const helpCenterSource = readFileSync(path.join(rootDir, "app/help/help-center.tsx"), "utf8");
const allSearchText = [
  ...HELP_SECTIONS.map((section) => helpSearchText(section)),
  JSON.stringify(HELP_FAQS).toLocaleLowerCase("ja-JP"),
].join("\n");

function assertUnique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  assert.deepEqual([...new Set(duplicates)], [], `${label} should not contain duplicates`);
}

test("help section and FAQ IDs are unique", () => {
  assertUnique(HELP_SECTIONS.map((section) => section.id), "section IDs");
  assertUnique(HELP_FAQS.map((faq) => faq.id), "FAQ IDs");
});

test("help FAQ count remains intentional", () => {
  assert.equal(HELP_FAQS.length, 12);
});

test("help search content covers score, CSV, and viewer permissions", () => {
  assert.match(allSearchText, /37点/);
  assert.match(allSearchText, /csv/);
  assert.match(allSearchText, /viewer/);
});

test("monthly help documents actual month-day forecasting without fixed 30-day wording", () => {
  const monthly = HELP_SECTIONS.find((section) => section.id === "monthly");
  assert.ok(monthly);

  const monthlyText = JSON.stringify(monthly);
  assert.match(monthlyText, /当月日数/);
  assert.doesNotMatch(monthlyText, /固定30日|30日換算|×\s*30日/);
});

test("help support contact follows current-user support policy", () => {
  assert.match(helpCenterSource, /mailto:support@gugumo\.jp/);
  assert.match(helpCenterSource, /support@gugumo\.jp/);
  assert.doesNotMatch(helpCenterSource, /mailto:info@gugumo\.jp/);
});

test("help content preserves public CSV limits and required headers", () => {
  assert.match(allSearchText, /物件コード/);
  assert.match(allSearchText, /物件名/);
  assert.match(allSearchText, /物件掲載/);
  assert.match(allSearchText, /6mb/);
  assert.match(allSearchText, /8mb/);
});
