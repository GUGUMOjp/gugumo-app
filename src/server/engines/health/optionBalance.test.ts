import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOptionBalance,
} from "./optionBalance";
import {
  isOptionOn,
} from "@/src/server/services/csv";
import type {
  CsvRow,
} from "@/src/server/types/csv";

type OptionKey = "smapic" | "misepic" | "panorama" | "area" | "movie";

const prices = {
  smapic: 100,
  misepic: 10,
  panorama: 20,
  area: 5,
  movie: 30,
} satisfies Record<OptionKey, number>;

function row(
  name: string,
  options: Partial<Record<OptionKey, boolean>> = {},
  belong = 3,
): CsvRow {
  return {
    "物件掲載": "○",
    "物件名": name,
    "部屋番号": "101",
    "住戸名寄せ点数": "0",
    "所属基準値": String(belong),
    "競合物件数(合計)": "5",
    "【第3基準値】競合物件数": "1",
    "【第2基準値】競合物件数": "1",
    "【第1基準値】競合物件数": "3",
    "問い合わせ(合計)": "0",
    "合計一覧PV(合計)": "0",
    "合計詳細PV(合計)": "0",
    "物件詳細PV(一日当たり)": "0",
    "掲載日数(日)(合計)": "30",
    "スマピク掲載": options.smapic ? "○" : "",
    "店舗案内ピックアップ掲載": options.misepic ? "○" : "",
    "パノラマ掲載": options.panorama ? "○" : "",
    "得意なエリア枠掲載": options.area ? "○" : "",
    "動画掲載": options.movie ? "○" : "",
  };
}

function idFor(name: string) {
  return `${name.toLowerCase()}-101`;
}

function build(
  rows: CsvRow[],
  overrides: Partial<Parameters<typeof buildOptionBalance>[2]> = {},
  slots = 1000,
) {
  return buildOptionBalance(rows, {
    slots,
    prices,
  }, {
    removeAllRows: [],
    lowerToSecondRows: [],
    raiseToSecondRows: [],
    raiseToThirdRows: [],
    smapicAdd: [],
    smapicRemove: [],
    ...overrides,
  });
}

test("base recommended count uses listing capacity 35 percent rounded up by 50", () => {
  assert.equal(build([], {}, 100).baseRecommendedCount, 50);
  assert.equal(build([], {}, 200).baseRecommendedCount, 100);
  assert.equal(build([], {}, 500).baseRecommendedCount, 200);
  assert.equal(build([], {}, 1000).baseRecommendedCount, 350);
  assert.equal(build([], {}, 1100).baseRecommendedCount, 400);
});

test("smapic is maintained independently and non-smapic categories keep at most two by priority", () => {
  const rows = Array.from({ length: 500 }, (_, index) => row(`p${index}`, {
    smapic: true,
    misepic: true,
    panorama: true,
    movie: true,
  }));
  const result = build(rows);
  const byKey = new Map(result.cards.map((card) => [card.key, card]));

  assert.deepEqual({
    smapic: byKey.get("smapic")?.recommended,
    misepic: byKey.get("misepic")?.recommended,
    panorama: byKey.get("panorama")?.recommended,
    movie: byKey.get("movie")?.recommended,
    area: byKey.get("area")?.recommended,
  }, {
    smapic: 350,
    misepic: 350,
    panorama: 350,
    movie: 0,
    area: 0,
  });
  assert.equal(byKey.get("movie")?.waste, 500);
});

test("remove all removes only currently enabled non-smapic options", () => {
  const target = row("remove", {
    smapic: true,
    misepic: true,
    panorama: true,
    movie: true,
  });
  const result = build([target], {
    removeAllRows: [target],
  });

  assert.equal(result.optimization.removalOptimizationCount, 3);
  assert.equal(result.optimization.removalOptimizationAmount, prices.misepic + prices.panorama + prices.movie);
});

