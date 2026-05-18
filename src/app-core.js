import { defaultAverageTimes } from "./average-times.js";

const MEMO_STORAGE_KEY = "keiba-review-memos-v1";
const RACE_STORAGE_KEY = "keiba-race-cards-v1";
const HORSE_RECORDS_STORAGE_KEY = "keiba-horse-records-v1";
const AVERAGE_TIMES_STORAGE_KEY = "keiba-average-times-v1";
const BROKEN_WEEKLY_RACES_KEY = "keiba-broken-weekly-races-v1";
const BROKEN_RACE_ENTRIES_KEY = "keiba-broken-race-entries-v1";
const BROKEN_RACE_RESULTS_KEY = "keiba-broken-race-results-v1";
const FORCE_HOME_STORAGE_KEY = "keiba-force-home-v1";
const WEEKLY_RACES_COMPAT_KEY = "weeklyRaces";
const RACE_ENTRIES_COMPAT_KEY = "raceEntries";
const LAST_RACE_SAVE_DEBUG_KEY = "keiba-last-race-save-debug-v1";
const REGISTERED_RACE_LIST_ERROR_KEY = "keiba-registered-race-list-error-v1";
const PACE_NOTES_STORAGE_KEY = "keiba-pace-prediction-notes-v1";
const FACTOR_NOTES_STORAGE_KEY = "keiba-prediction-factor-notes-v1";
const TRACK_BIAS_NOTES_STORAGE_KEY = "keiba-track-bias-v1";
const BACKUP_VERSION = 1;
const STORAGE_ALIASES = {
  horseNotes: MEMO_STORAGE_KEY,
  horseRecords: HORSE_RECORDS_STORAGE_KEY,
  pacePredictionNotes: PACE_NOTES_STORAGE_KEY,
  predictionFactorNotes: FACTOR_NOTES_STORAGE_KEY,
  trackBiasNotes: TRACK_BIAS_NOTES_STORAGE_KEY,
  weeklyRaces: WEEKLY_RACES_COMPAT_KEY,
  raceEntries: RACE_ENTRIES_COMPAT_KEY,
  raceResults: RACE_STORAGE_KEY,
  averageTimes: AVERAGE_TIMES_STORAGE_KEY,
  brokenWeeklyRaces: BROKEN_WEEKLY_RACES_KEY,
  brokenRaceEntries: BROKEN_RACE_ENTRIES_KEY,
  brokenRaceResults: BROKEN_RACE_RESULTS_KEY,
  brokenWeeklyRacesLegacy: "brokenWeeklyRaces",
  brokenRaceEntriesLegacy: "brokenRaceEntries",
  brokenRaceResultsLegacy: "brokenRaceResults",
};
const storageWarnings = [];

const tracks = ["東京", "中山", "阪神", "京都", "中京", "札幌", "函館", "福島", "新潟", "小倉"];
const goingOptions = ["良", "稍重", "重", "不良"];
const surfaceOptions = ["芝", "ダート"];
const raceClassOptions = ["OP", "3勝", "2勝", "1勝", "未勝利", "新馬"];
const courseTypeOptions = ["", "内", "外"];
const attentionOptions = [
  { value: "A", label: "A", help: "次走かなり買いたい" },
  { value: "B", label: "B", help: "条件次第で買いたい" },
  { value: "C", label: "C", help: "メモとして残す" },
];
const troubleTags = ["出遅れ", "前壁", "詰まり", "進路なし", "外回し", "内で包まれる", "砂被り嫌う", "馬場不向き", "距離不向き", "展開不向き", "ペース不向き", "位置取り悪い", "折り合い欠く", "掛かる", "直線不利", "4角不利", "包まれた", "進路狭い", "外々", "早仕掛け", "脚余し", "距離ロス"];
const strongTags = ["着順以上", "次走注目", "巻き返し候補", "距離短縮で狙い", "距離延長で狙い", "ダート替わりで狙い", "芝替わりで狙い", "良馬場で見直し", "道悪で見直し", "先行有利", "差し有利", "ハイペース向き", "スローペース向き", "ハイペース先行粘り", "先行有利で差し", "差し有利で先行", "上がり優秀", "次走買い"];
const buyTags = ["同距離", "距離短縮", "距離延長", "良馬場", "道悪", "東京向き", "中山向き", "外枠希望", "内枠希望", "人気落ちなら", "展開向けば"];
const attentionScores = { A: 5, B: 3, C: 1 };
const scoreTagRules = {
  次走買い: 3,
  前壁: 2,
  脚余し: 2,
  ハイペース先行粘り: 2,
  着順以上: 2,
};

const importantFactorRules = [
  { track: "東京", surface: "ダート", distances: [1600], label: "東京ダート1600m", factors: ["長い直線適性", "芝スタート実績", "外枠", "速い上がり", "1800メートル以上の実績", "コーナリング難の馬", "砂を嫌がる馬"] },
  { track: "東京", surface: "芝", distances: [1400], label: "東京芝1400m", factors: ["先行力", "長い直線実績", "コーナリングが苦手な馬", "内枠", "速い上がり"] },
  { track: "東京", surface: "芝", distances: [1600], label: "東京芝1600m", factors: ["速い上がり実績", "長い直線実績", "コーナリングが苦手な馬", "内枠先行馬"] },
  { track: "東京", surface: "芝", distances: [1800], label: "東京芝1800m", factors: ["速い上がり実績", "長い直線実績", "コーナリングが苦手な馬"] },
  { track: "東京", surface: "芝", distances: [2000], label: "東京芝2000m", factors: ["内枠", "速い上がり実績", "コーナリング難の馬"] },
  { track: "東京", surface: "ダート", distances: [1400], label: "東京ダート1400m", factors: ["先行力", "1400以上での連対実績", "コーナリング難の馬", "砂を嫌がる馬の外枠"] },
  { track: "中山", surface: "芝", distances: [1600], tendency: "fast", label: "中山芝1600m 時計の速い馬場", factors: ["内枠", "先行力", "小回り適性"] },
  { track: "中山", surface: "芝", distances: [1600], tendency: "slow", label: "中山芝1600m 時計が掛かる馬場", factors: ["小回り適性", "時計のかかる馬場実績", "好位差し、自在性のある脚質"] },
  { track: "中山", surface: "ダート", distances: [1200], tendency: "fast", label: "中山ダート1200m 時計の速い馬場", factors: ["内枠", "枠不問逃げ馬"] },
  { track: "中山", surface: "ダート", distances: [1200], tendency: "slow", label: "中山ダート1200m 時計のかかる馬場", factors: ["先行力", "小回り適性", "芝スタート適性"] },
  { track: "中山", surface: "芝", distances: [1800, 2000], tendency: "fast", label: "中山芝1800/2000m 時計の速い馬場", factors: ["先行馬", "内枠", "小回り実績"] },
  { track: "中山", surface: "芝", distances: [1800, 2000], tendency: "slow", label: "中山芝1800/2000m 時計のかかる馬場", factors: ["タフな馬", "小回り実績", "坂実績", "トラックバイアス有利"] },
  { track: "中山", surface: "芝", distances: [1200], tendency: "fast", label: "中山芝1200m 時計の速い馬場", factors: ["先行力", "下り坂実績"] },
  { track: "中山", surface: "芝", distances: [1200], tendency: "slow", label: "中山芝1200m 時計のかかる馬場", factors: ["上り坂実績", "時計のかかる馬場実績"] },
  { track: "中山", surface: "ダート", distances: [1800], tendency: "fast", label: "中山ダート1800m 時計の速い馬場", factors: ["先行力", "速い上がり", "小回り実績", "坂実績", "砂を嫌がる馬の外枠"] },
  { track: "中山", surface: "ダート", distances: [1800], tendency: "slow", label: "中山ダート1800m 時計のかかる馬場", factors: ["好位差し、追い込み馬", "タフな馬", "坂実績", "小回り適性", "砂を嫌がる馬の外枠"] },
  { track: "阪神", surface: "ダート", distances: [1200], tendency: "slow", label: "阪神ダート1200m 時計のかかる馬場", factors: ["タフな先行馬", "坂実績"] },
  { track: "阪神", surface: "ダート", distances: [1200], tendency: "fast", label: "阪神ダート1200m 時計の速い馬場", factors: ["上がり実績", "展開が向きそうな馬"] },
  { track: "阪神", surface: "芝", distances: [1200], label: "阪神芝1200m", factors: ["先行力", "内枠", "小回り適性", "坂実績"] },
  { track: "阪神", surface: "芝", distances: [1400], label: "阪神芝1400m", factors: ["先行力", "内枠", "小回り適性", "坂実績"] },
  { track: "阪神", surface: "ダート", distances: [1400], label: "阪神ダート1400m", factors: ["時計のかかる馬場の実績", "坂実績", "芝スタート実績", "砂を嫌がる馬の外枠"] },
  { track: "阪神", surface: "芝", distances: [1600, 1800], label: "阪神芝1600/1800m", factors: ["長い直線実績", "速い上がり", "坂実績", "逃げ馬"] },
  { track: "阪神", surface: "芝", distances: [2000, 2200], label: "阪神芝2000/2200m", factors: ["器用さ", "長くいい脚", "坂実績"] },
  { track: "阪神", surface: "ダート", distances: [1800], label: "阪神ダート1800m", factors: ["タフな馬", "坂実績", "小回り適性", "砂を嫌がる馬の外枠"] },
  { track: "中京", surface: "芝", distances: [1200, 1400], label: "中京芝1200/1400m", factors: ["長い直線実績", "先行力", "コーナリング難の馬"] },
  { track: "中京", surface: "芝", distances: [1600], label: "中京芝1600m", factors: ["速い上がり", "コーナリング難の馬"] },
  { track: "中京", surface: "芝", distances: [2000], label: "中京芝2000m", factors: ["速い上がり", "長い直線実績"] },
  { track: "中京", surface: "ダート", distances: [1200, 1400, 1800], label: "中京ダート", factors: ["先行力", "速い上がり実績", "砂を嫌がる馬の外枠"] },
  { track: "新潟", surface: "芝", distances: [1000], label: "新潟芝1000m", factors: ["先行力", "外枠"] },
  { track: "新潟", surface: "芝", distances: [1600, 1800, 2000], label: "新潟芝1600/1800/2000m 外回り想定", factors: ["速い上がり"] },
  { track: "新潟", surface: "芝", distances: [2200, 2400], label: "新潟芝2200/2400m", factors: ["小回り適性", "タフな馬", "速い馬場で僅差負け", "長い直線で僅差負け", "スローペースで僅差負け", "平坦巧者"] },
  { track: "新潟", surface: "芝", distances: [1200], label: "新潟芝1200m", factors: ["先行力", "速い上がり", "コーナリングが得意な馬"] },
  { track: "新潟", surface: "芝", distances: [1400], label: "新潟芝1400m", factors: ["速い上がり", "先行力", "小回り適性"] },
  { track: "新潟", surface: "ダート", distances: [1200], label: "新潟ダート1200m", factors: ["先行力", "小回り適性", "上がり実績", "平坦巧者", "砂を嫌がる馬の外枠"] },
  { track: "新潟", surface: "ダート", distances: [1800], label: "新潟ダート1800m", factors: ["先行力", "小回り適性", "速い上がり実績", "砂を嫌がる馬の外枠"] },
  { track: "福島", surface: "芝", distances: [1200], tendency: "fast", label: "福島芝1200m 時計の速い馬場", factors: ["内枠", "先行力", "小回り適性"] },
  { track: "福島", surface: "芝", distances: [1200], tendency: "slow", label: "福島芝1200m 時計のかかる馬場", factors: ["中枠〜外枠の好位差し馬"] },
  { track: "福島", surface: "ダート", distances: [1150], label: "福島ダート1150m", factors: ["先行力", "小回り適性", "芝スタート実績"] },
  { track: "福島", surface: "ダート", distances: [1700], label: "福島ダート1700m", factors: ["タフな先行馬", "小回り適性", "砂を嫌がる馬の外枠"] },
  { track: "福島", surface: "芝", distances: [1800, 2000], tendency: "inner", label: "福島芝1800/2000m 前・内有利の馬場", factors: ["先行力", "内枠", "小回り適性", "タフさ"] },
  { track: "福島", surface: "芝", distances: [1800, 2000], tendency: "outer", label: "福島芝1800/2000m 外伸び馬場", factors: ["好位差し〜差し脚質", "中枠〜外枠", "小回り適性", "タフさ"] },
  { track: "小倉", surface: "芝", distances: [1200], label: "小倉芝1200m", factors: ["先行力", "下り坂実績", "有利な枠"] },
  { track: "小倉", surface: "ダート", distances: [1000], label: "小倉ダート1000m", factors: ["先行力", "小回り適性", "下り坂適性", "砂を嫌がる馬の外枠"] },
  { track: "小倉", surface: "芝", distances: [1800, 2000], label: "小倉芝1800/2000m", factors: ["小回り適性", "先行力", "下り坂実績", "長くいい脚"] },
  { track: "小倉", surface: "ダート", distances: [1700], label: "小倉ダート1700m", factors: ["小回り実績", "先行力", "下り坂実績", "砂を嫌がる馬の外枠"] },
  { track: "札幌", surface: "ダート", distances: [1000], label: "札幌ダート1000m", factors: ["先行力", "小回り適性", "平坦巧者", "砂を嫌がる馬の外枠"] },
  { track: "札幌", surface: "ダート", distances: [1700], label: "札幌ダート1700m", factors: ["小回り適性", "能力上位", "砂を嫌がる馬の外枠"] },
  { track: "札幌", surface: "芝", distances: [1200], tendency: "inner", label: "札幌芝1200m 内・前有利", factors: ["先行力", "内枠", "小回り適性"] },
  { track: "札幌", surface: "芝", distances: [1200], tendency: "outer", label: "札幌芝1200m 外伸び馬場", factors: ["時計のかかる馬場実績", "中枠〜外枠", "小回り適性"] },
  { track: "札幌", surface: "芝", distances: [1800, 2000], label: "札幌芝1800/2000m", factors: ["先行力", "小回り適性", "時計のかかる馬場実績"] },
  { track: "函館", surface: "芝", distances: [1200], label: "函館芝1200m", factors: ["先行力", "内枠", "小回り適性", "平坦巧者"] },
  { track: "函館", surface: "芝", distances: [1800], label: "函館芝1800m", factors: ["先行力", "小回り実績", "内枠"] },
  { track: "函館", surface: "芝", distances: [2000], label: "函館芝2000m", factors: ["小回り適性", "好位差し、差し", "時計のかかる馬場実績", "速い上がり実績"] },
  { track: "函館", surface: "ダート", distances: [1000], label: "函館ダート1000m", factors: ["先行力", "小回り適性", "平坦巧者", "砂を嫌がる馬の外枠"] },
  { track: "函館", surface: "ダート", distances: [1700], label: "函館ダート1700m", factors: ["先行力", "小回り適性", "砂を嫌がる馬の外枠"] },
];

const emptyMemoForm = {
  horseName: "",
  raceDate: new Date().toISOString().slice(0, 10),
  track: "東京",
  raceNumber: "",
  distance: "",
  going: "良",
  finish: "",
  position: "",
  last3f: "",
  memo: "",
  troubleTags: [],
  strongTags: [],
  buyTags: [],
  attention: "B",
  confidence: 3,
};

const emptyRaceInfo = {
  raceDate: new Date().toISOString().slice(0, 10),
  track: "東京",
  raceNumber: "",
  raceName: "",
  raceTime: "",
  raceClass: "未勝利",
  surface: "芝",
  distance: "",
  courseType: "",
  going: "良",
  meetingNumber: "",
  meetingDay: "",
  meetingLabel: "",
  meetingGroupLabel: "",
};

const APP_STORAGE_KEYS = [
  MEMO_STORAGE_KEY,
  RACE_STORAGE_KEY,
  HORSE_RECORDS_STORAGE_KEY,
  AVERAGE_TIMES_STORAGE_KEY,
  PACE_NOTES_STORAGE_KEY,
  FACTOR_NOTES_STORAGE_KEY,
  TRACK_BIAS_NOTES_STORAGE_KEY,
  BROKEN_WEEKLY_RACES_KEY,
  BROKEN_RACE_ENTRIES_KEY,
  BROKEN_RACE_RESULTS_KEY,
];

function safeParseStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function loadJson(key) {
  const parsed = safeParseStorage(key, []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function appendBrokenStorage(key, value) {
  const current = loadJson(key);
  const items = Array.isArray(value) ? value : [value];
  saveJson(key, [...current, ...items.map((item) => ({ ...item, quarantinedAt: new Date().toISOString() }))]);
}

function getLocalStorageSnapshot() {
  const snapshot = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    const raw = localStorage.getItem(key);
    try {
      snapshot[key] = JSON.parse(raw);
    } catch {
      snapshot[key] = raw;
    }
  }
  return snapshot;
}

function formatDateStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function safeExportAllLocalStorage() {
  const backup = {
    appName: "MyKeiba Note",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: getLocalStorageSnapshot(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mykeiba-note-backup-${formatDateStamp()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function cleanHorseNamesInValue(value) {
  let count = 0;
  const visit = (item) => {
    if (Array.isArray(item)) return item.map(visit);
    if (!item || typeof item !== "object") return item;
    const next = { ...item };
    Object.entries(next).forEach(([key, child]) => {
      if (key === "horseName" && typeof child === "string") {
        const cleaned = cleanHorseName(child);
        if (cleaned && cleaned !== child) {
          next[key] = cleaned;
          count += 1;
        }
      } else {
        next[key] = visit(child);
      }
    });
    return next;
  };
  return { value: visit(value), count };
}

function cleanStoredHorseNameMarks() {
  const knownKeys = [
    RACE_STORAGE_KEY,
    WEEKLY_RACES_COMPAT_KEY,
    RACE_ENTRIES_COMPAT_KEY,
    HORSE_RECORDS_STORAGE_KEY,
    MEMO_STORAGE_KEY,
    "raceResults",
    "horseRecords",
    "horseNotes",
  ];
  const keys = new Set(knownKeys);
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) keys.add(key);
  }
  let total = 0;
  keys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw == null) return;
    try {
      const parsed = JSON.parse(raw);
      const result = cleanHorseNamesInValue(parsed);
      if (result.count > 0) {
        localStorage.setItem(key, JSON.stringify(result.value));
        total += result.count;
      }
    } catch (error) {
      console.warn("horse name cleanup skipped", key, error);
    }
  });
  return total;
}

function getStorageDiagnostics() {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    keys.push(localStorage.key(index));
  }
  const watched = Object.entries(STORAGE_ALIASES).map(([label, key]) => {
    const isolated = label.startsWith("broken") || key.includes("broken");
    const exists = localStorage.getItem(key) != null;
    const raw = localStorage.getItem(key);
    let parseable = false;
    let type = "なし";
    if (exists) {
      try {
        const parsed = JSON.parse(raw);
        parseable = true;
        type = Array.isArray(parsed) ? "配列" : typeof parsed;
      } catch {
        type = "文字列";
      }
    }
    return { label, key, exists, parseable, type, isolated };
  });
  return { keys, watched };
}

function saveRawJsonArray(key) {
  localStorage.setItem(key, "[]");
}

function emergencyResetRaceEntriesOnly() {
  saveRawJsonArray(RACE_STORAGE_KEY);
  saveRawJsonArray(BROKEN_WEEKLY_RACES_KEY);
  saveRawJsonArray(BROKEN_RACE_ENTRIES_KEY);
  saveRawJsonArray(WEEKLY_RACES_COMPAT_KEY);
  saveRawJsonArray(RACE_ENTRIES_COMPAT_KEY);
  saveRawJsonArray("brokenWeeklyRaces");
  saveRawJsonArray("brokenRaceEntries");
}

