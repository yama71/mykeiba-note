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
const BACKUP_VERSION = 1;
const STORAGE_ALIASES = {
  horseNotes: MEMO_STORAGE_KEY,
  horseRecords: HORSE_RECORDS_STORAGE_KEY,
  weeklyRaces: WEEKLY_RACES_COMPAT_KEY,
  raceEntries: RACE_ENTRIES_COMPAT_KEY,
  raceResults: RACE_STORAGE_KEY,
  averageTimes: AVERAGE_TIMES_STORAGE_KEY,
  brokenWeeklyRaces: BROKEN_WEEKLY_RACES_KEY,
  brokenRaceEntries: BROKEN_RACE_ENTRIES_KEY,
  brokenRaceResults: BROKEN_RACE_RESULTS_KEY,
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
};

const APP_STORAGE_KEYS = [
  MEMO_STORAGE_KEY,
  RACE_STORAGE_KEY,
  HORSE_RECORDS_STORAGE_KEY,
  AVERAGE_TIMES_STORAGE_KEY,
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
    localStorage.setItem(FORCE_HOME_STORAGE_KEY, "1");
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

  if (rows.length > 0) return rows;

  const legacyRows = lines
    .filter((line) => !/^(枠|枠番|馬番|印|人気|単勝|性齢|馬体重)/.test(line))
    .map(parseLegacyRaceLine)
    .filter(Boolean);
  return legacyRows.length > 0 ? legacyRows : [makeUnparsedRow(text.trim())];
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
    horseName,
    sexAge: "",
    popularity,
    jockey: "",
    carriedWeight: "",
    raw: line,
    parsed: false,
  };
}

function extractSexAge(line) {
  return line.match(/[牡牝セ]\d{1,2}/)?.[0] || "";
}

function extractJockeyWeight(line) {
  const matched = line.match(/([▲△☆◇★▽]?\s*[^()\s]+)\((\d{2}(?:\.\d)?)\)/);
  if (!matched) return null;
  return {
    jockey: matched[1].replace(/^[▲△☆◇★▽]\s*/, "").trim(),
    carriedWeight: matched[2],
  };
}

function inferFrameNumber(horseNumber) {
  const number = Number(horseNumber);
  if (!Number.isFinite(number) || number < 1) return "";
  return Math.min(8, Math.ceil(number / 2));
}

function parseLegacyRaceLine(line) {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length < 5 || !isFrame(tokens[0]) || !isHorseNumber(tokens[1])) return null;
  return {
    id: crypto.randomUUID(),
    frameNumber: tokens[0],
    horseNumber: tokens[1],
    horseName: tokens.slice(2, -2).join(" "),
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

  return rows.length > 0 ? rows : [makeResultRow(text.trim())];
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
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{1,2}:\d{2}\.\d$/.test(trimmed)) {
    const [minutes, seconds] = trimmed.split(":");
    return Number(minutes) * 60 + Number(seconds);
  }
  if (/^\d{2,3}\.\d$/.test(trimmed)) return Number(trimmed);
  return null;
}