test("lower to second removes highest score, then highest price, then panorama before misepic", () => {
  const movieFirst = row("movie-first", {
    misepic: true,
    panorama: true,
    movie: true,
  });
  assert.equal(build([movieFirst], {
    lowerToSecondRows: [movieFirst],
  }).optimization.removalOptimizationAmount, prices.movie);

  const priceFirst = row("price-first", {
    misepic: true,
    panorama: true,
  });
  assert.equal(build([priceFirst], {
    lowerToSecondRows: [priceFirst],
  }, 1000).optimization.removalOptimizationAmount, prices.panorama);

  const equalPriceResult = buildOptionBalance([priceFirst], {
    slots: 1000,
    prices: {
      ...prices,
      misepic: prices.panorama,
    },
  }, {
    removeAllRows: [],
    lowerToSecondRows: [priceFirst],
    raiseToSecondRows: [],
    raiseToThirdRows: [],
    smapicAdd: [],
    smapicRemove: [],
  });
  assert.equal(equalPriceResult.optimization.removalOptimizationAmount, prices.panorama);
});

test("option marker is enabled only when normalized value is circle", () => {
  assert.equal(isOptionOn("○"), true);
  assert.equal(isOptionOn(" ○ "), true);
  assert.equal(isOptionOn(""), false);
  assert.equal(isOptionOn("×"), false);
  assert.equal(isOptionOn("なし"), false);
  assert.equal(isOptionOn("-"), false);
  assert.equal(isOptionOn(null), false);
  assert.equal(isOptionOn(undefined), false);
});

test("additions use required score from current belonging score and choose the best option combination", () => {
  const addTarget = row("add-target", {}, 1);
  const alreadyFull = row("already-full", {
    misepic: true,
    panorama: true,
    area: true,
    movie: true,
  }, 1);
  const result = build([addTarget, alreadyFull], {
    raiseToSecondRows: [addTarget, alreadyFull],
  });

  assert.equal(result.optimization.additionOptimizationCount, 1);
  assert.equal(result.optimization.additionOptimizationAmount, prices.area);
});

test("addition combinations prefer enough score, minimum excess, minimum price, priority, then option count", () => {
  const addTarget = row("combination", {
    movie: true,
  }, 1);
  const result = build([addTarget], {
    raiseToThirdRows: [addTarget],
  });

  assert.equal(result.optimization.additionOptimizationCount, 1);
  assert.equal(result.optimization.additionOptimizationAmount, prices.area);

  const equalPriceTarget = row("equal-price", {}, 0);
  const equalPriceResult = buildOptionBalance([equalPriceTarget], {
    slots: 1000,
    prices: {
      ...prices,
      misepic: prices.panorama,
    },
  }, {
    removeAllRows: [],
    lowerToSecondRows: [],
    raiseToSecondRows: [],
    raiseToThirdRows: [equalPriceTarget],
    smapicAdd: [],
    smapicRemove: [],
  });

  assert.equal(equalPriceResult.optimization.additionOptimizationAmount, prices.panorama);
});

test("smapic optimization respects current CSV state", () => {
  const addTarget = row("smapic-add");
  const removeTarget = row("smapic-remove", {
    smapic: true,
  });
  const result = build([addTarget, removeTarget], {
    smapicAdd: [{ id: idFor("smapic-add"), currentSmapic: false }],
    smapicRemove: [{ id: idFor("smapic-remove"), currentSmapic: true }],
  });

  assert.equal(result.optimization.additionOptimizationAmount, prices.smapic);
  assert.equal(result.optimization.removalOptimizationAmount, prices.smapic);
});

test("same property option is not counted twice and conflicts are diagnosed", () => {
  const target = row("duplicate", {
    smapic: true,
    movie: true,
  });
  const result = build([target], {
    removeAllRows: [target],
    lowerToSecondRows: [target],
    smapicAdd: [{ id: idFor("duplicate"), currentSmapic: false }],
    smapicRemove: [{ id: idFor("duplicate"), currentSmapic: true }],
  });

  assert.equal(result.optimization.removalOptimizationCount, 2);
  assert.equal(result.optimization.additionOptimizationCount, 0);
  assert.equal(result.optimization.conflictCount, 1);
  assert.equal(result.optimization.conflictsByOption.smapic, 1);
  assert.equal(
    result.optimization.replacementOptimizationAmount,
    result.optimization.removalOptimizationAmount + result.optimization.additionOptimizationAmount,
  );
  assert.equal(
    result.optimization.totalImprovementAmount,
    result.optimization.capacitySavingsAmount + result.optimization.replacementOptimizationAmount,
  );
});