function emergencyResetRaceResultsOnly() {
  const raw = localStorage.getItem(RACE_STORAGE_KEY);
  try {
    const races = JSON.parse(raw || "[]");
    if (Array.isArray(races)) {
      const cleaned = races.map((race) => {
        if (!race || typeof race !== "object") return race;
        const { result, results, ...rest } = race;
        return rest;
      });
      localStorage.setItem(RACE_STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch {
    appendBrokenStorage(BROKEN_RACE_RESULTS_KEY, { raw, quarantinedReason: "race results parse failed" });
  }
  saveRawJsonArray(BROKEN_RACE_RESULTS_KEY);
  saveRawJsonArray("raceResults");
  saveRawJsonArray("brokenRaceResults");
}

function runRecoveryAction(action) {
  try {
    action();
  } catch (error) {
    console.error("MyKeiba recovery action failed", error);
  } finally {
    window.location.reload();
  }
}

function returnToHomeSafely() {
  try {
    localStorage.removeItem(FORCE_HOME_STORAGE_KEY);
  } catch (error) {
    console.error("MyKeiba force home failed", error);
  } finally {
    window.location.reload();
  }
}

function exportStorageBackup() {
  const backup = {
    appName: "MyKeiba Note",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      horseNotes: loadJson(MEMO_STORAGE_KEY),
      horseRecords: loadJson(HORSE_RECORDS_STORAGE_KEY),
      weeklyRaces: loadJson(RACE_STORAGE_KEY),
      raceEntries: sanitizeRaceCards(loadJson(RACE_STORAGE_KEY)).flatMap((race) => race.entries.map((entry) => ({ raceId: race.id, ...entry }))),
      raceResults: sanitizeRaceCards(loadJson(RACE_STORAGE_KEY)).filter((race) => race.result).map((race) => ({ raceId: race.id, result: race.result })),
      averageTimes: loadJson(AVERAGE_TIMES_STORAGE_KEY),
      brokenWeeklyRaces: loadJson(BROKEN_WEEKLY_RACES_KEY),
      brokenRaceEntries: loadJson(BROKEN_RACE_ENTRIES_KEY),
      brokenRaceResults: loadJson(BROKEN_RACE_RESULTS_KEY),
    },
    localStorage: getLocalStorageSnapshot(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mykeiba-note-recovery-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildBackup(memos, raceCards, horseRecords, averageTimes) {
  return {
    appName: "MyKeiba Note",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      memos,
      horseNotes: memos,
      raceCards: safeArray(raceCards).map(toStorageRaceCard),
      horseRecords,
      averageTimes,
    },
  };
}

function parseBackup(text) {
  const parsed = JSON.parse(text);
  const data = parsed.data || parsed;
  return {
    memos: Array.isArray(data.horseNotes) ? data.horseNotes : (Array.isArray(data.memos) ? data.memos : []),
    raceCards: Array.isArray(data.raceCards) ? data.raceCards : [],
    horseRecords: Array.isArray(data.horseRecords) ? data.horseRecords : [],
    averageTimes: Array.isArray(data.averageTimes) ? data.averageTimes : [],
  };
}

function averageTimeKey(item) {
  return [
    item.racecourse || "",
    item.surface || "",
    Number(item.distance) || "",
    item.courseType || "",
    normalizeRaceClass(item.raceClass || ""),
    item.going || "標準",
  ].join("::");
}

function normalizeRaceClass(value) {
  const text = String(value || "").trim();
  if (/^(OP|Ｇ?Ⅰ|GⅠ|GI|G1|Ｇ?Ⅱ|GⅡ|GII|G2|Ｇ?Ⅲ|GⅢ|GIII|G3|L|リステッド|オープン|重賞|重賞・OP)$/i.test(text)) return "OP";
  if (/3勝|3勝C|3勝クラス/.test(text)) return "3勝";
  if (/2勝|2勝C|2勝クラス/.test(text)) return "2勝";
  if (/1勝|1勝C|1勝クラス/.test(text)) return "1勝";
  if (/未勝利/.test(text)) return "未勝利";
  if (/新馬|メイクデビュー/.test(text)) return "新馬";
  return text || "未勝利";
}

function normalizeAverageTimeRow(item) {
  return {
    racecourse: item.racecourse || item.track || "",
    surface: item.surface || "",
    distance: Number(item.distance) || "",
    courseType: item.courseType || "",
    raceClass: normalizeRaceClass(item.raceClass || ""),
    going: item.going || "標準",
    averageTime: item.averageTime || "",
  };
}

function mergeAverageTimes(...lists) {
  const map = new Map();
  lists.flat().filter(Boolean).forEach((item) => {
    const normalized = normalizeAverageTimeRow(item);
    if (!normalized.racecourse || !normalized.surface || !normalized.distance || !normalized.raceClass || !normalized.averageTime) return;
    map.set(averageTimeKey(normalized), normalized);
  });
  return [...map.values()].sort((a, b) =>
    a.racecourse.localeCompare(b.racecourse, "ja")
    || a.surface.localeCompare(b.surface, "ja")
    || Number(a.distance) - Number(b.distance)
    || (a.courseType || "").localeCompare(b.courseType || "", "ja")
    || a.raceClass.localeCompare(b.raceClass, "ja")
  );
}

function findAverageTime(averageTimes, condition = {}) {
  const normalizedClass = normalizeRaceClass(condition.raceClass);
  const normalized = {
    racecourse: condition.racecourse || condition.track || "",
    surface: condition.surface || "",
    distance: Number(condition.distance) || "",
    courseType: condition.courseType || "",
    raceClass: normalizedClass,
    going: condition.going || "",
  };
  const candidates = [
    { ...normalized, going: normalized.going },
    { ...normalized, going: "標準" },
  ];
  for (const candidate of candidates) {
    const found = safeArray(averageTimes).find((item) => {
      const courseMatches = candidate.courseType ? (item.courseType || "") === candidate.courseType : !(item.courseType || "");
      return item.racecourse === candidate.racecourse
        && item.surface === candidate.surface
        && Number(item.distance) === Number(candidate.distance)
        && courseMatches
        && normalizeRaceClass(item.raceClass) === candidate.raceClass
        && item.going === candidate.going;
    });
    if (found) return found;
  }
  return null;
}

function parseRaceEntries(text) {
  const lines = text.split(/\r?\n/).map(normalizeRaceTextLine).filter(Boolean);
  const netkeibaRows = parseNetkeibaRaceEntries(lines);
  if (netkeibaRows.length > 0) return applyJraFrameAssignment(netkeibaRows);

  const rows = [];
  let pendingNumbers = [];

  lines.forEach((line, index) => {
    const numbers = extractNumberOnlyLine(line);
    if (numbers.length > 0) {
      pendingNumbers = numbers;
      return;
    }

    if (!isHorseInfoLine(line)) return;

    const row = parseHorseInfoLine(line, pendingNumbers);
    pendingNumbers = [];

    const sexAgeLine = lines.slice(index + 1, index + 4).find((nextLine) => extractSexAge(nextLine));
    const jockeyLine = lines.slice(index + 1, index + 5).find((nextLine) => extractJockeyWeight(nextLine));
    const sexAge = sexAgeLine ? extractSexAge(sexAgeLine) : "";
    const jockeyWeight = jockeyLine ? extractJockeyWeight(jockeyLine) : null;

    rows.push({
      ...row,
      sexAge,
      jockey: jockeyWeight?.jockey || "",
      carriedWeight: jockeyWeight?.carriedWeight || "",
      parsed: Boolean(row.horseNumber && row.horseName && sexAge && jockeyWeight),
    });
  });

  if (rows.length > 0) return applyJraFrameAssignment(rows);

  const legacyRows = lines
    .filter((line) => !/^(枠|枠番|馬番|印|人気|単勝|性齢|馬体重)/.test(line))
    .map(parseLegacyRaceLine)
    .filter(Boolean);
  return legacyRows.length > 0 ? applyJraFrameAssignment(legacyRows) : [makeUnparsedRow(text.trim())];
}

function parseNetkeibaRaceEntries(lines) {
  const safeLines = safeArray(lines).map((line) => String(line || "").trim()).filter(Boolean);
  const hasNetkeibaMarker = safeLines.some((line) => line.includes("のデータベース"));
  const hasNetkeibaLikeBlocks = safeLines.some((line) => /^\d{1,2}(?:\s+取消)?(?:\s+.+)?$/.test(line))
    && safeLines.some((line) => /(?:牡|牝|せん|セン|セ|騙)\d{1,2}/.test(line));
  if (!hasNetkeibaMarker && !hasNetkeibaLikeBlocks) return [];

  const starts = [];
  safeLines.forEach((line, index) => {
    const match = line.match(/^(\d{1,2})(?:\s+(取消))?(?:\s+(.+))?$/);
    if (!match) return;
    const headerName = match[3] && !/^(?:取消|--|\d+(?:\.\d+)?|\d+人気.*)$/.test(match[3]) ? match[3] : "";
    starts.push({ index, horseNumber: match[1], isScratched: Boolean(match[2]), headerName });
  });
  if (starts.length === 0) return [];

  const rows = [];
  starts.forEach((start, startIndex) => {
    const nextStart = starts[startIndex + 1]?.index ?? safeLines.length;
    const block = safeLines.slice(start.index + 1, nextStart);
    try {
      const parsed = parseNetkeibaHorseBlock(start.horseNumber, block, start.isScratched, start.headerName);
      if (parsed) rows.push(parsed);
    } catch (error) {
      console.warn("netkeiba horse block parse failed", error);
      rows.push({
        id: crypto.randomUUID(),
        frameNumber: "",
        horseNumber: start.horseNumber,
        horseName: "",
        sexAge: "",
        popularity: "",
        jockey: "",
        carriedWeight: "",
        raw: [safeLines[start.index], ...block].join(" / "),
        parsed: false,
        importSource: "netkeiba形式",
        status: start.isScratched ? "取消" : "",
        isScratched: start.isScratched,
      });
    }
  });
  return rows;
}

function parseNetkeibaHorseBlock(horseNumber, blockLines, scratchedFromHeader = false, headerName = "") {
  const block = safeArray(blockLines).map((line) => String(line || "").trim()).filter(Boolean);
  const isScratched = scratchedFromHeader || block.some((line) => line === "取消");
  const detailLine = block.find((line) => /(?:牡|牝|せん|セン|セ|騙)\d{1,2}/.test(line) && /\d{2}(?:\.\d)?$/.test(line));
  const detail = parseNetkeibaDetailLine(detailLine || "");
  const nameLine = block.find((line) => isNetkeibaHorseNameLine(line, detail?.horseName));
  const popularityLine = block.find((line) => /\d{1,2}人気/.test(line)) || "";
  const popularity = popularityLine.match(/(\d{1,2})人気/)?.[1] || "";
  const horseName = cleanHorseName(headerName || nameLine || detail?.horseName || "");
  if (!horseNumber && !horseName) return null;
  return {
    id: crypto.randomUUID(),
    frameNumber: "",
    horseNumber: String(horseNumber || "").trim(),
    horseName,
    sexAge: detail?.sexAge || "",
    popularity,
    jockey: detail?.jockey || "",
    carriedWeight: detail?.carriedWeight || "",
    raw: [horseNumber, ...block].filter(Boolean).join(" / "),
    parsed: Boolean(horseNumber && horseName && detail?.sexAge && detail?.jockey && detail?.carriedWeight),
    importSource: "netkeiba形式",
    status: isScratched ? "取消" : "",
    isScratched,
  };
}

function parseNetkeibaDetailLine(line) {
  const value = String(line || "").trim();
  if (!value) return null;
  const sexAgePattern = "(?:牡|牝|せん|セン|セ|騙)\\d{1,2}";
  const weightPattern = "(\\d{2}(?:\\.\\d)?)";
  const withDatabase = value.match(new RegExp(`^(${sexAgePattern})\\s+(.+?)のデータベース\\s*(.+?)\\s+${weightPattern}$`));
  if (withDatabase) {
    return {
      sexAge: withDatabase[1].trim(),
      horseName: cleanHorseName(withDatabase[2] || ""),
      jockey: String(withDatabase[3] || "").trim(),
      carriedWeight: withDatabase[4],
    };
  }
  const withoutDatabase = value.match(new RegExp(`^(${sexAgePattern})\\s*(.+?)\\s+${weightPattern}$`));
  if (!withoutDatabase) return null;
  return {
    sexAge: withoutDatabase[1].trim(),
    horseName: "",
    jockey: String(withoutDatabase[2] || "").trim(),
    carriedWeight: withoutDatabase[3],
  };
}

function isNetkeibaHorseNameLine(line, detailHorseName = "") {
  const value = String(line || "").trim();
  if (!value) return false;
  if (detailHorseName && cleanHorseName(value) === cleanHorseName(detailHorseName)) return true;
  if (/^(取消|--)$/.test(value)) return false;
  if (/^\d{1,2}(?:\s+取消)?$/.test(value)) return false;
  if (/^\d+(?:\.\d+)?$/.test(value)) return false;
  if (/\d+人気/.test(value)) return false;
  if (/^\([+-]?\d+\)$/.test(value)) return false;
  if (/^(?:牡|牝|せん|セン|セ|騙)\d{1,2}/.test(value)) return false;
  return /[^\d\s()（）+-]/.test(value);
}

function normalizeRaceTextLine(line) {
  return line
    .replace(/[０-９．]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, " ")
    .replace(/[|｜]/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumberOnlyLine(line) {
  const cleaned = line.replace(/ブリンカー|前4走を開く|前4走/g, "").trim();
  if (!/^\d{1,2}(?:\s+\d{1,2})?$/.test(cleaned)) return [];
  return cleaned.split(/\s+/).map((value) => Number(value));
}

function isHorseInfoLine(line) {
  return /\(\d{1,2}番人気\)/.test(line);
}

function parseHorseInfoLine(line, pendingNumbers) {
  const popularity = line.match(/\((\d{1,2})番人気\)/)?.[1] || "";
  const beforePopularity = line.split(/\(\d{1,2}番人気\)/)[0] || line;
  const withoutNoise = beforePopularity
    .replace(/ブリンカー/g, " ")
    .replace(/\d+(?:\.\d+)?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const sameLine = withoutNoise.match(/^(?:(\d{1,2})\s+)?(?:(\d{1,2})\s+)?(.+)$/);
  const sameLineNumbers = [sameLine?.[1], sameLine?.[2]].filter(Boolean).map((value) => Number(value));
  const horseName = (sameLine?.[3] || "").trim();
  const numbers = sameLineNumbers.length > 0 ? sameLineNumbers : pendingNumbers;
  const horseNumber = numbers.length >= 2 ? numbers[1] : numbers[0];
  const frameNumber = numbers.length >= 2 ? numbers[0] : inferFrameNumber(horseNumber);

  return {
    id: crypto.randomUUID(),
    frameNumber: frameNumber ? String(frameNumber) : "",
    horseNumber: horseNumber ? String(horseNumber) : "",
    horseName: cleanHorseName(horseName),
    sexAge: "",
    popularity,
    jockey: "",
    carriedWeight: "",
    raw: line,
    parsed: false,
  };
}

function extractSexAge(line) {
  const text = String(line || "").trim();
  const matched = text.match(/(?:牡|牝|せん|セン|セ|騙)\s*\d{1,2}/) || text.match(/[迚｡迚昴そ]\d{1,2}/);
  if (matched) {
    const value = matched[0].replace(/\s+/g, "");
    const age = value.match(/\d{1,2}/)?.[0] || "";
    if (/^(セン|セ|騙)/.test(value)) return age ? `せん${age}` : value;
    return value;
  }
  const gelding = text.match(/geld(?:ing)?\s*(\d{1,2})/i);
  return gelding ? `せん${gelding[1]}` : "";
}

function extractJockeyWeight(line) {
  const matched = line.match(/([▲△☆◇★▽]?\s*[^()\s]+)\((\d{2}(?:\.\d)?)\)/);
  if (!matched) return null;
  return {
    jockey: matched[1].replace(/^[▲△☆◇★▽]\s*/, "").trim(),
    carriedWeight: matched[2],
  };
}

function inferFrameNumber(horseNumber, fieldSize = 16) {
  const number = Number(horseNumber);
  const total = Number(fieldSize) || number || 16;
  if (!Number.isFinite(number) || number < 1) return "";
  if (total <= 8) return Math.min(8, number);
  if (total <= 15) {
    const singleFrameCount = 16 - total;
    if (number <= singleFrameCount) return number;
    return Math.min(8, singleFrameCount + Math.ceil((number - singleFrameCount) / 2));
  }
  if (total === 16) return Math.min(8, Math.ceil(number / 2));
  if (total === 17) return number <= 14 ? Math.ceil(number / 2) : 8;
  return number <= 12 ? Math.ceil(number / 2) : (number <= 15 ? 7 : 8);
}

function applyJraFrameAssignment(rows) {
  const safeRows = safeArray(rows);
  const fieldSize = Math.max(safeRows.length, ...safeRows.map((row) => Number(row.horseNumber || 0)).filter(Number.isFinite), 0);
  if (!fieldSize) return safeRows;
  return safeRows.map((row) => {
    const computedFrame = inferFrameNumber(row.horseNumber, fieldSize);
    const currentFrame = Number(row.frameNumber || row.frame || 0);
    const shouldFix = computedFrame && (!currentFrame || currentFrame < 1 || currentFrame > 8 || currentFrame !== computedFrame);
    return shouldFix ? { ...row, frameNumber: String(computedFrame), frame: String(computedFrame) } : row;
  });
}

function parseLegacyRaceLine(line) {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length < 5 || !isFrame(tokens[0]) || !isHorseNumber(tokens[1])) return null;
  return {
    id: crypto.randomUUID(),
    frameNumber: tokens[0],
    horseNumber: tokens[1],
    horseName: cleanHorseName(tokens.slice(2, -2).join(" ")),
    sexAge: "",
    popularity: "",
    jockey: tokens[tokens.length - 2].replace(/^[▲△☆◇★▽]\s*/, ""),
    carriedWeight: tokens[tokens.length - 1].replace(/kg$/i, ""),
    raw: line,
    parsed: true,
  };
}

function makeUnparsedRow(raw) {
  return {
    id: crypto.randomUUID(),
    frameNumber: "",
    horseNumber: "",
    horseName: "",
    sexAge: "",
    popularity: "",
    jockey: "",
    carriedWeight: "",
    raw,
    parsed: false,
  };
}

function isFrame(value) {
  return /^[1-8]$/.test(value);
}

function isHorseNumber(value) {
  return /^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 18;
}

function latestMemoForHorse(memos, horseName) {
  const normalizedName = normalizeHorseName(horseName);
  if (!normalizedName) return null;

  return safeArray(memos)
    .filter((memo) => normalizeHorseName(memo?.horseName) === normalizedName)
    .sort((a, b) => new Date(b.raceDate || 0) - new Date(a.raceDate || 0))[0] || null;
}

function scoreRace(race, memos) {
  const notableHorses = [];
  let score = 0;

  safeArray(race?.entries).forEach((entry) => {
    const latestMemo = latestMemoForHorse(memos, entry.horseName || "");
    if (!latestMemo) return;

    const tags = [...safeArray(latestMemo.troubleTags), ...safeArray(latestMemo.strongTags), ...safeArray(latestMemo.buyTags)];
    const attentionScore = attentionScores[latestMemo.attention] || 0;
    const tagScore = tags.reduce((sum, tag) => sum + (scoreTagRules[tag] || 0), 0);

    score += attentionScore + tagScore;
    notableHorses.push({
      horseName: normalizeHorseName(entry.horseName),
      attention: latestMemo.attention,
      score: attentionScore + tagScore,
    });
  });

  return {
    score,
    label: score >= 12 ? "勝負候補A" : score >= 6 ? "勝負候補B" : score >= 1 ? "勝負候補C" : "優先度低",
    notableHorses: notableHorses.sort((a, b) => b.score - a.score),
  };
}

function parseResultRows(text, raceCard) {
  const lines = text.split(/\r?\n/).map(normalizeRaceTextLine).filter(Boolean);
  const corner3Map = parseCornerPositions(extractCornerLine(lines, "3コーナー"));
  const corner4Map = parseCornerPositions(extractCornerLine(lines, "4コーナー"));
  const rows = [];

  lines.forEach((line, index) => {
    const statusHead = line.match(/^(取消|除外|競走除外|中止|競走中止)\s+([1-8])\s+(\d{1,2})(?:\s+(.+))?$/);
    if (statusHead) {
      const status = statusHead[1];
      const horseNameLine = statusHead[4] || lines.slice(index + 1, index + 4).find((nextLine) =>
        !extractSexAge(nextLine)
        && !extractJockeyWeight(nextLine)
        && !extractResultTime(nextLine)
        && !/^(取消|除外|競走除外|中止|競走中止|\d{1,2}\s+[1-8]\s+\d{1,2})/.test(nextLine)
      ) || "";
      const sexAgeLine = lines.slice(index + 1, index + 5).find((nextLine) => extractSexAge(nextLine));
      const jockeyLine = lines.slice(index + 1, index + 6).find((nextLine) => extractJockeyWeight(nextLine));
      const jockeyWeight = jockeyLine ? extractJockeyWeight(jockeyLine) : null;
      const linkedEntry = findRaceEntryForResult(raceCard, statusHead[3], horseNameLine);
      rows.push({
        id: crypto.randomUUID(),
        finish: "",
        status,
        isScratched: status === "取消",
        isExcluded: status === "除外" || status === "競走除外",
        isStopped: status === "中止" || status === "競走中止",
        frameNumber: statusHead[2] || linkedEntry?.frameNumber || "",
        horseNumber: statusHead[3] || linkedEntry?.horseNumber || "",
        horseName: cleanHorseName(horseNameLine || linkedEntry?.horseName || ""),
        sexAge: extractSexAge(sexAgeLine || "") || linkedEntry?.sexAge || "",
        popularity: linkedEntry?.popularity || "",
        jockey: jockeyWeight?.jockey || linkedEntry?.jockey || "",
        carriedWeight: jockeyWeight?.carriedWeight || linkedEntry?.carriedWeight || "",
        time: "",
        margin: "",
        last3f: "",
        corner3: "",
        corner4: "",
        firstFurlongEstimate: "-",
        raw: [line, horseNameLine, sexAgeLine, jockeyLine].filter(Boolean).join(" / "),
        parsed: Boolean(horseNameLine || linkedEntry?.horseName),
      });
      return;
    }
    const head = line.match(/^(\d{1,2})\s+([1-8])\s+(\d{1,2})(?:\s+(.+))?$/);
    if (!head) return;

    const horseLine = head[4]?.includes("番人気")
      ? head[4]
      : lines.slice(index + 1, index + 4).find((nextLine) => /番人気/.test(nextLine)) || "";
    const sexAgeLine = lines.slice(index + 1, index + 5).find((nextLine) => extractSexAge(nextLine));
    const jockeyLine = lines.slice(index + 1, index + 6).find((nextLine) => extractJockeyWeight(nextLine));
    const timeLine = lines.slice(index + 1, index + 7).find((nextLine) => extractResultTime(nextLine));
    const horseInfo = parseResultHorseLine(horseLine);
    const jockeyWeight = jockeyLine ? extractJockeyWeight(jockeyLine) : null;
    const timeInfo = timeLine ? extractResultTime(timeLine) : null;
    const linkedEntry = findRaceEntryForResult(raceCard, head[3], horseInfo.horseName);

    rows.push({
      id: crypto.randomUUID(),
      finish: head[1],
      frameNumber: head[2] || linkedEntry?.frameNumber || "",
      horseNumber: head[3] || linkedEntry?.horseNumber || "",
      horseName: horseInfo.horseName || linkedEntry?.horseName || "",
      sexAge: extractSexAge(sexAgeLine || "") || linkedEntry?.sexAge || "",
      popularity: horseInfo.popularity || linkedEntry?.popularity || "",
      jockey: jockeyWeight?.jockey || linkedEntry?.jockey || "",
      carriedWeight: jockeyWeight?.carriedWeight || linkedEntry?.carriedWeight || "",
      time: timeInfo?.time || "",
      margin: timeInfo?.margin || "",
      last3f: timeInfo?.last3f || "",
      corner3: corner3Map[head[3]] ? String(corner3Map[head[3]]) : "",
      corner4: corner4Map[head[3]] ? String(corner4Map[head[3]]) : "",
      raw: [line, horseLine, sexAgeLine, jockeyLine, timeLine].filter(Boolean).join(" / "),
      parsed: Boolean(horseInfo.horseName && sexAgeLine && jockeyWeight && timeInfo),
    });
  });

  return rows.length > 0 ? applyResultFrameFallback(rows) : [makeResultRow(text.trim())];
}

function parseRaceResultMeta(text, raceInfo = {}) {
  const rawLines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lapLine = rawLines.find((line) => /ハロンタイム|繝上Ο繝ｳ繧ｿ繧､繝/.test(line)) || "";
  const climbLine = rawLines.find((line) => /上り|上がり|荳翫ｊ/.test(line) && /3F|4F/.test(line)) || "";
  const lapText = lapLine.replace(/.*?(?:ハロンタイム|繝上Ο繝ｳ繧ｿ繧､繝)/, "");
  const lapTimes = lapText.match(/\d+(?:\.\d+)?/g) || [];
  const climbMatch = climbLine.match(/4F\s*([0-9.]+)\s*-\s*3F\s*([0-9.]+)/) || climbLine.match(/3F\s*([0-9.]+).*4F\s*([0-9.]+)/);
  const last4F = climbMatch ? (climbLine.includes("3F") && climbLine.indexOf("3F") < climbLine.indexOf("4F") ? climbMatch[2] : climbMatch[1]) : "";
  const last3F = climbMatch ? (climbLine.includes("3F") && climbLine.indexOf("3F") < climbLine.indexOf("4F") ? climbMatch[1] : climbMatch[2]) : "";
  const cornerPassages = {};

  [1, 2, 3, 4].forEach((corner) => {
    const properPattern = new RegExp("^" + corner + "\\s*コーナー");
    const legacyPattern = new RegExp("^" + corner + "\\s*繧ｳ繝ｼ繝翫・");
    const index = rawLines.findIndex((line) => properPattern.test(line) || legacyPattern.test(line));
    if (index < 0) return;
    const sameLine = rawLines[index].replace(properPattern, "").replace(legacyPattern, "").trim();
    const passage = sameLine || rawLines[index + 1] || "";
    if (passage) cornerPassages[String(corner)] = passage;
  });

  const half = calculateHalfTimes(lapTimes, raceInfo.distance);
  const threeF = calculateThreeFTimes(lapTimes, raceInfo.distance, last3F);
  const firstFurlong = calculateFirstFurlongBase(lapTimes, raceInfo.distance);
  return {
    lapTimes,
    last4F,
    last3F,
    firstHalfTime: half.firstHalfTime,
    secondHalfTime: half.secondHalfTime,
    halfDiff: half.halfDiff,
    first3F: threeF.first3F,
    last3F: threeF.last3F || last3F,
    threeFDiff: threeF.threeFDiff,
    isFirst100mStart: threeF.isFirst100mStart,
    firstFurlongBase: firstFurlong,
    firstFurlongCorner: firstExistingCorner(cornerPassages),
    firstFurlongTopHorseNumbers: extractHorseNumbersInOrder(cornerPassages[firstExistingCorner(cornerPassages)] || "").slice(0, 5),
    cornerPassages,
  };
}

function calculateHalfTimes(lapTimes, distance) {
  const laps = safeArray(lapTimes).map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (laps.length === 0) return { firstHalfTime: "", secondHalfTime: "", halfDiff: "" };
  const numericDistance = Number(String(distance || "").replace(/[^\d.]/g, ""));
  const hasFirst100m = isFirst100mDistance(numericDistance) && laps.length > 1;
  const segments = laps.map((lap, index) => ({ time: lap, distance: hasFirst100m && index === 0 ? 100 : 200 }));
  const totalDistance = numericDistance > 0 ? numericDistance : segments.reduce((sum, segment) => sum + segment.distance, 0);
  const halfDistance = totalDistance / 2;
  let covered = 0;
  let first = 0;
  let second = 0;

  segments.forEach((segment) => {
    const start = covered;
    const end = covered + segment.distance;
    const firstDistance = Math.max(0, Math.min(end, halfDistance) - start);
    const secondDistance = Math.max(0, end - Math.max(start, halfDistance));
    first += segment.time * (firstDistance / segment.distance);
    second += segment.time * (secondDistance / segment.distance);
    covered = end;
  });

  if (first === 0 || second === 0) return { firstHalfTime: "", secondHalfTime: "", halfDiff: "" };
  const diff = second - first;
  return {
    firstHalfTime: first.toFixed(1),
    secondHalfTime: second.toFixed(1),
    halfDiff: (diff >= 0 ? "+" : "") + diff.toFixed(1),
  };
}

function lapDistancesForRace(lapTimes, distance) {
  const laps = safeArray(lapTimes).map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const numericDistance = Number(String(distance || "").replace(/[^\d.]/g, ""));
  const hasFirst100m = isFirst100mDistance(numericDistance) && laps.length > 1;
  return laps.map((_, index) => (hasFirst100m && index === 0 ? 100 : 200));
}

function calculateSegmentTime(lapTimes, lapDistances, startMeter, endMeter) {
  const laps = safeArray(lapTimes).map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const distances = safeArray(lapDistances).map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
  if (laps.length === 0 || distances.length === 0 || laps.length !== distances.length) return "";
  const startTarget = Number(startMeter);
  const endTarget = Number(endMeter);
  if (!Number.isFinite(startTarget) || !Number.isFinite(endTarget) || endTarget <= startTarget) return "";

  let covered = 0;
  let total = 0;
  laps.forEach((lap, index) => {
    const distance = distances[index];
    const start = covered;
    const end = covered + distance;
    const usedDistance = Math.max(0, Math.min(end, endTarget) - Math.max(start, startTarget));
    if (usedDistance > 0) total += lap * (usedDistance / distance);
    covered = end;
  });
  return total > 0 ? total : "";
}

function calculateThreeFTimes(lapTimes, distance, officialLast3F = "") {
  const laps = safeArray(lapTimes).map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (laps.length === 0) return { first3F: "", last3F: officialLast3F || "", threeFDiff: "", isFirst100mStart: false };
  const numericDistance = Number(String(distance || "").replace(/[^\d.]/g, ""));
  const distances = lapDistancesForRace(laps, numericDistance);
  const totalDistance = numericDistance > 0 ? numericDistance : distances.reduce((sum, value) => sum + value, 0);
  const first = calculateSegmentTime(laps, distances, 0, 600);
  const lastCalculated = totalDistance >= 600 ? calculateSegmentTime(laps, distances, totalDistance - 600, totalDistance) : "";
  const official = Number(String(officialLast3F || "").replace(/[^\d.]/g, ""));
  const last = lastCalculated || (Number.isFinite(official) ? official : "");
  const diff = Number.isFinite(first) && Number.isFinite(last) ? last - first : "";
  return {
    first3F: Number.isFinite(first) ? first.toFixed(1) : "",
    last3F: Number.isFinite(last) ? last.toFixed(1) : (officialLast3F || ""),
    threeFDiff: Number.isFinite(diff) ? (diff >= 0 ? "+" : "") + diff.toFixed(1) : "",
    isFirst100mStart: isFirst100mDistance(numericDistance) && laps.length > 1,
  };
}

function isFirst100mDistance(distance) {
  const numeric = Number(distance);
  return Number.isFinite(numeric) && numeric > 0 && numeric % 200 === 100;
}

function calculateFirstFurlongBase(lapTimes, distance) {
  const laps = safeArray(lapTimes).map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (laps.length === 0) return "";
  const numericDistance = Number(String(distance || "").replace(/[^\d.]/g, ""));
  const base = isFirst100mDistance(numericDistance) && laps.length > 1 ? laps[0] + laps[1] / 2 : laps[0];
  return Number.isFinite(base) ? base.toFixed(1) : "";
}

function firstExistingCorner(cornerPassages = {}) {
  return ["1", "2", "3", "4"].find((corner) => String(cornerPassages[corner] || "").trim()) || "";
}

function extractHorseNumbersInOrder(passage) {
  return String(passage || "").match(/\d{1,2}/g) || [];
}

function buildFirstFurlongMap(meta = {}) {
  const base = Number(meta.firstFurlongBase);
  if (!Number.isFinite(base)) return {};
  const topNumbers = safeArray(meta.firstFurlongTopHorseNumbers).slice(0, 5);
  return topNumbers.reduce((map, horseNumber, index) => {
    map[String(horseNumber)] = (base + index * 0.1).toFixed(1);
    return map;
  }, {});
}

function parseResultHorseLine(line) {
  const cleaned = line.replace(/ブリンカー/g, " ").replace(/\s+/g, " ").trim();
  const matched = cleaned.match(/^(.+?)(\d{1,2})番人気$/);
  if (!matched) return { horseName: cleaned, popularity: "" };
  return {
    horseName: matched[1].trim(),
    popularity: matched[2],
  };
}

function extractResultTime(line) {
  const matched = line.match(/(\d{1,2}:\d{2}\.\d|\d{2,3}\.\d)(?:\s*\(([^)]+)\))?\s*\/\s*(\d{2}\.\d)/);
  if (!matched) return null;
  return {
    time: matched[1],
    margin: matched[2]?.trim() || "",
    last3f: matched[3],
  };
}

function extractCornerLine(lines, label) {
  const index = lines.findIndex((line) => line === label || line.startsWith(label));
  if (index < 0) return "";
  const sameLine = lines[index].replace(label, "").trim();
  if (sameLine) return sameLine;
  return lines[index + 1] || "";
}

function parseCornerPositions(value) {
  const positions = {};
  const text = normalizeRaceTextLine(value).replace(/[＊*]/g, "");
  let currentPosition = 1;
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    if (char === "(" || char === "（") {
      const end = text.indexOf(char === "(" ? ")" : "）", index + 1);
      const groupText = end >= 0 ? text.slice(index + 1, end) : text.slice(index + 1);
      const numbers = groupText.match(/\d{1,2}/g) || [];
      numbers.forEach((number) => {
        positions[number] = currentPosition;
      });
      currentPosition += numbers.length;
      index = end >= 0 ? end + 1 : text.length;
      continue;
    }

    if (/\d/.test(char)) {
      const matched = text.slice(index).match(/^\d{1,2}/);
      const number = matched[0];
      positions[number] = currentPosition;
      currentPosition += 1;
      index += number.length;
      continue;
    }

    index += 1;
  }

  return positions;
}

function findRaceEntryForResult(raceCard, horseNumber, horseName) {
  const entries = safeArray(raceCard?.entries);
  if (entries.length === 0) return null;
  const normalizedName = normalizeHorseName(horseName);
  return entries.find((entry) => entry.horseNumber === horseNumber)
    || entries.find((entry) => normalizeHorseName(entry.horseName) === normalizedName)
    || null;
}

function makeResultRow(raw) {
  return {
    id: crypto.randomUUID(),
    finish: "",
    frameNumber: "",
    horseNumber: "",
    horseName: "",
    sexAge: "",
    popularity: "",
    jockey: "",
    carriedWeight: "",
    time: "",
    margin: "",
    corner3: "",
    corner4: "",
    last3f: "",
    raw,
    parsed: false,
  };
}

function toSeconds(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (/^\d{1,2}:\d{2}\.\d$/.test(trimmed)) {
    const [minutes, seconds] = trimmed.split(":");
    return Number(minutes) * 60 + Number(seconds);
  }
  if (/^\d{2,3}\.\d$/.test(trimmed)) return Number(trimmed);
  return null;
}

function normalizeResultStatus(value) {
  const text = String(value || "").trim();
  if (/競走除外/.test(text)) return "競走除外";
  if (/除外/.test(text)) return "除外";
  if (/取消/.test(text)) return "取消";
  if (/競走中止/.test(text)) return "競走中止";
  if (/中止/.test(text)) return "中止";
  return "";
}

function isNonRunnerStatus(value) {
  return /^(取消|除外|競走除外)$/.test(normalizeResultStatus(value));
}

function isResultNonRunner(row = {}) {
  return Boolean(row.isScratched || row.isExcluded || isNonRunnerStatus(row.status || row.finish));
}

function isResultStopped(row = {}) {
  return Boolean(row.isStopped || /^(中止|競走中止)$/.test(normalizeResultStatus(row.status || row.finish)));
}

function isUnavailableEntry(entry = {}) {
  const status = normalizeResultStatus(entry.status || "");
  return Boolean(entry.isScratched || entry.isExcluded || status === "取消" || status === "除外" || status === "競走除外");
}

function isFinishedResultRow(row = {}) {
  return /^\d+$/.test(String(row.finish || "")) && !isResultNonRunner(row) && !isResultStopped(row);
}

function resultSortValue(row = {}) {
  return isFinishedResultRow(row) ? Number(row.finish) : 999;
}

function applyResultFrameFallback(rows) {
  const safeRows = safeArray(rows).map(sanitizeResultRow);
  const total = safeRows.length;
  return safeRows.map((row) => ({
    ...row,
    frameNumber: row.frameNumber || String(inferFrameNumber(row.horseNumber, total)),
  }));
}

function judgePaceBias(rows) {
  const board = rows
    .filter(isFinishedResultRow)
    .sort((a, b) => resultSortValue(a) - resultSortValue(b))
    .slice(0, 5);
  const cornerPositions = board.map((row) => Number(row.corner4)).filter((value) => Number.isFinite(value));
  const frontCount = cornerPositions.filter((value) => value <= 5).length;
  const closerCount = cornerPositions.filter((value) => value >= 10).length;

  if (board.length < 5 || cornerPositions.length < 5) return "判定材料不足";
  if (frontCount >= 4) return "先行有利";
  if (closerCount >= 3) return "差し有利";
  return "フラット";
}

function judgeTrackTrend(winningTime, averageWinningTime) {
  const winnerSeconds = toSeconds(winningTime);
  const averageSeconds = toSeconds(averageWinningTime);
  if (winnerSeconds == null || averageSeconds == null) return "平均勝ち時計を入力すると補助判定できます";

  const diff = winnerSeconds - averageSeconds;
  if (diff <= -1.0) return "高速馬場の可能性";
  if (diff <= -0.4) return "やや高速馬場の可能性";
  if (Math.abs(diff) <= 0.3) return "標準に近い";
  if (diff <= 0.9) return "やや時計がかかる馬場の可能性";
  return "時計がかかる馬場の可能性";
}

function buildRaceResult(rows, averageWinningTime, sourceText = "", raceInfo = {}) {
  const meta = parseRaceResultMeta(sourceText, raceInfo);
  const firstFurlongMap = buildFirstFurlongMap(meta);
  const safeRows = safeArray(rows).map(sanitizeResultRow).map((row) => ({
    ...row,
    frameNumber: row.frameNumber || String(inferFrameNumber(row.horseNumber, safeArray(rows).length)),
    firstFurlongEstimate: isResultNonRunner(row) || isResultStopped(row) ? "-" : firstFurlongMap[String(row.horseNumber || "")] || row.firstFurlongEstimate || "-",
  }));
  const sortedRows = [...safeRows].filter(isFinishedResultRow).sort((a, b) => resultSortValue(a) - resultSortValue(b));
  const winningTime = sortedRows[0]?.time || "";
  const paceBias = judgePaceBias(safeRows);
  const trackTrend = judgeTrackTrend(winningTime, averageWinningTime);
  return {
    status: "result_registered",
    rows: safeRows,
    fullResults: safeRows,
    top3: sortedRows.slice(0, 3),
    lapTimes: meta.lapTimes,
    last4F: meta.last4F,
    last3F: meta.last3F,
    firstHalfTime: meta.firstHalfTime,
    secondHalfTime: meta.secondHalfTime,
    halfDiff: meta.halfDiff,
    first3F: meta.first3F,
    last3F: meta.last3F,
    threeFDiff: meta.threeFDiff,
    isFirst100mStart: meta.isFirst100mStart,
    firstFurlongBase: meta.firstFurlongBase,
    firstFurlongCorner: meta.firstFurlongCorner,
    firstFurlongTopHorseNumbers: meta.firstFurlongTopHorseNumbers,
    cornerPassages: meta.cornerPassages,
    averageWinningTime: averageWinningTime || "",
    winningTime,
    paceBias,
    trackTrend,
    paceBiasLabel: paceBias,
    trackBiasLabel: trackTrend,
    biasNote: "断定ではなく、レース回顧のための補助判断です。",
    registeredAt: new Date().toISOString(),
    savedAt: new Date().toISOString(),
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanHorseName(value) {
  return String(value || "")
    .trim()
    .replace(/^(?:[\u25cb\u3007\u25ce\u24c4]\s*[外地]|マル(?:外|地|ガイ|チ)|丸(?:外|地)|丸囲み(?:外|地))\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeRaceNumber(value) {
  const text = String(value ?? "").trim().replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/[Ｒｒ]/g, "R");
  const matched = text.match(/\d{1,2}/);
  return matched ? `${Number(matched[0])}R` : "";
}

function raceNumberLabel(value) {
  return normalizeRaceNumber(value) || String(value || "").trim() || "-";
}

function normalizeRaceCourse(value) {
  return String(value || "").trim() || "未設定";
}

function buildStableRaceId(info = {}) {
  const date = String(info.date || info.raceDate || "").trim() || "日付未設定";
  const racecourse = normalizeRaceCourse(info.racecourse || info.track || info.raceCourse);
  const raceNumber = normalizeRaceNumber(info.raceNumber || info.raceNo || info.race || info.raceNum || info.race_number || info.raceIndex || info.R || info["レース番号"]) || "未設定";
  return `${date}_${racecourse}_${raceNumber}`;
}

function sanitizeRaceInfo(info = {}) {
  const raceNumber = normalizeRaceNumber(info.raceNumber || info.raceNo || info.race || info.raceNum || info.race_number || info.raceIndex || info.R || info["レース番号"]);
  const racecourse = normalizeRaceCourse(info.racecourse || info.track || info.raceCourse || info["競馬場"]);
  const meetingNumber = String(info.meetingNumber || info.meetingRound || info.meeting || info["開催回次"] || info["開催回"] || "").replace(/[^\d]/g, "");
  const meetingDay = String(info.meetingDay || info.dayNumber || info["開催日数"] || info["開催日次"] || "").replace(/[^\d]/g, "");
  const meetingLabel = meetingNumber && meetingDay && racecourse ? `第${meetingNumber}回${racecourse}${meetingDay}日` : String(info.meetingLabel || "");
  return {
    ...emptyRaceInfo,
    ...info,
    raceDate: String(info.date || info.raceDate || ""),
    track: racecourse,
    raceNumber,
    raceName: String(info.raceName || info.name || info["レース名"] || ""),
    raceTime: String(info.startTime || info.raceTime || ""),
    raceClass: info.raceClass ? normalizeRaceClass(info.raceClass) : "",
    surface: info.surface || "",
    distance: String(info.distance || ""),
    courseType: info.courseType || "",
    going: info.going || "",
    weather: info.weather || info["天気"] || "",
    turfGoing: info.turfGoing || info.turfCondition || info["芝馬場"] || "",
    dirtGoing: info.dirtGoing || info.dirtCondition || info["ダート馬場"] || "",
    meetingNumber,
    meetingDay,
    meetingLabel,
    meetingGroupLabel: info.meetingGroupLabel || "",
  };
}

function sanitizeRaceEntry(entry = {}) {
  const status = String(entry.status || "");
  const normalizedStatus = normalizeResultStatus(status);
  const isScratched = Boolean(entry.isScratched || normalizedStatus === "取消");
  const isExcluded = Boolean(entry.isExcluded || normalizedStatus === "除外" || normalizedStatus === "競走除外");
  return {
    id: entry.id || makeId("entry"),
    frameNumber: String(entry.frameNumber || entry.frame || entry["枠"] || ""),
    horseNumber: String(entry.horseNumber || ""),
    horseName: cleanHorseName(entry.horseName || entry["馬名"] || entry["鬥ｬ蜷・"] || ""),
    sexAge: String(entry.sexAge || entry["性齢"] || ""),
    popularity: String(entry.popularity || entry["人気"] || ""),
    jockey: String(entry.jockey || entry["騎手"] || ""),
    carriedWeight: String(entry.carriedWeight || entry.weight || entry["斤量"] || ""),
    raw: entry.raw || "",
    parsed: Boolean(entry.parsed),
    status: isScratched ? "取消" : isExcluded ? normalizedStatus : status,
    isScratched,
    isExcluded,
  };
}

function toStorageRaceEntry(entry = {}) {
  const safeEntry = sanitizeRaceEntry(entry);
  return {
    frame: safeEntry.frameNumber || "",
    horseNumber: safeEntry.horseNumber || "",
    horseName: cleanHorseName(safeEntry.horseName),
    sexAge: safeEntry.sexAge || "",
    popularity: safeEntry.popularity || "",
    jockey: safeEntry.jockey || "",
    weight: safeEntry.carriedWeight || "",
    status: safeEntry.status || "",
    isScratched: Boolean(safeEntry.isScratched),
    isExcluded: Boolean(safeEntry.isExcluded),
  };
}

function sanitizeResultRow(row = {}) {
  const rawStatus = normalizeResultStatus(row.status || row.finish || "");
  const isScratched = Boolean(row.isScratched || rawStatus === "取消");
  const isExcluded = Boolean(row.isExcluded || rawStatus === "除外" || rawStatus === "競走除外");
  const isStopped = Boolean(row.isStopped || rawStatus === "中止" || rawStatus === "競走中止");
  return {
    id: row.id || makeId("result-row"),
    finish: isScratched || isExcluded || isStopped ? "" : String(row.finish || ""),
    status: rawStatus || String(row.status || ""),
    isScratched,
    isExcluded,
    isStopped,
    frameNumber: String(row.frameNumber || row.frame || ""),
    horseNumber: String(row.horseNumber || ""),
    horseName: cleanHorseName(row.horseName || ""),
    sexAge: String(row.sexAge || ""),
    popularity: String(row.popularity || ""),
    jockey: String(row.jockey || ""),
    carriedWeight: String(row.carriedWeight || ""),
    time: isScratched || isExcluded ? "" : String(row.time || ""),
    margin: isScratched || isExcluded ? "" : String(row.margin || ""),
    last3f: isScratched || isExcluded ? "" : String(row.last3f || ""),
    corner3: isScratched || isExcluded ? "" : String(row.corner3 || ""),
    corner4: isScratched || isExcluded ? "" : String(row.corner4 || row.position || ""),
    firstFurlongEstimate: isScratched || isExcluded ? "-" : String(row.firstFurlongEstimate || "-"),
  };
}

function sanitizeRaceCard(race = {}) {
  const infoSource = { ...(race.raceInfo || {}), ...race };
  const raceInfo = sanitizeRaceInfo(infoSource);
  const entries = applyJraFrameAssignment(safeArray(race.entries).map(sanitizeRaceEntry));
  if (!raceInfo.raceName) raceInfo.raceName = "名称未設定";
  if (!raceInfo.raceNumber) raceInfo.raceNumber = "未設定";
  if (!raceInfo.track) raceInfo.track = "未設定";
  const stableRaceId = buildStableRaceId({
    date: raceInfo.raceDate,
    racecourse: raceInfo.track,
    raceNumber: raceInfo.raceNumber,
  });
  const id = race.raceId || race.id || stableRaceId;
  const rawResult = race.result || (safeArray(race.results).length > 0 ? { rows: race.results } : null);
  const result = rawResult ? {
    ...rawResult,
    status: rawResult.status || "result_registered",
    rows: safeArray(rawResult.fullResults || rawResult.rows || rawResult.results).map(sanitizeResultRow),
    fullResults: safeArray(rawResult.fullResults || rawResult.rows || rawResult.results).map(sanitizeResultRow),
    top3: safeArray(rawResult.top3).length > 0
      ? safeArray(rawResult.top3).map(sanitizeResultRow).filter(isFinishedResultRow)
      : [...safeArray(rawResult.fullResults || rawResult.rows || rawResult.results).map(sanitizeResultRow)]
        .filter(isFinishedResultRow)
        .sort((a, b) => resultSortValue(a) - resultSortValue(b))
        .slice(0, 3),
    averageWinningTime: rawResult.averageWinningTime || "",
    winningTime: rawResult.winningTime || "",
    paceBias: rawResult.paceBias || "判定材料不足",
    trackTrend: rawResult.trackTrend || "平均勝ち時計を入力すると補助判定できます",
    paceBiasLabel: rawResult.paceBiasLabel || rawResult.paceBias || "",
    trackBiasLabel: rawResult.trackBiasLabel || rawResult.trackTrend || "",
    biasNote: rawResult.biasNote || "",
  } : null;
  const status = result ? "result_registered" : (race.status || (entries.length > 0 ? "entry_registered" : ""));
  return {
    ...race,
    id,
    raceId: race.raceId || stableRaceId || id,
    date: raceInfo.raceDate || "",
    racecourse: raceInfo.track || "",
    raceNumber: raceInfo.raceNumber || "",
    raceName: raceInfo.raceName || "",
    raceClass: raceInfo.raceClass || "",
    surface: raceInfo.surface || "",
    distance: raceInfo.distance || "",
    going: raceInfo.going || "",
    meetingNumber: raceInfo.meetingNumber || "",
    meetingDay: raceInfo.meetingDay || "",
    meetingLabel: raceInfo.meetingLabel || "",
    meetingGroupLabel: raceInfo.meetingGroupLabel || "",
    startTime: raceInfo.raceTime || "",
    raceInfo,
    entries,
    result,
    status,
    createdAt: race.createdAt || new Date().toISOString(),
    updatedAt: race.updatedAt || race.createdAt || new Date().toISOString(),
  };
}

function toStorageRaceCard(race = {}) {
  const safeRace = sanitizeRaceCard(race);
  const stableRaceId = buildStableRaceId({
    date: safeRace.raceInfo.raceDate,
    racecourse: safeRace.raceInfo.track,
    raceNumber: safeRace.raceInfo.raceNumber,
  });
  const raceId = safeRace.raceId || stableRaceId;
  const storageRace = {
    id: raceId,
    raceId,
    date: safeRace.raceInfo.raceDate || "",
    racecourse: safeRace.raceInfo.track || "",
    raceNumber: safeRace.raceInfo.raceNumber || "",
    raceName: safeRace.raceInfo.raceName || "",
    raceClass: safeRace.raceInfo.raceClass || "",
    surface: safeRace.raceInfo.surface || "",
    distance: safeRace.raceInfo.distance ? Number(safeRace.raceInfo.distance) || null : null,
    going: safeRace.raceInfo.going || "",
    meetingNumber: safeRace.raceInfo.meetingNumber || "",
    meetingDay: safeRace.raceInfo.meetingDay || "",
    meetingLabel: safeRace.raceInfo.meetingLabel || "",
    meetingGroupLabel: safeRace.raceInfo.meetingGroupLabel || "",
    startTime: safeRace.raceInfo.raceTime || "",
    status: safeRace.result ? "result_registered" : "entry_registered",
    entries: safeArray(safeRace.entries).map(toStorageRaceEntry).filter((entry) => normalizeHorseName(entry.horseName)),
    results: safeRace.result ? safeArray(safeRace.result.rows).map(sanitizeResultRow) : [],
    result: safeRace.result || null,
    createdAt: safeRace.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return storageRace;
}

function sanitizeRaceCards(raceCards) {
  return safeArray(raceCards).map(sanitizeRaceCard);
}

function normalizeStoredRaceCards(raceCards) {
  return sanitizeReadableRaceCards(raceCards);
}

function normalizeRaceEntryCompatCards() {
  const raceEntries = loadJson(RACE_ENTRIES_COMPAT_KEY);
  const entryLike = raceEntries.some((item) => item?.horseName || item?.horseNumber || item?.frame || item?.frameNumber);
  if (entryLike && raceEntries.length > 0) {
    return normalizeStoredRaceCards([{
      id: makeId("race"),
      raceId: makeId("race"),
      date: "",
      racecourse: "未設定",
      raceNumber: "未設定",
      raceName: "名称未設定",
      raceClass: "",
      surface: "",
      distance: null,
      going: "",
      startTime: "",
      entries: raceEntries,
    }]);
  }
  return normalizeStoredRaceCards(raceEntries);
}

function mergeRaceCardsById(raceCards) {
  const map = new Map();
  safeArray(raceCards).forEach((race) => {
    const safeRace = sanitizeRaceCard(race);
    const key = safeRace.raceId || safeRace.id;
    if (!key) return;
    const current = map.get(key) || {};
    const result = safeRace.result || current.result || null;
    map.set(key, {
      ...current,
      ...safeRace,
      entries: safeArray(safeRace.entries).length > 0 ? safeRace.entries : safeArray(current.entries),
      result,
      status: result ? "result_registered" : (safeRace.status || current.status || "entry_registered"),
    });
  });
  return [...map.values()].map(sanitizeRaceCard);
}

function getAllRaceCards() {
  try {
    return mergeRaceCardsById([
      ...normalizeStoredRaceCards(loadJson(RACE_STORAGE_KEY)),
      ...normalizeStoredRaceCards(loadJson(WEEKLY_RACES_COMPAT_KEY)),
      ...normalizeRaceEntryCompatCards(),
    ]);
  } catch (error) {
    console.error("getAllRaceCards failed", error);
    return [];
  }
}

function safeString(value, fallback = "") {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  try {
    return String(value);
  } catch {
    return fallback;
  }
}

function readStorageArrayFlexible(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return Object.values(parsed);
    return [];
  } catch (error) {
    console.warn(`readStorageArrayFlexible failed: ${key}`, error);
    return [];
  }
}

function getDateKeySafe(value) {
  const raw = safeString(value, "").trim();
  if (!raw || raw === "日付未設定") return "日付未設定";
  const matched = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!matched) return raw || "日付未設定";
  const [, year, month, day] = matched;
  return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;
}

function raceCardListKey(card) {
  return [
    safeString(card?.raceId || card?.id || ""),
    safeString(card?.date || card?.raceDate || card?.raceInfo?.raceDate || ""),
    safeString(card?.racecourse || card?.track || card?.raceInfo?.track || ""),
    safeString(card?.raceNumber || card?.raceNo || card?.R || card?.raceInfo?.raceNumber || ""),
  ].join("::");
}

function isEntryRowLike(item) {
  return Boolean(item && typeof item === "object" && !Array.isArray(item)
    && !Array.isArray(item.entries)
    && (item.horseName || item["馬名"] || item.horseNumber || item.frame || item.frameNumber || item.jockey));
}

function raceCardsFromEntryRowsSafe(rows) {
  const groups = new Map();
  safeArray(rows).forEach((row) => {
    if (!isEntryRowLike(row)) return;
    const raceInfo = row.raceInfo || {};
    const date = safeString(row.date || row.raceDate || raceInfo.raceDate || "");
    const racecourse = safeString(row.racecourse || row.track || raceInfo.track || "");
    const raceNumber = normalizeRaceNumber(row.raceNumber || row.raceNo || row.R || raceInfo.raceNumber || "") || safeString(row.raceNumber || "");
    const raceId = safeString(row.raceId || row.id || buildStableRaceId({ date, racecourse, raceNumber }));
    const key = raceId || [date, racecourse, raceNumber].join("::");
    if (!key.trim()) return;
    const current = groups.get(key) || {
      id: raceId || key,
      raceId: raceId || key,
      date,
      racecourse,
      raceNumber,
      raceName: safeString(row.raceName || raceInfo.raceName || ""),
      raceClass: safeString(row.raceClass || raceInfo.raceClass || ""),
      startTime: safeString(row.startTime || row.raceTime || raceInfo.raceTime || ""),
      surface: safeString(row.surface || raceInfo.surface || ""),
      distance: safeString(row.distance || raceInfo.distance || ""),
      going: safeString(row.going || raceInfo.going || ""),
      entries: [],
      status: "entry_registered",
    };
    current.entries.push(toStorageRaceEntry(row));
    groups.set(key, current);
  });
  return [...groups.values()];
}

function normalizeRaceCardForList(card) {
  const raceInfo = card?.raceInfo || {};
  const date = safeString(card?.date || card?.raceDate || raceInfo.raceDate || "");
  const dateKey = getDateKeySafe(date);
  const racecourse = safeString(card?.racecourse || card?.track || raceInfo.track || "競馬場未設定", "競馬場未設定") || "競馬場未設定";
  const raceNumber = normalizeRaceNumber(card?.raceNumber || card?.raceNo || card?.R || raceInfo.raceNumber || "") || safeString(card?.raceNumber || raceInfo.raceNumber || "R未設定", "R未設定") || "R未設定";
  const raceName = safeString(card?.raceName || card?.name || raceInfo.raceName || "レース名未設定", "レース名未設定") || "レース名未設定";
  const raceId = safeString(card?.raceId || card?.id || buildStableRaceId({ date: dateKey === "日付未設定" ? "" : dateKey, racecourse, raceNumber }));
  const entries = safeArray(card?.entries);
  const rawResult = card?.result || (safeArray(card?.results).length > 0 ? { rows: card.results } : null);
  const status = safeString(card?.status || (rawResult ? "result_registered" : "entry_registered"));
  const winner = rawResult
    ? sortResultRows(safeArray(rawResult.fullResults || rawResult.rows || rawResult.results).map(sanitizeResultRow)).find(isFinishedResultRow)
    : null;
  return {
    raceId,
    id: raceId,
    date: date || "日付未設定",
    dateKey,
    racecourse,
    raceNumber,
    raceName,
    raceClass: safeString(card?.raceClass || raceInfo.raceClass || ""),
    startTime: safeString(card?.startTime || card?.raceTime || raceInfo.raceTime || ""),
    surface: safeString(card?.surface || raceInfo.surface || ""),
    distance: safeString(card?.distance || raceInfo.distance || ""),
    entries,
    entriesCount: entries.length,
    status,
    resultStatusLabel: status === "result_registered" || rawResult ? "登録済み" : "未登録",
    winnerName: safeString(winner?.horseName || ""),
    winnerTime: safeString(winner?.time || ""),
    raw: card,
  };
}

function getAllRaceCardsSafe() {
  try {
    const rawRaceCards = readStorageArrayFlexible(RACE_STORAGE_KEY);
    const rawWeeklyRaces = readStorageArrayFlexible(WEEKLY_RACES_COMPAT_KEY);
    const rawRaceEntries = readStorageArrayFlexible(RACE_ENTRIES_COMPAT_KEY);
    const raceEntryCards = rawRaceEntries.some(isEntryRowLike)
      ? raceCardsFromEntryRowsSafe(rawRaceEntries)
      : rawRaceEntries;
    const map = new Map();
    [...rawRaceCards, ...rawWeeklyRaces, ...raceEntryCards].forEach((item) => {
      const normalized = normalizeRaceCardForList(item);
      const key = normalized.raceId || raceCardListKey(item) || makeId("race-list");
      const current = map.get(key);
      if (!current) {
        map.set(key, normalized);
        return;
      }
      map.set(key, {
        ...current,
        ...normalized,
        entries: normalized.entriesCount > 0 ? normalized.entries : current.entries,
        entriesCount: Math.max(current.entriesCount || 0, normalized.entriesCount || 0),
        resultStatusLabel: normalized.resultStatusLabel === "登録済み" ? "登録済み" : current.resultStatusLabel,
      });
    });
    return [...map.values()];
  } catch (error) {
    console.error("getAllRaceCardsSafe failed", error);
    return [];
  }
}

function groupRaceCardsForListByDate(cards) {
  const groups = new Map();
  safeArray(cards).forEach((card) => {
    try {
      const normalized = normalizeRaceCardForList(card.raw || card);
      const key = normalized.dateKey || "日付未設定";
      if (!groups.has(key)) groups.set(key, { key, label: key, races: [] });
      groups.get(key).races.push(normalized);
    } catch (error) {
      console.warn("Skipping race card in registered list", error);
    }
  });
  const raceNumberSortValue = (race) => Number(safeString(race.raceNumber).match(/\d+/)?.[0] || 0);
  return [...groups.values()]
    .map((group) => ({
      ...group,
      races: group.races.sort((a, b) => {
        if (a.startTime && b.startTime && a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
        if (a.startTime && !b.startTime) return -1;
        if (!a.startTime && b.startTime) return 1;
        return safeString(a.racecourse).localeCompare(safeString(b.racecourse)) || raceNumberSortValue(a) - raceNumberSortValue(b);
      }),
    }))
    .sort((a, b) => {
      if (a.key === "日付未設定") return 1;
      if (b.key === "日付未設定") return -1;
      return safeString(b.key).localeCompare(safeString(a.key));
    });
}

function buildTrackTendencySummaries(races, averageTimes = [], horseRecords = []) {
  const groups = new Map();
  safeArray(races).forEach((race) => {
    const safeRace = sanitizeRaceCard(race.raw || race);
    const info = safeRace.raceInfo || {};
    const track = info.track || race.racecourse || "";
    const surface = info.surface || race.surface || "";
    if (!track || !surface) return;
    const key = `${track}_${surface}`;
    if (!groups.has(key)) groups.set(key, { track, surface, diffs: [], front: 0, middle: 0, closer: 0, paceTotal: 0, raceCount: 0 });
    const group = groups.get(key);
    group.raceCount += 1;
    const rows = sortResultRows(resultRowsFromRace(safeRace, horseRecords)).filter(isFinishedResultRow);
    const winner = rows.find(isFinishedResultRow);
    const average = findAverageTime(averageTimes, info);
    const winnerSeconds = winner?.time ? toSeconds(winner.time) : null;
    const averageSeconds = average?.averageTime ? toSeconds(average.averageTime) : null;
    if (winnerSeconds != null && averageSeconds != null) group.diffs.push(winnerSeconds - averageSeconds);
    const fieldSize = safeRace.entries.length || rows.length || 0;
    if (fieldSize > 0) {
      rows.slice(0, 5).forEach((row) => {
        const corner = Number(row.corner4);
        if (!Number.isFinite(corner) || corner <= 0) return;
        const frontLimit = Math.ceil(fieldSize / 3);
        const middleLimit = Math.ceil(fieldSize * 2 / 3);
        if (corner <= frontLimit) group.front += 1;
        else if (corner <= middleLimit) group.middle += 1;
        else group.closer += 1;
        group.paceTotal += 1;
      });
    }
  });
  return [...groups.values()].map((group) => {
    const avgDiff = group.diffs.length ? group.diffs.reduce((sum, value) => sum + value, 0) / group.diffs.length : null;
    const clockLabel = avgDiff == null ? "判定材料不足" : avgDiff <= -1 ? `高速馬場（平均 ${avgDiff.toFixed(1)}秒）` : avgDiff >= 1 ? `時計がかかる（平均 +${avgDiff.toFixed(1)}秒）` : `標準（平均 ${avgDiff >= 0 ? "+" : ""}${avgDiff.toFixed(1)}秒）`;
    const paceLabel = group.paceTotal === 0 ? "判定材料不足" : group.front / group.paceTotal >= 0.5 ? `先行有利（掲示板内 先行${group.front}/${group.paceTotal}）` : group.closer / group.paceTotal >= 0.5 ? `差し有利（掲示板内 差し${group.closer}/${group.paceTotal}）` : "フラット";
    return { ...group, clockLabel, paceLabel };
  });
}

function saveRegisteredListError(error, details = {}) {
  try {
    localStorage.setItem(REGISTERED_RACE_LIST_ERROR_KEY, JSON.stringify({
      name: error?.name || "Error",
      message: error?.message || safeString(error),
      stack: safeString(error?.stack || "").split("\n").slice(0, 6).join("\n"),
      details,
      savedAt: new Date().toISOString(),
    }));
  } catch (saveError) {
    console.warn("saveRegisteredListError failed", saveError);
  }
}

function loadRegisteredListError() {
  const value = safeParseStorage(REGISTERED_RACE_LIST_ERROR_KEY, null);
  return value && typeof value === "object" ? value : null;
}

function loadRaceCardsFromStorage() {
  return getAllRaceCards();
}

function persistRaceCardsToStorage(raceCards) {
  const storageCards = safeArray(raceCards).map(toStorageRaceCard);
  saveJson(RACE_STORAGE_KEY, storageCards);
  saveJson(WEEKLY_RACES_COMPAT_KEY, storageCards);
  saveJson(RACE_ENTRIES_COMPAT_KEY, storageCards);
  return storageCards;
}

function upsertRaceCardInStorage(raceCard) {
  const storageRace = toStorageRaceCard(raceCard);
  const current = loadJson(RACE_STORAGE_KEY).map(toStorageRaceCard);
  const next = [storageRace, ...current.filter((race) => race.raceId !== storageRace.raceId && race.id !== storageRace.id)];
  persistRaceCardsToStorage(next);
  return { storageRace, next };
}

function verifyStoredRaceCard(raceId, expectedEntryCount) {
  const stored = loadJson(RACE_STORAGE_KEY);
  const found = stored.find((race) => race?.id === raceId || race?.raceId === raceId);
  const entries = safeArray(found?.entries);
  return {
    ok: Boolean(found && (found.status === "entry_registered" || found.status === "result_registered") && Array.isArray(found.entries) && entries.length > 0 && entries.length === expectedEntryCount),
    count: stored.length,
    found: Boolean(found),
    entriesIsArray: Boolean(found && Array.isArray(found.entries)),
    entryCount: entries.length,
  };
}

function saveRaceSaveDebug(debug) {
  try {
    localStorage.setItem(LAST_RACE_SAVE_DEBUG_KEY, JSON.stringify({ ...debug, savedAt: new Date().toISOString() }));
  } catch (error) {
    console.error("race save debug failed", error);
  }
}

function loadRaceSaveDebug() {
  return safeParseStorage(LAST_RACE_SAVE_DEBUG_KEY, null);
}

function isReadableRaceCard(race) {
  const info = race?.raceInfo || {};
  return Boolean(race?.id && info.raceNumber && info.track && Array.isArray(race.entries));
}

function sanitizeReadableRaceCards(raceCards) {
  const rawCards = safeArray(raceCards);
  const sanitized = sanitizeRaceCards(rawCards);
  const readable = [];
  const unreadable = [];
  const brokenEntries = [];
  sanitized.forEach((race, index) => {
    const raw = rawCards[index] || {};
    if (!Array.isArray(raw.entries) && raw.entries != null) {
      brokenEntries.push({ raceId: race.id, raceInfo: race.raceInfo, entries: raw.entries });
    }
    if (isReadableRaceCard(race)) readable.push(race);
    else unreadable.push(raw);
  });
  if (unreadable.length > 0) appendBrokenStorage(BROKEN_WEEKLY_RACES_KEY, unreadable);
  if (brokenEntries.length > 0) appendBrokenStorage(BROKEN_RACE_ENTRIES_KEY, brokenEntries);
  if (unreadable.length > 0 || brokenEntries.length > 0) {
    storageWarnings.push("出走表データの一部を読み込めなかったため、スキップしました。");
  }
  return readable;
}

function validateRaceCard(raceCard) {
  const errors = [];
  const race = sanitizeRaceCard(raceCard);
  const validEntries = race.entries.filter((entry) => normalizeHorseName(entry.horseName));
  if (validEntries.length === 0) errors.push("馬名が1件も取得できていません。");
  race.raceInfo = sanitizeRaceInfo({
    ...race.raceInfo,
    raceName: race.raceInfo.raceName || "名称未設定",
    track: race.raceInfo.track || "未設定",
    raceNumber: race.raceInfo.raceNumber || "未設定",
  });
  race.entries = validEntries;
  return { race, errors };
}

function inspectRaceCardBeforeSave(raceCard, existingRaceCards = []) {
  const race = sanitizeRaceCard(raceCard);
  const entries = safeArray(race.entries);
  const warnings = [];
  const fatals = [];
  const horseNumbers = entries.map((entry) => String(entry.horseNumber || "").trim()).filter(Boolean);
  const duplicatedNumbers = [...new Set(horseNumbers.filter((number, index) => horseNumbers.indexOf(number) !== index))];
  const missingNames = entries.map((entry, index) => normalizeHorseName(entry.horseName) ? null : index + 1).filter(Boolean);
  const missingNumbers = entries.map((entry, index) => String(entry.horseNumber || "").trim() ? null : index + 1).filter(Boolean);
  const missingSexAges = entries.map((entry, index) => String(entry.sexAge || "").trim() ? null : index + 1).filter(Boolean);
  const missingJockeys = entries.map((entry, index) => String(entry.jockey || "").trim() ? null : index + 1).filter(Boolean);
  const missingWeights = entries.map((entry, index) => String(entry.carriedWeight || entry.weight || "").trim() ? null : index + 1).filter(Boolean);
  const missingPopularities = entries.map((entry, index) => {
    const isScratched = isUnavailableEntry(entry);
    return isScratched || String(entry.popularity || "").trim() ? null : index + 1;
  }).filter(Boolean);
  const missingFrames = entries.map((entry, index) => String(entry.frameNumber || entry.frame || "").trim() ? null : index + 1).filter(Boolean);
  const expectedNumbers = entries.length ? Array.from({ length: entries.length }, (_, index) => String(index + 1)) : [];
  const absentExpectedNumbers = expectedNumbers.filter((number) => !horseNumbers.includes(number));
  const raceId = race.raceId || race.id || buildStableRaceId(race.raceInfo || {});
  const sameRace = safeArray(existingRaceCards).find((card) => {
    const safe = sanitizeRaceCard(card);
    const info = safe.raceInfo || {};
    const target = race.raceInfo || {};
    return safe.raceId === raceId
      || (info.raceDate && target.raceDate && info.raceDate === target.raceDate
        && info.track === target.track
        && raceNumberLabel(info.raceNumber) === raceNumberLabel(target.raceNumber));
  });

  if (entries.length === 0) fatals.push("entries が0件です");
  if (!raceId) fatals.push("raceId が作れません");
  if (missingNames.length >= Math.max(1, Math.ceil(entries.length * 0.8))) fatals.push("馬名がほぼ取得できていません");
  if (missingNumbers.length >= Math.max(1, Math.ceil(entries.length * 0.8))) fatals.push("馬番がほぼ取得できていません");
  if (duplicatedNumbers.length) warnings.push(`馬番が重複しています：${duplicatedNumbers.join(", ")}`);
  if (missingNames.length) warnings.push(`馬名が空の行があります：${missingNames.join(", ")}行目`);
  if (absentExpectedNumbers.length) warnings.push(`登録予定頭数が${entries.length}頭ですが、馬番 ${absentExpectedNumbers.join(", ")} が見つかりません`);
  if (missingSexAges.length) warnings.push(`性齢が空の馬があります：${missingSexAges.length}頭`);
  if (missingJockeys.length) warnings.push(`騎手が空の馬があります：${missingJockeys.length}頭`);
  if (missingWeights.length) warnings.push(`斤量が空の馬があります：${missingWeights.length}頭`);
  if (missingPopularities.length) warnings.push(`人気が空の馬があります：${missingPopularities.length}頭`);
  if (missingFrames.length) warnings.push(`枠番が空の馬があります：${missingFrames.length}頭`);
  if (sameRace) warnings.push("同じ日付・競馬場・レース番号の出走表がすでに登録されています");
  return { race, raceId, sameRace, warnings, fatals };
}

function inspectRaceResultBeforeSave(race, rows) {
  const safeRows = safeArray(rows).map(sanitizeResultRow);
  const finishedRows = safeRows.filter(isFinishedResultRow);
  const warnings = [];
  const fatals = [];
  const finishes = finishedRows.map((row) => String(row.finish || "").trim()).filter(Boolean);
  const numbers = safeRows.map((row) => String(row.horseNumber || "").trim()).filter(Boolean);
  const duplicatedFinishes = [...new Set(finishes.filter((value, index) => finishes.indexOf(value) !== index))];
  const duplicatedNumbers = [...new Set(numbers.filter((value, index) => numbers.indexOf(value) !== index))];
  const missingNames = safeRows.map((row, index) => normalizeHorseName(row.horseName) ? null : index + 1).filter(Boolean);
  const missingTimes = safeRows.map((row, index) => !isFinishedResultRow(row) || String(row.time || "").trim() ? null : index + 1).filter(Boolean);
  const entries = safeArray(race?.entries);
  const entryNumbers = entries.map((entry) => String(entry.horseNumber || "").trim()).filter(Boolean);
  const unknownNumbers = numbers.filter((number) => entryNumbers.length > 0 && !entryNumbers.includes(number));
  if (!race) fatals.push("登録対象レースが選択されていません");
  if (safeRows.length === 0) fatals.push("結果行が0件です");
  if (missingNames.length >= Math.max(1, Math.ceil(safeRows.length * 0.8))) fatals.push("馬名がほぼ取得できていません");
  if (duplicatedFinishes.length) warnings.push(`着順が重複しています：${duplicatedFinishes.join(", ")}`);
  if (duplicatedNumbers.length) warnings.push(`馬番が重複しています：${duplicatedNumbers.join(", ")}`);
  if (missingNames.length) warnings.push(`馬名が空の行があります：${missingNames.join(", ")}行目`);
  if (missingTimes.length) warnings.push(`タイムが空の馬があります：${missingTimes.length}頭`);
  if (unknownNumbers.length) warnings.push(`出走表に存在しない馬番が結果に含まれています：${[...new Set(unknownNumbers)].join(", ")}`);
  if (race?.status === "result_registered" || race?.result) warnings.push("このレースはすでに結果登録済みです");
  return { warnings, fatals };
}

function validateRaceResultInput(race, rows) {
  const info = sanitizeRaceInfo(race?.raceInfo || {});
  const validRows = safeArray(rows).map(sanitizeResultRow).filter((row) => normalizeHorseName(row.horseName));
  const errors = [];
  if (!info.track) errors.push("競馬場が未入力です。");
  if (!info.raceNumber) errors.push("レース番号が未入力です。");
  if (validRows.length === 0) errors.push("馬名が入っている結果が1件もありません。");
  return { validRows, errors };
}

function isolateLatestProblemData() {
  const races = sanitizeRaceCards(loadJson(RACE_STORAGE_KEY));
  if (races.length === 0) return;
  const sorted = [...races].sort((a, b) => new Date(b.createdAt || b.raceInfo?.raceDate || 0) - new Date(a.createdAt || a.raceInfo?.raceDate || 0));
  const target = sorted[0];
  appendBrokenStorage(BROKEN_WEEKLY_RACES_KEY, target);
  if (target.entries?.length) appendBrokenStorage(BROKEN_RACE_ENTRIES_KEY, { raceId: target.id, entries: target.entries });
  if (target.result) appendBrokenStorage(BROKEN_RACE_RESULTS_KEY, { raceId: target.id, result: target.result });
  const remaining = races.filter((race) => race.id !== target.id);
  saveJson(RACE_STORAGE_KEY, remaining);
}

function resetWeeklyRaceDataOnly() {
  const races = sanitizeRaceCards(loadJson(RACE_STORAGE_KEY));
  if (races.length > 0) appendBrokenStorage(BROKEN_WEEKLY_RACES_KEY, races);
  saveJson(RACE_STORAGE_KEY, []);
}

function resetRaceEntriesOnly() {
  const races = sanitizeRaceCards(loadJson(RACE_STORAGE_KEY));
  const movedEntries = races
    .filter((race) => race.entries.length > 0)
    .map((race) => ({ raceId: race.id, raceInfo: race.raceInfo, entries: race.entries }));
  if (movedEntries.length > 0) appendBrokenStorage(BROKEN_RACE_ENTRIES_KEY, movedEntries);
  saveJson(RACE_STORAGE_KEY, races.map((race) => ({ ...race, entries: [] })));
}

function resetRaceResultsOnly() {
  const races = sanitizeRaceCards(loadJson(RACE_STORAGE_KEY));
  const movedResults = races
    .filter((race) => race.result)
    .map((race) => ({ raceId: race.id, raceInfo: race.raceInfo, result: race.result }));
  if (movedResults.length > 0) appendBrokenStorage(BROKEN_RACE_RESULTS_KEY, movedResults);
  saveJson(RACE_STORAGE_KEY, races.map((race) => ({ ...race, result: null })));
}

function repairStorageData() {
  saveJson(RACE_STORAGE_KEY, sanitizeReadableRaceCards(loadJson(RACE_STORAGE_KEY)));
  saveJson(HORSE_RECORDS_STORAGE_KEY, safeArray(loadJson(HORSE_RECORDS_STORAGE_KEY)));
  saveJson(MEMO_STORAGE_KEY, safeArray(loadJson(MEMO_STORAGE_KEY)));
  saveJson(AVERAGE_TIMES_STORAGE_KEY, mergeAverageTimes(defaultAverageTimes, loadJson(AVERAGE_TIMES_STORAGE_KEY)));
}

function getDataDiagnostics() {
  const races = sanitizeRaceCards(loadJson(RACE_STORAGE_KEY));
  const unreadable = races.filter((race) => !isReadableRaceCard(race)).length;
  const raceResults = races.filter((race) => race.result || race.status === "result_registered").length;
  const entryRegistered = races.filter((race) => race.status === "entry_registered").length;
  const raceEntries = races.reduce((sum, race) => sum + safeArray(race.entries).length, 0);
  const brokenWeeklyRaces = loadJson(BROKEN_WEEKLY_RACES_KEY).length + loadJson("brokenWeeklyRaces").length;
  const brokenRaceEntries = loadJson(BROKEN_RACE_ENTRIES_KEY).length + loadJson("brokenRaceEntries").length;
  const brokenRaceResults = loadJson(BROKEN_RACE_RESULTS_KEY).length + loadJson("brokenRaceResults").length;
  return {
    horseRecords: loadJson(HORSE_RECORDS_STORAGE_KEY).length,
    horseNotes: loadJson(MEMO_STORAGE_KEY).length,
    raceResults,
    entryRegistered,
    raceEntries,
    weeklyRaces: races.length,
    averageTimes: loadJson(AVERAGE_TIMES_STORAGE_KEY).length || defaultAverageTimes.length,
    unreadable,
    quarantined: brokenWeeklyRaces + brokenRaceEntries + brokenRaceResults,
    brokenWeeklyRaces,
    brokenRaceEntries,
    brokenRaceResults,
  };
}

function isolatedBrokenMessage(count) {
  return count > 0
    ? `隔離済みデータあり。通常表示には使用しません。（${count}件）`
    : "なし";
}

function normalizeHorseName(value) {
  return cleanHorseName(value);
}

function normalizeRating(value) {
  return ["A", "B", "C"].includes(value) ? value : "C";
}

function recordKey(record) {
  const horseName = normalizeHorseName(record.horseName);
  if (record.raceId) return `${record.raceId}::${horseName}`;
  return [record.raceDate, record.track, record.raceNumber, horseName].join("::");
}

function buildHorseRecord(race, row) {
  const info = race.raceInfo || {};
  const fieldSize = race.result?.rows?.length || race.entries?.length || "";
  const nonRunner = isResultNonRunner(row);
  const stopped = isResultStopped(row);
  return {
    id: recordKey({
      raceId: race.id,
      raceDate: info.raceDate || "",
      track: info.track || "",
      raceNumber: info.raceNumber || "",
      horseName: row.horseName || "",
    }),
    raceId: race.id || "",
    horseName: normalizeHorseName(row.horseName),
    raceDate: info.raceDate || "",
    track: info.track || "",
    raceNumber: info.raceNumber || "",
    raceName: info.raceName || "",
    raceClass: info.raceClass || "",
    surface: info.surface || "",
    distance: info.distance || "",
    going: info.going || "",
    fieldSize,
    finish: nonRunner || stopped ? "" : row.finish || "",
    status: row.status || (row.isScratched ? "取消" : row.isExcluded ? "除外" : row.isStopped ? "中止" : ""),
    isScratched: Boolean(row.isScratched),
    isExcluded: Boolean(row.isExcluded),
    isStopped: Boolean(row.isStopped),
    frameNumber: row.frameNumber || "",
    horseNumber: row.horseNumber || "",
    sexAge: row.sexAge || "",
    popularity: row.popularity || "",
    jockey: row.jockey || "",
    carriedWeight: row.carriedWeight || "",
    time: row.time || "",
    margin: row.margin || "",
    last3f: row.last3f || "",
    corner3: row.corner3 || "",
    corner4: row.corner4 || "",
    firstFurlongEstimate: row.firstFurlongEstimate || "-",
    averageWinningTime: race.result?.averageWinningTime || "",
    averageTimeDiff: !nonRunner && !stopped && toSeconds(row.time || "") != null && toSeconds(race.result?.averageWinningTime || "") != null
      ? (toSeconds(row.time || "") - toSeconds(race.result?.averageWinningTime || "")).toFixed(1)
      : "",
    trackTrend: race.result?.trackTrend || "",
    savedAt: new Date().toISOString(),
  };
}

function upsertHorseRecords(currentRecords, race, result) {
  const nextMap = new Map(safeArray(currentRecords).map((record) => [recordKey(record), record]));
  const raceForRecord = { ...race, result };
  safeArray(result?.rows).forEach((row) => {
    if (!normalizeHorseName(row.horseName)) return;
    const record = buildHorseRecord(raceForRecord, row);
    nextMap.set(recordKey(record), record);
  });
  return [...nextMap.values()].sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));
}

function buildHorseRecordsFromRaceCards(raceCards) {
  return sanitizeRaceCards(raceCards).reduce((records, race) => race.result ? upsertHorseRecords(records, race, race.result) : records, []);
}

function resultRowsFromRace(race, horseRecords = []) {
  const safeRace = sanitizeRaceCard(race);
  const directRows = safeArray(safeRace.result?.fullResults).length > 0
    ? safeArray(safeRace.result.fullResults)
    : safeArray(safeRace.result?.rows || safeRace.results);
  if (directRows.length > 0) return enrichRowsWithFirstFurlong(directRows, safeRace.result);

  const raceId = safeRace.raceId || safeRace.id;
  const storedResult = loadJson("raceResults").find((item) => item?.raceId === raceId || item?.id === raceId);
  const storedRows = safeArray(storedResult?.result?.fullResults || storedResult?.result?.rows || storedResult?.fullResults || storedResult?.rows || storedResult?.results);
  if (storedRows.length > 0) return enrichRowsWithFirstFurlong(storedRows, storedResult?.result || storedResult);

  return safeArray(horseRecords)
    .filter((record) => record.raceId === raceId || record.raceId === safeRace.id || record.raceId === safeRace.raceId)
    .map((record) => sanitizeResultRow({
      id: record.id,
      finish: record.finish,
      status: record.status,
      isScratched: record.isScratched,
      isExcluded: record.isExcluded,
      isStopped: record.isStopped,
      frameNumber: record.frameNumber || record.frame,
      horseNumber: record.horseNumber,
      horseName: record.horseName,
      sexAge: record.sexAge,
      popularity: record.popularity,
      jockey: record.jockey,
      carriedWeight: record.carriedWeight || record.weight,
      time: record.time,
      margin: record.margin,
      last3f: record.last3f,
      corner3: record.corner3,
      corner4: record.corner4,
      firstFurlongEstimate: record.firstFurlongEstimate || "-",
      parsed: true,
    }));
}

function enrichRowsWithFirstFurlong(rows, resultMeta) {
  const firstFurlongMap = buildFirstFurlongMap(resultMeta || {});
  return safeArray(rows)
    .map(sanitizeResultRow)
    .map((row) => ({
      ...row,
      firstFurlongEstimate: row.firstFurlongEstimate && row.firstFurlongEstimate !== "-" ? row.firstFurlongEstimate : firstFurlongMap[String(row.horseNumber || "")] || "-",
    }));
}

function hasRaceResult(race, horseRecords = []) {
  const safeRace = sanitizeRaceCard(race);
  return safeRace.status === "result_registered" || Boolean(safeRace.result) || resultRowsFromRace(safeRace, horseRecords).length > 0;
}

function sortResultRows(rows) {
  return safeArray(rows).map(sanitizeResultRow).sort((a, b) => resultSortValue(a) - resultSortValue(b));
}

function raceKeyFromRecord(record = {}) {
  return record.raceId || buildStableRaceId({
    date: record.raceDate || record.date || "",
    racecourse: record.track || record.racecourse || "",
    raceNumber: record.raceNumber || record.R || "",
  });
}

function recordDateValue(record = {}) {
  return new Date(record.raceDate || record.date || record.createdAt || 0).getTime() || 0;
}

function isWinRecord(record = {}) {
  if (isResultNonRunner(record) || isResultStopped(record)) return false;
  return String(record.finish || record.rank || "").replace(/[^\d]/g, "") === "1";
}

function isOpenOrHigherClass(value = "") {
  const text = String(value || "");
  return /OP|L|GI|GⅠ|GII|GⅡ|GIII|GⅢ|G1|G2|G3|重賞|オープン|リステッド/i.test(text);
}

function winLabelForRecord(record = {}) {
  const raceClass = record.raceClass || "";
  const raceName = record.raceName || "";
  if (isOpenOrHigherClass(raceClass) && raceName) return raceName;
  return raceClass || raceName || "勝利";
}

function buildRivalWinFollowUps(targetRecord, allRecords, currentHorseName) {
  const targetRaceKey = raceKeyFromRecord(targetRecord);
  if (!targetRaceKey) return { status: "missing", items: [], extraCount: 0 };

  const groupedByHorse = new Map();
  safeArray(allRecords).forEach((record) => {
    const name = normalizeHorseName(record.horseName || "");
    if (!name) return;
    if (!groupedByHorse.has(name)) groupedByHorse.set(name, []);
    groupedByHorse.get(name).push(record);
  });

  const targetNames = new Set(
    safeArray(allRecords)
      .filter((record) => raceKeyFromRecord(record) === targetRaceKey)
      .map((record) => normalizeHorseName(record.horseName || ""))
      .filter(Boolean)
  );

  targetNames.delete(normalizeHorseName(currentHorseName || targetRecord.horseName || ""));
  if (targetNames.size === 0) return { status: "insufficient", items: [], extraCount: 0 };

  const wins = [];
  targetNames.forEach((horseName) => {
    const records = safeArray(groupedByHorse.get(horseName)).sort((a, b) => recordDateValue(a) - recordDateValue(b));
    const raceIndex = records.findIndex((record) => raceKeyFromRecord(record) === targetRaceKey);
    if (raceIndex < 0 || raceIndex >= records.length - 1) return;
    const laterRecords = records.slice(raceIndex + 1);
    const laterWins = laterRecords
      .map((record, index) => ({ record, runAfter: index + 1 }))
      .filter((item) => isWinRecord(item.record));
    if (laterWins.length === 0) return;
    const latestWin = laterWins[laterWins.length - 1];
    wins.push({
      horseName,
      originalFinish: records[raceIndex].finish || "-",
      runAfter: latestWin.runAfter,
      winRecord: latestWin.record,
      label: winLabelForRecord(latestWin.record),
    });
  });

  wins.sort((a, b) => a.runAfter - b.runAfter || Number(a.originalFinish || 999) - Number(b.originalFinish || 999));
  return {
    status: wins.length > 0 ? "ok" : "none",
    items: wins.slice(0, 5),
    extraCount: Math.max(0, wins.length - 5),
  };
}

function raceCardsFromHorseRecords(records) {
  const groups = new Map();
  safeArray(records).forEach((record) => {
    const horseName = normalizeHorseName(record?.horseName);
    if (!horseName) return;
    const info = sanitizeRaceInfo({
      raceDate: record.raceDate || record.date || "",
      track: record.track || record.racecourse || "",
      raceNumber: record.raceNumber || record.raceNo || record.R || "",
      raceName: record.raceName || "",
      raceClass: record.raceClass || "",
      surface: record.surface || "",
      distance: record.distance || "",
      going: record.going || "",
    });
    const raceId = record.raceId || buildStableRaceId({ date: info.raceDate, racecourse: info.track, raceNumber: info.raceNumber });
    const current = groups.get(raceId) || {
      id: raceId,
      raceId,
      raceInfo: info,
      entries: [],
      createdAt: record.savedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    current.entries.push(sanitizeRaceEntry({
      frame: record.frameNumber || record.frame || "",
      horseNumber: record.horseNumber || "",
      horseName,
      sexAge: record.sexAge || "",
      popularity: record.popularity || "",
      jockey: record.jockey || "",
      weight: record.carriedWeight || record.weight || "",
    }));
    groups.set(raceId, current);
  });
  return [...groups.values()].map((race) => sanitizeRaceCard(race));
}

function restoreRaceCardsFromHorseRecords() {
  const recovered = raceCardsFromHorseRecords(loadJson(HORSE_RECORDS_STORAGE_KEY));
  if (recovered.length === 0) return { count: 0, races: [] };
  const current = loadRaceCardsFromStorage();
  const merged = [...recovered, ...current].reduce((map, race) => {
    const safeRace = sanitizeRaceCard(race);
    map.set(safeRace.raceId || safeRace.id, safeRace);
    return map;
  }, new Map());
  const races = [...merged.values()];
  persistRaceCardsToStorage(races);
  return { count: recovered.length, races };
}

function raceStorageStatus() {
  const last = loadRaceSaveDebug();
  const allRaceCards = getAllRaceCards();
  const horseRaceIds = new Set(safeArray(loadJson(HORSE_RECORDS_STORAGE_KEY)).map((record) =>
    record?.raceId || buildStableRaceId({ date: record?.raceDate || record?.date || "", racecourse: record?.track || record?.racecourse || "", raceNumber: record?.raceNumber || record?.R || "" })
  ).filter(Boolean));
  return {
    main: loadJson(RACE_STORAGE_KEY).length,
    weekly: loadJson(WEEKLY_RACES_COMPAT_KEY).length,
    raceEntries: loadJson(RACE_ENTRIES_COMPAT_KEY).length,
    allRaceCards: allRaceCards.length,
    entryRegistered: allRaceCards.filter((race) => race.status === "entry_registered").length,
    resultRegistered: allRaceCards.filter((race) => race.status === "result_registered" || race.result).length,
    resultTargets: allRaceCards.length,
    recentRaceCards: sortRaceCardsRecent(allRaceCards).slice(0, 24).length,
    horseRecordRaces: horseRaceIds.size,
    lastRaceId: last?.raceId || "",
    lastSaveStatus: last?.status || "",
    lastMessage: last?.message || "",
  };
}

function horseRecordRaceKey(record) {
  return [
    record?.raceDate || record?.date || "",
    record?.track || record?.racecourse || "",
    normalizeRaceNumber(record?.raceNumber || record?.R || "") || String(record?.raceNumber || ""),
  ].join("::");
}

function isEntryOnlyHorseRecord(record) {
  const horseName = normalizeHorseName(record?.horseName);
  const raceDate = String(record?.raceDate || record?.date || "").trim();
  const racecourse = String(record?.track || record?.racecourse || "").trim();
  const raceNumber = String(record?.raceNumber || record?.raceNo || record?.R || "").trim();
  const finish = String(record?.finish || "").trim();
  const time = String(record?.time || "").trim();
  const last3f = String(record?.last3f || "").trim();
  return Boolean(horseName && raceDate && racecourse && raceNumber && !finish && !time && !last3f);
}

function raceNumberValue(race) {
  return Number(normalizeRaceNumber(race?.raceInfo?.raceNumber || race?.raceNumber).match(/\d+/)?.[0] || 0);
}

function paceNoteKey(raceId, entry = {}) {
  return [
    safeString(raceId, "race"),
    safeString(entry.horseNumber || entry.horseNo || "", ""),
    normalizeHorseName(entry.horseName || ""),
  ].join("__");
}

function normalizePaceNote(note = {}) {
  return {
    id: note.id || paceNoteKey(note.raceId, note),
    raceId: safeString(note.raceId, ""),
    horseNumber: safeString(note.horseNumber, ""),
    horseName: normalizeHorseName(note.horseName || ""),
    stamina: ["余力あり", "余力なし", "普通"].includes(note.stamina) ? note.stamina : "普通",
    comment: safeString(note.comment, ""),
    updatedAt: note.updatedAt || "",
    createdAt: note.createdAt || "",
  };
}

function getPaceNote(notes, raceId, entry) {
  const key = paceNoteKey(raceId, entry);
  return normalizePaceNote(safeArray(notes).find((note) => note.id === key)
    || safeArray(notes).find((note) => note.raceId === raceId
      && safeString(note.horseNumber) === safeString(entry.horseNumber)
      && normalizeHorseName(note.horseName) === normalizeHorseName(entry.horseName))
    || { id: key, raceId, horseNumber: entry.horseNumber || "", horseName: entry.horseName || "" });
}

function parseFirstFurlongValue(value) {
  const number = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getBestFirstFurlong(records = []) {
  const values = safeArray(records).map((record) => parseFirstFurlongValue(record.firstFurlongEstimate)).filter((value) => value != null);
  if (values.length === 0) return "-";
  return Math.min(...values).toFixed(1);
}

function getHorsePredictionRecords(horseName, horseRecords = [], raceCards = []) {
  const normalizedName = normalizeHorseName(horseName);
  const directRecords = safeArray(horseRecords).filter((record) => normalizeHorseName(record.horseName) === normalizedName);
  const keys = new Set(directRecords.map((record) => `${raceIdForHorseRecord(record)}::${record.finish || ""}::${record.time || ""}`));
  const resultRecords = [];
  safeArray(raceCards).forEach((race) => {
    const safeRace = sanitizeRaceCard(race);
    const info = safeRace.raceInfo || {};
    safeArray(safeRace.result?.fullResults || safeRace.result?.rows || safeRace.results).forEach((row) => {
      const safeRow = sanitizeResultRow(row);
      if (normalizeHorseName(safeRow.horseName) !== normalizedName) return;
      const record = {
        ...safeRow,
        horseName: safeRow.horseName,
        raceId: safeRace.raceId || safeRace.id,
        raceDate: info.raceDate || "",
        track: info.track || "",
        raceNumber: info.raceNumber || "",
        raceName: info.raceName || "",
        raceClass: info.raceClass || "",
        surface: info.surface || "",
        distance: info.distance || "",
        going: info.going || "",
        fieldSize: safeArray(safeRace.result?.fullResults || safeRace.result?.rows || safeRace.entries).length || "",
      };
      const key = `${raceIdForHorseRecord(record)}::${record.finish || ""}::${record.time || ""}`;
      if (!keys.has(key)) {
        keys.add(key);
        resultRecords.push(record);
      }
    });
  });
  return [...directRecords, ...resultRecords].sort((a, b) => safeString(b.raceDate || b.date).localeCompare(safeString(a.raceDate || a.date)));
}

function classifyPacePosition(bestFirstFurlong, records = [], note = {}) {
  if (note.stamina === "余力あり" && parseFirstFurlongValue(bestFirstFurlong) != null) return "front";
  if (note.stamina === "余力なし" && parseFirstFurlongValue(bestFirstFurlong) != null) return "closer";
  const speed = parseFirstFurlongValue(bestFirstFurlong);
  if (speed != null) {
    if (speed <= 12.3) return "front";
    if (speed <= 12.8) return "middle";
    return "closer";
  }
  const cornerSamples = safeArray(records).map((record) => Number(record.corner4 || record.corner3 || record.position)).filter((value) => Number.isFinite(value) && value > 0);
  if (cornerSamples.length > 0) {
    const average = cornerSamples.reduce((sum, value) => sum + value, 0) / cornerSamples.length;
    if (average <= 4) return "front";
    if (average <= 9) return "middle";
    return "closer";
  }
  return "unknown";
}

function buildPacePrediction(race, horseRecords = [], paceNotes = [], raceCards = []) {
  const raceId = race?.raceId || race?.id || "";
  const entries = safeArray(race?.entries).map(sanitizeRaceEntry);
  const activeEntries = entries.filter((entry) => !isUnavailableEntry(entry));
  const groups = { front: [], middle: [], closer: [], unknown: [] };
  activeEntries.forEach((entry) => {
    const horseName = normalizeHorseName(entry.horseName);
    const records = getHorsePredictionRecords(horseName, horseRecords, raceCards);
    const note = getPaceNote(paceNotes, raceId, entry);
    const bestFirstFurlong = getBestFirstFurlong(records);
    const position = classifyPacePosition(bestFirstFurlong, records, note);
    groups[position].push({ entry, records, note, bestFirstFurlong });
  });
  const frontCount = groups.front.length;
  const paceLabel = frontCount >= 3 ? "H" : frontCount <= 1 ? "S" : "M";
  return { raceId, entries, activeEntries, groups, paceLabel };
}

function normalizeFactorNote(note = {}) {
  return {
    id: note.id || factorNoteKey(note.raceId, note, note.factorName),
    raceId: safeString(note.raceId, ""),
    horseNumber: safeString(note.horseNumber, ""),
    horseName: normalizeHorseName(note.horseName || ""),
    factorName: safeString(note.factorName, ""),
    memo: safeString(note.memo, ""),
    createdAt: note.createdAt || "",
    updatedAt: note.updatedAt || "",
  };
}

function factorNoteKey(raceId, entry = {}, factorName = "") {
  return [
    safeString(raceId, "race"),
    safeString(entry.horseNumber || entry.horseNo || "", ""),
    normalizeHorseName(entry.horseName || ""),
    safeString(factorName, ""),
  ].join("__");
}

function getFactorNote(notes, raceId, entry, factorName) {
  const key = factorNoteKey(raceId, entry, factorName);
  return normalizeFactorNote(safeArray(notes).find((note) => note.id === key)
    || { id: key, raceId, horseNumber: entry.horseNumber || "", horseName: entry.horseName || "", factorName });
}

function normalizeSurfaceLabel(value) {
  const text = safeString(value, "");
  if (text.includes("ダ")) return "ダート";
  if (text.includes("芝")) return "芝";
  return text;
}

function extractDistanceNumber(value) {
  const number = Number(safeString(value, "").match(/\d+/)?.[0] || 0);
  return Number.isFinite(number) ? number : 0;
}

function dateKeyToIso(value) {
  const key = getDateKeySafe(value);
  if (!key || key === "日付未設定") return "";
  const matched = key.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  return matched ? `${matched[1]}-${matched[2]}-${matched[3]}` : "";
}

function shiftIsoDate(value, days) {
  const iso = dateKeyToIso(value);
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function trackBiasNoteKey(note = {}) {
  return [
    safeString(note.date || ""),
    safeString(note.racecourse || ""),
    normalizeSurfaceLabel(note.surface || ""),
    safeString(note.raceId || ""),
    safeString(note.horseNumber || ""),
    safeString(note.finishPosition || ""),
  ].join("__");
}

function normalizeTrackBiasNote(note = {}) {
  const normalized = {
    id: note.id || trackBiasNoteKey(note),
    date: dateKeyToIso(note.date) || safeString(note.date || ""),
    racecourse: safeString(note.racecourse || ""),
    surface: normalizeSurfaceLabel(note.surface || ""),
    raceId: safeString(note.raceId || ""),
    horseNumber: safeString(note.horseNumber || ""),
    horseName: normalizeHorseName(note.horseName || ""),
    finishPosition: safeString(note.finishPosition || ""),
    coursePath: ["内", "中", "外", "不明"].includes(note.coursePath) ? note.coursePath : "不明",
    runningStyle: ["逃げ", "先行", "好位差し", "差し", "追込", "不明"].includes(note.runningStyle) ? note.runningStyle : "不明",
    createdAt: note.createdAt || "",
    updatedAt: note.updatedAt || "",
  };
  return { ...normalized, id: normalized.id || trackBiasNoteKey(normalized) };
}

function getTrackBiasNote(notes, race, row) {
  const safeRace = sanitizeRaceCard(race);
  const info = safeRace.raceInfo || {};
  const base = {
    date: info.raceDate || "",
    racecourse: info.track || "",
    surface: info.surface || "",
    raceId: safeRace.raceId || safeRace.id || "",
    horseNumber: row?.horseNumber || "",
    horseName: row?.horseName || "",
    finishPosition: row?.finish || "",
  };
  const key = trackBiasNoteKey(base);
  return normalizeTrackBiasNote(safeArray(notes).find((note) => note.id === key)
    || safeArray(notes).find((note) => note.raceId === base.raceId
      && safeString(note.horseNumber) === safeString(base.horseNumber)
      && safeString(note.finishPosition) === safeString(base.finishPosition))
    || base);
}

function getTrackBiasReferenceRaces(targetRace, raceCards = []) {
  const target = sanitizeRaceCard(targetRace);
  const info = target.raceInfo || {};
  const targetDate = dateKeyToIso(info.raceDate);
  const previousDate = shiftIsoDate(info.raceDate, -1);
  const targetSurface = normalizeSurfaceLabel(info.surface || "");
  const targetTrack = info.track || "";
  const dateSet = new Set([previousDate, targetDate].filter(Boolean));
  if (!targetDate || !targetTrack || !targetSurface) return [];
  return safeArray(raceCards)
    .map((race) => sanitizeRaceCard(race.raw || race))
    .filter((race) => {
      const raceInfo = race.raceInfo || {};
      const raceDate = dateKeyToIso(raceInfo.raceDate);
      return dateSet.has(raceDate)
        && raceInfo.track === targetTrack
        && normalizeSurfaceLabel(raceInfo.surface || "") === targetSurface;
    })
    .sort((a, b) =>
      safeString(a.raceInfo?.raceDate).localeCompare(safeString(b.raceInfo?.raceDate))
      || raceNumberValue(a) - raceNumberValue(b)
    );
}

function buildTrackBiasReferenceRows(referenceRaces = [], horseRecords = []) {
  return safeArray(referenceRaces).flatMap((race) => {
    const rows = sortResultRows(resultRowsFromRace(race, horseRecords)).filter(isFinishedResultRow).slice(0, 3);
    return rows.map((row) => ({ race, row }));
  });
}

function buildTrackBiasClockSummary(referenceRaces = [], averageTimes = [], horseRecords = []) {
  const diffs = [];
  safeArray(referenceRaces).forEach((race) => {
    const safeRace = sanitizeRaceCard(race);
    const info = safeRace.raceInfo || {};
    const winner = sortResultRows(resultRowsFromRace(safeRace, horseRecords)).find(isFinishedResultRow);
    const average = findAverageTime(averageTimes, info);
    const winnerSeconds = winner?.time ? toSeconds(winner.time) : null;
    const averageSeconds = average?.averageTime ? toSeconds(average.averageTime) : null;
    if (winnerSeconds != null && averageSeconds != null) diffs.push(winnerSeconds - averageSeconds);
  });
  if (diffs.length === 0) return { tendency: "", label: "判定材料不足", averageDiff: null, count: 0 };
  const averageDiff = diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
  if (averageDiff <= -1) return { tendency: "fast", label: `高速馬場（平均 ${averageDiff.toFixed(1)}秒）`, averageDiff, count: diffs.length };
  if (averageDiff >= 1) return { tendency: "slow", label: `時計がかかる（平均 +${averageDiff.toFixed(1)}秒）`, averageDiff, count: diffs.length };
  return { tendency: "standard", label: `標準（平均 ${averageDiff >= 0 ? "+" : ""}${averageDiff.toFixed(1)}秒）`, averageDiff, count: diffs.length };
}

function buildManualTrackBiasSummary(notes = [], referenceRows = []) {
  const normalizedNotes = safeArray(notes).map(normalizeTrackBiasNote);
  const matchedNotes = safeArray(referenceRows).map(({ race, row }) => getTrackBiasNote(normalizedNotes, race, row));
  const pathValues = matchedNotes.map((note) => note.coursePath).filter((value) => value && value !== "不明");
  const styleValues = matchedNotes.map((note) => note.runningStyle).filter((value) => value && value !== "不明");
  const count = (values, targets) => values.filter((value) => targets.includes(value)).length;
  const pathInner = count(pathValues, ["内"]);
  const pathOuter = count(pathValues, ["外"]);
  let pathTendency = "";
  let pathLabel = "判定材料不足";
  if (pathValues.length >= 3) {
    if (pathInner / pathValues.length >= 0.5) {
      pathTendency = "inner";
      pathLabel = `内有利（内 ${pathInner} / 入力済み ${pathValues.length}）`;
    } else if (pathOuter / pathValues.length >= 0.5) {
      pathTendency = "outer";
      pathLabel = `外伸び（外 ${pathOuter} / 入力済み ${pathValues.length}）`;
    } else {
      pathTendency = "flat";
      pathLabel = "フラット";
    }
  }

  const styleFront = count(styleValues, ["逃げ", "先行"]);
  const styleCloser = count(styleValues, ["差し", "追込"]);
  let styleTendency = "";
  let styleLabel = "判定材料不足";
  if (styleValues.length >= 3) {
    if (styleFront / styleValues.length >= 0.5) {
      styleTendency = "front";
      styleLabel = `先行有利（先行系 ${styleFront} / 入力済み ${styleValues.length}）`;
    } else if (styleCloser / styleValues.length >= 0.5) {
      styleTendency = "closer";
      styleLabel = `差し有利（差し系 ${styleCloser} / 入力済み ${styleValues.length}）`;
    } else {
      styleTendency = "flat";
      styleLabel = "フラット";
    }
  }
  return {
    notes: matchedNotes,
    inputCount: matchedNotes.filter((note) => note.coursePath !== "不明" || note.runningStyle !== "不明").length,
    pathInputCount: pathValues.length,
    styleInputCount: styleValues.length,
    pathTendency,
    pathLabel,
    styleTendency,
    styleLabel,
  };
}

function buildTrackBiasSummaryForRace(race, raceCards = [], averageTimes = [], horseRecords = [], trackBiasNotes = []) {
  const safeRace = sanitizeRaceCard(race);
  const info = safeRace.raceInfo || {};
  const referenceRaces = getTrackBiasReferenceRaces(safeRace, raceCards);
  const referenceRows = buildTrackBiasReferenceRows(referenceRaces, horseRecords);
  const clock = buildTrackBiasClockSummary(referenceRaces, averageTimes, horseRecords);
  const manual = buildManualTrackBiasSummary(trackBiasNotes, referenceRows);
  return {
    race: safeRace,
    track: info.track || "",
    surface: normalizeSurfaceLabel(info.surface || ""),
    referenceRaces,
    referenceRows,
    clock,
    manual,
    targetRaceCount: referenceRaces.length,
    inputCount: manual.inputCount,
  };
}

function detectRaceTendency(race, sameDateRaces = [], averageTimes = [], horseRecords = []) {
  const resultText = [
    race?.result?.trackBiasLabel,
    race?.result?.paceBiasLabel,
    race?.result?.biasNote,
  ].filter(Boolean).join(" ");
  if (/高速|速い/.test(resultText)) return "fast";
  if (/かかる|掛かる|タフ/.test(resultText)) return "slow";
  if (/内|前/.test(resultText)) return "inner";
  if (/外伸び|外/.test(resultText)) return "outer";
  const info = race?.raceInfo || {};
  const summaries = buildTrackTendencySummaries(sameDateRaces, averageTimes, horseRecords);
  const summary = summaries.find((item) => item.track === info.track && normalizeSurfaceLabel(item.surface) === normalizeSurfaceLabel(info.surface));
  const clock = safeString(summary?.clockLabel, "");
  const pace = safeString(summary?.paceLabel, "");
  if (/高速|速い/.test(clock)) return "fast";
  if (/かかる|掛かる/.test(clock)) return "slow";
  if (/先行/.test(pace)) return "inner";
  if (/差し/.test(pace)) return "outer";
  return "";
}

function getImportantFactorGroupsForRace(race, raceCards = [], averageTimes = [], horseRecords = [], trackBiasNotes = []) {
  const safeRace = sanitizeRaceCard(race);
  const info = safeRace.raceInfo || {};
  const track = info.track || "";
  const surface = normalizeSurfaceLabel(info.surface || "");
  const distance = extractDistanceNumber(info.distance);
  const sameDateRaces = safeArray(raceCards).filter((card) => {
    const cardInfo = sanitizeRaceCard(card).raceInfo || {};
    return cardInfo.raceDate && info.raceDate && cardInfo.raceDate === info.raceDate;
  });
  const candidates = importantFactorRules.filter((rule) => rule.track === track
    && rule.surface === surface
    && safeArray(rule.distances).includes(distance));
  if (candidates.length === 0) return { label: `${track}${surface}${distance || ""}${distance ? "m" : ""}`, tendency: "", groups: [] };
  const trackBiasSummary = buildTrackBiasSummaryForRace(safeRace, raceCards, averageTimes, horseRecords, trackBiasNotes);
  const candidateTendencies = new Set(candidates.map((rule) => rule.tendency).filter(Boolean));
  let tendency = detectRaceTendency(safeRace, sameDateRaces, averageTimes, horseRecords);
  if ((candidateTendencies.has("fast") || candidateTendencies.has("slow")) && ["fast", "slow"].includes(trackBiasSummary.clock.tendency)) {
    tendency = trackBiasSummary.clock.tendency;
  }
  if ((candidateTendencies.has("inner") || candidateTendencies.has("outer")) && ["inner", "outer"].includes(trackBiasSummary.manual.pathTendency)) {
    tendency = trackBiasSummary.manual.pathTendency;
  }
  const exact = candidates.filter((rule) => !rule.tendency || rule.tendency === tendency);
  const groups = exact.length > 0 ? exact : candidates;
  return {
    label: groups[0]?.label || `${track}${surface}${distance}m`,
    tendency,
    groups,
    unresolvedTendency: candidates.some((rule) => rule.tendency) && !tendency,
    trackBiasSummary,
  };
}

function getHorseFactorContext(entry, horseRecords = [], memos = [], raceCards = []) {
  const horseName = normalizeHorseName(entry.horseName);
  const records = getHorsePredictionRecords(horseName, horseRecords, raceCards);
  const horseMemos = safeArray(memos).filter((memo) => normalizeHorseName(memo.horseName) === horseName);
  const tags = [...new Set(horseMemos.flatMap((memo) => [
    ...safeArray(memo.tags),
    ...safeArray(memo.troubleTags),
    ...safeArray(memo.strongTags),
    ...safeArray(memo.buyTags),
  ]).filter(Boolean))];
  const memoText = horseMemos.map((memo) => [memo.memo, memo.nextRunNote].filter(Boolean).join(" ")).join(" ");
  const bestLast3f = records.map((record) => Number(record.last3f)).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b)[0];
  const bestFirstFurlong = getBestFirstFurlong(records);
  return { horseName, records, horseMemos, tags, memoText, bestLast3f, bestFirstFurlong };
}

function hasTagOrMemo(context, words) {
  const text = `${context.tags.join(" ")} ${context.memoText}`;
  return safeArray(words).some((word) => text.includes(word));
}

function bestFinishRecord(records, predicate) {
  return safeArray(records).filter((record) => isFinishedResultRow(record) && predicate(record)).sort((a, b) => resultSortValue(a) - resultSortValue(b))[0] || null;
}

function analyzeImportantFactor(factorName, entry, context, raceCards = []) {
  const records = safeArray(context.records);
  const frame = Number(entry.frameNumber || entry.frame || 0);
  const factor = safeString(factorName, "");
  const positive = (text) => ({ label: `${text}`, tone: "positive" });
  const neutral = (text = "該当データなし") => ({ label: text, tone: "neutral" });
  if (/先行|逃げ|好位/.test(factor)) {
    const frontCount = records.filter((record) => Number(record.corner4 || record.corner3) > 0 && Number(record.corner4 || record.corner3) <= 3).length;
    const tag = hasTagOrMemo(context, ["先行", "逃げ", "前で運ぶ", "好位"]);
    if (frontCount || tag || context.bestFirstFurlong !== "-") return positive(`4角3番手以内 ${frontCount}回 / 最速テン1F ${context.bestFirstFurlong}${tag ? " / 関連タグあり" : ""}`);
    return neutral();
  }
  if (/速い上がり|上がり/.test(factor)) {
    const tag = hasTagOrMemo(context, ["上がり優秀", "速い上がり", "末脚"]);
    if (context.bestLast3f || tag) return positive(`${context.bestLast3f ? `最速上がり ${context.bestLast3f.toFixed(1)}` : "上がりデータなし"}${tag ? " / 関連タグあり" : ""}`);
    return neutral();
  }
  if (/長い直線/.test(factor)) {
    const record = bestFinishRecord(records, (item) => ["東京", "新潟", "中京"].includes(item.track || item.racecourse || "") && Number(item.finish || 99) <= 3);
    const tag = hasTagOrMemo(context, ["長い直線", "長くいい脚", "直線不利"]);
    if (record || tag) return positive(record ? `${record.track || record.racecourse}${record.distance || ""} ${record.finish}着${tag ? " / 関連タグあり" : ""}` : "関連タグあり");
    return neutral();
  }
  if (/芝スタート/.test(factor)) {
    const record = bestFinishRecord(records, (item) => ["東京", "阪神", "中京", "福島"].includes(item.track || item.racecourse || "") && normalizeSurfaceLabel(item.surface) === "ダート" && [1150, 1400, 1600].includes(extractDistanceNumber(item.distance)) && Number(item.finish || 99) <= 3);
    if (record) return positive(`${record.track || record.racecourse}ダ${record.distance} ${record.finish}着`);
    return hasTagOrMemo(context, ["芝スタート"]) ? positive("芝スタートタグあり") : neutral("芝スタート実績なし");
  }
  if (/外枠/.test(factor)) return frame >= 6 ? positive(`${frame}枠で条件該当`) : neutral(`${frame || "-"}枠で条件非該当`);
  if (/内枠/.test(factor)) return frame >= 1 && frame <= 3 ? positive(`${frame}枠で条件該当`) : neutral(`${frame || "-"}枠で条件非該当`);
  if (/中枠|有利な枠/.test(factor)) return frame >= 4 ? positive(`${frame}枠で条件該当可能性あり`) : neutral(`${frame || "-"}枠`);
  if (/小回り|器用/.test(factor)) {
    const record = bestFinishRecord(records, (item) => ["中山", "福島", "小倉", "札幌", "函館"].includes(item.track || item.racecourse || "") && Number(item.finish || 99) <= 3);
    const tag = hasTagOrMemo(context, ["小回り", "器用", "立ち回り", "コーナリング得意"]);
    if (record || tag) return positive(record ? `${record.track || record.racecourse}${record.distance || ""} ${record.finish}着${tag ? " / 関連タグあり" : ""}` : "関連タグあり");
    return neutral();
  }
  if (/コーナリング.*苦手|コーナリング難/.test(factor)) return hasTagOrMemo(context, ["コーナリング難", "コーナリング苦手", "4角不利", "外々", "コーナー膨れる"]) ? positive("関連タグ・メモあり") : neutral("関連タグなし");
  if (/砂/.test(factor)) {
    const tag = hasTagOrMemo(context, ["砂被り嫌う", "砂を嫌がる", "包まれた", "内で包まれる"]);
    if (tag) return positive(`砂被り関連タグあり${frame >= 6 ? ` / ${frame}枠で条件好転可能性` : ""}`);
    return neutral("砂被り関連タグなし");
  }
  if (/1800|1400以上/.test(factor)) {
    const threshold = factor.includes("1800") ? 1800 : 1400;
    const record = bestFinishRecord(records, (item) => extractDistanceNumber(item.distance) >= threshold && Number(item.finish || 99) <= 2);
    return record ? positive(`${record.track || record.racecourse}${record.distance || ""} ${record.finish}着`) : neutral();
  }
  if (/時計/.test(factor)) {
    const tag = hasTagOrMemo(context, ["時計かかる", "時計のかかる", "高速馬場", "速い馬場"]);
    return tag ? positive("馬場時計関連タグあり") : neutral();
  }
  if (/坂/.test(factor)) {
    const record = bestFinishRecord(records, (item) => ["中山", "阪神", "中京", "東京"].includes(item.track || item.racecourse || "") && Number(item.finish || 99) <= 3);
    return record || hasTagOrMemo(context, ["坂実績", "坂"]) ? positive(record ? `${record.track || record.racecourse}${record.distance || ""} ${record.finish}着` : "坂関連タグあり") : neutral();
  }
  if (/平坦/.test(factor)) {
    const record = bestFinishRecord(records, (item) => ["新潟", "札幌", "函館"].includes(item.track || item.racecourse || "") && Number(item.finish || 99) <= 3);
    return record || hasTagOrMemo(context, ["平坦巧者"]) ? positive(record ? `${record.track || record.racecourse}${record.distance || ""} ${record.finish}着` : "平坦巧者タグあり") : neutral();
  }
  if (/下り坂/.test(factor)) {
    const record = bestFinishRecord(records, (item) => ["阪神", "小倉"].includes(item.track || item.racecourse || "") && Number(item.finish || 99) <= 3);
    return record || hasTagOrMemo(context, ["下り坂"]) ? positive(record ? `${record.track || record.racecourse}${record.distance || ""} ${record.finish}着` : "下り坂タグあり") : neutral();
  }
  if (/タフ/.test(factor)) return hasTagOrMemo(context, ["タフ", "時計のかかる", "渋太い"]) ? positive("タフさ関連タグ・メモあり") : neutral();
  if (/長くいい脚/.test(factor)) return hasTagOrMemo(context, ["長くいい脚", "早め進出", "まくり"]) ? positive("持続力系タグ・メモあり") : neutral();
  if (/能力上位/.test(factor)) {
    const wins = records.filter((record) => String(record.finish) === "1").length;
    const rating = context.horseMemos.map((memo) => normalizeRating(memo.rating || memo.attention)).find((value) => value);
    return wins || rating ? positive(`${rating ? `評価${rating}` : "評価なし"} / 勝利${wins}回`) : neutral("評価・勝利実績なし");
  }
  return neutral();
}

function sortRaceCardsRecent(raceCards) {
  return safeArray(raceCards).map(sanitizeRaceCard).sort((a, b) =>
    String(b.raceInfo?.raceDate || "").localeCompare(String(a.raceInfo?.raceDate || ""))
    || raceNumberValue(b) - raceNumberValue(a)
  );
}

function dayOfWeekJa(dateString) {
  const date = new Date(`${dateString || ""}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] || "";
}

function dateGroupLabel(dateString) {
  if (!dateString) return "日付未設定";
  const day = dayOfWeekJa(dateString);
  return `${formatDateSlash(dateString)}${day ? `（${day}）` : ""}`;
}

function sortRaceCardsForDateGroup(raceCards) {
  return safeArray(raceCards).map(sanitizeRaceCard).sort((a, b) => {
    const timeA = String(a.raceInfo?.raceTime || "");
    const timeB = String(b.raceInfo?.raceTime || "");
    if (timeA && timeB && timeA !== timeB) return timeA.localeCompare(timeB);
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;
    const trackCompare = String(a.raceInfo?.track || "").localeCompare(String(b.raceInfo?.track || ""));
    return trackCompare || raceNumberValue(a) - raceNumberValue(b);
  });
}

function groupRaceCardsByDate(raceCards) {
  const groups = new Map();
  sortRaceCardsRecent(raceCards).forEach((race) => {
    const safeRace = sanitizeRaceCard(race);
    const date = safeRace.raceInfo?.raceDate || "";
    const key = date || "date-unset";
    if (!groups.has(key)) groups.set(key, { key, date, label: dateGroupLabel(date), races: [] });
    groups.get(key).races.push(safeRace);
  });
  return [...groups.values()]
    .map((group) => ({ ...group, races: sortRaceCardsForDateGroup(group.races) }))
    .sort((a, b) => {
      if (a.date && b.date) return String(b.date).localeCompare(String(a.date));
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return 0;
    });
}

function groupHorseRecordsByRace(records) {
  const map = new Map();
  safeArray(records).forEach((record) => {
    const key = horseRecordRaceKey(record);
    if (key === "::::") return;
    const current = map.get(key) || {
      key,
      raceDate: record.raceDate || record.date || "",
      track: record.track || record.racecourse || "",
      raceNumber: normalizeRaceNumber(record.raceNumber || record.R || "") || String(record.raceNumber || ""),
      raceName: record.raceName || "",
      records: [],
    };
    current.records.push(record);
    map.set(key, current);
  });
  return [...map.values()].map((race) => ({
    ...race,
    label: `${race.raceDate || "日付未入力"} ${race.track || "競馬場未入力"}${raceNumberLabel(race.raceNumber)} ${race.raceName || ""}`.trim(),
    horseNames: race.records.map((record) => record.horseName).filter(Boolean),
  })).sort((a, b) => String(b.raceDate).localeCompare(String(a.raceDate)) || raceNumberLabel(a.raceNumber).localeCompare(raceNumberLabel(b.raceNumber)));
}

function raceIdForHorseRecord(record) {
  return record?.raceId || buildStableRaceId({
    date: record?.raceDate || record?.date || "",
    racecourse: record?.track || record?.racecourse || "",
    raceNumber: record?.raceNumber || record?.R || "",
  });
}

function raceInfoFromHorseRecord(record) {
  return {
    raceDate: record?.raceDate || record?.date || "",
    track: record?.track || record?.racecourse || "",
    raceNumber: normalizeRaceNumber(record?.raceNumber || record?.R || "") || String(record?.raceNumber || ""),
    raceName: record?.raceName || "",
    raceClass: record?.raceClass || "",
    surface: record?.surface || "",
    distance: record?.distance || "",
    going: record?.going || "",
  };
}

function buildRaceResultDeleteGroups(raceCards, horseRecords) {
  const map = new Map();
  sanitizeRaceCards(raceCards).forEach((race) => {
    const rows = resultRowsFromRace(race, horseRecords);
    if (!(race.status === "result_registered" || race.result || rows.length > 0)) return;
    const raceId = race.raceId || race.id;
    map.set(raceId, {
      raceId,
      raceInfo: race.raceInfo || sanitizeRaceInfo(race),
      entryCount: safeArray(race.entries).length,
      resultCount: rows.length,
      fromRaceCard: true,
    });
  });

  safeArray(horseRecords).forEach((record) => {
    const raceId = raceIdForHorseRecord(record);
    if (!raceId) return;
    const current = map.get(raceId) || {
      raceId,
      raceInfo: raceInfoFromHorseRecord(record),
      entryCount: 0,
      resultCount: 0,
      fromRaceCard: false,
    };
    current.resultCount += 1;
    if (!current.raceInfo?.raceName && record.raceName) current.raceInfo.raceName = record.raceName;
    map.set(raceId, current);
  });

  return [...map.values()]
    .filter((race) => race.resultCount > 0)
    .sort((a, b) => String(b.raceInfo?.raceDate || "").localeCompare(String(a.raceInfo?.raceDate || "")) || raceNumberValue({ raceInfo: b.raceInfo }) - raceNumberValue({ raceInfo: a.raceInfo }));
}

export function createKeibaApp(React, icons) {
  const { useEffect, useMemo, useState } = React;
  const h = React.createElement;
  const {
    CalendarDays,
    ChevronLeft,
    ClipboardList,
    Clock,
    ListChecks,
    Plus,
    Search,
    Star,
    Tag,
    Trash2,
    Trophy,
  } = icons;

  class AppErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error) {
      console.error("MyKeiba Note render error", error);
    }

    render() {
      if (this.state.hasError) {
        const diagnostics = getStorageDiagnostics();
        return h("div", { className: "app-shell" },
          h("section", { className: "screen" },
            h("div", { className: "error-panel" },
              h("h2", null, "登録データの一部を読み込めませんでした。データを確認してください"),
              h("p", null, "保存済みデータは全部削除しません。まず安全バックアップを書き出してから、必要なデータだけ復旧してください。"),
              h("div", { className: "recovery-actions" },
                h("button", { type: "button", className: "primary full-button", onClick: safeExportAllLocalStorage }, "安全バックアップを書き出す"),
                h("button", { type: "button", className: "secondary full-button", onClick: () => runRecoveryAction(emergencyResetRaceEntriesOnly) }, "出走表データだけ削除して復旧"),
                h("button", { type: "button", className: "secondary full-button", onClick: () => runRecoveryAction(emergencyResetRaceResultsOnly) }, "結果登録データだけ削除して復旧"),
                h("button", { type: "button", className: "secondary full-button", onClick: () => runRecoveryAction(restoreRaceCardsFromHorseRecords) }, "馬別成績から出走表を復元"),
                h("button", { type: "button", className: "secondary full-button", onClick: safeExportAllLocalStorage }, "バックアップを書き出す"),
                h("button", { type: "button", className: "secondary full-button", onClick: () => runRecoveryAction(isolateLatestProblemData) }, "問題のある直近データだけ隔離する"),
                h("button", { type: "button", className: "secondary full-button", onClick: () => runRecoveryAction(resetWeeklyRaceDataOnly) }, "今週のレースデータだけリセット"),
                h("button", { type: "button", className: "secondary full-button", onClick: () => runRecoveryAction(resetRaceEntriesOnly) }, "出走表データだけリセット"),
                h("button", { type: "button", className: "secondary full-button", onClick: () => runRecoveryAction(resetRaceResultsOnly) }, "結果登録データだけリセット"),
                h("button", { type: "button", className: "secondary full-button", onClick: returnToHomeSafely }, "通常画面に戻る")
              ),
              h("div", { className: "storage-debug" },
                h("h3", null, "保存データの状態"),
                h("p", null, `localStorageキー: ${diagnostics.keys.length ? diagnostics.keys.join(" / ") : "なし"}`),
                h("div", { className: "storage-debug-list" }, diagnostics.watched.map((item) => h("div", { key: item.label, className: "storage-debug-row" },
                  h("span", null, item.label),
                  h("strong", null, item.isolated && item.exists
                    ? `隔離済みデータ：あり。通常動作には影響しません / ${item.parseable ? "JSON OK" : "JSON不可"} / ${item.type}`
                    : `${item.exists ? "あり" : "なし"} / ${item.parseable ? "JSON OK" : "JSON不可"} / ${item.type}`)
                )))
              )
            )
          )
        );
      }
      return this.props.children;
    }
  }

  function App() {
    const [screen, setScreen] = useState("home");
    const [safeHomeMode] = useState(() => {
      const requested = localStorage.getItem(FORCE_HOME_STORAGE_KEY) === "1";
      if (requested) localStorage.removeItem(FORCE_HOME_STORAGE_KEY);
      return requested;
    });
    const [memos, setMemos] = useState(() => loadJson(MEMO_STORAGE_KEY));
    const [raceCards, setRaceCards] = useState(() => loadRaceCardsFromStorage());
    const [skipNextRaceSave, setSkipNextRaceSave] = useState(false);
    const [horseRecords, setHorseRecords] = useState(() => {
      const savedRecords = loadJson(HORSE_RECORDS_STORAGE_KEY);
      return savedRecords.length > 0 ? savedRecords : buildHorseRecordsFromRaceCards(sanitizeRaceCards(loadJson(RACE_STORAGE_KEY)));
    });
    const [averageTimes, setAverageTimes] = useState(() => mergeAverageTimes(loadJson(AVERAGE_TIMES_STORAGE_KEY), defaultAverageTimes));
    const [selectedHorse, setSelectedHorse] = useState("");
    const [selectedRaceId, setSelectedRaceId] = useState("");
    const [selectedPredictionRaceId, setSelectedPredictionRaceId] = useState("");
    const [paceNotes, setPaceNotes] = useState(() => loadJson(PACE_NOTES_STORAGE_KEY).map(normalizePaceNote));
    const [factorNotes, setFactorNotes] = useState(() => loadJson(FACTOR_NOTES_STORAGE_KEY).map(normalizeFactorNote));
    const [trackBiasNotes, setTrackBiasNotes] = useState(() => loadJson(TRACK_BIAS_NOTES_STORAGE_KEY).map(normalizeTrackBiasNote));
    const [navigationHistory, setNavigationHistory] = useState([]);
    const [toast, setToast] = useState("");

    useEffect(() => saveJson(MEMO_STORAGE_KEY, memos), [memos]);
    useEffect(() => {
      if (skipNextRaceSave) {
        localStorage.removeItem(FORCE_HOME_STORAGE_KEY);
        setSkipNextRaceSave(false);
      }
    }, [skipNextRaceSave]);
    useEffect(() => {
      const allRaceCards = getAllRaceCards();
      const mainRaceCards = normalizeStoredRaceCards(loadJson(RACE_STORAGE_KEY));
      if (allRaceCards.length > mainRaceCards.length) persistRaceCardsToStorage(allRaceCards);
      if (allRaceCards.length > 0) setRaceCards(allRaceCards);
    }, []);
    useEffect(() => saveJson(HORSE_RECORDS_STORAGE_KEY, horseRecords), [horseRecords]);
    useEffect(() => saveJson(AVERAGE_TIMES_STORAGE_KEY, averageTimes), [averageTimes]);
    useEffect(() => saveJson(PACE_NOTES_STORAGE_KEY, safeArray(paceNotes).map(normalizePaceNote)), [paceNotes]);
    useEffect(() => saveJson(FACTOR_NOTES_STORAGE_KEY, safeArray(factorNotes).map(normalizeFactorNote)), [factorNotes]);
    useEffect(() => saveJson(TRACK_BIAS_NOTES_STORAGE_KEY, safeArray(trackBiasNotes).map(normalizeTrackBiasNote)), [trackBiasNotes]);

    const horseStats = useMemo(() => {
      const map = new Map();
      safeArray(memos).forEach((memo) => {
        const horseName = normalizeHorseName(memo?.horseName);
        if (!horseName) return;
        const safeMemo = { ...memo, horseName, raceDate: memo.raceDate || "", track: memo.track || "", distance: memo.distance || "", attention: memo.attention || "C" };
        const current = map.get(horseName) || { horseName, count: 0, recordCount: 0, latest: safeMemo, maxAttention: "C" };
        current.count += 1;
        if (new Date(safeMemo.raceDate) > new Date(current.latest.raceDate)) current.latest = safeMemo;
        if ("ABC".indexOf(safeMemo.attention) < "ABC".indexOf(current.maxAttention)) current.maxAttention = safeMemo.attention;
        map.set(horseName, current);
      });
      safeArray(horseRecords).forEach((record) => {
        const horseName = normalizeHorseName(record.horseName);
        if (!horseName) return;
        const current = map.get(horseName) || {
          horseName,
          count: 0,
          recordCount: 0,
          latest: { raceDate: record.raceDate, track: record.track, raceNumber: record.raceNumber, distance: record.distance, confidence: "-", attention: "C" },
          maxAttention: "C",
        };
        current.recordCount = (current.recordCount || 0) + 1;
        if (!current.count && new Date(record.raceDate) > new Date(current.latest.raceDate)) {
          current.latest = { raceDate: record.raceDate, track: record.track, raceNumber: record.raceNumber, distance: record.distance, confidence: "-", attention: "C" };
        }
        map.set(horseName, current);
      });
      return [...map.values()].sort((a, b) => new Date(b.latest.raceDate) - new Date(a.latest.raceDate));
    }, [memos, horseRecords]);

    function notify(message) {
      setToast(message);
      setTimeout(() => setToast(""), 1800);
    }

    function navigate(nextScreen) {
      setNavigationHistory((current) => screen === nextScreen ? current : [...current, screen].slice(-20));
      setScreen(nextScreen);
    }

    function goBack() {
      setNavigationHistory((current) => {
        const previous = current[current.length - 1] || "home";
        setScreen(previous);
        return current.slice(0, -1);
      });
    }

    function goHome() {
      setNavigationHistory([]);
      setScreen("home");
    }

    function addMemo(memo) {
      const nextMemo = { ...memo, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setMemos((current) => [nextMemo, ...current]);
      notify("保存しました");
      navigate("list");
    }

    function saveHorseNote(note) {
      const now = new Date().toISOString();
      const normalized = {
        ...note,
        id: note.id || crypto.randomUUID(),
        horseName: normalizeHorseName(note.horseName),
        raceId: note.raceId || null,
        date: note.date || note.raceDate || "",
        racecourse: note.racecourse || note.track || "",
        raceDate: note.date || note.raceDate || "",
        track: note.racecourse || note.track || "",
        raceNumber: note.raceNumber || "",
        raceName: note.raceName || "",
        raceClass: note.raceClass || "",
        surface: note.surface || "",
        distance: note.distance || null,
        going: note.going || "",
        attention: ["A", "B", "C"].includes(note.rating) ? note.rating : "C",
        tags: safeArray(note.tags),
        troubleTags: safeArray(note.troubleTags || note.tags),
        strongTags: safeArray(note.strongTags),
        buyTags: safeArray(note.buyTags),
        rating: ["A", "B", "C"].includes(note.rating) ? note.rating : "C",
        nextRunNote: note.nextRunNote || "",
        memo: note.memo || "",
        createdAt: note.createdAt || now,
        updatedAt: now,
      };
      if (!normalized.horseName) return;
      setMemos((current) => [normalized, ...safeArray(current).filter((memo) => memo.id !== normalized.id)]);
      notify("回顧メモを保存しました");
    }

    function deleteHorseNote(id) {
      const confirmed = window.confirm("この回顧メモを削除します。よろしいですか？");
      if (!confirmed) return;
      setMemos((current) => safeArray(current).filter((memo) => memo.id !== id));
      notify("回顧メモを削除しました");
    }

    function addRaceCard(raceCard) {
      try {
        const now = new Date().toISOString();
        const beforeCount = loadJson(RACE_STORAGE_KEY).length;
        const nextRaceCard = sanitizeRaceCard(toStorageRaceCard({ ...raceCard, createdAt: now, updatedAt: now }));
        const entryCount = safeArray(nextRaceCard.entries).length;
        const { storageRace, next } = upsertRaceCardInStorage(nextRaceCard);
        const verification = verifyStoredRaceCard(storageRace.raceId, entryCount);
        const allRaceVerification = getAllRaceCards().some((race) => (race.id === storageRace.raceId || race.raceId === storageRace.raceId) && race.status === "entry_registered");
        if (!verification.ok || !allRaceVerification) {
          saveRaceSaveDebug({
            status: "NG",
            raceId: storageRace.raceId,
            message: allRaceVerification ? "保存確認NG：keiba-race-cards-v1 に保存されていません" : "保存確認NG：登録レースが getAllRaceCards に見つかりません",
            beforeCount,
            afterCount: verification.count,
            entryCount,
          });
          return {
            ok: false,
            message: allRaceVerification ? "localStorage保存後の確認に失敗しました" : "保存確認NG：登録レースが getAllRaceCards に見つかりません",
            debug: { beforeCount, afterCount: verification.count, raceId: storageRace.raceId, entryCount, verification },
          };
        }
        const nextCards = sanitizeRaceCards(next);
        setRaceCards(nextCards);
        setSelectedRaceId(storageRace.raceId);
        saveRaceSaveDebug({
          status: "OK",
          raceId: storageRace.raceId,
          message: `出走表を登録しました / 保存先：${RACE_STORAGE_KEY} / 登録レース：${nextRaceCard.raceInfo.track}${raceNumberLabel(nextRaceCard.raceInfo.raceNumber)} / 登録頭数：${entryCount}頭 / 保存確認：OK`,
          beforeCount,
          afterCount: verification.count,
          entryCount,
        });
        notify(`登録しました：${nextRaceCard.raceInfo.track}${raceNumberLabel(nextRaceCard.raceInfo.raceNumber)} ${nextRaceCard.raceInfo.raceName} / ${entryCount}頭`);
        setScreen("race");
        return {
          ok: true,
          message: `登録しました：${nextRaceCard.raceInfo.track}${raceNumberLabel(nextRaceCard.raceInfo.raceNumber)} ${nextRaceCard.raceInfo.raceName} / ${entryCount}頭`,
          confirmation: allRaceVerification
            ? `保存確認OK：登録レースが getAllRaceCards に存在します / entries ${verification.entryCount}頭`
            : `保存確認NG：登録レースが getAllRaceCards に見つかりません`,
          debug: { beforeCount, afterCount: verification.count, raceId: storageRace.raceId, entryCount, verification },
        };
      } catch (error) {
        console.error("Race card save failed", error);
        saveRaceSaveDebug({ status: "NG", raceId: "", message: "保存に失敗しました", error: String(error) });
        return { ok: false, message: "保存に失敗しました", debug: { error: String(error) } };
      }
    }

    function deleteRaceEntryOnly(raceId) {
      const normalizedRaceId = String(raceId || "").trim();
      if (!normalizedRaceId) return { ok: false };
      const allCards = getAllRaceCards();
      const target = allCards.find((race) => race.id === normalizedRaceId || race.raceId === normalizedRaceId);
      if (!target) return { ok: false };
      const hasResultData = hasRaceResult(target, horseRecords);
      const info = target.raceInfo || {};
      const label = `${info.raceDate || ""} ${info.track || ""}${raceNumberLabel(info.raceNumber)} ${info.raceName || ""}`.trim();
      const message = hasResultData
        ? `このレースは結果登録済みです。\n\n${label}\n\n出走表だけを削除しても、結果・馬別成績・回顧メモは残ります。\n本当に出走表だけ削除しますか？\n\n不安な場合は、先にバックアップを書き出してください。`
        : `この出走表を削除しますか？\n\n${label}\n\n出走馬情報は消えますが、すでに登録済みの結果・馬別成績・回顧メモは削除しません。\n不安な場合は、先にバックアップを書き出してください。`;
      if (!window.confirm(message)) return { ok: false, cancelled: true };
      const now = new Date().toISOString();
      const nextCards = hasResultData
        ? allCards.map((race) => {
          const same = race.id === normalizedRaceId || race.raceId === normalizedRaceId;
          if (!same) return race;
          return sanitizeRaceCard({ ...race, entries: [], entryDeleted: true, updatedAt: now });
        })
        : allCards.filter((race) => race.id !== normalizedRaceId && race.raceId !== normalizedRaceId);
      persistRaceCardsToStorage(nextCards);
      setRaceCards(sanitizeRaceCards(nextCards));
      notify(hasResultData ? "出走表だけ削除しました。結果は残っています。" : "出走表を削除しました。");
      if (!hasResultData) setScreen("races");
      return { ok: true, hasResult: hasResultData };
    }

    function deleteMemo(id) {
      setMemos((current) => current.filter((memo) => memo.id !== id));
    }

    function deleteHorseRecordsForHorse(horseName) {
      const normalizedName = normalizeHorseName(horseName);
      const count = safeArray(horseRecords).filter((record) => normalizeHorseName(record.horseName) === normalizedName).length;
      if (count === 0) return;
      const confirmed = window.confirm(`${normalizedName}の成績履歴を${count}件削除します。回顧メモは残します。よろしいですか？`);
      if (!confirmed) return;
      setHorseRecords((current) => safeArray(current).filter((record) => normalizeHorseName(record.horseName) !== normalizedName));
      notify(`${normalizedName}の成績履歴を削除しました`);
    }

    function deleteHorseMemosForHorse(horseName) {
      const normalizedName = normalizeHorseName(horseName);
      const count = safeArray(memos).filter((memo) => normalizeHorseName(memo.horseName) === normalizedName).length;
      if (count === 0) return;
      const confirmed = window.confirm(`${normalizedName}の回顧メモを${count}件削除します。成績履歴とは別の削除です。よろしいですか？`);
      if (!confirmed) return;
      setMemos((current) => safeArray(current).filter((memo) => normalizeHorseName(memo.horseName) !== normalizedName));
      notify(`${normalizedName}の回顧メモを削除しました`);
    }

    function deleteHorseRecordsForRace(targetRace) {
      const matched = safeArray(horseRecords).filter((record) => horseRecordRaceKey(record) === targetRace.key);
      if (matched.length === 0) return;
      const names = matched.map((record) => record.horseName).filter(Boolean).join("、");
      const confirmed = window.confirm(`対象レース：${targetRace.label}\n削除対象：${matched.length}頭分の成績\n削除対象馬：${names}\n\n回顧メモは残します。削除しますか？`);
      if (!confirmed) return;
      setHorseRecords((current) => safeArray(current).filter((record) => horseRecordRaceKey(record) !== targetRace.key));
      notify(`${targetRace.label}の成績を削除しました`);
    }

    function deleteRaceResultByRaceId(raceId) {
      const normalizedRaceId = String(raceId || "").trim();
      if (!normalizedRaceId) return { ok: false, count: 0 };

      const allCards = getAllRaceCards();
      const targetRace = allCards.find((race) => race.id === normalizedRaceId || race.raceId === normalizedRaceId);
      const targetInfo = targetRace?.raceInfo || {};
      const targetFallbackId = buildStableRaceId({
        date: targetInfo.raceDate || targetRace?.date || "",
        racecourse: targetInfo.track || targetRace?.racecourse || "",
        raceNumber: targetInfo.raceNumber || targetRace?.raceNumber || "",
      });
      const matchesRace = (record) => {
        const recordRaceId = record?.raceId || buildStableRaceId({
          date: record?.raceDate || record?.date || "",
          racecourse: record?.track || record?.racecourse || "",
          raceNumber: record?.raceNumber || record?.R || "",
        });
        return recordRaceId === normalizedRaceId || recordRaceId === targetFallbackId;
      };
      const deletedCount = safeArray(horseRecords).filter(matchesRace).length;

      setHorseRecords((current) => safeArray(current).filter((record) => !matchesRace(record)));

      const updatedCards = allCards.map((race) => {
        const sameRace = race.id === normalizedRaceId || race.raceId === normalizedRaceId || race.id === targetFallbackId || race.raceId === targetFallbackId;
        if (!sameRace) return race;
        return sanitizeRaceCard({
          ...race,
          result: null,
          results: [],
          status: "entry_registered",
          updatedAt: new Date().toISOString(),
        });
      });
      persistRaceCardsToStorage(updatedCards);
      setRaceCards(updatedCards);

      const legacyResults = loadJson("raceResults");
      if (safeArray(legacyResults).length > 0) {
        saveJson("raceResults", safeArray(legacyResults).filter((item) => {
          const itemRaceId = item?.raceId || item?.id || "";
          return itemRaceId !== normalizedRaceId && itemRaceId !== targetFallbackId;
        }));
      }

      notify(`レース成績を削除しました（${deletedCount}頭分）`);
      return { ok: true, count: deletedCount };
    }

    function deleteEntryOnlyHorseRecords() {
      const targets = safeArray(horseRecords).filter(isEntryOnlyHorseRecord);
      if (targets.length === 0) {
        notify("出走表登録だけで作られた成績は見つかりませんでした");
        return;
      }
      const names = targets.map((record) => record.horseName).filter(Boolean).slice(0, 12).join("、");
      const confirmed = window.confirm(`出走表登録で誤って作られた可能性のある成績を${targets.length}件削除します。\n対象例：${names}${targets.length > 12 ? "…" : ""}\n\n回顧メモ、平均タイム、実際の結果データは残します。よろしいですか？`);
      if (!confirmed) return;
      setHorseRecords((current) => safeArray(current).filter((record) => !isEntryOnlyHorseRecord(record)));
      notify(`出走表登録だけで作られた成績を${targets.length}件削除しました`);
    }

    function saveRaceResult(raceId, result, raceInfoPatch = {}) {
      const allRaceCards = loadRaceCardsFromStorage();
      const targetRace = sanitizeRaceCards([...raceCards, ...allRaceCards]).find((race) => race.id === raceId || race.raceId === raceId);
      const raceForRecord = targetRace ? { ...targetRace, raceInfo: { ...targetRace.raceInfo, ...raceInfoPatch } } : null;
      if (targetRace) {
        setHorseRecords((current) => upsertHorseRecords(current, raceForRecord, result));
      }
      const updatedRace = sanitizeRaceCard({ ...(targetRace || {}), id: raceId, raceId, raceInfo: { ...(targetRace?.raceInfo || {}), ...raceInfoPatch }, result, status: "result_registered" });
      const nextCards = [updatedRace, ...sanitizeRaceCards(allRaceCards).filter((race) => race.id !== updatedRace.id && race.raceId !== updatedRace.raceId)];
      persistRaceCardsToStorage(nextCards);
      setRaceCards(nextCards);
      notify("レース結果を保存しました");
      navigate("race");
    }

    function openResultImport(raceId) {
      setSelectedRaceId(raceId);
      navigate("result");
    }

    function openRaceDetail(raceId) {
      setSelectedRaceId(raceId);
      navigate("race");
    }

    function openPredictionRace(raceId) {
      setSelectedPredictionRaceId(raceId);
      navigate("predictionRace");
    }

    function openPacePrediction(raceId) {
      setSelectedPredictionRaceId(raceId);
      navigate("pacePrediction");
    }

    function openImportantFactors(raceId) {
      setSelectedPredictionRaceId(raceId);
      navigate("importantFactors");
    }

    function openTrackBias(raceId) {
      setSelectedPredictionRaceId(raceId);
      navigate("trackBias");
    }

    function savePacePredictionNote(raceId, entry, patch) {
      const now = new Date().toISOString();
      const key = paceNoteKey(raceId, entry);
      setPaceNotes((current) => {
        const existing = getPaceNote(current, raceId, entry);
        const nextNote = normalizePaceNote({
          ...existing,
          ...patch,
          id: key,
          raceId,
          horseNumber: entry.horseNumber || existing.horseNumber || "",
          horseName: entry.horseName || existing.horseName || "",
          createdAt: existing.createdAt || now,
          updatedAt: now,
        });
        return [nextNote, ...safeArray(current).filter((note) => note.id !== key)];
      });
    }

    function saveFactorNote(raceId, entry, factorName, memo) {
      const now = new Date().toISOString();
      const key = factorNoteKey(raceId, entry, factorName);
      setFactorNotes((current) => {
        const existing = getFactorNote(current, raceId, entry, factorName);
        const nextNote = normalizeFactorNote({
          ...existing,
          id: key,
          raceId,
          horseNumber: entry.horseNumber || existing.horseNumber || "",
          horseName: entry.horseName || existing.horseName || "",
          factorName,
          memo,
          createdAt: existing.createdAt || now,
          updatedAt: now,
        });
        return [nextNote, ...safeArray(current).filter((note) => note.id !== key)];
      });
    }

    function saveTrackBiasNote(patch) {
      const now = new Date().toISOString();
      const base = normalizeTrackBiasNote({ ...patch, updatedAt: now, createdAt: patch.createdAt || now });
      const key = trackBiasNoteKey(base);
      const nextNote = normalizeTrackBiasNote({ ...base, id: key });
      setTrackBiasNotes((current) => [nextNote, ...safeArray(current).filter((note) => note.id !== key)]);
    }

    function openHorse(horseName) {
      setSelectedHorse(normalizeHorseName(horseName));
      navigate("horse");
    }

    return h(AppErrorBoundary, null,
      h("div", { className: "app-shell" },
        h(Header, { screen, goBack, goHome }),
        h("main", null,
          screen === "home" && h(Home, { raceCards, horseRecords, setScreen: navigate, openRaceDetail, safeHomeMode }),
          screen === "add" && h(AddMemo, { onSave: addMemo, onCancel: goBack }),
          screen === "import" && h(RaceImport, { onSave: addRaceCard }),
          screen === "result" && h(ResultImport, { raceCards, horseRecords, selectedRaceId, averageTimes, onSave: saveRaceResult, openHorse }),
        screen === "race" && h(RaceDetail, { raceCards, selectedRaceId, averageTimes, horseRecords, openHorse, openResultImport, setScreen: navigate, goBack, goHome, deleteRaceEntryOnly }),
        screen === "races" && h(RegisteredRaceList, { raceCards, averageTimes, horseRecords, openRaceDetail, deleteRaceEntryOnly, setScreen: navigate }),
        screen === "prediction" && h(PredictionPage, { raceCards, horseRecords, openPredictionRace }),
        screen === "predictionRace" && h(PredictionRacePage, { selectedRaceId: selectedPredictionRaceId, raceCards, horseRecords, memos, paceNotes, averageTimes, trackBiasNotes, openHorse, openRaceDetail, openPacePrediction, openImportantFactors, openTrackBias }),
        screen === "pacePrediction" && h(PacePredictionDetailPage, { selectedRaceId: selectedPredictionRaceId, raceCards, horseRecords, paceNotes, onSaveNote: savePacePredictionNote }),
        screen === "importantFactors" && h(ImportantFactorDetailPage, { selectedRaceId: selectedPredictionRaceId, raceCards, horseRecords, memos, averageTimes, factorNotes, trackBiasNotes, onSaveFactorNote: saveFactorNote }),
        screen === "trackBias" && h(TrackBiasDetailPage, { selectedRaceId: selectedPredictionRaceId, raceCards, horseRecords, averageTimes, trackBiasNotes, onSaveTrackBiasNote: saveTrackBiasNote }),
        screen === "deleteResults" && h(RaceResultDeleteScreen, { raceCards, horseRecords, onDeleteResult: deleteRaceResultByRaceId }),
        screen === "average" && h(AverageTimesScreen, { averageTimes }),
        screen === "diagnostic" && h(DataDiagnosticScreen, { setScreen: navigate }),
        screen === "backup" && h(BackupScreen, { memos, raceCards, horseRecords, averageTimes, setMemos, setRaceCards, setHorseRecords, setAverageTimes, notify, setScreen: navigate, deleteEntryOnlyHorseRecords }),
          screen === "list" && h(HorseList, { horseStats, horseRecords, openHorse, setScreen: navigate }),
          screen === "search" && h(HorseSearch, { horseStats, openHorse }),
          screen === "horse" && h(HorsePage, { horseName: selectedHorse, memos, horseRecords, saveHorseNote, deleteHorseNote, deleteMemo, setScreen: navigate, goBack, goHome, openRaceDetail })
        ),
        h(BottomNav, { screen, setScreen: navigate }),
        toast && h("div", { className: "toast" }, toast)
      ),
    );
  }

  function Header({ screen, goBack, goHome }) {
    const titles = {
      home: "MyKeiba Note",
      add: "回顧メモ追加",
      import: "出走表インポート",
      result: "結果インポート",
      race: "レース詳細",
      races: "登録済みレース一覧",
      prediction: "予想",
      predictionRace: "馬柱",
      pacePrediction: "展開予想",
      importantFactors: "重要ファクター",
      trackBias: "トラックバイアス",
      deleteResults: "レース成績を削除",
      average: "平均タイム",
      diagnostic: "データ診断",
      backup: "設定",
      list: "馬別成績一覧",
      search: "馬名検索",
      horse: "メモ履歴",
    };
    return h("header", { className: "topbar" },
      screen !== "home"
        ? h("button", { className: "icon-button", onClick: goBack, "aria-label": "戻る" }, h(ChevronLeft, { size: 22 }))
        : h("div", { className: "brand-mark" }, h(Trophy, { size: 20 })),
      h("div", null, h("p", { className: "eyebrow" }, "自分用"), h("h1", null, titles[screen])),
      screen !== "home" && h("button", { type: "button", className: "home-link-button", onClick: goHome }, "ホームへ")
    );
  }

  function Home({ raceCards, horseRecords, setScreen, openRaceDetail, safeHomeMode }) {
    const allRaceCards = getAllRaceCards();
    const displayRaceCards = allRaceCards.length > 0 ? allRaceCards : safeArray(raceCards);
    const recentRaceCards = sortRaceCardsRecent(displayRaceCards).slice(0, 24);

    return h("section", { className: "screen home" },
      safeHomeMode && h("div", { className: "warning-panel" }, "安全表示でホームを開きました。馬別成績、回顧メモ、平均タイムは残しています。出走表を再登録できます。"),
      storageWarnings.length > 0 && h("div", { className: "warning-panel" }, [...new Set(storageWarnings)].join(" ")),
      h("div", { className: "home-actions" },
        h(HomeAction, { title: "レース結果インポート", text: "登録済みレースに結果を貼り付け", icon: h(ClipboardList, { size: 20 }), onClick: () => setScreen("result") }),
        h(HomeAction, { title: "馬名検索", text: "メモと成績から馬を探す", icon: h(Search, { size: 20 }), onClick: () => setScreen("search") }),
        h(HomeAction, { title: "馬別成績一覧", text: "馬ごとの履歴を見る", icon: h(ListChecks, { size: 20 }), onClick: () => setScreen("list") }),
        h(HomeAction, { title: "登録済みレース一覧", text: "保存した全レースを見る", icon: h(Trophy, { size: 20 }), onClick: () => setScreen("races") }),
        h(HomeAction, { title: "回顧メモ追加", text: "気づいた馬をメモする", icon: h(Plus, { size: 20 }), onClick: () => setScreen("add") }),
        h(HomeAction, { title: "今週のレース", text: "登録済みレース一覧へ", icon: h(Trophy, { size: 20 }), onClick: () => document.getElementById("weekly-races")?.scrollIntoView({ behavior: "smooth" }) }),
        h(HomeAction, { title: "出走表インポート", text: "今週のレースを登録する", icon: h(ClipboardList, { size: 20 }), onClick: () => setScreen("import") }),
        h(HomeAction, { title: "バックアップ / 復元", text: "JSONで保存・読み込み", icon: h(ClipboardList, { size: 20 }), onClick: () => setScreen("backup") }),
        h(HomeAction, { title: "レース成績を削除", text: "結果だけを消して出走表は残す", icon: h(Trash2, { size: 20 }), onClick: () => setScreen("deleteResults") }),
        h(HomeAction, { title: "平均タイム管理", text: "条件別の平均時計を見る", icon: h(Clock, { size: 20 }), onClick: () => setScreen("average") })
      ),
      h("div", { id: "weekly-races" }, h(SectionTitle, { icon: h(ClipboardList, { size: 18 }), title: "直近24レース" })),
      recentRaceCards.length === 0
        ? h(EmptyState, { title: "登録済みの出走表はありません", text: "コピーした出走表を貼り付けて、まずは1レース登録できます。" })
        : h("div", { className: "compact-race-list" }, recentRaceCards.map((race) => h(RaceListItem, { key: race.id, race, horseRecords, onOpen: () => openRaceDetail(race.id) })))
    );
  }

  function HomeAction({ title, text, icon, onClick }) {
    return h("button", { type: "button", className: "home-action", onClick },
      h("span", { className: "home-action-icon" }, icon),
      h("span", null, h("strong", null, title), h("small", null, text))
    );
  }

  function RaceImport({ onSave }) {
    const [raceInfo, setRaceInfo] = useState(emptyRaceInfo);
    const [pasteText, setPasteText] = useState("");
    const [entries, setEntries] = useState([]);
    const [warning, setWarning] = useState("");
    const [saveMessage, setSaveMessage] = useState("");
    const [saveDebug, setSaveDebug] = useState({ beforeCount: loadJson(RACE_STORAGE_KEY).length, afterCount: loadJson(RACE_STORAGE_KEY).length, raceId: "", status: "未保存" });
    const [showPreview, setShowPreview] = useState(false);
    const [importFormat, setImportFormat] = useState("");
    const safeEntries = safeArray(entries).map(sanitizeRaceEntry);
    const validEntryCount = safeEntries.filter((entry) => normalizeHorseName(entry.horseName)).length;
    const unparsedEntryCount = Math.max(0, safeEntries.length - validEntryCount);

    function updateInfo(field, value) {
      setRaceInfo((current) => ({ ...current, [field]: value }));
    }

    function updateEntry(id, field, value) {
      setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, [field]: value, parsed: true } : entry));
    }

    function addManualEntry() {
      setEntries((current) => [...current, makeUnparsedRow("")]);
    }

    function analyze() {
      const parsedEntries = parseRaceEntries(pasteText);
      setEntries(parsedEntries);
      setImportFormat(parsedEntries.some((entry) => entry.importSource === "netkeiba形式") ? "netkeiba形式" : (parsedEntries.some((entry) => entry.parsed) ? "JRA公式形式" : "未判定"));
      const validCount = parsedEntries.filter((entry) => normalizeHorseName(entry.horseName)).length;
      const skippedCount = Math.max(0, parsedEntries.length - validCount);
      setWarning(parsedEntries.length === 0
        ? "馬名が1件も取得できていません。手入力行を追加して修正できます。"
        : `${validCount}件登録できます。${skippedCount}件は未解析です。空欄は必要なら修正してください。`);
    }

    function submit(event) {
      event.preventDefault();
      const preparedRaceCard = {
        raceInfo: {
          ...raceInfo,
          raceClass: raceInfo.raceClass ? normalizeRaceClass(raceInfo.raceClass) : "",
          distance: String(raceInfo.distance || "").trim(),
          raceName: String(raceInfo.raceName || "").trim(),
          surface: raceInfo.surface || "",
          going: raceInfo.going || "",
        },
        entries: safeEntries.map(({ id, frameNumber, horseNumber, horseName, sexAge, popularity, jockey, carriedWeight, raw, parsed, status, isScratched }) => ({
          id,
          frameNumber: String(frameNumber || "").trim(),
          horseNumber: String(horseNumber || "").trim(),
          horseName: String(horseName || "").trim(),
          sexAge: String(sexAge || "").trim(),
          popularity: String(popularity || "").trim(),
          jockey: String(jockey || "").trim(),
          carriedWeight: String(carriedWeight || "").trim(),
          raw: raw || "",
          parsed: Boolean(parsed),
          status: isScratched ? "取消" : String(status || "").trim(),
          isScratched: Boolean(isScratched || status === "取消"),
        })),
      };
      const validation = validateRaceCard(preparedRaceCard);
      if (validation.errors.length > 0) {
        setWarning(validation.errors.join(" "));
        setSaveMessage("");
        setSaveDebug((current) => ({ ...current, status: "失敗" }));
        return;
      }
      const inspection = inspectRaceCardBeforeSave(validation.race, getAllRaceCards());
      if (inspection.fatals.length > 0) {
        setWarning(`登録できません：${inspection.fatals.join(" / ")}`);
        setSaveMessage("");
        setSaveDebug((current) => ({ ...current, status: "失敗" }));
        return;
      }
      let raceToSave = validation.race;
      if (inspection.sameRace) {
        const choice = window.prompt(`同じレースの出走表がすでに登録されています。\n\n${inspection.warnings.join("\n")}\n\n入力してください：\n1 = キャンセル\n2 = 別データとして保存\n3 = 既存の出走表を上書き`, "3");
        if (choice === "1" || choice == null) {
          setWarning("登録をキャンセルしました。手修正画面に戻れます。");
          return;
        }
        if (choice === "2") {
          const suffix = `copy-${Date.now()}`;
          raceToSave = sanitizeRaceCard({ ...validation.race, id: `${inspection.raceId}-${suffix}`, raceId: `${inspection.raceId}-${suffix}` });
        }
      } else if (inspection.warnings.length > 0) {
        const confirmed = window.confirm(`登録予定データに確認が必要な項目があります。\n\n${inspection.warnings.join("\n")}\n\nそれでも登録しますか？\nキャンセルすると手修正画面に戻ります。`);
        if (!confirmed) {
          setWarning(inspection.warnings.join(" "));
          return;
        }
      }
      const result = onSave(raceToSave);
      if (!result?.ok) {
        setWarning(result?.message || "保存に失敗しました");
        setSaveMessage("");
        setSaveDebug({ beforeCount: result?.debug?.beforeCount ?? loadJson(RACE_STORAGE_KEY).length, afterCount: result?.debug?.afterCount ?? loadJson(RACE_STORAGE_KEY).length, raceId: result?.debug?.raceId || "", status: "失敗" });
        return;
      }
      setWarning("");
      setSaveMessage(`${result.message} / ${result.confirmation}`);
      setSaveDebug({ beforeCount: result.debug.beforeCount, afterCount: result.debug.afterCount, raceId: result.debug.raceId, status: "成功" });
    }

    return h("form", { className: "screen form-screen", onSubmit: submit },
      h("div", { className: "two-col" },
        h(Field, { label: "開催日", required: true }, h("input", { type: "date", value: raceInfo.raceDate, onChange: (event) => updateInfo("raceDate", event.target.value) })),
        h(Field, { label: "競馬場" }, h("select", { value: raceInfo.track, onChange: (event) => updateInfo("track", event.target.value) }, tracks.map((track) => h("option", { key: track }, track))))
      ),
      h("div", { className: "two-col" },
        h(Field, { label: "レース番号", required: true }, h("input", { inputMode: "numeric", value: raceInfo.raceNumber, onChange: (event) => updateInfo("raceNumber", event.target.value), placeholder: "11" }))
      ),
      h(Field, { label: "レース名" }, h("input", { value: raceInfo.raceName, onChange: (event) => updateInfo("raceName", event.target.value), placeholder: "例：○○ステークス" })),
      h("div", { className: "three-col" },
        h(Field, { label: "芝/ダート" }, h("select", { value: raceInfo.surface, onChange: (event) => updateInfo("surface", event.target.value) }, surfaceOptions.map((surface) => h("option", { key: surface }, surface)))),
        h(Field, { label: "距離" }, h("input", { inputMode: "numeric", value: raceInfo.distance, onChange: (event) => updateInfo("distance", event.target.value), placeholder: "1600" })),
        h(Field, { label: "馬場状態" }, h("select", { value: raceInfo.going, onChange: (event) => updateInfo("going", event.target.value) }, goingOptions.map((going) => h("option", { key: going }, going))))
      ),
      h("div", { className: "two-col" },
        h(Field, { label: "クラス" }, h("select", { value: raceInfo.raceClass, onChange: (event) => updateInfo("raceClass", event.target.value) }, raceClassOptions.map((item) => h("option", { key: item }, item)))),
        h(Field, { label: "コース区分" }, h("select", { value: raceInfo.courseType, onChange: (event) => updateInfo("courseType", event.target.value) }, courseTypeOptions.map((item) => h("option", { key: item, value: item }, item || "通常"))))
      ),
      h(Field, { label: "出走表テキスト" }, h("textarea", {
        value: pasteText,
        onChange: (event) => setPasteText(event.target.value),
        placeholder: "JRAや競馬サイトのスマホ向け出馬表をそのまま貼り付け",
        rows: 8,
      })),
      h("div", { className: "form-actions inline-actions" },
        h("button", { type: "button", className: "secondary", onClick: addManualEntry }, "手入力行を追加"),
        h("button", { type: "button", className: "primary", onClick: analyze }, "解析")
      ),
      h(SectionTitle, { icon: h(ClipboardList, { size: 18 }), title: `抽出結果 ${entries.length}頭` }),
      warning && h("div", { className: "warning-panel" }, warning),
      saveMessage && h("div", { className: "success-panel" }, saveMessage),
      importFormat && h("p", { className: "import-format-label" }, `解析形式：${importFormat}`),
      h("div", { className: "form-actions inline-actions" },
        h("button", { type: "button", className: "secondary", onClick: () => setShowPreview((current) => !current) }, "保存予定データを確認")
      ),
      showPreview && h(RegistrationPreview, {
        title: "出走表の登録予定",
        raceInfo,
        rows: safeEntries,
        validCount: validEntryCount,
        unparsedCount: unparsedEntryCount,
        importFormat,
      }),
      entries.length === 0
        ? h(EmptyState, { title: "まだ解析結果がありません", text: "出走表テキストを貼り付けて解析してください。" })
        : h("div", { className: "entry-stack" }, entries.map((entry, index) => h(EntryEditor, { key: entry.id, entry, index, updateEntry }))),
      h("div", { className: "form-actions" },
        h("button", { type: "button", className: "secondary", onClick: () => setEntries([]) }, "結果クリア"),
        h("button", { className: "primary" }, "登録")
      ),
      h("section", { className: "debug-panel" },
        h("h3", null, "登録デバッグ"),
        h("p", null, `解析済み entries 件数: ${safeEntries.length}`),
        h("p", null, `保存先キー: ${RACE_STORAGE_KEY}`),
        h("p", null, `登録前の保存件数: ${saveDebug.beforeCount}`),
        h("p", null, `登録後の保存件数: ${saveDebug.afterCount}`),
        h("p", null, `最後に登録した raceId: ${saveDebug.raceId || "-"}`),
        h("p", null, `最後の保存結果: ${saveDebug.status}`)
      ),

    );
  }

  function EntryEditor({ entry, index, updateEntry }) {
    return h("article", { className: `entry-card ${entry.parsed ? "" : "unparsed"}` },
      h("div", { className: "entry-head" },
        h("strong", null, entry.parsed ? `${index + 1}頭目` : "未解析"),
        isUnavailableEntry(entry) && h("span", { className: "scratch-badge" }, normalizeResultStatus(entry.status) || "取消"),
        entry.raw && h("span", null, entry.raw)
      ),
      h("div", { className: "entry-grid" },
        h(Field, { label: "枠" }, h("input", { inputMode: "numeric", value: entry.frameNumber, onChange: (event) => updateEntry(entry.id, "frameNumber", event.target.value) })),
        h(Field, { label: "馬番" }, h("input", { inputMode: "numeric", value: entry.horseNumber, onChange: (event) => updateEntry(entry.id, "horseNumber", event.target.value) })),
        h(Field, { label: "馬名" }, h("input", { value: entry.horseName, onChange: (event) => updateEntry(entry.id, "horseName", event.target.value) })),
        h(Field, { label: "性齢" }, h("input", { value: entry.sexAge || "", onChange: (event) => updateEntry(entry.id, "sexAge", event.target.value), placeholder: "牡3" })),
        h(Field, { label: "人気" }, h("input", { inputMode: "numeric", value: entry.popularity || "", onChange: (event) => updateEntry(entry.id, "popularity", event.target.value) })),
        h(Field, { label: "騎手" }, h("input", { value: entry.jockey, onChange: (event) => updateEntry(entry.id, "jockey", event.target.value) })),
        h(Field, { label: "斤量" }, h("input", { inputMode: "decimal", value: entry.carriedWeight, onChange: (event) => updateEntry(entry.id, "carriedWeight", event.target.value) }))
      )
    );
  }

  function ResultImport({ raceCards, horseRecords, selectedRaceId, averageTimes, onSave, openHorse }) {
    const storedRaceCards = getAllRaceCards();
    const safeRaceCards = sanitizeRaceCards(storedRaceCards.length > 0 ? storedRaceCards : safeArray(raceCards));
    const status = raceStorageStatus();
    const initialRaceId = selectedRaceId || safeRaceCards[0]?.id || "";
    const [raceId, setRaceId] = useState(initialRaceId);
    const currentRace = safeRaceCards.find((race) => race.id === raceId || race.raceId === raceId) || safeRaceCards[0];
    const selectedValue = currentRace?.id || raceId || "";
    const [pasteText, setPasteText] = useState("");
    const [averageWinningTime, setAverageWinningTime] = useState(currentRace?.result?.averageWinningTime || "");
    const [raceInfoDraft, setRaceInfoDraft] = useState(() => ({
      raceDate: currentRace?.raceInfo?.raceDate || "",
      track: currentRace?.raceInfo?.track || "東京",
      raceNumber: currentRace?.raceInfo?.raceNumber || "",
      raceName: currentRace?.raceInfo?.raceName || "",
      surface: currentRace?.raceInfo?.surface || "芝",
      distance: currentRace?.raceInfo?.distance || "",
      raceClass: normalizeRaceClass(currentRace?.raceInfo?.raceClass || "未勝利"),
      courseType: currentRace?.raceInfo?.courseType || "",
      going: currentRace?.raceInfo?.going || "良",
    }));
    const [rows, setRows] = useState(safeArray(currentRace?.result?.rows).map(sanitizeResultRow));
    const [warning, setWarning] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const safeRows = safeArray(rows).map(sanitizeResultRow);
    const validResultCount = safeRows.filter((row) => normalizeHorseName(row.horseName)).length;
    const unparsedResultCount = Math.max(0, safeRows.length - validResultCount);
    const resultPreview = buildRaceResult(rows, averageWinningTime, pasteText, raceInfoDraft);
    const matchedAverageTime = findAverageTime(averageTimes, raceInfoDraft);

    useEffect(() => {
      if (!currentRace) return;
      if (currentRace.id && raceId !== currentRace.id) setRaceId(currentRace.id);
      setRaceInfoDraft({
        raceDate: currentRace.raceInfo?.raceDate || "",
        track: currentRace.raceInfo?.track || "東京",
        raceNumber: currentRace.raceInfo?.raceNumber || "",
        raceName: currentRace.raceInfo?.raceName || "",
        surface: currentRace.raceInfo?.surface || "芝",
        distance: currentRace.raceInfo?.distance || "",
        raceClass: normalizeRaceClass(currentRace.raceInfo?.raceClass || "未勝利"),
        courseType: currentRace.raceInfo?.courseType || "",
        going: currentRace.raceInfo?.going || "良",
      });
      setAverageWinningTime(currentRace.result?.averageWinningTime || "");
      setRows(safeArray(currentRace.result?.rows).map(sanitizeResultRow));
      setWarning("");
      setShowPreview(false);
    }, [raceId, safeRaceCards.length]);

    useEffect(() => {
      if (currentRace?.result?.averageWinningTime) return;
      const found = findAverageTime(averageTimes, raceInfoDraft);
      if (found) setAverageWinningTime(found.averageTime);
    }, [averageTimes, raceInfoDraft.track, raceInfoDraft.surface, raceInfoDraft.distance, raceInfoDraft.raceClass, raceInfoDraft.courseType, raceInfoDraft.going]);

    function updateRow(id, field, value) {
      setRows((current) => current.map((row) => row.id === id ? {
        ...row,
        [field]: value,
        parsed: true,
      } : row));
    }

    function analyze() {
      const parsedRows = parseResultRows(pasteText, currentRace);
      const validCount = parsedRows.filter((row) => normalizeHorseName(row.horseName)).length;
      const skippedCount = Math.max(0, parsedRows.length - validCount);
      setRows(parsedRows);
      setWarning(parsedRows.length === 0
        ? "馬名と着順が入っている結果が1件もありません。手入力行を追加して修正できます。"
        : `${validCount}件登録できます。${skippedCount}件は未解析です。空欄は必要なら修正してください。`);
    }

    function addManualRow() {
      setRows((current) => [...current, makeResultRow("")]);
    }

    function submit(event) {
      event.preventDefault();
      if (!selectedValue || !currentRace) {
        setWarning("対象レースが選ばれていません。先に出走表を登録するか、対象レースを選んでください。");
        return;
      }
      const mergedRaceInfo = sanitizeRaceInfo({
        ...currentRace.raceInfo,
        ...raceInfoDraft,
        raceDate: raceInfoDraft.raceDate || currentRace.raceInfo?.raceDate || "",
        raceNumber: raceInfoDraft.raceNumber || currentRace.raceInfo?.raceNumber || "",
        raceName: currentRace.raceInfo?.raceName || raceInfoDraft.raceName || "",
      });
      const validation = validateRaceResultInput({ raceInfo: mergedRaceInfo }, safeRows);
      if (validation.errors.length > 0) {
        setWarning(validation.errors.join(" "));
        return;
      }
      const inspection = inspectRaceResultBeforeSave(currentRace, validation.validRows);
      if (inspection.fatals.length > 0) {
        setWarning(`登録できません：${inspection.fatals.join(" / ")}`);
        return;
      }
      if (inspection.warnings.length > 0) {
        const confirmed = window.confirm(`結果登録データに確認が必要な項目があります。\n\n${inspection.warnings.join("\n")}\n\nそれでも登録しますか？\nキャンセルすると手修正画面に戻ります。`);
        if (!confirmed) {
          setWarning(inspection.warnings.join(" "));
          return;
        }
      }
      onSave(selectedValue, buildRaceResult(validation.validRows.map((row) => ({
        id: row.id,
        finish: String(row.finish || "").trim(),
        status: String(row.status || "").trim(),
        isScratched: Boolean(row.isScratched),
        isExcluded: Boolean(row.isExcluded),
        isStopped: Boolean(row.isStopped),
        frameNumber: String(row.frameNumber || "").trim(),
        horseNumber: String(row.horseNumber || "").trim(),
        horseName: String(row.horseName || "").trim(),
        sexAge: String(row.sexAge || "").trim(),
        popularity: String(row.popularity || "").trim(),
        jockey: String(row.jockey || "").trim(),
        carriedWeight: String(row.carriedWeight || "").trim(),
        time: String(row.time || "").trim(),
        margin: String(row.margin || "").trim(),
        last3f: String(row.last3f || "").trim(),
        corner3: String(row.corner3 || "").trim(),
        corner4: String(row.corner4 || "").trim(),
      })), String(averageWinningTime || "").trim(), pasteText, mergedRaceInfo), {
        ...mergedRaceInfo,
        raceClass: mergedRaceInfo.raceClass ? normalizeRaceClass(mergedRaceInfo.raceClass) : "",
        distance: String(mergedRaceInfo.distance || "").trim(),
      });
      setWarning("");
      setShowPreview(false);
    }

    return h("form", { className: "screen form-screen", onSubmit: submit },
      safeRaceCards.length === 0
        ? h(React.Fragment, null,
          h(EmptyState, { title: "出走表がありません", text: "先に出走表を登録してください。" }),
          status.horseRecordRaces > 0 && h("button", { type: "button", className: "secondary full-button", onClick: () => runRecoveryAction(restoreRaceCardsFromHorseRecords) }, "馬別成績から出走表を復元"),

        )
        : h(React.Fragment, null,
          currentRace && h("div", { className: "success-panel" }, `対象レース：${currentRace.raceInfo?.raceDate || "-"} ${currentRace.raceInfo?.track || "-"}${raceNumberLabel(currentRace.raceInfo?.raceNumber)} ${currentRace.raceInfo?.raceName || ""} ${currentRace.raceInfo?.surface || ""}${currentRace.raceInfo?.distance || ""}`),
          h(Field, { label: "対象レース" }, h("select", { value: selectedValue, onChange: (event) => {
            setRaceId(event.target.value);
          } }, safeRaceCards.map((race) => h("option", { key: race.id, value: race.id }, `${race.raceInfo.track}${raceNumberLabel(race.raceInfo.raceNumber)} ${race.raceInfo.raceName || "レース名未入力"}`)))),
          h("div", { className: "three-col" },
            h(Field, { label: "レース日" }, h("input", { type: "date", value: raceInfoDraft.raceDate || "", onChange: (event) => setRaceInfoDraft((current) => ({ ...current, raceDate: event.target.value })) })),
            h(Field, { label: "レース番号" }, h("input", { value: raceInfoDraft.raceNumber || "", onChange: (event) => setRaceInfoDraft((current) => ({ ...current, raceNumber: event.target.value })), placeholder: "11R" })),
            h(Field, { label: "レース名" }, h("input", { value: raceInfoDraft.raceName || "", onChange: (event) => setRaceInfoDraft((current) => ({ ...current, raceName: event.target.value })) }))
          ),
          h("div", { className: "three-col" },
            h(Field, { label: "競馬場" }, h("select", { value: raceInfoDraft.track, onChange: (event) => setRaceInfoDraft((current) => ({ ...current, track: event.target.value })) }, tracks.map((track) => h("option", { key: track }, track)))),
            h(Field, { label: "芝/ダート" }, h("select", { value: raceInfoDraft.surface, onChange: (event) => setRaceInfoDraft((current) => ({ ...current, surface: event.target.value })) }, surfaceOptions.map((surface) => h("option", { key: surface }, surface)))),
            h(Field, { label: "距離" }, h("input", { inputMode: "numeric", value: raceInfoDraft.distance, onChange: (event) => setRaceInfoDraft((current) => ({ ...current, distance: event.target.value })) }))
          ),
          h("div", { className: "three-col" },
            h(Field, { label: "クラス" }, h("select", { value: raceInfoDraft.raceClass, onChange: (event) => setRaceInfoDraft((current) => ({ ...current, raceClass: event.target.value })) }, raceClassOptions.map((item) => h("option", { key: item }, item)))),
            h(Field, { label: "コース区分" }, h("select", { value: raceInfoDraft.courseType, onChange: (event) => setRaceInfoDraft((current) => ({ ...current, courseType: event.target.value })) }, courseTypeOptions.map((item) => h("option", { key: item, value: item }, item || "通常")))),
            h(Field, { label: "馬場状態" }, h("select", { value: raceInfoDraft.going, onChange: (event) => setRaceInfoDraft((current) => ({ ...current, going: event.target.value })) }, goingOptions.map((going) => h("option", { key: going }, going))))
          ),
          h(Field, { label: "平均勝ち時計" }, h("input", {
            value: averageWinningTime,
            onChange: (event) => setAverageWinningTime(event.target.value),
            placeholder: "例：1:33.5 / 93.5",
          })),
          h("p", { className: "lookup-note" }, matchedAverageTime ? `平均タイム候補: ${matchedAverageTime.averageTime}（${matchedAverageTime.going}${matchedAverageTime.courseType ? `・${matchedAverageTime.courseType}` : ""}）` : "平均タイムが見つからない場合は手入力してください。"),
          h(Field, { label: "レース結果テキスト" }, h("textarea", {
            value: pasteText,
            onChange: (event) => setPasteText(event.target.value),
            placeholder: "JRAや競馬サイトのスマホ向けレース結果をそのまま貼り付け",
            rows: 8,
          })),
          h("div", { className: "form-actions inline-actions" },
            h("button", { type: "button", className: "secondary", onClick: addManualRow }, "手入力行を追加"),
            h("button", { type: "button", className: "primary", onClick: analyze }, "解析")
          ),
          h(ResultSummary, { result: resultPreview }),
          h(SectionTitle, { icon: h(ClipboardList, { size: 18 }), title: `抽出結果 ${rows.length}頭` }),
          warning && h("div", { className: "warning-panel" }, warning),
          h("div", { className: "form-actions inline-actions" },
            h("button", { type: "button", className: "secondary", onClick: () => setShowPreview((current) => !current) }, "登録予定データを確認")
          ),
          showPreview && h(RegistrationPreview, {
            title: "結果の登録予定",
            raceInfo: {
              ...currentRace?.raceInfo,
              ...raceInfoDraft,
            },
            rows: safeRows,
            validCount: validResultCount,
            unparsedCount: unparsedResultCount,
            resultMeta: resultPreview,
          }),
          rows.length === 0
            ? h(EmptyState, { title: "まだ解析結果がありません", text: "結果テキストを貼り付けて解析してください。" })
            : h("div", { className: "entry-stack" }, rows.map((row, index) => h(ResultRowEditor, { key: row.id, row, index, updateRow, openHorse }))),
          h("div", { className: "form-actions" },
            h("button", { type: "button", className: "secondary", onClick: () => setRows([]) }, "結果クリア"),
            h("button", { className: "primary" }, "保存")
          ),

        )
    );
  }

  function AverageTimesScreen({ averageTimes }) {
    const [query, setQuery] = useState("");
    const [trackFilter, setTrackFilter] = useState("");
    const filtered = safeArray(averageTimes).filter((item) => {
      const text = `${item.racecourse} ${item.surface} ${item.distance} ${item.courseType || ""} ${item.raceClass} ${item.going} ${item.averageTime}`;
      return (!trackFilter || item.racecourse === trackFilter) && text.includes(query.trim());
    });

    return h("section", { className: "screen average-screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "平均タイムマスター"),
        h("p", null, `${safeArray(averageTimes).length}件の平均タイムを登録済みです。OP・重賞・G1などはOPとして扱います。馬場状態が合わない時は標準の平均タイムを使います。`)
      ),
      h("div", { className: "two-col" },
        h(Field, { label: "競馬場で絞り込み" }, h("select", { value: trackFilter, onChange: (event) => setTrackFilter(event.target.value) },
          h("option", { value: "" }, "すべて"),
          tracks.map((track) => h("option", { key: track }, track))
        )),
        h(Field, { label: "キーワード検索" }, h("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "例：東京 芝 1600 OP" }))
      ),
      h("div", { className: "average-list" }, filtered.slice(0, 160).map((item) => h("article", { className: "average-card", key: averageTimeKey(item) },
        h("strong", null, `${item.racecourse} ${item.surface}${item.distance}${item.courseType ? ` ${item.courseType}` : ""}`),
        h("span", null, `${item.raceClass} / ${item.going}`),
        h("b", null, item.averageTime)
      ))),
      filtered.length > 160 && h("p", { className: "lookup-note" }, `表示は先頭160件です。検索すると絞り込めます。`)
    );
  }

  function DataDiagnosticScreen({ setScreen }) {
    const diagnostics = getDataDiagnostics();
    const registeredListError = loadRegisteredListError();
    const rows = [
      ["horseRecords", diagnostics.horseRecords],
      ["horseNotes", diagnostics.horseNotes],
      ["raceResults", diagnostics.raceResults],
      ["raceEntries", diagnostics.raceEntries],
      ["weeklyRaces", diagnostics.weeklyRaces],
      ["averageTimes", diagnostics.averageTimes],
      ["読み込み不可データ", diagnostics.unreadable],
      ["隔離データ", diagnostics.quarantined],
      ["brokenWeeklyRaces", isolatedBrokenMessage(diagnostics.brokenWeeklyRaces)],
      ["brokenRaceEntries", isolatedBrokenMessage(diagnostics.brokenRaceEntries)],
      ["brokenRaceResults", isolatedBrokenMessage(diagnostics.brokenRaceResults)],
      ["登録済みレース一覧エラー", registeredListError ? `${registeredListError.name}: ${registeredListError.message}` : "なし"],
      ["登録済みレース一覧エラー詳細", registeredListError ? `${registeredListError.stack || ""} ${JSON.stringify(registeredListError.details || {})}` : "なし"],
    ];
    return h("section", { className: "screen backup-screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "データ診断"),
        h("p", null, "保存データを削除せず、件数だけ確認します。読み込み不可データがある場合は、エラー画面の隔離ボタンで避けられます。")
      ),
      h("div", { className: "diagnostic-list" }, rows.map(([label, value]) => h("div", { key: label, className: "diagnostic-row" },
        h("span", null, label),
        h("strong", null, value)
      ))),
      h("button", { type: "button", className: "secondary full-button", onClick: () => setScreen("backup") }, "設定に戻る")
    );
  }

  function RaceResultDeleteScreen({ raceCards, horseRecords, onDeleteResult }) {
    const [message, setMessage] = useState("");
    const groups = buildRaceResultDeleteGroups(getAllRaceCards().length > 0 ? getAllRaceCards() : raceCards, horseRecords);

    function confirmDelete(group) {
      const info = group.raceInfo || {};
      const label = [formatDateSlash(info.raceDate), info.track, raceNumberLabel(info.raceNumber), info.raceName].filter(Boolean).join(" ");
      const confirmed = window.confirm(`以下のレース成績を削除します。\n\n${label}\n削除対象：${group.resultCount}頭分の成績\n\n削除されるもの：このレースの結果、このレースに紐づく馬別成績\n削除されないもの：出走表、回顧メモ、平均タイム\n\n本当に削除しますか？`);
      if (!confirmed) return;
      const result = onDeleteResult(group.raceId);
      if (result?.ok) {
        setMessage(`${label} の成績を削除しました。出走表は残っています。`);
      } else {
        setMessage("削除できませんでした。対象レースをもう一度確認してください。");
      }
    }

    return h("section", { className: "screen race-result-delete-screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "レース成績を削除"),
        h("p", null, "結果と馬別成績だけを削除します。出走表、回顧メモ、平均タイムは残します。"),
        h("button", { type: "button", className: "secondary full-button", onClick: safeExportAllLocalStorage }, "削除前にバックアップを書き出す")
      ),
      message && h("div", { className: "success-panel" }, message),
      groups.length === 0
        ? h(EmptyState, { title: "削除できる結果がありません", text: "結果登録済みのレースがあると、ここに一覧で表示されます。" })
        : h("div", { className: "race-result-delete-list" }, groups.map((group) => {
          const info = group.raceInfo || {};
          return h("article", { key: group.raceId, className: "delete-race-card" },
            h("div", null,
              h("h3", null, `${formatDateSlash(info.raceDate)} ${info.track || ""}${raceNumberLabel(info.raceNumber)} ${info.raceName || ""}`.trim()),
              h("p", { className: "delete-race-meta" }, [info.raceClass, `${info.surface || ""}${info.distance || ""}`, info.going, `${group.resultCount}頭分の成績`].filter(Boolean).join(" / ")),
              h("small", null, `raceId: ${group.raceId}`)
            ),
            h("button", { type: "button", className: "danger-button", onClick: () => confirmDelete(group) }, "このレースの成績を削除")
          );
        }))
    );
  }

  function RegisteredRaceList({ raceCards, averageTimes = [], horseRecords = [], openRaceDetail, deleteRaceEntryOnly, setScreen }) {
    const [openDateKey, setOpenDateKey] = useState("");
    let debugDetails = { safeCount: 0, fallbackCount: safeArray(raceCards).length, displayCount: 0, groupCount: 0 };
    try {
      const safeRaceCards = getAllRaceCardsSafe();
      const displayRaceCards = safeRaceCards.length > 0 ? safeRaceCards : safeArray(raceCards).map(normalizeRaceCardForList);
      const dateGroups = groupRaceCardsForListByDate(displayRaceCards);
      debugDetails = { ...debugDetails, safeCount: safeRaceCards.length, displayCount: displayRaceCards.length, groupCount: dateGroups.length };
      return h("section", { className: "screen" },
        h(SectionTitle, { icon: h(ClipboardList, { size: 18 }), title: "登録済みレース一覧" }),
        displayRaceCards.length === 0
          ? h(EmptyState, { title: "登録済みレースはありません", text: "出走表を登録すると、ここに日付ごとで表示されます。" })
          : h("div", { className: "meeting-week-list" }, dateGroups.map((group) => {
            const isOpen = openDateKey === group.key;
            return h("section", { key: group.key, className: "meeting-week-card" },
              h("button", { type: "button", className: "meeting-week-button", onClick: () => setOpenDateKey(isOpen ? "" : group.key) },
                h("span", null,
                  h("strong", null, group.label),
                  h("small", null, `${group.races.length}レース`)
                ),
                h("b", null, isOpen ? "閉じる" : "開く")
              ),
              isOpen && h("div", { className: "track-tendency-stack" }, buildTrackTendencySummaries(group.races, averageTimes, horseRecords).map((summary) => h("article", { key: `${summary.track}-${summary.surface}`, className: "track-tendency-card" },
                h("h4", null, `${summary.track} ${summary.surface}傾向`),
                h("p", null, `時計：${summary.clockLabel}`),
                h("p", null, `脚質：${summary.paceLabel}`),
                h("small", null, `対象：${summary.track}${summary.surface} ${summary.raceCount}レース`),
                h("small", null, "映像ではなく、登録済みレースの勝ち時計・通過順位からの補助判断です。")
              ))),
              isOpen && h("div", { className: "compact-race-list meeting-week-races" }, group.races.map((race) => h("div", { key: race.raceId, className: "race-list-row-with-actions" },
                h("button", {
                  type: "button",
                  className: "compact-race-card",
                  onClick: () => openRaceDetail(race.raceId),
                },
                  h("span", { className: "compact-race-main" },
                    h("strong", null, `${race.racecourse}${raceNumberLabel(race.raceNumber)} ${race.raceName}`),
                    h("span", null, [

                      `${race.surface || ""}${race.distance || ""}${race.distance ? "m" : ""}`,
                      `${race.entriesCount}頭`,
                      race.raceClass,
                      `結果：${race.resultStatusLabel}`,
                    ].filter(Boolean).join(" / ")),
                    race.winnerName && h("small", { className: "race-winner-line" }, `1着：${race.winnerName} ${race.winnerTime || ""}`)
                  ),
                  h("span", { className: "race-chevron", "aria-hidden": true }, ">")
                ),
                race.entriesCount > 0 && deleteRaceEntryOnly && h("button", { type: "button", className: "danger-button ghost small", onClick: () => deleteRaceEntryOnly(race.raceId) }, "出走表だけ削除")
              )))
            );
          }))
      );
    } catch (error) {
      console.error("Registered race list render failed", error);
      saveRegisteredListError(error, debugDetails);
      return h("section", { className: "screen" },
        h("div", { className: "error-panel" },
          h("h2", null, "登録済みレース一覧の表示中に問題が発生しました。"),
          h("p", null, "保存データは削除されていません。ホームへ戻るか、データ診断で状態を確認できます。"),
          h("details", { className: "storage-debug" },
            h("summary", null, "エラー詳細を見る"),
            h("pre", null, `${error?.message || error}\n\n${safeString(error?.stack || "").split("\n").slice(0, 6).join("\n")}\n\n表示対象: ${debugDetails.displayCount || 0}\n安全取得: ${debugDetails.safeCount || 0}`)
          ),
          h("div", { className: "recovery-actions" },
            h("button", { type: "button", className: "primary full-button", onClick: () => setScreen("home") }, "ホームへ戻る"),
            h("button", { type: "button", className: "secondary full-button", onClick: () => setScreen("diagnostic") }, "データ診断を見る"),
            h("button", { type: "button", className: "secondary full-button", onClick: safeExportAllLocalStorage }, "バックアップを書き出す")
          )
        )
      );
    }
    try {
    const allRaceCards = getAllRaceCards();
    const displayRaceCards = sortRaceCardsRecent(allRaceCards.length > 0 ? allRaceCards : raceCards);
    const dateGroups = groupRaceCardsByDate(displayRaceCards);
    return h("section", { className: "screen" },
      h(SectionTitle, { icon: h(ClipboardList, { size: 18 }), title: "登録済みレース一覧" }),

      displayRaceCards.length === 0
        ? h(EmptyState, { title: "登録済みレースはありません", text: "出走表インポートで登録すると、ここに表示されます。" })
        : h("div", { className: "meeting-week-list" }, dateGroups.map((group) => {
          const isOpen = openDateKey === group.key;
          return h("section", { key: group.key, className: "meeting-week-card" },
            h("button", { type: "button", className: "meeting-week-button", onClick: () => setOpenDateKey(isOpen ? "" : group.key) },
              h("span", null,
                h("strong", null, group.label),
                h("small", null, `${group.races.length}レース`)
              ),
              h("b", null, isOpen ? "閉じる" : "開く")
            ),
            isOpen && h("div", { className: "compact-race-list meeting-week-races" }, group.races.map((race) => h(RaceListItem, { key: race.id, race, onOpen: () => openRaceDetail(race.id) })))
          );
        }))
    );
    } catch (error) {
      console.error("Registered race list render failed", error);
      return h("section", { className: "screen" },
        h("div", { className: "error-panel" },
          h("h2", null, "登録済みレース一覧の表示中に問題が発生しました。"),
          h("p", null, "保存データは削除されていません。ホームへ戻るか、データ診断で状態を確認できます。"),
          h("div", { className: "recovery-actions" },
            h("button", { type: "button", className: "primary full-button", onClick: () => setScreen("home") }, "ホームへ戻る"),
            h("button", { type: "button", className: "secondary full-button", onClick: () => setScreen("diagnostic") }, "データ診断を見る"),
            h("button", { type: "button", className: "secondary full-button", onClick: safeExportAllLocalStorage }, "バックアップを書き出す")
          )
        )
      );
    }
  }

  function RaceListItem({ race, horseRecords = [], onOpen }) {
    const safeRace = sanitizeRaceCard(race);
    const info = safeRace.raceInfo || {};
    const rows = sortResultRows(resultRowsFromRace(safeRace, horseRecords));
    const winner = rows[0];
    const hasResult = hasRaceResult(safeRace, horseRecords);
    return h("button", { type: "button", className: "compact-race-card", onClick: onOpen },
      h("span", { className: "compact-race-main" },
        h("strong", null, `${info.raceDate || "-"} ${info.track || "-"}${raceNumberLabel(info.raceNumber)} ${info.raceName || "レース名未入力"}`),
        h("span", null, [

          `${info.surface || ""}${info.distance || "-"}m`,
          `${safeRace.entries.length}頭`,
          info.raceClass,
          `結果：${hasResult ? "登録済み" : "未登録"}`,
        ].filter(Boolean).join("　")),
        hasResult && winner && h("small", { className: "race-winner-line" }, `1着：${winner.horseName || "-"} ${winner.time || ""}`)
      ),
      h("span", { className: "race-chevron", "aria-hidden": true }, ">")
    );
  }

  function RaceDetail({ raceCards, selectedRaceId, averageTimes, horseRecords = [], openHorse, openResultImport, setScreen, goBack, goHome, deleteRaceEntryOnly }) {
    const [showAllResults, setShowAllResults] = useState(false);
    const [showEntries, setShowEntries] = useState(false);
    const storedRaceCards = getAllRaceCards();
    const baseRaceCards = storedRaceCards.length > 0 ? storedRaceCards : raceCards;
    const safeRaceCards = sanitizeRaceCards([...safeArray(baseRaceCards), ...raceCardsFromHorseRecords(horseRecords)]);
    const race = safeRaceCards.find((item) => item.id === selectedRaceId || item.raceId === selectedRaceId) || safeRaceCards[0];
    if (!race) {
      return h("section", { className: "screen" }, h(EmptyState, { title: "レースが見つかりません", text: "ホームからレースを選んでください。" }));
    }

    const info = race.raceInfo || {};
    const average = findAverageTime(averageTimes, info);
    const resultRows = sortResultRows(resultRowsFromRace(race, horseRecords));
    const top3 = resultRows.filter(isFinishedResultRow).slice(0, 3);
    const hasResult = hasRaceResult(race, horseRecords);
    const entries = safeArray(race.entries);
    const resultMeta = race.result || {};
    const renderAverage = () => h("section", { className: "race-detail-panel" },
      h("h3", null, "平均タイム"),
      h("strong", null, average ? average.averageTime : "平均タイム未登録"),
      average && h("p", null, `${average.racecourse} ${average.surface}${average.distance}${average.courseType ? ` ${average.courseType}` : ""} / ${average.raceClass} / ${average.going}`)
    );
    const renderEntries = () => h("section", { id: "race-runners", className: "race-detail-panel" },
      h("h3", null, "出走表"),
      entries.length
        ? h("div", { className: "race-runner-stack compact-detail-runners" }, entries.map((entry) => h(RaceRunnerCard, {
          key: entry.id,
          entry,
          latestMemo: null,
          onOpen: () => openHorse(entry.horseName || ""),
        })))
        : h("p", null, race.entryDeleted ? "出走表は削除済みです。" : "出走馬データはまだありません。")
    );
    const renderResultList = (rows, compact = false) => h("div", { className: compact ? "result-card-stack top3" : "result-card-stack" }, rows.map((row) => h(ResultHorseCard, { key: row.id || `${row.finish}-${row.horseName}`, row, compact, openHorse })));
    const renderResultStatus = () => h("section", { className: "race-detail-panel result-status-panel" },
      h("h3", null, "結果ステータス"),
      h("strong", null, hasResult ? "結果：登録済み" : "結果：未登録")
    );
    const raceConditionItems = [
      info.raceClass,
      `${info.surface || ""}${info.distance || "-"}m`,
      info.courseType,
      `${entries.length}頭`,
      info.going,
      info.weather ? `天気:${info.weather}` : "",
      info.turfGoing ? `芝:${info.turfGoing}` : "",
      info.dirtGoing ? `ダ:${info.dirtGoing}` : "",
    ].filter(Boolean);

    return h("section", { className: "screen race-detail-screen" },
      h("article", { className: "race-detail-hero" },
        h("p", null, `${info.raceDate || "-"} ${info.track || "-"}${raceNumberLabel(info.raceNumber)}`),
        h("h2", null, info.raceName || "レース名未入力"),
        h("div", { className: "race-detail-line" }, raceConditionItems.map((item) => h("span", { key: item }, item)))
      ),
      hasResult
        ? h(React.Fragment, null,
          h(ResultBiasPanel, { result: resultMeta }),
          h("section", { className: "race-detail-panel" },
            h("h3", null, "結果サマリー"),
            top3.length ? renderResultList(top3, true) : h("p", null, "表示できる結果データがありません。")
          ),
          h(RaceLapPanel, { result: resultMeta, raceInfo: info }),
          h(CornerPassagePanel, { result: resultMeta }),
          h("div", { className: "race-detail-actions" },
            h("button", { type: "button", className: "secondary", onClick: () => setShowAllResults((current) => !current) }, showAllResults ? "全着順を閉じる" : "全着順を見る"),
            entries.length > 0 ? h("button", { type: "button", className: "secondary", onClick: () => setShowEntries((current) => !current) }, showEntries ? "出走表を閉じる" : "出走表を見る") : h("span", { className: "muted-mini" }, "出走表は削除済み"),
            h("button", { type: "button", className: "secondary", onClick: () => setScreen("add") }, "このレースの回顧メモを書く")
          ),
          showAllResults && h("section", { className: "race-detail-panel" }, h("h3", null, "全着順"), renderResultList(resultRows)),
          showEntries && renderEntries(),
          renderAverage(),
          renderResultStatus()
        )
        : h(React.Fragment, null,
          h("div", { className: "race-detail-actions" },
            h("button", { type: "button", className: "primary", onClick: () => openResultImport(race.id) }, "このレースの結果を登録"),
            h("button", { type: "button", className: "secondary", onClick: () => setScreen("add") }, "このレースの回顧メモを書く")
          ),
          renderEntries(),
          renderAverage(),
          renderResultStatus()
        ),
      entries.length > 0 && deleteRaceEntryOnly && h("section", { className: "race-detail-panel danger-zone" },
        h("h3", null, "出走表管理"),
        h("p", null, "出走表だけを削除します。結果・馬別成績・回顧メモは削除しません。"),
        h("button", { type: "button", className: "danger-button full-button", onClick: () => deleteRaceEntryOnly(race.raceId || race.id) }, "出走表だけ削除")
      )
    );
  }
  function ResultHorseCard({ row, compact = false, openHorse }) {
    const safeRow = sanitizeResultRow(row);
    const statusLabel = normalizeResultStatus(safeRow.status || safeRow.finish || "") || (safeRow.isScratched ? "取消" : safeRow.isExcluded ? "除外" : safeRow.isStopped ? "中止" : "");
    const rankLabel = statusLabel || `${safeRow.finish || "-"}着`;
    return h("button", { type: "button", className: `result-horse-card ${compact ? "compact" : ""} ${statusLabel ? "non-runner" : ""}`, onClick: () => openHorse(safeRow.horseName || "") },
      h("div", { className: "result-rank" }, rankLabel),
      h("div", { className: "result-horse-body" },
        h("div", { className: "horse-line-title" }, h(FrameHorseNumbers, { frame: safeRow.frameNumber, horseNumber: safeRow.horseNumber }), h("h4", null, safeRow.horseName || "馬名未入力", statusLabel && h("span", { className: "scratch-badge inline" }, statusLabel))),
        h("p", null, [safeRow.sexAge, `${safeRow.jockey || "騎手未入力"} ${safeRow.carriedWeight || "-"}`, safeRow.popularity ? `人気${safeRow.popularity}` : ""].filter(Boolean).join(" / ")),
        h("p", null, statusLabel ? "-" : [safeRow.time || "タイム未入力", safeRow.margin ? `着差${safeRow.margin}` : "", safeRow.last3f ? `上がり${safeRow.last3f}` : "", `テン1F:${safeRow.firstFurlongEstimate || "-"}`].filter(Boolean).join(" / ")),
        h("p", { className: "corner-line" }, [`3角${safeRow.corner3 || "-"}番手`, `4角${safeRow.corner4 || "-"}番手`].join(" / "))
      )
    );
  }

  function RaceLapPanel({ result, raceInfo = {} }) {
    const laps = safeArray(result?.lapTimes).filter(Boolean);
    const threeF = result?.first3F || result?.threeFDiff
      ? {
        first3F: result.first3F || "",
        last3F: result.last3F || "",
        threeFDiff: result.threeFDiff || "",
        isFirst100mStart: Boolean(result.isFirst100mStart),
      }
      : calculateThreeFTimes(laps, raceInfo.distance, result?.last3F || "");
    const hasLapInfo = laps.length > 0 || result?.last4F || result?.last3F || threeF.first3F || threeF.last3F;
    if (!hasLapInfo) return null;
    return h("section", { className: "race-detail-panel race-lap-panel" },
      h("h3", null, "\u30ec\u30fc\u30b9\u30e9\u30c3\u30d7"),
      laps.length > 0 && h("p", { className: "lap-line" }, laps.join(" - ")),
      h("div", { className: "lap-summary-grid" },
        h("span", null, h("small", null, "\u524d\u534a3F"), h("strong", null, threeF.first3F || "-")),
        h("span", null, h("small", null, "\u5f8c\u534a3F"), h("strong", null, threeF.last3F || "-")),
        h("span", null, h("small", null, "\u524d\u5f8c\u534a3F\u5dee"), h("strong", null, threeF.threeFDiff || "-")),
        h("span", null, h("small", null, "\u4e0a\u308a4F"), h("strong", null, result.last4F || "-")),
        h("span", null, h("small", null, "\u4e0a\u308a3F"), h("strong", null, result.last3F || "-"))
      ),
      laps.length > 0 && h("p", { className: "lap-note" }, `100m\u59cb\u307e\u308a\u8ddd\u96e2\uff1a${threeF.isFirst100mStart ? "\u306f\u3044" : "\u3044\u3044\u3048"}`),
      safeArray(result.firstFurlongTopHorseNumbers).length > 0 && h("p", { className: "lap-note" }, `\u30c6\u30f31F\u4e0a\u4f4d5\u982d: ${safeArray(result.firstFurlongTopHorseNumbers).join(", ")}`)
    );
  }

  function CornerPassagePanel({ result }) {
    const passages = result?.cornerPassages || {};
    const corners = ["1", "2", "3", "4"].filter((corner) => String(passages[corner] || "").trim());
    if (corners.length === 0) return null;
    const highlightMap = buildCornerHighlightMap(result);
    return h("section", { className: "race-detail-panel corner-passage-panel" },
      h("h3", null, "コーナー通過順位"),
      corners.map((corner) => h("div", { key: corner, className: "corner-passage-row" },
        h("strong", null, `${corner}コーナー`),
        h("p", null, renderCornerPassageTokens(passages[corner], highlightMap))
      ))
    );
  }

  function buildCornerHighlightMap(result) {
    return sortResultRows(resultRowsFromResult(result)).filter(isFinishedResultRow).slice(0, 3).reduce((map, row) => {
      if (!row.horseNumber) return map;
      map[String(row.horseNumber)] = row.frameNumber || inferFrameNumber(row.horseNumber, safeArray(result?.fullResults || result?.rows).length);
      return map;
    }, {});
  }

  function resultRowsFromResult(result) {
    return enrichRowsWithFirstFurlong(result?.fullResults || result?.rows || result?.top3, result);
  }

  function renderCornerPassageTokens(passage, highlightMap) {
    return String(passage || "").split(/(\d{1,2})/g).filter((token) => token !== "").map((token, index) => {
      if (!/^\d{1,2}$/.test(token) || !highlightMap[token]) return h("span", { key: `${token}-${index}` }, token);
      const frame = Number(highlightMap[token]);
      return h("span", { key: `${token}-${index}`, className: `corner-horse-chip corner-frame-${frame}` }, token);
    });
  }

  function FrameHorseNumbers({ frame, horseNumber }) {
    const frameText = String(frame || "-");
    const frameClass = Number(frameText) >= 1 && Number(frameText) <= 8 ? `frame-${Number(frameText)}` : "frame-unknown";
    return h("span", { className: "frame-horse-numbers" },
      h("span", { className: `frame-box ${frameClass}` }, frameText),
      h("span", { className: "horse-number-box" }, horseNumber || "-")
    );
  }

  function BackupScreen({ memos, raceCards, horseRecords, averageTimes, setMemos, setRaceCards, setHorseRecords, setAverageTimes, notify, setScreen, deleteEntryOnlyHorseRecords }) {
    const [importText, setImportText] = useState("");
    const [error, setError] = useState("");
    const [showDebug, setShowDebug] = useState(false);
    const backupText = JSON.stringify(buildBackup(memos, raceCards, horseRecords, averageTimes), null, 2);
    const fileInputId = "backup-file-input";

    function exportBackup() {
      const blob = new Blob([backupText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mykeiba-note-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify("バックアップを書き出しました");
    }

    function restoreBackupText(text) {
      try {
        const imported = parseBackup(text);
        const confirmed = window.confirm("現在のデータが上書きされる可能性があります。読み込みますか？");
        if (!confirmed) return;
        setMemos(imported.memos);
        const sanitizedRaceCards = sanitizeRaceCards(imported.raceCards);
        persistRaceCardsToStorage(sanitizedRaceCards);
        setRaceCards(sanitizedRaceCards);
        setHorseRecords(imported.horseRecords.length > 0 ? imported.horseRecords : buildHorseRecordsFromRaceCards(sanitizedRaceCards));
        setAverageTimes(mergeAverageTimes(defaultAverageTimes, imported.averageTimes));
        setImportText("");
        setError("");
        notify("バックアップを読み込みました");
        setScreen("home");
      } catch {
        setError("JSONの形が正しくありません。書き出したバックアップ内容をそのまま貼り付けてください。");
      }
    }

    function importBackup(event) {
      event.preventDefault();
      restoreBackupText(importText);
    }

    function importBackupFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => restoreBackupText(String(reader.result || ""));
      reader.onerror = () => setError("ファイルを読み込めませんでした。もう一度選び直してください。");
      reader.readAsText(file);
      event.target.value = "";
    }

    function restoreRaceCards() {
      const result = restoreRaceCardsFromHorseRecords();
      if (result.count === 0) {
        setError("馬別成績から復元できる出走表が見つかりませんでした。");
        return;
      }
      setRaceCards(sanitizeRaceCards(result.races));
      setError("");
      notify(`馬別成績から${result.count}件の出走表を復元しました`);
      setScreen("home");
    }

    function cleanHorseMarks() {
      safeExportAllLocalStorage();
      const count = cleanStoredHorseNameMarks();
      setError("");
      notify(`馬名マークを${count}件クリーニングしました`);
      setTimeout(() => window.location.reload(), 350);
    }

    return h("section", { className: "screen backup-screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "設定"),
        h("p", null, "スマホで入力した回顧メモ、注目馬、出走表データをJSONファイルとして保存・復元できます。"),
        h("button", { type: "button", className: "secondary full-button", onClick: () => setScreen("diagnostic") }, "データ診断"),
        h("button", { type: "button", className: "secondary full-button", onClick: restoreRaceCards }, "馬別成績から出走表を復元"),
        h("button", { type: "button", className: "secondary full-button", onClick: cleanHorseMarks }, "外国産馬・地方馬マークを削除"),
        h("button", { type: "button", className: "danger-button full-button", onClick: deleteEntryOnlyHorseRecords }, "出走表登録で誤って作られた成績を削除")
        , h("button", { type: "button", className: "secondary full-button", onClick: () => setShowDebug((current) => !current) }, showDebug ? "デバッグ情報を閉じる" : "デバッグ情報を見る")
      ),
      showDebug && h(StorageStatusDebug, { status: raceStorageStatus() }),
      h("div", { className: "backup-panel" },
        h("h2", null, "バックアップ書き出し"),
        h("p", null, "今のデータをJSONファイルとして保存します。機種変更前や、念のため残したい時に使います。"),
        h("button", { type: "button", className: "primary full-button", onClick: exportBackup }, "バックアップ書き出し"),
        h(Field, { label: "現在のバックアップJSON" }, h("textarea", {
          value: backupText,
          readOnly: true,
          rows: 8,
        }))
      ),
      h("form", { className: "backup-panel", onSubmit: importBackup },
        h("h2", null, "バックアップ読み込み"),
        h("p", null, "書き出したJSONファイルを選ぶと復元できます。読み込み前に確認画面が出ます。"),
        h("input", {
          id: fileInputId,
          className: "file-input",
          type: "file",
          accept: "application/json,.json",
          onChange: importBackupFile,
        }),
        h("label", { className: "secondary full-button file-button", htmlFor: fileInputId }, "バックアップ読み込み"),
        h("p", { className: "backup-note" }, "現在のデータが上書きされる可能性があります。"),
        h(Field, { label: "JSONを貼り付けて読み込む場合" }, h("textarea", {
          value: importText,
          onChange: (event) => setImportText(event.target.value),
          placeholder: "ここにバックアップJSONを貼り付け",
          rows: 10,
        })),
        error && h("p", { className: "error-text" }, error),
        h("button", { className: "primary full-button", disabled: !importText.trim() }, "貼り付けたJSONを読み込む")
      )
    );
  }

  function ResultSummary({ result }) {
    const paceBias = result.paceBiasLabel || result.paceBias || "";
    const trackBias = result.trackBiasLabel || result.trackTrend || "";
    const note = result.biasNote || "断定ではなく、レース回顧のための補助判断です。";
    return h("section", { className: "result-summary" },
      h("div", null, h("span", null, "脚質バイアス"), h("strong", null, paceBias || "-")),
      h("div", null, h("span", null, "馬場傾向"), h("strong", null, trackBias || "-")),
      h("p", null, note)
    );
  }

  function ResultBiasPanel({ result }) {
    const paceBias = result?.paceBiasLabel || result?.paceBias || "";
    const trackBias = result?.trackBiasLabel || result?.trackTrend || "";
    const note = result?.biasNote || (paceBias || trackBias ? "断定ではなく、レース回顧のための補助判断です。" : "");
    if (!paceBias && !trackBias) return null;
    return h("section", { className: "race-detail-panel result-bias-panel" },
      paceBias && h("div", null, h("span", null, "脚質バイアス"), h("strong", null, paceBias)),
      trackBias && h("div", null, h("span", null, "馬場傾向"), h("strong", null, trackBias)),
      note && h("p", null, note)
    );
  }
  function RegistrationPreview({ title, raceInfo, rows, validCount, unparsedCount, resultMeta, importFormat = "" }) {
    const info = sanitizeRaceInfo(raceInfo);
    const isRaceEntryPreview = title.includes("出走表");
    const storagePreview = isRaceEntryPreview
      ? toStorageRaceCard({ raceInfo: info, entries: rows })
      : {
        raceInfo: {
          raceDate: info.raceDate || "",
          racecourse: info.track || "",
          raceNumber: info.raceNumber || "",
          raceName: info.raceName || "",
          raceClass: info.raceClass || "",
          surface: info.surface || "",
          distance: info.distance || "",
          going: info.going || "",
        },
        rows: safeArray(rows).slice(0, 5),
      };
    const summary = {
      raceInfo: {
        raceDate: info.raceDate || "",
        racecourse: info.track || "",
        raceNumber: info.raceNumber || "",
        raceName: info.raceName || "",
        raceClass: info.raceClass || "",
        surface: info.surface || "",
        distance: info.distance || "",
        going: info.going || "",
      },
      registerableHorses: validCount,
      unparsedRows: unparsedCount,
      entriesIsArray: isRaceEntryPreview ? Array.isArray(storagePreview.entries) : Array.isArray(storagePreview.rows),
      storageKey: isRaceEntryPreview ? RACE_STORAGE_KEY : "race result on selected race",
      raceId: storagePreview.raceId || storagePreview.id || "",
      raceName: storagePreview.raceName || info.raceName || "",
      racecourse: storagePreview.racecourse || info.track || "",
      raceNumber: storagePreview.raceNumber || info.raceNumber || "",
      surface: storagePreview.surface || info.surface || "",
      distance: storagePreview.distance ?? info.distance ?? "",
      raceClass: storagePreview.raceClass || info.raceClass || "",
      entriesCount: safeArray(storagePreview.entries || storagePreview.rows).length,
      firstThreeHorseNames: safeArray(storagePreview.entries || storagePreview.rows).slice(0, 3).map((entry) => entry.horseName || "馬名未入力"),
      lapTimes: safeArray(resultMeta?.lapTimes),
      last4F: resultMeta?.last4F || "",
      last3F: resultMeta?.last3F || "",
      firstHalfTime: resultMeta?.firstHalfTime || "",
      secondHalfTime: resultMeta?.secondHalfTime || "",
      halfDiff: resultMeta?.halfDiff || "",
      first3F: resultMeta?.first3F || "",
      threeFDiff: resultMeta?.threeFDiff || "",
      isFirst100mStart: resultMeta?.isFirst100mStart ? "はい" : "いいえ",
      firstFurlongBase: resultMeta?.firstFurlongBase || "",
      firstFurlongCorner: resultMeta?.firstFurlongCorner || "",
      firstFurlongTopHorseNumbers: safeArray(resultMeta?.firstFurlongTopHorseNumbers),
      firstFurlongEstimates: enrichRowsWithFirstFurlong(rows, resultMeta)
        .slice(0, 8)
        .map((row) => `${row.horseNumber || "-"}番 ${row.horseName || "馬名未入力"}: ${row.firstFurlongEstimate || "-"}`),
      cornerPassages: resultMeta?.cornerPassages || {},
      storagePreview,
    };

    return h("section", { className: "preview-panel" },
      h("h3", null, title),
      importFormat && h("p", { className: "import-format-label" }, `解析形式：${importFormat}`),
      h("div", { className: "preview-stats" },
        h("span", null, `登録予定: ${validCount}件`),
        h("span", null, `未解析: ${unparsedCount}件`),
        h("span", null, `entries配列: ${summary.entriesIsArray ? "はい" : "いいえ"}`)
      ),
      h("p", null, `${info.track || "競馬場未入力"} ${raceNumberLabel(info.raceNumber) || "レース番号未入力"} ${info.raceName || "レース名未入力"}`),
      resultMeta && h(RaceLapPanel, { result: resultMeta, raceInfo: info }),
      resultMeta && h(CornerPassagePanel, { result: resultMeta }),
      h("pre", null, JSON.stringify(summary, null, 2))
    );
  }

  function StorageStatusDebug({ status }) {
    return h("section", { className: "debug-panel" },
      h("h3", null, "出走表保存状況"),
      h("p", null, `${RACE_STORAGE_KEY} 件数: ${status.main}`),
      h("p", null, `${WEEKLY_RACES_COMPAT_KEY} 件数: ${status.weekly}`),
      h("p", null, `${RACE_ENTRIES_COMPAT_KEY} 件数: ${status.raceEntries}`),
      h("p", null, `getAllRaceCards() 件数: ${status.allRaceCards}`),
      h("p", null, `entry_registered 件数: ${status.entryRegistered}`),
      h("p", null, `result_registered 件数: ${status.resultRegistered}`),
      h("p", null, `結果登録画面の対象レース件数: ${status.resultTargets}`),
      h("p", null, `直近24レース表示件数: ${status.recentRaceCards}`),
      h("p", null, `horseRecords 内のレース数: ${status.horseRecordRaces}`),
      h("p", null, `最後に保存した raceId: ${status.lastRaceId || "-"}`),
      h("p", null, `最後の保存結果: ${status.lastSaveStatus || "-"}`),
      status.lastMessage && h("p", null, status.lastMessage)
    );
  }

  function ResultRowEditor({ row, index, updateRow, openHorse }) {
    return h("article", { className: `entry-card result-row ${row.parsed ? "" : "unparsed"}` },
      h("div", { className: "entry-head" },
        h("strong", null, row.parsed ? `${index + 1}頭目` : "未解析"),
        row.raw && h("span", null, row.raw),
        row.horseName && h("button", { type: "button", className: "secondary small row-horse-button", onClick: () => openHorse(row.horseName) }, "馬ページ")
      ),
      h("div", { className: "result-grid" },
        h(Field, { label: "着順" }, h("input", { inputMode: "numeric", value: row.finish, onChange: (event) => updateRow(row.id, "finish", event.target.value) })),
        h(Field, { label: "ステータス" }, h("select", { value: row.status || "", onChange: (event) => updateRow(row.id, "status", event.target.value) },
          ["", "取消", "除外", "競走除外", "中止", "競走中止"].map((item) => h("option", { key: item, value: item }, item || "通常"))
        )),
        h(Field, { label: "枠" }, h("input", { inputMode: "numeric", value: row.frameNumber || "", onChange: (event) => updateRow(row.id, "frameNumber", event.target.value) })),
        h(Field, { label: "馬番" }, h("input", { inputMode: "numeric", value: row.horseNumber || "", onChange: (event) => updateRow(row.id, "horseNumber", event.target.value) })),
        h(Field, { label: "馬名" }, h("input", { value: row.horseName, onChange: (event) => updateRow(row.id, "horseName", event.target.value) })),
        h(Field, { label: "性齢" }, h("input", { value: row.sexAge || "", onChange: (event) => updateRow(row.id, "sexAge", event.target.value), placeholder: "牡3" })),
        h(Field, { label: "人気" }, h("input", { inputMode: "numeric", value: row.popularity || "", onChange: (event) => updateRow(row.id, "popularity", event.target.value) })),
        h(Field, { label: "騎手" }, h("input", { value: row.jockey || "", onChange: (event) => updateRow(row.id, "jockey", event.target.value) })),
        h(Field, { label: "斤量" }, h("input", { inputMode: "decimal", value: row.carriedWeight || "", onChange: (event) => updateRow(row.id, "carriedWeight", event.target.value) })),
        h(Field, { label: "走破タイム" }, h("input", { value: row.time, onChange: (event) => updateRow(row.id, "time", event.target.value), placeholder: "1:33.2" })),
        h(Field, { label: "着差" }, h("input", { value: row.margin, onChange: (event) => updateRow(row.id, "margin", event.target.value), placeholder: "-" })),
        h(Field, { label: "上がり3F" }, h("input", { inputMode: "decimal", value: row.last3f, onChange: (event) => updateRow(row.id, "last3f", event.target.value), placeholder: "34.1" })),
        h(Field, { label: "3角" }, h("input", { inputMode: "numeric", value: row.corner3 || "", onChange: (event) => updateRow(row.id, "corner3", event.target.value) })),
        h(Field, { label: "4角" }, h("input", { inputMode: "numeric", value: row.corner4 || "", onChange: (event) => updateRow(row.id, "corner4", event.target.value) }))
      )
    );
  }

  function RaceCard({ race, memos, openHorse, openResultImport }) {
    const safeRace = sanitizeRaceCard(race);
    const info = safeRace.raceInfo;
    const scoreInfo = safeRace.scoreInfo || scoreRace(safeRace, memos);
    return h("article", { className: `race-card score-${scoreInfo.label.slice(-1)}` },
      h("div", { className: "race-head" },
        h("div", null,
          h("h3", null, `${info.track}${raceNumberLabel(info.raceNumber)} ${info.raceName || "レース名未入力"}`),
          h("p", null, `${info.raceDate}・${info.surface}${info.distance || "-"}m・${info.going}`)
        ),
        h("strong", null, `${safeRace.entries.length}頭`)
      ),
      h("div", { className: "race-score-panel" },
        h("div", null,
          h("span", null, "勝負スコア"),
          h("strong", null, `${scoreInfo.score}点`)
        ),
        h("b", null, scoreInfo.label)
      ),
      scoreInfo.notableHorses.length > 0 && h("div", { className: "notable-row" },
        scoreInfo.notableHorses.map((horse) => h("span", { key: `${horse.horseName}-${horse.attention}` }, `${horse.horseName} ${horse.attention}`))
      ),
      safeRace.result && h(ResultSummary, { result: safeRace.result }),
      h("button", { type: "button", className: "secondary result-import-button", onClick: () => openResultImport(safeRace.id) }, safeRace.result ? "結果を編集" : "結果インポート"),
      h("div", { className: "race-runner-stack" },
        safeRace.entries.map((entry) => h(RaceRunnerCard, {
          key: entry.id,
          entry,
          latestMemo: latestMemoForHorse(memos, entry.horseName || ""),
          onOpen: () => openHorse(entry.horseName || ""),
        }))
      )
    );
  }

  function RaceRunnerCard({ entry, latestMemo, onOpen }) {
    const hasMemo = Boolean(latestMemo);
    const tags = hasMemo ? [...safeArray(latestMemo.troubleTags), ...safeArray(latestMemo.strongTags), ...safeArray(latestMemo.buyTags)] : [];
    const attention = latestMemo?.attention || "";
    const isScratched = isUnavailableEntry(entry);

    return h("button", { className: `race-runner-card ${attention === "A" ? "attention-a" : ""}`, type: "button", onClick: onOpen },
      h("div", { className: "runner-main" },
        h("div", { className: "runner-number" }, h(FrameHorseNumbers, { frame: entry.frameNumber, horseNumber: entry.horseNumber })),
        h("div", null,
          h("div", { className: "runner-title" },
            h("h4", null, entry.horseName || "馬名未入力"),
            isScratched && h("span", { className: "scratch-badge" }, "取消"),
            hasMemo && h("span", { className: `rank mini-rank rank-${attention}` }, attention)
          ),
          h("p", null, [
            entry.sexAge,
            entry.popularity ? `人気${entry.popularity}` : "",
            entry.jockey || "騎手未入力",
            `${entry.carriedWeight || "-"}kg`,
          ].filter(Boolean).join("・"))
        )
      ),
      h("div", { className: `memo-status ${hasMemo ? "has-memo" : ""}` }, hasMemo ? "過去メモあり" : "過去メモなし"),
      hasMemo && h("div", { className: "runner-memo-preview" },
        h("p", { className: "memo-date" }, `${latestMemo.raceDate}・${latestMemo.track}・${latestMemo.distance || "距離未入力"}`),
        latestMemo.memo && h("p", { className: "memo-text compact" }, latestMemo.memo),
        tags.length > 0 && h("div", { className: "tag-row compact-tags" }, tags.map((tag) => h("span", { key: tag }, tag)))
      )
    );
  }

  function AddMemo({ onSave, onCancel }) {
    const [form, setForm] = useState(emptyMemoForm);
    const canSave = form.horseName.trim() && form.raceDate;
    const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    function submit(event) {
      event.preventDefault();
      if (!canSave) return;
      onSave({ ...form, horseName: form.horseName.trim(), raceNumber: form.raceNumber.trim(), distance: form.distance.trim() });
      setForm(emptyMemoForm);
    }
    return h("form", { className: "screen form-screen", onSubmit: submit },
      h(Field, { label: "馬名", required: true }, h("input", { value: form.horseName, onChange: (event) => update("horseName", event.target.value), placeholder: "例：サンプルホース" })),
      h("div", { className: "two-col" },
        h(Field, { label: "レース日", required: true }, h("input", { type: "date", value: form.raceDate, onChange: (event) => update("raceDate", event.target.value) })),
        h(Field, { label: "競馬場" }, h("select", { value: form.track, onChange: (event) => update("track", event.target.value) }, tracks.map((track) => h("option", { key: track }, track))))
      ),
      h(Field, { label: "レース番号" }, h("input", { inputMode: "numeric", value: form.raceNumber, onChange: (event) => update("raceNumber", event.target.value), placeholder: "例：1" })),
      h("div", { className: "two-col" },
        h(Field, { label: "距離" }, h("input", { value: form.distance, onChange: (event) => update("distance", event.target.value), placeholder: "芝1600 / ダ1800" })),
        h(Field, { label: "馬場状態" }, h("select", { value: form.going, onChange: (event) => update("going", event.target.value) }, goingOptions.map((going) => h("option", { key: going }, going))))
      ),
      h("div", { className: "three-col" },
        h(Field, { label: "着順" }, h("input", { inputMode: "numeric", value: form.finish, onChange: (event) => update("finish", event.target.value), placeholder: "3" })),
        h(Field, { label: "通過順" }, h("input", { value: form.position, onChange: (event) => update("position", event.target.value), placeholder: "7-7-5" })),
        h(Field, { label: "上がり3F" }, h("input", { inputMode: "decimal", value: form.last3f, onChange: (event) => update("last3f", event.target.value), placeholder: "34.1" }))
      ),
      h(Field, { label: "自由メモ" }, h("textarea", { value: form.memo, onChange: (event) => update("memo", event.target.value), placeholder: "見返した時の気づき、次走狙いたい条件など", rows: 5 })),
      h(TagPicker, { title: "不利タグ", tags: troubleTags, selected: form.troubleTags, onChange: (tags) => update("troubleTags", tags) }),
      h(TagPicker, { title: "強い内容タグ", tags: strongTags, selected: form.strongTags, onChange: (tags) => update("strongTags", tags) }),
      h(TagPicker, { title: "次走買い条件タグ", tags: buyTags, selected: form.buyTags, onChange: (tags) => update("buyTags", tags) }),
      h("section", { className: "choice-panel" },
        h("p", { className: "field-label" }, "注目度"),
        h("div", { className: "attention-grid" }, attentionOptions.map((item) => h("button", { type: "button", className: form.attention === item.value ? "selected" : "", key: item.value, onClick: () => update("attention", item.value) }, h("b", null, item.label), h("span", null, item.help))))
      ),
      h("div", { className: "form-actions" }, h("button", { type: "button", className: "secondary", onClick: onCancel }, "キャンセル"), h("button", { className: "primary", disabled: !canSave }, "保存する"))
    );
  }

  function HorseList({ horseStats, openHorse, setScreen }) {
    return h("section", { className: "screen" },
      h("div", { className: "backup-panel compact-management" },
        h("h2", null, "データ管理"),
        h("p", null, "レース単位の成績削除は専用画面から行えます。回顧メモや平均タイムは消しません。"),
        h("div", { className: "inline-actions" },
          h("button", { type: "button", className: "secondary", onClick: safeExportAllLocalStorage }, "削除前にバックアップを書き出す"),
          h("button", { type: "button", className: "danger-button", onClick: () => setScreen("deleteResults") }, "レース成績を削除")
        )
      ),
      horseStats.length === 0
        ? h(EmptyState, { title: "馬別成績はまだ空です", text: "結果インポートを登録すると馬ごとに成績が並びます。", action: h("button", { className: "primary small", onClick: () => setScreen("add") }, "メモを追加") })
        : h("div", { className: "card-stack" }, horseStats.map((horse) => h(HorseCard, {
          key: horse.horseName,
          horse,
          onOpen: () => openHorse(horse.horseName),
        })))
    );
  }

  function HorseSearch({ horseStats, openHorse }) {
    const [query, setQuery] = useState("");
    const results = horseStats.filter((horse) => horse.horseName.toLowerCase().includes(query.trim().toLowerCase()));
    return h("section", { className: "screen" },
      h("div", { className: "search-box" }, h(Search, { size: 20 }), h("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "馬名を入力", autoFocus: true })),
      h("div", { className: "card-stack" }, results.map((horse) => h(HorseCard, { key: horse.horseName, horse, onOpen: () => openHorse(horse.horseName) }))),
      query && results.length === 0 && h(EmptyState, { title: "該当なし", text: "馬名の一部でも検索できます。" })
    );
  }

  function HorsePage({ horseName, memos, horseRecords, saveHorseNote, deleteHorseNote, deleteMemo, setScreen, goBack, goHome, openRaceDetail }) {
    const [tab, setTab] = useState("memos");
    const [openRecordId, setOpenRecordId] = useState("");
    const [editingNote, setEditingNote] = useState(null);
    const [expandedMemoId, setExpandedMemoId] = useState("");
    const normalizedName = horseName.trim();
    const history = safeArray(memos)
      .filter((memo) => normalizeHorseName(memo?.horseName) === normalizedName)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || b.raceDate || 0) - new Date(a.updatedAt || a.createdAt || a.raceDate || 0));
    const records = safeArray(horseRecords)
      .filter((record) => normalizeHorseName(record.horseName) === normalizedName)
      .sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));
    const latestMemo = history[0];
    const sexAge = records.find((record) => record.sexAge)?.sexAge || "";
    const bestFinish = records.map((record) => Number(record.finish)).filter((finish) => Number.isFinite(finish)).sort((a, b) => a - b)[0];
    const recentFinishes = records.slice(0, 5).map((record) => `${record.finish || "-"}着`).join(" / ");
    const memoCountForRecords = records.filter((record) => findMemoForRecord(history, record)).length;

    function makeDraft(seed = {}) {
      const existingTags = [...safeArray(seed.tags), ...safeArray(seed.troubleTags), ...safeArray(seed.strongTags), ...safeArray(seed.buyTags)];
      return {
        id: seed.id || "",
        horseName: normalizedName,
        raceId: seed.raceId || null,
        date: seed.date || seed.raceDate || "",
        racecourse: seed.racecourse || seed.track || "",
        raceNumber: seed.raceNumber || "",
        raceName: seed.raceName || "",
        raceClass: seed.raceClass || "",
        surface: seed.surface || "",
        distance: seed.distance || null,
        going: seed.going || "",
        memo: seed.memo || "",
        tags: [...new Set(existingTags)].filter(Boolean),
        rating: ["A", "B", "C"].includes(seed.rating || seed.attention) ? (seed.rating || seed.attention) : "C",
        nextRunNote: seed.nextRunNote || "",
        createdAt: seed.createdAt || "",
      };
    }

    function startMemo(seed = {}) {
      setEditingNote(makeDraft(seed));
      setTab("memos");
    }

    function startMemoFromRecord(record) {
      startMemo({
        raceId: record.raceId || null,
        raceDate: record.raceDate || "",
        track: record.track || "",
        raceNumber: record.raceNumber || "",
        raceName: record.raceName || "",
        raceClass: record.raceClass || "",
        surface: record.surface || "",
        distance: record.distance || null,
        going: record.going || "",
      });
    }

    function updateDraft(field, value) {
      setEditingNote((current) => ({ ...(current || makeDraft()), [field]: value }));
    }

    function submitNote(event) {
      event.preventDefault();
      if (!editingNote?.horseName) return;
      saveHorseNote(editingNote);
      setEditingNote(null);
    }

    return h("section", { className: "screen horse-page" }, !horseName || (history.length === 0 && records.length === 0)
      ? h(EmptyState, { title: "履歴が見つかりません", text: "注目馬リストか検索から馬を選んでください。", action: h("button", { className: "primary small", onClick: () => setScreen("list") }, "リストへ") })
      : h(React.Fragment, null,
        h("div", { className: "horse-title horse-profile-title" },
          h("div", null,
            h("h2", null, normalizedName),
        h("p", null, [sexAge, latestMemo ? `最新評価 ${normalizeRating(latestMemo.rating || latestMemo.attention)}` : ""].filter(Boolean).join(" / ") || "競走成績")
          ),
          latestMemo && h("div", { className: `rank rank-${normalizeRating(latestMemo.rating || latestMemo.attention)}` }, normalizeRating(latestMemo.rating || latestMemo.attention))
        ),
        h("div", { className: "horse-summary-grid" },
          h(Metric, { label: "成績数", value: records.length }),
          h(Metric, { label: "最高着順", value: bestFinish ? `${bestFinish}着` : "-" }),
          h(Metric, { label: "メモあり", value: history.length }),
          h(Metric, { label: "最新評価", value: latestMemo ? normalizeRating(latestMemo.rating || latestMemo.attention) : "-" })
        ),
        h("div", { className: "recent-finishes" }, h("span", null, "直近5走"), h("strong", null, recentFinishes || "-")),
        h("div", { className: "tab-switch" },
          h("button", { type: "button", className: tab === "memos" ? "active" : "", onClick: () => setTab("memos") }, `回顧メモ ${history.length}`),
          h("button", { type: "button", className: tab === "records" ? "active" : "", onClick: () => setTab("records") }, `競走成績 ${records.length}`)
        ),
        tab === "memos" && h("section", { className: "horse-note-section" },
          h("div", { className: "section-headline" }, h("h3", null, "回顧メモ"), h("button", { type: "button", className: "primary small", onClick: () => startMemo() }, "この馬の回顧メモを書く")),
          editingNote && h(HorseNoteForm, { draft: editingNote, updateDraft, submitNote, onCancel: () => setEditingNote(null) }),
          history.length === 0
            ? h(EmptyState, { title: "回顧メモはまだありません", text: "気になった内容をこの馬のページから残せます。" })
            : h("div", { className: "horse-note-list" }, history.map((memo) => h(HorseNoteCard, { key: memo.id, memo, expanded: expandedMemoId === memo.id, onToggle: () => setExpandedMemoId((current) => current === memo.id ? "" : memo.id), onEdit: () => startMemo(memo), onDelete: () => deleteHorseNote(memo.id) })))
        ),
        tab === "records" && (records.length === 0
          ? h(EmptyState, { title: "競走成績はまだありません", text: "結果インポートを保存すると自動でここに並びます。" })
          : h("div", { className: "record-stack" }, records.map((record) => {
            const linkedMemo = findMemoForRecord(history, record);
            return h(HorseRecordCard, {
              key: record.id || recordKey(record),
              record,
              memo: linkedMemo,
              rivalSummary: buildRivalWinFollowUps(record, horseRecords, normalizedName),
              expanded: openRecordId === (record.id || recordKey(record)),
              onToggle: () => setOpenRecordId((current) => current === (record.id || recordKey(record)) ? "" : (record.id || recordKey(record))),
              onWriteMemo: () => startMemoFromRecord(record),
              onOpenRace: () => openRaceDetail(record.raceId || buildStableRaceId({ date: record.raceDate || record.date || "", racecourse: record.track || record.racecourse || "", raceNumber: record.raceNumber || record.R || "" })),
            });
          })))
      ));
  }

  function HorseNoteForm({ draft, updateDraft, submitNote, onCancel }) {
    const [customTag, setCustomTag] = useState("");
    const [showDistanceLoss, setShowDistanceLoss] = useState(false);
    const allTags = [...new Set([...troubleTags, ...strongTags])];
    function addCustomTag() {
      const tag = customTag.trim();
      if (!tag) return;
      updateDraft("tags", [...new Set([...safeArray(draft.tags), tag])]);
      setCustomTag("");
    }
    return h("form", { className: "horse-note-form", onSubmit: submitNote },
      h("div", { className: "note-target-panel" },
        h("p", null, "対象馬"),
        h("strong", null, draft.horseName || "-"),
        h("p", null, "対象レース"),
        h("span", null, [formatDateSlash(draft.date || draft.raceDate), draft.racecourse || draft.track, raceNumberLabel(draft.raceNumber), draft.raceName].filter(Boolean).join(" ") || "レース未指定"),
        h("small", null, [draft.raceClass, `${draft.surface || ""}${draft.distance || ""}`, draft.going].filter(Boolean).join(" / "))
      ),
      h("div", { className: "two-col" },
        h(Field, { label: "レース日" }, h("input", { type: "date", value: draft.date || "", onChange: (event) => updateDraft("date", event.target.value) })),
        h(Field, { label: "競馬場" }, h("input", { value: draft.racecourse || "", onChange: (event) => updateDraft("racecourse", event.target.value) }))
      ),
      h("div", { className: "two-col" },
        h(Field, { label: "レース番号" }, h("input", { value: draft.raceNumber || "", onChange: (event) => updateDraft("raceNumber", event.target.value), placeholder: "11R" })),
        h(Field, { label: "レース名" }, h("input", { value: draft.raceName || "", onChange: (event) => updateDraft("raceName", event.target.value) }))
      ),
      h(Field, { label: "メモ本文" }, h("textarea", { value: draft.memo || "", onChange: (event) => updateDraft("memo", event.target.value), rows: 5, placeholder: "見返した内容、次走で気をつけたいこと" })),

      h("button", { type: "button", className: "secondary full-button", onClick: () => setShowDistanceLoss(true) }, "\u8ddd\u96e2\u30ed\u30b9\u65e9\u898b\u8868\u3092\u898b\u308b"),
      showDistanceLoss && h(DistanceLossModal, { onClose: () => setShowDistanceLoss(false) }),
     h(TagPicker, { title: "不利・内容タグ", tags: allTags, selected: safeArray(draft.tags), onChange: (tags) => updateDraft("tags", tags) }),
      h("div", { className: "custom-tag-row" }, h("input", { value: customTag, onChange: (event) => setCustomTag(event.target.value), placeholder: "自由タグ" }), h("button", { type: "button", className: "secondary", onClick: addCustomTag }, "追加")),
      h("section", { className: "choice-panel" },
        h("p", { className: "field-label" }, "評価"),
        h("div", { className: "rating-grid" }, ["A", "B", "C"].map((rating) => h("button", { type: "button", key: rating, className: draft.rating === rating ? "selected" : "", onClick: () => updateDraft("rating", rating) }, rating)))
      ),
      h(Field, { label: "次走メモ" }, h("textarea", { value: draft.nextRunNote || "", onChange: (event) => updateDraft("nextRunNote", event.target.value), rows: 3, placeholder: "次走で買いたい条件など" })),
      h("div", { className: "form-actions" }, h("button", { type: "button", className: "secondary", onClick: onCancel }, "キャンセル"), h("button", { className: "primary", disabled: !String(draft.memo || "").trim() }, "保存"))
    );
  }

  function DistanceLossModal({ onClose }) {
    const halfRows = [
      ["1m外", "3.14m", "1.3馬身", "0.21秒"],
      ["2m外", "6.28m", "2.6馬身", "0.41秒"],
      ["4m外", "12.5m", "5.2馬身", "0.83秒"],
      ["6m外", "18.8m", "7.8馬身", "1.25秒"],
    ];
    const fullRows = [
      ["1m外", "6.28m", "2.6馬身", "0.41秒"],
      ["2m外", "12.5m", "5.2馬身", "0.83秒"],
      ["4m外", "25.1m", "10.4馬身", "1.67秒"],
      ["6m外", "37.6m", "15.7馬身", "2.51秒"],
    ];
    const renderTable = (title, rows) => h("section", { className: "distance-loss-table-wrap" },
      h("h4", null, title),
      h("table", { className: "distance-loss-table" },
        h("thead", null, h("tr", null, [title, "距離ロス", "馬身", "ロスタイム"].map((head) => h("th", { key: head }, head)))),
        h("tbody", null, rows.map((row) => h("tr", { key: row.join("-") }, row.map((cell) => h("td", { key: cell }, cell)))))
      )
    );
    return h("div", { className: "modal-backdrop", role: "dialog", "aria-modal": true },
      h("div", { className: "distance-loss-modal" },
        h("div", { className: "modal-head" },
          h("h3", null, "距離ロス早見表"),
          h("button", { type: "button", className: "secondary small", onClick: onClose }, "閉じる")
        ),
        renderTable("半周", halfRows),
        renderTable("1周", fullRows),
        h("section", { className: "distance-loss-note" },
          h("h4", null, "距離ロスの計算"),
          [
            "内ラチから1m外を半周走った場合の計算",
            "【2m（直径に換算するため1m+1mになる）× 3.14（円周率）】÷ 2 = 3.14m",
            "馬身に換算すると",
            "1馬身 = 2.4m とする",
            "3.14m ÷ 2.4m = 1.3馬身",
            "タイムに換算すると",
            "1馬身 = 0.16秒",
            "1.3馬身 × 0.16秒 = 0.21秒",
            "約0.2秒のロスがあったと見ることができる",
          ].map((line) => h("p", { key: line }, line))
        )
      )
    );
  }

  function HorseNoteCard({ memo, expanded, onToggle, onEdit, onDelete }) {
    const tags = [...new Set([...safeArray(memo.tags), ...safeArray(memo.troubleTags), ...safeArray(memo.strongTags), ...safeArray(memo.buyTags)])].filter(Boolean);
    const body = memo.memo || "";
    const shortBody = body.length > 90 && !expanded ? `${body.slice(0, 90)}...` : body;
    return h("article", { className: "horse-note-card" },
      h("div", { className: "horse-note-head" },
        h("strong", null, [memo.raceDate || memo.date, memo.track || memo.racecourse, raceNumberLabel(memo.raceNumber), memo.raceName].filter(Boolean).join(" ") || "単独メモ"),
        h("span", { className: `rank mini-rank rank-${normalizeRating(memo.rating || memo.attention)}` }, normalizeRating(memo.rating || memo.attention))
      ),
      tags.length > 0 && h("div", { className: "tag-row compact-tags" }, tags.map((tag) => h("span", { key: tag }, tag))),
      body && h("p", { className: "memo-text" }, shortBody),
      body.length > 90 && h("button", { type: "button", className: "text-button", onClick: onToggle }, expanded ? "閉じる" : "全文を見る"),
      memo.nextRunNote && h("p", { className: "next-run-note" }, `次走メモ：${memo.nextRunNote}`),
      h("div", { className: "inline-actions" }, h("button", { type: "button", className: "secondary small", onClick: onEdit }, "編集"), h("button", { type: "button", className: "danger-button ghost small", onClick: onDelete }, "削除"))
    );
  }

  function memoMatchesRecord(memo, record) {
    const memoHorse = normalizeHorseName(memo?.horseName);
    const recordHorse = normalizeHorseName(record?.horseName);
    if (!memoHorse || !recordHorse || memoHorse !== recordHorse) return false;

    const memoRaceId = safeString(memo?.raceId || "");
    const recordRaceId = safeString(record?.raceId || raceIdForHorseRecord(record) || "");
    const memoHorseNumber = safeString(memo?.horseNumber || memo?.horseNo || "");
    const recordHorseNumber = safeString(record?.horseNumber || record?.horseNo || "");
    if (memoRaceId && recordRaceId && memoRaceId === recordRaceId) {
      if (memoHorseNumber && recordHorseNumber) return memoHorseNumber === recordHorseNumber;
      return true;
    }

    const memoDate = getDateKeySafe(memo?.date || memo?.raceDate || "");
    const recordDate = getDateKeySafe(record?.raceDate || record?.date || "");
    const memoTrack = safeString(memo?.racecourse || memo?.track || "");
    const recordTrack = safeString(record?.track || record?.racecourse || "");
    const memoRaceNumber = normalizeRaceNumber(memo?.raceNumber || memo?.R || "");
    const recordRaceNumber = normalizeRaceNumber(record?.raceNumber || record?.R || "");
    const sameRace = memoDate !== "日付未設定"
      && recordDate !== "日付未設定"
      && memoDate === recordDate
      && memoTrack === recordTrack
      && memoRaceNumber === recordRaceNumber;
    if (!sameRace) return false;
    if (memoHorseNumber && recordHorseNumber) return memoHorseNumber === recordHorseNumber;
    return true;
  }

  function findMemoForRecord(memosForHorse, record) {
    return safeArray(memosForHorse)
      .slice()
      .sort((a, b) => safeString(b.updatedAt || b.createdAt || b.date || b.raceDate).localeCompare(safeString(a.updatedAt || a.createdAt || a.date || a.raceDate)))
      .find((memo) => memoMatchesRecord(memo, record)) || null;
  }

  function HorseRecordCard({ record, memo, rivalSummary, expanded, onToggle, onWriteMemo, onOpenRace }) {
    const tags = memo ? [...new Set([...safeArray(memo.tags), ...safeArray(memo.troubleTags), ...safeArray(memo.strongTags), ...safeArray(memo.buyTags)])].filter(Boolean) : [];
    const memoCount = memo ? 1 : 0;
    return h("article", { className: `record-card finish-${record.finish === "1" ? "win" : "normal"}` },
      h("button", { type: "button", className: "record-main", onClick: onToggle },
        h("div", { className: "record-rank" },
          h("strong", null, record.finish || "-"),
          h("span", null, "着")
        ),
        h("div", { className: "record-body" },
          h("h3", null, `${formatDateSlash(record.raceDate)} ${record.track}${raceNumberLabel(record.raceNumber)} ${record.raceName || "レース名未入力"}`),
          h("p", { className: "record-condition" }, [record.raceClass, `${record.surface || ""}${record.distance || ""}`, record.going].filter(Boolean).join(" / ")),
          h("div", { className: "record-facts" },
            h("span", null, `${record.finish || "-"}着 / ${record.fieldSize || "-"}頭 / 人気${record.popularity || "-"}`),
            h("span", null, `騎手: ${record.jockey || "-"} ${record.carriedWeight || "-"}kg`),
            h("span", null, `タイム: ${record.time || "-"} / 上がり ${record.last3f || "-"} / テン1F ${record.firstFurlongEstimate || "-"}`),
            h("span", null, `3角 ${record.corner3 || "-"}番手 / 4角 ${record.corner4 || "-"}番手`),
            h("span", { className: "record-frame-display" },
              h(FrameHorseNumbers, { frame: record.frameNumber, horseNumber: record.horseNumber }),
              tags.length > 0 && h("span", { className: "record-inline-tags" }, tags.slice(0, 5).map((tag) => h("span", { key: tag }, tag)))
            )
          )
        )
      ),
      h("div", { className: "inline-actions record-actions" },
        h("button", { type: "button", className: "secondary small", onClick: onWriteMemo }, "このレースのメモを書く")
      ),
      expanded && h("div", { className: "record-detail" },
        h("div", { className: "inline-actions record-actions" },
          h("button", { type: "button", className: "primary small", onClick: onOpenRace }, "このレース結果を詳しく見る")
        ),
        h(RivalWinSummary, { summary: rivalSummary })
      )
    );
  }

  function RivalWinSummary({ summary }) {
    const safeSummary = summary || { status: "missing", items: [], extraCount: 0 };
    let message = "";
    if (safeSummary.status === "insufficient" || safeSummary.status === "missing") {
      message = "他馬のその後成績データが不足しています";
    } else if (safeArray(safeSummary.items).length === 0) {
      message = "このレースの出走馬から後の勝ち上がり馬はまだ確認できません";
    }
    return h("section", { className: "rival-win-summary" },
      h("h4", null, "このレースの他馬のその後の勝利状況"),
      message
        ? h("p", null, message)
        : h("ul", null,
          safeSummary.items.map((item) => h("li", { key: `${item.horseName}-${item.runAfter}-${item.label}` },
            `${item.originalFinish || "-"}着馬 ${item.horseName} ${item.runAfter === 1 ? "次走勝利" : `${item.runAfter}走後勝利`}（${item.label || "勝利"}）`
          )),
          safeSummary.extraCount > 0 && h("li", { className: "rival-win-extra" }, `他${safeSummary.extraCount}頭が勝利`)
        )
    );
  }

  function formatDateSlash(value) {
    return value ? value.replaceAll("-", "/") : "-";
  }

  function HorseCard({ horse, onOpen }) {
    return h("article", { className: "horse-card horse-card-actionable" },
      h("button", { className: "horse-card-main", onClick: onOpen },
        h("div", { className: `rank rank-${horse.maxAttention}` }, horse.maxAttention),
        h("div", null, h("h3", null, horse.horseName), h("p", null, `${horse.latest.raceDate}・${horse.latest.track}${horse.latest.raceNumber ? raceNumberLabel(horse.latest.raceNumber) : ""}・${horse.latest.distance || "距離未入力"}`), h("div", { className: "mini-tags" }, h("span", null, `メモ ${horse.count}`), h("span", null, `成績 ${horse.recordCount || 0}`)))
      ),
    );
  }

  function MemoCard({ memo, onOpen, onDelete }) {
    const tags = [...memo.troubleTags, ...memo.strongTags, ...memo.buyTags];
    return h("article", { className: "memo-card" },
      h("button", { className: "card-main", onClick: onOpen },
        h("div", { className: "memo-head" },
          h("div", null, h("h3", null, memo.horseName), h("p", null, h(CalendarDays, { size: 14 }), ` ${memo.raceDate}・${memo.track}${memo.raceNumber ? raceNumberLabel(memo.raceNumber) : ""}・${memo.distance || "距離未入力"}`)),
          h("div", { className: `rank rank-${memo.attention}` }, memo.attention)
        ),
        h("div", { className: "facts" }, h("span", null, `馬場 ${memo.going}`), h("span", null, `着順 ${memo.finish || "-"}`), h("span", null, `通過 ${memo.position || "-"}`), h("span", null, `上がり ${memo.last3f || "-"}`)),
        memo.memo && h("p", { className: "memo-text" }, memo.memo),
        tags.length > 0 && h("div", { className: "tag-row" }, tags.slice(0, 8).map((tag) => h("span", { key: tag }, tag))),
      ),
      onDelete && h("button", { className: "delete-button", onClick: onDelete, "aria-label": "メモを削除" }, h(Trash2, { size: 18 }))
    );
  }

  function TagPicker({ title, tags, selected, onChange }) {
    const toggle = (tag) => onChange(selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag]);
    return h("section", { className: "tag-picker" },
      h("p", { className: "field-label" }, h(Tag, { size: 15 }), ` ${title}`),
      h("div", { className: "tag-options" }, tags.map((tag) => h("button", { type: "button", className: selected.includes(tag) ? "selected" : "", key: tag, onClick: () => toggle(tag) }, tag)))
    );
  }

  function Field({ label, required, children }) {
    return h("label", { className: "field" }, h("span", { className: "field-label" }, label, required && h("b", null, "必須")), children);
  }

  function Metric({ label, value }) {
    return h("div", { className: "metric" }, h("strong", null, value), h("span", null, label));
  }

  function SectionTitle({ icon, title }) {
    return h("h2", { className: "section-title" }, icon, title);
  }

  function EmptyState({ title, text, action }) {
    return h("div", { className: "empty-state" }, h("p", null, title), h("span", null, text), action);
  }

  function PredictionPage({ raceCards, horseRecords, openPredictionRace }) {
    const allCards = getAllRaceCardsSafe();
    const displayCards = allCards.length > 0 ? allCards : safeArray(raceCards).map(normalizeRaceCardForList);
    const sorted = sortRaceCardsRecent(displayCards.map((race) => sanitizeRaceCard(race.raw || race)));
    const pending = sorted.filter((race) => safeArray(race.entries).length > 0 && !hasRaceResult(race, horseRecords));
    const resulted = sorted.filter((race) => safeArray(race.entries).length > 0 && hasRaceResult(race, horseRecords)).slice(0, 8);
    const racesToShow = pending.length > 0 ? pending : resulted;

    return h("section", { className: "screen prediction-screen" },
      h(SectionTitle, { icon: h(ListChecks, { size: 18 }), title: "予想" }),
      h("div", { className: "backup-panel compact-panel" },
        h("h2", null, "今週の出走表"),
        h("p", null, "登録済みの出走表から、結果未登録のレースを優先して表示します。")
      ),
      racesToShow.length === 0
        ? h(EmptyState, { title: "予想できる出走表がありません", text: "出走表インポートでレースを登録すると、ここに表示されます。" })
        : h("div", { className: "compact-race-list prediction-race-list" }, racesToShow.map((race) => {
          const info = race.raceInfo || {};
          const resultLabel = hasRaceResult(race, horseRecords) ? "登録済み" : "未登録";
          return h("button", {
            key: race.raceId || race.id,
            type: "button",
            className: "compact-race-card prediction-race-card",
            onClick: () => openPredictionRace(race.raceId || race.id),
          },
            h("span", { className: "compact-race-main" },
              h("strong", null, `${formatDateSlash(info.raceDate)} ${info.track || "-"}${raceNumberLabel(info.raceNumber)} ${info.raceName || "レース名未設定"}`),
              h("span", null, [
                `${info.surface || ""}${info.distance || ""}${info.distance ? "m" : ""}`,
                info.going,
                `${safeArray(race.entries).length}頭`,
                `結果：${resultLabel}`,
              ].filter(Boolean).join(" / "))
            ),
            h("span", { className: "race-chevron", "aria-hidden": true }, ">")
          );
        }))
    );
  }

  function PredictionRacePage({ selectedRaceId, raceCards, horseRecords, memos, paceNotes, averageTimes, trackBiasNotes, openHorse, openRaceDetail, openPacePrediction, openImportantFactors, openTrackBias }) {
    const storedCards = getAllRaceCards();
    const cards = sanitizeRaceCards(storedCards.length > 0 ? storedCards : raceCards);
    const race = cards.find((item) => item.raceId === selectedRaceId || item.id === selectedRaceId);
    if (!race) {
      return h("section", { className: "screen prediction-screen" },
        h(EmptyState, { title: "馬柱を表示するレースが見つかりません", text: "予想タブからレースを選び直してください。" })
      );
    }
    const info = race.raceInfo || {};
    const entries = safeArray(race.entries).map(sanitizeRaceEntry);
    const pace = buildPacePrediction(race, horseRecords, paceNotes, cards);
    const factorInfo = getImportantFactorGroupsForRace(race, cards, averageTimes, horseRecords, trackBiasNotes);
    const trackBias = buildTrackBiasSummaryForRace(race, cards, averageTimes, horseRecords, trackBiasNotes);

    return h("section", { className: "screen prediction-screen" },
      h("article", { className: "race-detail-hero prediction-hero" },
        h("p", null, `${formatDateSlash(info.raceDate)} ${info.track || "-"}${raceNumberLabel(info.raceNumber)}`),
        h("h2", null, info.raceName || "レース名未設定"),
        h("div", { className: "race-detail-line" }, [
          info.raceClass,
          `${info.surface || ""}${info.distance || ""}${info.distance ? "m" : ""}`,
          info.going,
          `${entries.length}頭`,
        ].filter(Boolean).map((item) => h("span", { key: item }, item)))
      ),
      entries.length === 0
        ? h(EmptyState, { title: "出走馬データがありません", text: "出走表の entries が未登録です。" })
        : h("div", { className: "race-column-board" }, entries.map((entry) => h(PredictionHorseColumnRow, {
          key: `${entry.horseNumber}-${entry.horseName}`,
          entry,
          horseRecords,
          memos,
          raceCards: cards,
          openHorse,
        }))),
      h(PacePredictionSummary, { race, pace, openPacePrediction }),
      h(ImportantFactorSummary, { race, factorInfo, openImportantFactors }),
      h(TrackBiasSummary, { race, trackBias, openTrackBias }),
      h("div", { className: "form-actions" },
        h("button", { type: "button", className: "secondary full-button", onClick: () => openRaceDetail(race.raceId || race.id) }, "レース詳細を見る")
      )
    );
  }

  function PredictionHorseColumnRow({ entry, horseRecords, memos, raceCards, openHorse }) {
    const horseName = normalizeHorseName(entry.horseName);
    const records = getHorsePredictionRecords(horseName, horseRecords, raceCards);
    const horseMemos = safeArray(memos)
      .filter((memo) => normalizeHorseName(memo.horseName) === horseName)
      .sort((a, b) => safeString(b.updatedAt || b.createdAt || b.raceDate || b.date).localeCompare(safeString(a.updatedAt || a.createdAt || a.raceDate || a.date)));
    const latestMemo = horseMemos[0] || null;
    const rating = latestMemo ? normalizeRating(latestMemo.rating || latestMemo.attention) : "";
    const tags = latestMemo ? [...new Set([...safeArray(latestMemo.tags), ...safeArray(latestMemo.troubleTags), ...safeArray(latestMemo.strongTags), ...safeArray(latestMemo.buyTags)])].filter(Boolean) : [];
    const recentRecords = records.slice(0, 10);
    const isScratched = isUnavailableEntry(entry);

    return h("article", { className: `race-column-row ${isScratched ? "scratched" : ""}` },
      h("div", { className: "race-column-horse" },
        h("div", { className: "horse-column-number" }, h(FrameHorseNumbers, { frame: entry.frameNumber || entry.frame, horseNumber: entry.horseNumber })),
        h("button", { type: "button", className: "horse-column-title", onClick: () => openHorse(horseName) },
          h("strong", null, horseName || "馬名未設定", isScratched && h("span", { className: "scratch-badge inline" }, "取消")),
          h("span", null, [entry.sexAge, entry.jockey, entry.carriedWeight || entry.weight ? `${entry.carriedWeight || entry.weight}kg` : "", entry.popularity ? `人気${entry.popularity}` : ""].filter(Boolean).join(" / ")),
          h("span", null, `評価:${rating || "なし"} / メモ${horseMemos.length} / 成績${records.length}`)
        ),
        tags.length > 0 && h("div", { className: "tag-row compact-tags" }, tags.slice(0, 5).map((tag) => h("span", { key: tag }, tag)))
      ),
      recentRecords.length > 0
        ? h("div", { className: "race-column-scroll" }, recentRecords.map((record, index) => {
          const recordRaceId = raceIdForHorseRecord(record);
          const relatedRace = safeArray(raceCards).find((race) => race.raceId === recordRaceId || race.id === recordRaceId);
          const tendency = relatedRace?.result?.trackBiasLabel || relatedRace?.result?.paceBiasLabel
            ? [relatedRace.result.trackBiasLabel, relatedRace.result.paceBiasLabel].filter(Boolean).join(" / ")
            : "";
          const relatedMemo = findMemoForRecord(horseMemos, record);
          return h("article", { key: `${record.raceDate}-${record.raceNumber}-${record.finish}-${record.time}-${index}`, className: "race-column-cell" },
            h("strong", null, `${index + 1}走前`),
            h("p", null, `${formatDateSlash(record.raceDate || record.date)} ${record.track || record.racecourse || ""}${raceNumberLabel(record.raceNumber || "")}`.trim()),
            h("p", null, [record.raceClass, `${record.surface || ""}${record.distance || ""}${record.going ? ` ${record.going}` : ""}`].filter(Boolean).join(" / ")),
            h("p", null, `${record.finish || "-"}着 / ${record.fieldSize || "-"}頭 / 人気${record.popularity || "-"}`),
            h("p", null, `タイム ${record.time || "-"} / 上がり ${record.last3f || "-"} / テン1F ${record.firstFurlongEstimate || "-"}`),
            h("p", null, `3角${record.corner3 || "-"} / 4角${record.corner4 || "-"}`),
            h("p", null, [record.jockey, record.carriedWeight || record.weight ? `${record.carriedWeight || record.weight}kg` : ""].filter(Boolean).join(" / ")),
            tendency && h("small", null, `馬場傾向：${tendency}`),
            relatedMemo && h("small", null, `メモあり${relatedMemo.rating ? ` / ${relatedMemo.rating}` : ""}`)
          );
        }))
        : h("div", { className: "race-column-scroll" }, h("article", { className: "race-column-cell empty" }, "過去成績なし"))
    );
  }

  function PacePredictionSummary({ race, pace, openPacePrediction }) {
    const raceId = race?.raceId || race?.id || "";
    const labelList = (items) => safeArray(items).slice(0, 6).map((item) => `${item.entry.horseNumber || "-"} ${item.entry.horseName || ""}`.trim()).join("、") || "-";
    return h("article", { className: "pace-summary-card" },
      h("div", { className: "section-heading compact-heading" },
        h("h3", null, "展開予想"),
        h("button", { type: "button", className: "secondary small", onClick: () => openPacePrediction(raceId) }, "詳しく見る")
      ),
      h("p", { className: "muted-mini" }, "登録済みデータからの補助予想です。映像確認ではないため断定ではありません。"),
      h("div", { className: "pace-grid" },
        h("div", null, h("span", null, "ペース予想"), h("strong", null, pace.paceLabel)),
        h("div", null, h("span", null, "逃げ候補"), h("strong", null, labelList(pace.groups.front))),
        h("div", null, h("span", null, "先行・中団候補"), h("strong", null, labelList(pace.groups.middle))),
        h("div", null, h("span", null, "差し候補"), h("strong", null, labelList(pace.groups.closer)))
      )
    );
  }

  function PacePredictionDetailPage({ selectedRaceId, raceCards, horseRecords, paceNotes, onSaveNote }) {
    const storedCards = getAllRaceCards();
    const cards = sanitizeRaceCards(storedCards.length > 0 ? storedCards : raceCards);
    const race = cards.find((item) => item.raceId === selectedRaceId || item.id === selectedRaceId);
    if (!race) {
      return h("section", { className: "screen prediction-screen" },
        h(EmptyState, { title: "展開予想を表示するレースが見つかりません", text: "予想タブからレースを選び直してください。" })
      );
    }
    const info = race.raceInfo || {};
    const pace = buildPacePrediction(race, horseRecords, paceNotes, cards);
    const rows = pace.entries.map((entry) => {
      const horseName = normalizeHorseName(entry.horseName);
      const records = getHorsePredictionRecords(horseName, horseRecords, cards);
      return { entry, records, note: getPaceNote(paceNotes, pace.raceId, entry), bestFirstFurlong: getBestFirstFurlong(records) };
    });

    return h("section", { className: "screen prediction-screen" },
      h("article", { className: "race-detail-hero prediction-hero" },
        h("p", null, `${formatDateSlash(info.raceDate)} ${info.track || "-"}${raceNumberLabel(info.raceNumber)}`),
        h("h2", null, "展開予想 詳細"),
        h("div", { className: "race-detail-line" }, [
          info.raceName,
          `${info.surface || ""}${info.distance || ""}${info.distance ? "m" : ""}`,
          info.going,
          `ペース予想:${pace.paceLabel}`,
        ].filter(Boolean).map((item) => h("span", { key: item }, item)))
      ),
      h("div", { className: "pace-detail-list" }, rows.map(({ entry, note, bestFirstFurlong }) => {
        const isScratched = isUnavailableEntry(entry);
        return h("article", { key: `${entry.horseNumber}-${entry.horseName}`, className: `pace-detail-card ${isScratched ? "scratched" : ""}` },
          h("div", { className: "pace-detail-head" },
            h(FrameHorseNumbers, { frame: entry.frameNumber || entry.frame, horseNumber: entry.horseNumber }),
            h("strong", null, entry.horseName || "馬名未設定"),
            isScratched && h("span", { className: "scratch-badge" }, "取消"),
            h("span", null, `テン1F ${bestFirstFurlong}`)
          ),
          h("div", { className: "pace-choice-row" }, ["余力あり", "普通", "余力なし"].map((value) => h("button", {
            key: value,
            type: "button",
            className: note.stamina === value ? "selected" : "",
            onClick: () => onSaveNote(pace.raceId, entry, { stamina: value }),
          }, value))),
          h("label", { className: "field-label" }, "陣営コメント"),
          h("textarea", {
            value: note.comment || "",
            rows: 3,
            placeholder: "例：叩いた上積みあり。揉まれ弱いので外枠なら。",
            onChange: (event) => onSaveNote(pace.raceId, entry, { comment: event.target.value }),
          })
        );
      }))
    );
  }

  function ImportantFactorSummary({ race, factorInfo, openImportantFactors }) {
    const raceId = race?.raceId || race?.id || "";
    const groups = safeArray(factorInfo?.groups);
    const factors = groups.length ? groups.flatMap((group) => safeArray(group.factors)) : [];
    const uniqueFactors = [...new Set(factors)];
    return h("article", { className: "important-factor-card" },
      h("div", { className: "section-heading compact-heading" },
        h("h3", null, "重要ファクター"),
        uniqueFactors.length > 0 && h("button", { type: "button", className: "secondary small", onClick: () => openImportantFactors(raceId) }, "詳しく見る")
      ),
      h("p", { className: "muted-mini" }, factorInfo?.label || "コース情報未設定"),
      groups.length === 0
        ? h("p", { className: "muted-mini" }, "このコースの重要ファクターはまだ登録されていません")
        : h("div", { className: "important-factor-list" },
          factorInfo.unresolvedTendency && h("p", { className: "muted-mini" }, "馬場傾向：未判定。該当しうるパターンを表示しています。"),
          groups.map((group) => h("div", { key: group.label, className: "important-factor-group" },
            groups.length > 1 && h("strong", null, group.label),
            h("ol", null, safeArray(group.factors).map((factor) => h("li", { key: factor }, factor)))
          ))
        )
    );
  }

  function ImportantFactorDetailPage({ selectedRaceId, raceCards, horseRecords, memos, averageTimes, factorNotes, trackBiasNotes, onSaveFactorNote }) {
    const storedCards = getAllRaceCards();
    const cards = sanitizeRaceCards(storedCards.length > 0 ? storedCards : raceCards);
    const race = cards.find((item) => item.raceId === selectedRaceId || item.id === selectedRaceId);
    if (!race) {
      return h("section", { className: "screen prediction-screen" },
        h(EmptyState, { title: "重要ファクターを表示するレースが見つかりません", text: "予想タブからレースを選び直してください。" })
      );
    }
    const info = race.raceInfo || {};
    const factorInfo = getImportantFactorGroupsForRace(race, cards, averageTimes, horseRecords, trackBiasNotes);
    const factors = [...new Set(safeArray(factorInfo.groups).flatMap((group) => safeArray(group.factors)))];
    const entries = safeArray(race.entries).map(sanitizeRaceEntry);
    return h("section", { className: "screen prediction-screen" },
      h("article", { className: "race-detail-hero prediction-hero" },
        h("p", null, `${formatDateSlash(info.raceDate)} ${info.track || "-"}${raceNumberLabel(info.raceNumber)}`),
        h("h2", null, "重要ファクター詳細"),
        h("div", { className: "race-detail-line" }, [
          info.raceName,
          `${info.surface || ""}${info.distance || ""}${info.distance ? "m" : ""}`,
          info.going,
        ].filter(Boolean).map((item) => h("span", { key: item }, item)))
      ),
      factors.length === 0
        ? h(EmptyState, { title: "重要ファクター未登録", text: "このコースの重要ファクターはまだ登録されていません。" })
        : h("article", { className: "important-factor-card" },
          h("h3", null, factorInfo.label),
          factorInfo.unresolvedTendency && h("p", { className: "muted-mini" }, "馬場傾向未判定のため、該当しうるファクターをまとめて表示しています。"),
          h("ol", null, factors.map((factor) => h("li", { key: factor }, factor)))
        ),
      factors.length > 0 && h("div", { className: "important-factor-detail-list" }, entries.map((entry) => {
        const context = getHorseFactorContext(entry, horseRecords, memos, cards);
        const isScratched = isUnavailableEntry(entry);
        return h("article", { key: `${entry.horseNumber}-${entry.horseName}`, className: `important-factor-horse-card ${isScratched ? "scratched" : ""}` },
          h("div", { className: "pace-detail-head" },
            h(FrameHorseNumbers, { frame: entry.frameNumber || entry.frame, horseNumber: entry.horseNumber }),
            h("strong", null, entry.horseName || "馬名未設定"),
            isScratched && h("span", { className: "scratch-badge" }, "取消"),
            h("span", null, context.records.length ? `成績${context.records.length}` : "過去成績なし")
          ),
          factors.map((factor) => {
            const analysis = analyzeImportantFactor(factor, entry, context, cards);
            const note = getFactorNote(factorNotes, race.raceId || race.id, entry, factor);
            return h("div", { key: factor, className: "factor-analysis-row" },
              h("div", null,
                h("strong", null, factor),
                h("p", { className: analysis.tone === "positive" ? "factor-positive" : "muted-mini" }, analysis.label || "該当データなし")
              ),
              h("textarea", {
                value: note.memo || "",
                rows: 2,
                placeholder: "このファクターについて追記メモ",
                onChange: (event) => onSaveFactorNote(race.raceId || race.id, entry, factor, event.target.value),
              })
            );
          })
        );
      }))
    );
  }

  function TrackBiasSummary({ race, trackBias, openTrackBias }) {
    const raceId = race?.raceId || race?.id || "";
    const targetLabel = [trackBias?.track, trackBias?.surface].filter(Boolean).join(" ");
    const hasReferences = safeArray(trackBias?.referenceRaces).length > 0;
    return h("article", { className: "track-bias-card" },
      h("div", { className: "section-heading compact-heading" },
        h("h3", null, "トラックバイアス"),
        h("button", { type: "button", className: "secondary small", onClick: () => openTrackBias(raceId) }, "詳しく見る")
      ),
      h("p", { className: "muted-mini" }, targetLabel || "コース情報未設定"),
      hasReferences
        ? h("div", { className: "track-bias-grid" },
          h("div", null, h("span", null, "時計傾向"), h("strong", null, trackBias.clock?.label || "判定材料不足")),
          h("div", null, h("span", null, "内外傾向"), h("strong", null, trackBias.manual?.pathLabel || "判定材料不足")),
          h("div", null, h("span", null, "脚質傾向"), h("strong", null, trackBias.manual?.styleLabel || "判定材料不足")),
          h("div", null, h("span", null, "対象レース"), h("strong", null, `前日＋同日 ${trackBias.targetRaceCount || 0}レース`)),
          h("div", null, h("span", null, "入力済み"), h("strong", null, `${trackBias.inputCount || 0}件`))
        )
        : h("p", { className: "muted-mini" }, "前日＋同日の登録済みレースがありません。"),
      h("p", { className: "muted-mini" }, "登録済みレースと手入力情報からの補助判断です。")
    );
  }

  function TrackBiasDetailPage({ selectedRaceId, raceCards, horseRecords, averageTimes, trackBiasNotes, onSaveTrackBiasNote }) {
    const storedCards = getAllRaceCards();
    const cards = sanitizeRaceCards(storedCards.length > 0 ? storedCards : raceCards);
    const race = cards.find((item) => item.raceId === selectedRaceId || item.id === selectedRaceId);
    if (!race) {
      return h("section", { className: "screen prediction-screen" },
        h(EmptyState, { title: "トラックバイアスを表示するレースが見つかりません", text: "予想タブからレースを選び直してください。" })
      );
    }
    const info = race.raceInfo || {};
    const summary = buildTrackBiasSummaryForRace(race, cards, averageTimes, horseRecords, trackBiasNotes);
    const pathChoices = ["内", "中", "外", "不明"];
    const styleChoices = ["逃げ", "先行", "好位差し", "差し", "追込", "不明"];
    const notePatch = (raceItem, row, patch) => {
      const raceInfo = raceItem.raceInfo || {};
      const existing = getTrackBiasNote(trackBiasNotes, raceItem, row);
      onSaveTrackBiasNote({
        ...existing,
        ...patch,
        date: dateKeyToIso(raceInfo.raceDate) || raceInfo.raceDate || "",
        racecourse: raceInfo.track || "",
        surface: raceInfo.surface || "",
        raceId: raceItem.raceId || raceItem.id || "",
        horseNumber: row.horseNumber || "",
        horseName: row.horseName || "",
        finishPosition: row.finish || "",
      });
    };
    return h("section", { className: "screen prediction-screen" },
      h("article", { className: "race-detail-hero prediction-hero" },
        h("p", null, `${formatDateSlash(info.raceDate)} ${info.track || "-"}${raceNumberLabel(info.raceNumber)}`),
        h("h2", null, "トラックバイアス詳細"),
        h("div", { className: "race-detail-line" }, [
          info.raceName,
          `${info.surface || ""}${info.distance || ""}${info.distance ? "m" : ""}`,
          info.going,
        ].filter(Boolean).map((item) => h("span", { key: item }, item)))
      ),
      h("article", { className: "track-bias-card" },
        h("h3", null, "集計結果"),
        h("div", { className: "track-bias-grid" },
          h("div", null, h("span", null, "時計傾向"), h("strong", null, summary.clock?.label || "判定材料不足")),
          h("div", null, h("span", null, "内外傾向"), h("strong", null, summary.manual?.pathLabel || "判定材料不足")),
          h("div", null, h("span", null, "脚質傾向"), h("strong", null, summary.manual?.styleLabel || "判定材料不足")),
          h("div", null, h("span", null, "対象"), h("strong", null, `前日＋同日 ${summary.targetRaceCount || 0}レース`)),
          h("div", null, h("span", null, "入力済み"), h("strong", null, `${summary.inputCount || 0}件`))
        ),
        h("p", { className: "muted-mini" }, "勝ち時計・平均タイムと、1〜3着馬への手入力からの補助判断です。")
      ),
      safeArray(summary.referenceRaces).length === 0
        ? h(EmptyState, { title: "参照対象レースなし", text: "前日＋同日の同競馬場・同馬場種別の登録済みレースがありません。" })
        : h("div", { className: "track-bias-detail-list" }, safeArray(summary.referenceRaces).map((raceItem) => {
          const raceInfo = raceItem.raceInfo || {};
          const rows = sortResultRows(resultRowsFromRace(raceItem, horseRecords)).filter(isFinishedResultRow).slice(0, 3);
          return h("article", { key: raceItem.raceId || raceItem.id, className: "track-bias-race-card" },
            h("h3", null, `${formatDateSlash(raceInfo.raceDate)} ${raceInfo.track || "-"}${raceNumberLabel(raceInfo.raceNumber)} ${raceInfo.raceName || ""}`),
            h("p", { className: "muted-mini" }, [`${raceInfo.surface || ""}${raceInfo.distance || ""}${raceInfo.distance ? "m" : ""}`, raceInfo.going].filter(Boolean).join(" / ")),
            rows.length === 0
              ? h("p", { className: "muted-mini" }, "1〜3着馬データなし")
              : rows.map((row) => {
                const note = getTrackBiasNote(trackBiasNotes, raceItem, row);
                return h("div", { key: `${row.finish}-${row.horseNumber}-${row.horseName}`, className: "bias-top3-row" },
                  h("div", { className: "pace-detail-head" },
                    h(FrameHorseNumbers, { frame: row.frameNumber || row.frame, horseNumber: row.horseNumber }),
                    h("strong", null, `${row.finish || "-"}着 ${row.horseName || "馬名未設定"}`),
                    h("span", null, row.time || "")
                  ),
                  h("p", { className: "field-label" }, "通ったところ"),
                  h("div", { className: "bias-choice-row" }, pathChoices.map((value) => h("button", {
                    key: value,
                    type: "button",
                    className: note.coursePath === value ? "selected" : "",
                    onClick: () => notePatch(raceItem, row, { coursePath: value }),
                  }, value))),
                  h("p", { className: "field-label" }, "脚質"),
                  h("div", { className: "bias-choice-row wide" }, styleChoices.map((value) => h("button", {
                    key: value,
                    type: "button",
                    className: note.runningStyle === value ? "selected" : "",
                    onClick: () => notePatch(raceItem, row, { runningStyle: value }),
                  }, value)))
                );
              })
          );
        }))
    );
  }

  function BottomNav({ screen, setScreen }) {
    const items = [
      { id: "home", label: "ホーム", icon: Trophy },
      { id: "add", label: "追加", icon: Plus },
      { id: "import", label: "出走表", icon: ClipboardList },
      { id: "prediction", label: "予想", icon: ListChecks },
      { id: "search", label: "検索", icon: Search },
    ];
    return h("nav", { className: "bottom-nav" }, items.map((item) => h("button", { className: screen === item.id ? "active" : "", key: item.id, onClick: () => setScreen(item.id) }, h(item.icon, { size: 20 }), h("span", null, item.label))));
  }

  return App;
}