function judgePaceBias(rows) {
  const board = rows
    .filter((row) => /^\d+$/.test(row.finish))
    .sort((a, b) => Number(a.finish) - Number(b.finish))
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

function buildRaceResult(rows, averageWinningTime) {
  const safeRows = safeArray(rows).map(sanitizeResultRow);
  const sortedRows = [...safeRows].sort((a, b) => Number(a.finish || 999) - Number(b.finish || 999));
  const winningTime = sortedRows[0]?.time || "";
  return {
    status: "result_registered",
    rows: safeRows,
    fullResults: safeRows,
    top3: sortedRows.slice(0, 3),
    averageWinningTime: averageWinningTime || "",
    winningTime,
    paceBias: judgePaceBias(safeRows),
    trackTrend: judgeTrackTrend(winningTime, averageWinningTime),
    registeredAt: new Date().toISOString(),
    savedAt: new Date().toISOString(),
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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
  };
}

function sanitizeRaceEntry(entry = {}) {
  return {
    id: entry.id || makeId("entry"),
    frameNumber: String(entry.frameNumber || entry.frame || entry["枠"] || ""),
    horseNumber: String(entry.horseNumber || ""),
    horseName: String(entry.horseName || entry["馬名"] || ""),
    sexAge: String(entry.sexAge || entry["性齢"] || ""),
    popularity: String(entry.popularity || entry["人気"] || ""),
    jockey: String(entry.jockey || entry["騎手"] || ""),
    carriedWeight: String(entry.carriedWeight || entry.weight || entry["斤量"] || ""),
    raw: entry.raw || "",
    parsed: Boolean(entry.parsed),
  };
}

function toStorageRaceEntry(entry = {}) {
  const safeEntry = sanitizeRaceEntry(entry);
  return {
    frame: safeEntry.frameNumber || "",
    horseNumber: safeEntry.horseNumber || "",
    horseName: normalizeHorseName(safeEntry.horseName),
    sexAge: safeEntry.sexAge || "",
    popularity: safeEntry.popularity || "",
    jockey: safeEntry.jockey || "",
    weight: safeEntry.carriedWeight || "",
  };
}

function sanitizeResultRow(row = {}) {
  return {
    id: row.id || makeId("result-row"),
    finish: String(row.finish || ""),
    frameNumber: String(row.frameNumber || ""),
    horseNumber: String(row.horseNumber || ""),
    horseName: String(row.horseName || ""),
    sexAge: String(row.sexAge || ""),
    popularity: String(row.popularity || ""),
    jockey: String(row.jockey || ""),
    carriedWeight: String(row.carriedWeight || ""),
    time: String(row.time || ""),
    margin: String(row.margin || ""),
    last3f: String(row.last3f || ""),
    corner3: String(row.corner3 || ""),
    corner4: String(row.corner4 || row.position || ""),
  };
}

function sanitizeRaceCard(race = {}) {
  const infoSource = { ...(race.raceInfo || {}), ...race };
  const raceInfo = sanitizeRaceInfo(infoSource);
  const entries = safeArray(race.entries).map(sanitizeRaceEntry);
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
      ? safeArray(rawResult.top3).map(sanitizeResultRow)
      : [...safeArray(rawResult.fullResults || rawResult.rows || rawResult.results).map(sanitizeResultRow)]
        .sort((a, b) => Number(a.finish || 999) - Number(b.finish || 999))
        .slice(0, 3),
    averageWinningTime: rawResult.averageWinningTime || "",
    winningTime: rawResult.winningTime || "",
    paceBias: rawResult.paceBias || "判定材料不足",
    trackTrend: rawResult.trackTrend || "平均勝ち時計を入力すると補助判定できます",
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
  const raceId = buildStableRaceId({
    date: safeRace.raceInfo.raceDate,
    racecourse: safeRace.raceInfo.track,
    raceNumber: safeRace.raceInfo.raceNumber,
  });
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
  return {
    horseRecords: loadJson(HORSE_RECORDS_STORAGE_KEY).length,
    horseNotes: loadJson(MEMO_STORAGE_KEY).length,
    raceResults,
    entryRegistered,
    raceEntries,
    weeklyRaces: races.length,
    averageTimes: loadJson(AVERAGE_TIMES_STORAGE_KEY).length || defaultAverageTimes.length,
    unreadable,
    quarantined: loadJson(BROKEN_WEEKLY_RACES_KEY).length + loadJson(BROKEN_RACE_ENTRIES_KEY).length + loadJson(BROKEN_RACE_RESULTS_KEY).length,
    brokenWeeklyRaces: loadJson(BROKEN_WEEKLY_RACES_KEY).length,
    brokenRaceEntries: loadJson(BROKEN_RACE_ENTRIES_KEY).length,
    brokenRaceResults: loadJson(BROKEN_RACE_RESULTS_KEY).length,
  };
}

function normalizeHorseName(value) {
  return (value || "").trim();
}

function recordKey(record) {
  const horseName = normalizeHorseName(record.horseName);
  if (record.raceId) return `${record.raceId}::${horseName}`;
  return [record.raceDate, record.track, record.raceNumber, horseName].join("::");
}

function buildHorseRecord(race, row) {
  const info = race.raceInfo || {};
  const fieldSize = race.result?.rows?.length || race.entries?.length || "";
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
    finish: row.finish || "",
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
    averageWinningTime: race.result?.averageWinningTime || "",
    averageTimeDiff: toSeconds(row.time || "") != null && toSeconds(race.result?.averageWinningTime || "") != null
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
  if (directRows.length > 0) return directRows.map(sanitizeResultRow);

  const raceId = safeRace.raceId || safeRace.id;
  const storedResult = loadJson("raceResults").find((item) => item?.raceId === raceId || item?.id === raceId);
  const storedRows = safeArray(storedResult?.result?.fullResults || storedResult?.result?.rows || storedResult?.fullResults || storedResult?.rows || storedResult?.results);
  if (storedRows.length > 0) return storedRows.map(sanitizeResultRow);

  return safeArray(horseRecords)
    .filter((record) => record.raceId === raceId || record.raceId === safeRace.id || record.raceId === safeRace.raceId)
    .map((record) => sanitizeResultRow({
      id: record.id,
      finish: record.finish,
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
      parsed: true,
    }));
}

function hasRaceResult(race, horseRecords = []) {
  const safeRace = sanitizeRaceCard(race);
  return safeRace.status === "result_registered" || Boolean(safeRace.result) || resultRowsFromRace(safeRace, horseRecords).length > 0;
}

function sortResultRows(rows) {
  return safeArray(rows).map(sanitizeResultRow).sort((a, b) => Number(a.finish || 999) - Number(b.finish || 999));
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

function sortRaceCardsRecent(raceCards) {
  return safeArray(raceCards).map(sanitizeRaceCard).sort((a, b) =>
    String(b.raceInfo?.raceDate || "").localeCompare(String(a.raceInfo?.raceDate || ""))
    || raceNumberValue(b) - raceNumberValue(a)
  );
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
    const [safeHomeMode] = useState(() => localStorage.getItem(FORCE_HOME_STORAGE_KEY) === "1");
    const [memos, setMemos] = useState(() => loadJson(MEMO_STORAGE_KEY));
    const [raceCards, setRaceCards] = useState(() => safeHomeMode ? [] : loadRaceCardsFromStorage());
    const [skipNextRaceSave, setSkipNextRaceSave] = useState(safeHomeMode);
    const [horseRecords, setHorseRecords] = useState(() => {
      const savedRecords = loadJson(HORSE_RECORDS_STORAGE_KEY);
      return savedRecords.length > 0 ? savedRecords : buildHorseRecordsFromRaceCards(sanitizeRaceCards(loadJson(RACE_STORAGE_KEY)));
    });
    const [averageTimes, setAverageTimes] = useState(() => mergeAverageTimes(loadJson(AVERAGE_TIMES_STORAGE_KEY), defaultAverageTimes));
    const [selectedHorse, setSelectedHorse] = useState("");
    const [selectedRaceId, setSelectedRaceId] = useState("");
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
      if (!safeHomeMode && allRaceCards.length > 0) setRaceCards(allRaceCards);
    }, []);
    useEffect(() => saveJson(HORSE_RECORDS_STORAGE_KEY, horseRecords), [horseRecords]);
    useEffect(() => saveJson(AVERAGE_TIMES_STORAGE_KEY, averageTimes), [averageTimes]);

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
        raceDate: note.date || note.raceDate || "",
        track: note.racecourse || note.track || "",
        raceNumber: note.raceNumber || "",
        raceName: note.raceName || "",
        attention: note.rating && note.rating !== "保留" ? note.rating : "C",
        tags: safeArray(note.tags),
        troubleTags: safeArray(note.troubleTags || note.tags),
        strongTags: safeArray(note.strongTags),
        buyTags: safeArray(note.buyTags),
        rating: note.rating || "保留",
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
        screen === "race" && h(RaceDetail, { raceCards, selectedRaceId, averageTimes, horseRecords, openHorse, openResultImport, setScreen: navigate, goBack, goHome }),
        screen === "races" && h(RegisteredRaceList, { raceCards, openRaceDetail }),
        screen === "average" && h(AverageTimesScreen, { averageTimes }),
        screen === "diagnostic" && h(DataDiagnosticScreen, { setScreen: navigate }),
        screen === "backup" && h(BackupScreen, { memos, raceCards, horseRecords, averageTimes, setMemos, setRaceCards, setHorseRecords, setAverageTimes, notify, setScreen: navigate, deleteEntryOnlyHorseRecords }),
          screen === "list" && h(HorseList, { horseStats, horseRecords, openHorse, setScreen: navigate, goHome, deleteHorseRecordsForRace }),
          screen === "search" && h(HorseSearch, { horseStats, openHorse }),
          screen === "horse" && h(HorsePage, { horseName: selectedHorse, memos, horseRecords, saveHorseNote, deleteHorseNote, deleteMemo, setScreen: navigate, goBack, goHome, deleteHorseRecordsForHorse, deleteHorseMemosForHorse })
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
        entries: safeEntries.map(({ id, frameNumber, horseNumber, horseName, sexAge, popularity, jockey, carriedWeight, raw, parsed }) => ({
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
        })),
      };
      const validation = validateRaceCard(preparedRaceCard);
      if (validation.errors.length > 0) {
        setWarning(validation.errors.join(" "));
        setSaveMessage("");
        setSaveDebug((current) => ({ ...current, status: "失敗" }));
        return;
      }
      const result = onSave(validation.race);
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
        h(Field, { label: "レース番号", required: true }, h("input", { inputMode: "numeric", value: raceInfo.raceNumber, onChange: (event) => updateInfo("raceNumber", event.target.value), placeholder: "11" })),
        h(Field, { label: "発走時刻" }, h("input", { value: raceInfo.raceTime, onChange: (event) => updateInfo("raceTime", event.target.value), placeholder: "15:40" }))
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
      h("div", { className: "form-actions inline-actions" },
        h("button", { type: "button", className: "secondary", onClick: () => setShowPreview((current) => !current) }, "保存予定データを確認")
      ),
      showPreview && h(RegistrationPreview, {
        title: "出走表の登録予定",
        raceInfo,
        rows: safeEntries,
        validCount: validEntryCount,
        unparsedCount: unparsedEntryCount,
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
    const resultPreview = buildRaceResult(rows, averageWinningTime);
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
      onSave(selectedValue, buildRaceResult(validation.validRows.map((row) => ({
        id: row.id,
        finish: String(row.finish || "").trim(),
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
      })), String(averageWinningTime || "").trim()), {
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
    const rows = [
      ["horseRecords", diagnostics.horseRecords],
      ["horseNotes", diagnostics.horseNotes],
      ["raceResults", diagnostics.raceResults],
      ["raceEntries", diagnostics.raceEntries],
      ["weeklyRaces", diagnostics.weeklyRaces],
      ["averageTimes", diagnostics.averageTimes],
      ["読み込み不可データ", diagnostics.unreadable],
      ["隔離データ", diagnostics.quarantined],
      ["brokenWeeklyRaces", diagnostics.brokenWeeklyRaces],
      ["brokenRaceEntries", diagnostics.brokenRaceEntries],
      ["brokenRaceResults", diagnostics.brokenRaceResults],
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

  function RegisteredRaceList({ raceCards, openRaceDetail }) {
    const allRaceCards = getAllRaceCards();
    const displayRaceCards = sortRaceCardsRecent(allRaceCards.length > 0 ? allRaceCards : raceCards);
    return h("section", { className: "screen" },
      h(SectionTitle, { icon: h(ClipboardList, { size: 18 }), title: "登録済みレース一覧" }),
      
      displayRaceCards.length === 0
        ? h(EmptyState, { title: "登録済みレースはありません", text: "出走表インポートで登録すると、ここに表示されます。" })
        : h("div", { className: "compact-race-list" }, displayRaceCards.map((race) => h(RaceListItem, { key: race.id, race, onOpen: () => openRaceDetail(race.id) })))
    );
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
          info.raceTime,
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

  function RaceDetail({ raceCards, selectedRaceId, averageTimes, horseRecords = [], openHorse, openResultImport, setScreen, goBack, goHome }) {
    const [showAllResults, setShowAllResults] = useState(false);
    const [showEntries, setShowEntries] = useState(false);
    const storedRaceCards = getAllRaceCards();
    const safeRaceCards = sanitizeRaceCards(storedRaceCards.length > 0 ? storedRaceCards : raceCards);
    const race = safeRaceCards.find((item) => item.id === selectedRaceId || item.raceId === selectedRaceId) || safeRaceCards[0];
    if (!race) {
      return h("section", { className: "screen" }, h(EmptyState, { title: "レースが見つかりません", text: "ホームからレースを選んでください。" }));
    }

    const info = race.raceInfo || {};
    const average = findAverageTime(averageTimes, info);
    const resultRows = sortResultRows(resultRowsFromRace(race, horseRecords));
    const top3 = resultRows.slice(0, 3);
    const hasResult = hasRaceResult(race, horseRecords);
    const entries = safeArray(race.entries);
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
        : h("p", null, "出走馬データはまだありません。")
    );
    const renderResultList = (rows, compact = false) => h("div", { className: compact ? "result-card-stack top3" : "result-card-stack" }, rows.map((row) => h(ResultHorseCard, { key: row.id || `${row.finish}-${row.horseName}`, row, compact, openHorse })));

    return h("section", { className: "screen race-detail-screen" },
      h("article", { className: "race-detail-hero" },
        h("p", null, `${info.raceDate || "-"} ${info.track || "-"}${raceNumberLabel(info.raceNumber)}`),
        h("h2", null, info.raceName || "レース名未入力"),
        h("div", { className: "race-detail-line" }, [
          info.raceTime,
          info.raceClass,
          `${info.surface || ""}${info.distance || "-"}m`,
          info.courseType,
          `${entries.length}頭`,
          info.going,
        ].filter(Boolean).map((item) => h("span", { key: item }, item)))
      ),
      h("section", { className: "race-detail-panel result-status-panel" },
        h("h3", null, "結果ステータス"),
        h("strong", null, hasResult ? "結果：登録済み" : "結果：未登録")
      ),
      hasResult
        ? h(React.Fragment, null,
          h("section", { className: "race-detail-panel" },
            h("h3", null, "結果サマリー"),
            top3.length ? renderResultList(top3, true) : h("p", null, "表示できる結果データがありません。")
          ),
          h("div", { className: "race-detail-actions" },
            h("button", { type: "button", className: "secondary", onClick: () => setShowAllResults((current) => !current) }, showAllResults ? "全着順を閉じる" : "全着順を見る"),
            h("button", { type: "button", className: "secondary", onClick: () => setShowEntries((current) => !current) }, showEntries ? "出走表を閉じる" : "出走表を見る"),
            h("button", { type: "button", className: "secondary", onClick: () => setScreen("add") }, "このレースの回顧メモを書く")
          ),
          showAllResults && h("section", { className: "race-detail-panel" }, h("h3", null, "全着順"), renderResultList(resultRows)),
          showEntries && renderEntries(),
          renderAverage()
        )
        : h(React.Fragment, null,
          h("div", { className: "race-detail-actions" },
            h("button", { type: "button", className: "primary", onClick: () => openResultImport(race.id) }, "このレースの結果を登録"),
            h("button", { type: "button", className: "secondary", onClick: () => setScreen("add") }, "このレースの回顧メモを書く")
          ),
          renderEntries(),
          renderAverage()
        )
    );
  }

  function ResultHorseCard({ row, compact = false, openHorse }) {
    const safeRow = sanitizeResultRow(row);
    return h("button", { type: "button", className: `result-horse-card ${compact ? "compact" : ""}`, onClick: () => openHorse(safeRow.horseName || "") },
      h("div", { className: "result-rank" }, `${safeRow.finish || "-"}着`),
      h("div", { className: "result-horse-body" },
        h("div", { className: "horse-line-title" }, h(FrameHorseNumbers, { frame: safeRow.frameNumber, horseNumber: safeRow.horseNumber }), h("h4", null, safeRow.horseName || "馬名未入力")),
        h("p", null, [safeRow.sexAge, `${safeRow.jockey || "騎手未入力"} ${safeRow.carriedWeight || "-"}`, safeRow.popularity ? `人気${safeRow.popularity}` : ""].filter(Boolean).join(" / ")),
        h("p", null, [safeRow.time || "タイム未入力", safeRow.margin ? `着差${safeRow.margin}` : "", safeRow.last3f ? `上がり${safeRow.last3f}` : ""].filter(Boolean).join(" / ")),
        h("p", { className: "corner-line" }, [`3角${safeRow.corner3 || "-"}番手`, `4角${safeRow.corner4 || "-"}番手`].join(" / "))
      )
    );
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

    return h("section", { className: "screen backup-screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "設定"),
        h("p", null, "スマホで入力した回顧メモ、注目馬、出走表データをJSONファイルとして保存・復元できます。"),
        h("button", { type: "button", className: "secondary full-button", onClick: () => setScreen("diagnostic") }, "データ診断"),
        h("button", { type: "button", className: "secondary full-button", onClick: restoreRaceCards }, "馬別成績から出走表を復元"),
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
    return h("section", { className: "result-summary" },
      h("div", null, h("span", null, "脚質バイアス"), h("strong", null, result.paceBias)),
      h("div", null, h("span", null, "馬場傾向"), h("strong", null, result.trackTrend)),
      h("p", null, "断定ではなく、レース回顧のための補助判断です。")
    );
  }

  function RegistrationPreview({ title, raceInfo, rows, validCount, unparsedCount }) {
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
      storagePreview,
    };

    return h("section", { className: "preview-panel" },
      h("h3", null, title),
      h("div", { className: "preview-stats" },
        h("span", null, `登録予定: ${validCount}件`),
        h("span", null, `未解析: ${unparsedCount}件`),
        h("span", null, `entries配列: ${summary.entriesIsArray ? "はい" : "いいえ"}`)
      ),
      h("p", null, `${info.track || "競馬場未入力"} ${raceNumberLabel(info.raceNumber) || "レース番号未入力"} ${info.raceName || "レース名未入力"}`),
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

    return h("button", { className: `race-runner-card ${attention === "A" ? "attention-a" : ""}`, type: "button", onClick: onOpen },
      h("div", { className: "runner-main" },
        h("div", { className: "runner-number" }, h(FrameHorseNumbers, { frame: entry.frameNumber, horseNumber: entry.horseNumber })),
        h("div", null,
          h("div", { className: "runner-title" },
            h("h4", null, entry.horseName || "馬名未入力"),
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
      h(Field, { label: `自信度 ${form.confidence}` }, h("input", { type: "range", min: "1", max: "5", value: form.confidence, onChange: (event) => update("confidence", Number(event.target.value)) })),
      h("div", { className: "form-actions" }, h("button", { type: "button", className: "secondary", onClick: onCancel }, "キャンセル"), h("button", { className: "primary", disabled: !canSave }, "保存する"))
    );
  }

  function HorseList({ horseStats, horseRecords, openHorse, setScreen, deleteHorseRecordsForRace }) {
    const raceGroups = groupHorseRecordsByRace(horseRecords);
    return h("section", { className: "screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "安全削除"),
        h("p", null, "削除対象は馬別成績だけです。回顧メモと平均タイムは残ります。"),
        h("button", { type: "button", className: "secondary full-button", onClick: safeExportAllLocalStorage }, "削除前にバックアップを書き出す")
      ),
      raceGroups.length > 0 && h("section", { className: "delete-panel" },
        h("h3", null, "レース単位で成績を削除"),
        raceGroups.map((race) => h("article", { key: race.key, className: "race-delete-row" },
          h("div", null,
            h("strong", null, race.label),
            h("p", null, `${race.records.length}頭分: ${race.horseNames.slice(0, 6).join("、")}${race.horseNames.length > 6 ? "…" : ""}`)
          ),
          h("button", { type: "button", className: "danger-button", onClick: () => deleteHorseRecordsForRace(race) }, "このレースの成績を削除")
        ))),
      horseStats.length === 0
        ? h(EmptyState, { title: "注目馬はまだ空です", text: "メモを追加すると馬ごとにまとまります。", action: h("button", { className: "primary small", onClick: () => setScreen("add") }, "追加する") })
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

  function HorsePage({ horseName, memos, horseRecords, saveHorseNote, deleteHorseNote, deleteMemo, setScreen, goBack, goHome, deleteHorseRecordsForHorse, deleteHorseMemosForHorse }) {
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
        memo: seed.memo || "",
        tags: [...new Set(existingTags)].filter(Boolean),
        rating: seed.rating || seed.attention || "保留",
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
            h("p", null, [sexAge, latestMemo ? `最新評価 ${latestMemo.rating || latestMemo.attention || "-"}` : ""].filter(Boolean).join(" / ") || "競走成績")
          ),
          latestMemo && h("div", { className: `rank rank-${latestMemo.attention || latestMemo.rating || "C"}` }, latestMemo.rating || latestMemo.attention || "-")
        ),
        h("div", { className: "horse-summary-grid" },
          h(Metric, { label: "成績数", value: records.length }),
          h(Metric, { label: "最高着順", value: bestFinish ? `${bestFinish}着` : "-" }),
          h(Metric, { label: "メモあり", value: history.length }),
          h(Metric, { label: "最新評価", value: latestMemo?.rating || latestMemo?.attention || "-" })
        ),
        h("div", { className: "recent-finishes" }, h("span", null, "直近5走"), h("strong", null, recentFinishes || "-")),
        h("div", { className: "danger-zone" },
          h("button", { type: "button", className: "danger-button", onClick: () => deleteHorseRecordsForHorse(normalizedName) }, "この馬の成績履歴を削除"),
          h("button", { type: "button", className: "danger-button ghost", onClick: () => deleteHorseMemosForHorse(normalizedName) }, "この馬の回顧メモも削除")
        ),
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
              expanded: openRecordId === (record.id || recordKey(record)),
              onToggle: () => setOpenRecordId((current) => current === (record.id || recordKey(record)) ? "" : (record.id || recordKey(record))),
              onWriteMemo: () => startMemoFromRecord(record),
            });
          })))
      ));
  }

  function HorseNoteForm({ draft, updateDraft, submitNote, onCancel }) {
    const [customTag, setCustomTag] = useState("");
    const allTags = [...new Set([...troubleTags, ...strongTags])];
    function addCustomTag() {
      const tag = customTag.trim();
      if (!tag) return;
      updateDraft("tags", [...new Set([...safeArray(draft.tags), tag])]);
      setCustomTag("");
    }
    return h("form", { className: "horse-note-form", onSubmit: submitNote },
      h("div", { className: "two-col" },
        h(Field, { label: "レース日" }, h("input", { type: "date", value: draft.date || "", onChange: (event) => updateDraft("date", event.target.value) })),
        h(Field, { label: "競馬場" }, h("input", { value: draft.racecourse || "", onChange: (event) => updateDraft("racecourse", event.target.value) }))
      ),
      h("div", { className: "two-col" },
        h(Field, { label: "レース番号" }, h("input", { value: draft.raceNumber || "", onChange: (event) => updateDraft("raceNumber", event.target.value), placeholder: "11R" })),
        h(Field, { label: "レース名" }, h("input", { value: draft.raceName || "", onChange: (event) => updateDraft("raceName", event.target.value) }))
      ),
      h(Field, { label: "メモ本文" }, h("textarea", { value: draft.memo || "", onChange: (event) => updateDraft("memo", event.target.value), rows: 5, placeholder: "見返した内容、次走で気をつけたいこと" })),
      h(TagPicker, { title: "不利・内容タグ", tags: allTags, selected: safeArray(draft.tags), onChange: (tags) => updateDraft("tags", tags) }),
      h("div", { className: "custom-tag-row" }, h("input", { value: customTag, onChange: (event) => setCustomTag(event.target.value), placeholder: "自由タグ" }), h("button", { type: "button", className: "secondary", onClick: addCustomTag }, "追加")),
      h("section", { className: "choice-panel" },
        h("p", { className: "field-label" }, "評価"),
        h("div", { className: "rating-grid" }, ["A", "B", "C", "保留"].map((rating) => h("button", { type: "button", key: rating, className: draft.rating === rating ? "selected" : "", onClick: () => updateDraft("rating", rating) }, rating)))
      ),
      h(Field, { label: "次走メモ" }, h("textarea", { value: draft.nextRunNote || "", onChange: (event) => updateDraft("nextRunNote", event.target.value), rows: 3, placeholder: "次走で買いたい条件など" })),
      h("div", { className: "form-actions" }, h("button", { type: "button", className: "secondary", onClick: onCancel }, "キャンセル"), h("button", { className: "primary", disabled: !String(draft.memo || "").trim() }, "保存"))
    );
  }

  function HorseNoteCard({ memo, expanded, onToggle, onEdit, onDelete }) {
    const tags = [...new Set([...safeArray(memo.tags), ...safeArray(memo.troubleTags), ...safeArray(memo.strongTags), ...safeArray(memo.buyTags)])].filter(Boolean);
    const body = memo.memo || "";
    const shortBody = body.length > 90 && !expanded ? `${body.slice(0, 90)}...` : body;
    return h("article", { className: "horse-note-card" },
      h("div", { className: "horse-note-head" },
        h("strong", null, [memo.raceDate || memo.date, memo.track || memo.racecourse, raceNumberLabel(memo.raceNumber), memo.raceName].filter(Boolean).join(" ") || "単独メモ"),
        h("span", { className: `rank mini-rank rank-${memo.rating || memo.attention || "C"}` }, memo.rating || memo.attention || "-")
      ),
      tags.length > 0 && h("div", { className: "tag-row compact-tags" }, tags.map((tag) => h("span", { key: tag }, tag))),
      body && h("p", { className: "memo-text" }, shortBody),
      body.length > 90 && h("button", { type: "button", className: "text-button", onClick: onToggle }, expanded ? "閉じる" : "全文を見る"),
      memo.nextRunNote && h("p", { className: "next-run-note" }, `次走メモ：${memo.nextRunNote}`),
      h("div", { className: "inline-actions" }, h("button", { type: "button", className: "secondary small", onClick: onEdit }, "編集"), h("button", { type: "button", className: "danger-button ghost small", onClick: onDelete }, "削除"))
    );
  }

  function findMemoForRecord(memosForHorse, record) {
    return memosForHorse.find((memo) =>
      memo.horseName.trim() === normalizeHorseName(record.horseName)
      && memo.raceDate === record.raceDate
      && memo.track === record.track
      && String(memo.raceNumber || "") === String(record.raceNumber || "")
    ) || memosForHorse.find((memo) =>
      memo.horseName.trim() === normalizeHorseName(record.horseName)
      && memo.raceDate === record.raceDate
      && memo.track === record.track
    ) || null;
  }

  function HorseRecordCard({ record, memo, expanded, onToggle, onWriteMemo }) {
    const tags = memo ? [...safeArray(memo.tags), ...safeArray(memo.troubleTags), ...safeArray(memo.strongTags), ...safeArray(memo.buyTags)] : [];
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
            h("span", null, `タイム: ${record.time || "-"} / 上がり: ${record.last3f || "-"}`),
            h("span", null, `3角: ${record.corner3 || "-"}番手 / 4角: ${record.corner4 || "-"}番手`),
            h("span", { className: "record-frame-display" }, h(FrameHorseNumbers, { frame: record.frameNumber, horseNumber: record.horseNumber }))
          ),
          memo && h("div", { className: "record-memo-badge" }, "メモあり")
        )
      ),
      h("div", { className: "inline-actions record-actions" }, h("button", { type: "button", className: "secondary small", onClick: onWriteMemo }, "このレースのメモを書く")),
      memo && h("p", { className: "record-memo-summary" }, memo.memo || "このレースの回顧メモがあります。"),
      expanded && h("div", { className: "record-detail" },
        h("dl", null,
          h("dt", null, "全成績情報"),
          h("dd", null, `${record.finish || "-"}着 / ${record.fieldSize || "-"}頭 / 人気${record.popularity || "-"}`),
          h("dt", null, "条件"),
          h("dd", null, `${record.surface || "-"}${record.distance || ""} ${record.going || "-"} / ${record.jockey || "-"} ${record.carriedWeight || "-"}kg`),
          h("dt", null, "タイム"),
          h("dd", null, `${record.time || "-"} / 着差 ${record.margin || "なし"} / 上がり ${record.last3f || "-"}`),
          h("dt", null, "通過"),
          h("dd", null, `3角 ${record.corner3 || "-"}番手 / 4角 ${record.corner4 || "-"}番手`)
        ),
        memo && h("div", { className: "record-linked-memo" },
          h("h4", null, "自分の回顧メモ"),
          h("p", null, memo.memo || "自由メモなし"),
          h("div", { className: `rank mini-rank rank-${memo.attention}` }, memo.attention),
          tags.length > 0 && h("div", { className: "tag-row compact-tags" }, tags.map((tag) => h("span", { key: tag }, tag)))
        )
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
        h("div", null, h("h3", null, horse.horseName), h("p", null, `${horse.latest.raceDate}・${horse.latest.track}${horse.latest.raceNumber ? raceNumberLabel(horse.latest.raceNumber) : ""}・${horse.latest.distance || "距離未入力"}`), h("div", { className: "mini-tags" }, h("span", null, `メモ ${horse.count}`), h("span", null, `成績 ${horse.recordCount || 0}`), h("span", null, `自信度 ${horse.latest.confidence}`)))
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
        h("p", { className: "confidence" }, h(Star, { size: 14 }), ` 自信度 ${memo.confidence}/5`)
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

  function BottomNav({ screen, setScreen }) {
    const items = [
      { id: "home", label: "ホーム", icon: Trophy },
      { id: "add", label: "追加", icon: Plus },
      { id: "import", label: "出走表", icon: ClipboardList },
      { id: "search", label: "検索", icon: Search },
    ];
    return h("nav", { className: "bottom-nav" }, items.map((item) => h("button", { className: screen === item.id ? "active" : "", key: item.id, onClick: () => setScreen(item.id) }, h(item.icon, { size: 20 }), h("span", null, item.label))));
  }

  return App;
}
