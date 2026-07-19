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
  buildMonthly,
  buildWeekly,
} = require("../src/server/services/analysis/summary.ts");

function day(dateKey, listPV, detailPV = 0, inquiry = 0) {
  const date = new Date(`${dateKey}T00:00:00`);

  return {
    date,
    dateKey,
    dateLabel: dateKey,
    listPV,
    detailPV,
    inquiry,
    avgCompetition: 0,
    listedCount: 0,
    propertyDiffs: [],
  };
}

function latestMonthlyForecast(dateKey, listPV) {
  const summaries = buildMonthly([day(dateKey, listPV)]);
  assert.equal(summaries.length, 1);
  return summaries[0];
}

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} should equal ${expected}`);
}

test("monthly forecast uses actual calendar days for 28, 29, 30, and 31 day months", () => {
  assert.equal(latestMonthlyForecast("2025-02-10", 1000).forecast?.listPV, 2800);
  assert.equal(latestMonthlyForecast("2024-02-10", 1000).forecast?.listPV, 2900);
  assert.equal(latestMonthlyForecast("2026-04-10", 1000).forecast?.listPV, 3000);
  assert.equal(latestMonthlyForecast("2026-07-10", 1000).forecast?.listPV, 3100);
});

test("monthly forecast includes the latest data date in elapsed calendar days", () => {
  const summary = latestMonthlyForecast("2026-07-01", 100);

  assert.equal(summary.elapsedDays, 1);
  assert.equal(summary.totalDays, 31);
  assert.equal(summary.forecast?.listPV, 3100);
});

test("monthly forecast is omitted after period completion and actual remains unchanged", () => {
  for (const [dateKey, totalDays] of [
    ["2025-02-28", 28],
    ["2024-02-29", 29],
    ["2026-04-30", 30],
    ["2026-07-31", 31],
  ]) {
    const summary = latestMonthlyForecast(dateKey, 1000);

    assert.equal(summary.isComplete, true);
    assert.equal(summary.elapsedDays, totalDays);
    assert.equal(summary.totalDays, totalDays);
    assert.equal(summary.listPV, 1000);
    assert.equal(summary.forecast, undefined);
  }
});

test("monthly forecast keeps zero cumulative values at zero", () => {
  assert.equal(latestMonthlyForecast("2026-04-10", 0).forecast?.listPV, 0);
});

test("monthly summaries do not mix previous month data into the target month forecast", () => {
  const summaries = buildMonthly([
    day("2026-01-31", 9999),
    day("2026-02-10", 1000),
  ]);
  const february = summaries.find((summary) => summary.key === "2026-02");

  assert.ok(february);
  assert.equal(february.listPV, 1000);
  assert.equal(february.elapsedDays, 10);
  assert.equal(february.totalDays, 28);
  assert.equal(february.forecast?.listPV, 2800);
});

test("weekly forecast uses elapsed calendar days over the seven day target period", () => {
  const summaries = buildWeekly([day("2026-07-04", 700)]);
  assert.equal(summaries.length, 1);

  const week = summaries[0];
  assert.equal(week.elapsedDays, 3);
  assert.equal(week.totalDays, 7);
  assertClose(week.forecast?.listPV, 700 / 3 * 7);
});
