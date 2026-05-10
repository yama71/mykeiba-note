import { defaultAverageTimes } from "./average-times.js";

const MEMO_STORAGE_KEY = "keiba-review-memos-v1";
const RACE_STORAGE_KEY = "keiba-race-cards-v1";
const HORSE_RECORDS_STORAGE_KEY = "keiba-horse-records-v1";
const AVERAGE_TIMES_STORAGE_KEY = "keiba-average-times-v1";
const BACKUP_VERSION = 1;

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
const troubleTags = ["出遅れ", "前壁", "包まれた", "進路狭い", "外々", "早仕掛け", "脚余し", "掛かる", "直線不利", "距離ロス"];
const strongTags = ["ハイペース先行粘り", "先行有利で差し", "差し有利で先行", "上がり優秀", "着順以上", "次走買い"];
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
  raceClass: "未勝利",
  surface: "芝",
  distance: "",
  courseType: "",
  going: "良",
};

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function buildBackup(memos, raceCards, horseRecords, averageTimes) {
  return {
    appName: "MyKeiba Note",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      memos,
      raceCards,
      horseRecords,
      averageTimes,
    },
  };
}

function parseBackup(text) {
  const parsed = JSON.parse(text);
  const data = parsed.data || parsed;
  return {
    memos: Array.isArray(data.memos) ? data.memos : [],
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

function findAverageTime(averageTimes, condition) {
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
    const found = averageTimes.find((item) => {
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
  const normalizedName = horseName.trim();
  if (!normalizedName) return null;

  return memos
    .filter((memo) => memo.horseName.trim() === normalizedName)
    .sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate))[0] || null;
}

function scoreRace(race, memos) {
  const notableHorses = [];
  let score = 0;

  race.entries.forEach((entry) => {
    const latestMemo = latestMemoForHorse(memos, entry.horseName || "");
    if (!latestMemo) return;

    const tags = [...latestMemo.troubleTags, ...latestMemo.strongTags, ...latestMemo.buyTags];
    const attentionScore = attentionScores[latestMemo.attention] || 0;
    const tagScore = tags.reduce((sum, tag) => sum + (scoreTagRules[tag] || 0), 0);

    score += attentionScore + tagScore;
    notableHorses.push({
      horseName: entry.horseName.trim(),
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
  if (!raceCard?.entries) return null;
  const normalizedName = horseName.trim();
  return raceCard.entries.find((entry) => entry.horseNumber === horseNumber)
    || raceCard.entries.find((entry) => entry.horseName.trim() === normalizedName)
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
  const sortedRows = [...rows].sort((a, b) => Number(a.finish || 999) - Number(b.finish || 999));
  const winningTime = sortedRows[0]?.time || "";
  return {
    rows,
    averageWinningTime,
    winningTime,
    paceBias: judgePaceBias(rows),
    trackTrend: judgeTrackTrend(winningTime, averageWinningTime),
    savedAt: new Date().toISOString(),
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
    savedAt: new Date().toISOString(),
  };
}

function upsertHorseRecords(currentRecords, race, result) {
  const nextMap = new Map(currentRecords.map((record) => [recordKey(record), record]));
  const raceForRecord = { ...race, result };
  result.rows.forEach((row) => {
    if (!normalizeHorseName(row.horseName)) return;
    const record = buildHorseRecord(raceForRecord, row);
    nextMap.set(recordKey(record), record);
  });
  return [...nextMap.values()].sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));
}

function buildHorseRecordsFromRaceCards(raceCards) {
  return raceCards.reduce((records, race) => race.result ? upsertHorseRecords(records, race, race.result) : records, []);
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

  function App() {
    const [screen, setScreen] = useState("home");
    const [memos, setMemos] = useState(() => loadJson(MEMO_STORAGE_KEY));
    const [raceCards, setRaceCards] = useState(() => loadJson(RACE_STORAGE_KEY));
    const [horseRecords, setHorseRecords] = useState(() => {
      const savedRecords = loadJson(HORSE_RECORDS_STORAGE_KEY);
      return savedRecords.length > 0 ? savedRecords : buildHorseRecordsFromRaceCards(loadJson(RACE_STORAGE_KEY));
    });
    const [averageTimes, setAverageTimes] = useState(() => mergeAverageTimes(loadJson(AVERAGE_TIMES_STORAGE_KEY), defaultAverageTimes));
    const [selectedHorse, setSelectedHorse] = useState("");
    const [selectedRaceId, setSelectedRaceId] = useState("");
    const [toast, setToast] = useState("");

    useEffect(() => saveJson(MEMO_STORAGE_KEY, memos), [memos]);
    useEffect(() => saveJson(RACE_STORAGE_KEY, raceCards), [raceCards]);
    useEffect(() => saveJson(HORSE_RECORDS_STORAGE_KEY, horseRecords), [horseRecords]);
    useEffect(() => saveJson(AVERAGE_TIMES_STORAGE_KEY, averageTimes), [averageTimes]);

    const horseStats = useMemo(() => {
      const map = new Map();
      memos.forEach((memo) => {
        const current = map.get(memo.horseName) || { horseName: memo.horseName, count: 0, recordCount: 0, latest: memo, maxAttention: "C" };
        current.count += 1;
        if (new Date(memo.raceDate) > new Date(current.latest.raceDate)) current.latest = memo;
        if ("ABC".indexOf(memo.attention) < "ABC".indexOf(current.maxAttention)) current.maxAttention = memo.attention;
        map.set(memo.horseName, current);
      });
      horseRecords.forEach((record) => {
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

    function addMemo(memo) {
      const nextMemo = { ...memo, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setMemos((current) => [nextMemo, ...current]);
      notify("保存しました");
      setScreen("list");
    }

    function addRaceCard(raceCard) {
      const nextRaceCard = { ...raceCard, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setRaceCards((current) => [nextRaceCard, ...current]);
      notify("出走表を登録しました");
      setScreen("home");
    }

    function deleteMemo(id) {
      setMemos((current) => current.filter((memo) => memo.id !== id));
    }

    function saveRaceResult(raceId, result, raceInfoPatch = {}) {
      const targetRace = raceCards.find((race) => race.id === raceId);
      const raceForRecord = targetRace ? { ...targetRace, raceInfo: { ...targetRace.raceInfo, ...raceInfoPatch } } : null;
      if (targetRace) {
        setHorseRecords((current) => upsertHorseRecords(current, raceForRecord, result));
      }
      setRaceCards((current) => current.map((race) => race.id === raceId ? { ...race, raceInfo: { ...race.raceInfo, ...raceInfoPatch }, result } : race));
      notify("レース結果を保存しました");
      setScreen("home");
    }

    function openResultImport(raceId) {
      setSelectedRaceId(raceId);
      setScreen("result");
    }

    function openHorse(horseName) {
      setSelectedHorse(horseName.trim());
      setScreen("horse");
    }

    return h("div", { className: "app-shell" },
      h(Header, { screen, setScreen }),
      h("main", null,
        screen === "home" && h(Home, { memos, horseStats, raceCards, setScreen, openHorse, openResultImport }),
        screen === "add" && h(AddMemo, { onSave: addMemo, onCancel: () => setScreen("home") }),
        screen === "import" && h(RaceImport, { onSave: addRaceCard }),
        screen === "result" && h(ResultImport, { raceCards, selectedRaceId, averageTimes, onSave: saveRaceResult, openHorse }),
        screen === "average" && h(AverageTimesScreen, { averageTimes }),
        screen === "backup" && h(BackupScreen, { memos, raceCards, horseRecords, averageTimes, setMemos, setRaceCards, setHorseRecords, setAverageTimes, notify, setScreen }),
        screen === "list" && h(HorseList, { horseStats, openHorse, setScreen }),
        screen === "search" && h(HorseSearch, { horseStats, openHorse }),
        screen === "horse" && h(HorsePage, { horseName: selectedHorse, memos, horseRecords, deleteMemo, setScreen })
      ),
      h(BottomNav, { screen, setScreen }),
      toast && h("div", { className: "toast" }, toast)
    );
  }

  function Header({ screen, setScreen }) {
    const titles = {
      home: "MyKeiba Note",
      add: "回顧メモ追加",
      import: "出走表インポート",
      result: "結果インポート",
      average: "平均タイム",
      backup: "設定",
      list: "注目馬リスト",
      search: "馬名検索",
      horse: "メモ履歴",
    };
    return h("header", { className: "topbar" },
      screen !== "home"
        ? h("button", { className: "icon-button", onClick: () => setScreen("home"), "aria-label": "ホームへ戻る" }, h(ChevronLeft, { size: 22 }))
        : h("div", { className: "brand-mark" }, h(Trophy, { size: 20 })),
      h("div", null, h("p", { className: "eyebrow" }, "自分専用"), h("h1", null, titles[screen]))
    );
  }

  function Home({ memos, horseStats, raceCards, setScreen, openHorse, openResultImport }) {
    const [raceSort, setRaceSort] = useState("created");
    const latest = memos.slice(0, 3);
    const aRank = memos.filter((memo) => memo.attention === "A").length;
    const scoredRaceCards = raceCards
      .map((race) => ({ ...race, scoreInfo: scoreRace(race, memos) }))
      .sort((a, b) => raceSort === "score" ? b.scoreInfo.score - a.scoreInfo.score : 0);

    return h("section", { className: "screen home" },
      h("div", { className: "summary-grid" },
        h(Metric, { label: "メモ数", value: memos.length }),
        h(Metric, { label: "注目馬", value: horseStats.length }),
        h(Metric, { label: "出走表", value: raceCards.length })
      ),
      h("div", { className: "action-grid" },
        h("button", { className: "primary-action", onClick: () => setScreen("add") }, h(Plus, { size: 20 }), " 回顧メモを追加"),
        h("button", { className: "primary-action alt", onClick: () => setScreen("import") }, h(ClipboardList, { size: 20 }), " 出走表をインポート")
      ),
      h("div", { className: "quick-actions" },
        h("button", { onClick: () => setScreen("list") }, h(ListChecks, { size: 18 }), " 注目馬を見る"),
        h("button", { onClick: () => setScreen("search") }, h(Search, { size: 18 }), " 馬名で探す"),
        h("button", { onClick: () => setScreen("average") }, h(Clock, { size: 18 }), " 平均タイム"),
        h("button", { onClick: () => setScreen("backup") }, h(ClipboardList, { size: 18 }), " 設定")
      ),
      h(SectionTitle, { icon: h(ClipboardList, { size: 18 }), title: "今週のレース一覧" }),
      raceCards.length > 0 && h("div", { className: "sort-control", "aria-label": "レース並び替え" },
        h("button", { className: raceSort === "created" ? "active" : "", type: "button", onClick: () => setRaceSort("created") }, "登録順"),
        h("button", { className: raceSort === "score" ? "active" : "", type: "button", onClick: () => setRaceSort("score") }, "スコア順")
      ),
      raceCards.length === 0
        ? h(EmptyState, { title: "登録済みの出走表はありません", text: "コピーした出走表を貼り付けて、まずは1レース登録できます。" })
        : h("div", { className: "card-stack race-list" }, scoredRaceCards.map((race) => h(RaceCard, { key: race.id, race, memos, openHorse, openResultImport }))),
      h(SectionTitle, { icon: h(Clock, { size: 18 }), title: "最近のメモ" }),
      latest.length === 0
        ? h(EmptyState, { title: "まだメモがありません", text: "まずは気になった馬を1頭だけ保存してみましょう。" })
        : h("div", { className: "card-stack" }, latest.map((memo) => h(MemoCard, { key: memo.id, memo, onOpen: () => openHorse(memo.horseName) })))
    );
  }

  function RaceImport({ onSave }) {
    const [raceInfo, setRaceInfo] = useState(emptyRaceInfo);
    const [pasteText, setPasteText] = useState("");
    const [entries, setEntries] = useState([]);
    const canSave = raceInfo.raceDate && raceInfo.track && raceInfo.raceNumber && entries.length > 0;

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
      setEntries(parseRaceEntries(pasteText));
    }

    function submit(event) {
      event.preventDefault();
      if (!canSave) return;
      onSave({
        raceInfo: {
          ...raceInfo,
          raceClass: normalizeRaceClass(raceInfo.raceClass),
          distance: raceInfo.distance.trim(),
          raceName: raceInfo.raceName.trim(),
        },
        entries: entries.map(({ id, frameNumber, horseNumber, horseName, sexAge, popularity, jockey, carriedWeight }) => ({
          id,
          frameNumber: frameNumber.trim(),
          horseNumber: horseNumber.trim(),
          horseName: horseName.trim(),
          sexAge: sexAge.trim(),
          popularity: popularity.trim(),
          jockey: jockey.trim(),
          carriedWeight: carriedWeight.trim(),
        })),
      });
      setRaceInfo(emptyRaceInfo);
      setPasteText("");
      setEntries([]);
    }

    return h("form", { className: "screen form-screen", onSubmit: submit },
      h("div", { className: "two-col" },
        h(Field, { label: "開催日", required: true }, h("input", { type: "date", value: raceInfo.raceDate, onChange: (event) => updateInfo("raceDate", event.target.value) })),
        h(Field, { label: "競馬場" }, h("select", { value: raceInfo.track, onChange: (event) => updateInfo("track", event.target.value) }, tracks.map((track) => h("option", { key: track }, track))))
      ),
      h("div", { className: "two-col" },
        h(Field, { label: "レース番号", required: true }, h("input", { inputMode: "numeric", value: raceInfo.raceNumber, onChange: (event) => updateInfo("raceNumber", event.target.value), placeholder: "11" })),
        h(Field, { label: "レース名" }, h("input", { value: raceInfo.raceName, onChange: (event) => updateInfo("raceName", event.target.value), placeholder: "例：○○ステークス" }))
      ),
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
      entries.length === 0
        ? h(EmptyState, { title: "まだ解析結果がありません", text: "出走表テキストを貼り付けて解析してください。" })
        : h("div", { className: "entry-stack" }, entries.map((entry, index) => h(EntryEditor, { key: entry.id, entry, index, updateEntry }))),
      h("div", { className: "form-actions" },
        h("button", { type: "button", className: "secondary", onClick: () => setEntries([]) }, "結果クリア"),
        h("button", { className: "primary", disabled: !canSave }, "登録")
      )
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

  function ResultImport({ raceCards, selectedRaceId, averageTimes, onSave, openHorse }) {
    const initialRaceId = selectedRaceId || raceCards[0]?.id || "";
    const [raceId, setRaceId] = useState(initialRaceId);
    const currentRace = raceCards.find((race) => race.id === raceId);
    const [pasteText, setPasteText] = useState("");
    const [averageWinningTime, setAverageWinningTime] = useState(currentRace?.result?.averageWinningTime || "");
    const [raceInfoDraft, setRaceInfoDraft] = useState(() => ({
      track: currentRace?.raceInfo?.track || "東京",
      surface: currentRace?.raceInfo?.surface || "芝",
      distance: currentRace?.raceInfo?.distance || "",
      raceClass: normalizeRaceClass(currentRace?.raceInfo?.raceClass || "未勝利"),
      courseType: currentRace?.raceInfo?.courseType || "",
      going: currentRace?.raceInfo?.going || "良",
    }));
    const [rows, setRows] = useState(currentRace?.result?.rows || []);
    const resultPreview = buildRaceResult(rows, averageWinningTime);
    const canSave = Boolean(raceId) && rows.length > 0;
    const matchedAverageTime = findAverageTime(averageTimes, raceInfoDraft);

    useEffect(() => {
      if (!currentRace) return;
      setRaceInfoDraft({
        track: currentRace.raceInfo?.track || "東京",
        surface: currentRace.raceInfo?.surface || "芝",
        distance: currentRace.raceInfo?.distance || "",
        raceClass: normalizeRaceClass(currentRace.raceInfo?.raceClass || "未勝利"),
        courseType: currentRace.raceInfo?.courseType || "",
        going: currentRace.raceInfo?.going || "良",
      });
      setAverageWinningTime(currentRace.result?.averageWinningTime || "");
      setRows(currentRace.result?.rows || []);
    }, [raceId]);

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
      setRows(parseResultRows(pasteText, currentRace));
    }

    function addManualRow() {
      setRows((current) => [...current, makeResultRow("")]);
    }

    function submit(event) {
      event.preventDefault();
      if (!canSave) return;
      onSave(raceId, buildRaceResult(rows.map((row) => ({
        id: row.id,
        finish: row.finish.trim(),
        frameNumber: (row.frameNumber || "").trim(),
        horseNumber: (row.horseNumber || "").trim(),
        horseName: row.horseName.trim(),
        sexAge: (row.sexAge || "").trim(),
        popularity: (row.popularity || "").trim(),
        jockey: (row.jockey || "").trim(),
        carriedWeight: (row.carriedWeight || "").trim(),
        time: row.time.trim(),
        margin: row.margin.trim(),
        last3f: row.last3f.trim(),
        corner3: (row.corner3 || "").trim(),
        corner4: (row.corner4 || "").trim(),
      })), averageWinningTime.trim()), {
        ...raceInfoDraft,
        raceClass: normalizeRaceClass(raceInfoDraft.raceClass),
        distance: String(raceInfoDraft.distance).trim(),
      });
    }

    return h("form", { className: "screen form-screen", onSubmit: submit },
      raceCards.length === 0
        ? h(EmptyState, { title: "出走表がありません", text: "先に出走表を登録してください。" })
        : h(React.Fragment, null,
          h(Field, { label: "対象レース" }, h("select", { value: raceId, onChange: (event) => {
            setRaceId(event.target.value);
          } }, raceCards.map((race) => h("option", { key: race.id, value: race.id }, `${race.raceInfo.track}${race.raceInfo.raceNumber}R ${race.raceInfo.raceName || "レース名未入力"}`)))),
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
          rows.length === 0
            ? h(EmptyState, { title: "まだ解析結果がありません", text: "結果テキストを貼り付けて解析してください。" })
            : h("div", { className: "entry-stack" }, rows.map((row, index) => h(ResultRowEditor, { key: row.id, row, index, updateRow, openHorse }))),
          h("div", { className: "form-actions" },
            h("button", { type: "button", className: "secondary", onClick: () => setRows([]) }, "結果クリア"),
            h("button", { className: "primary", disabled: !canSave }, "保存")
          )
        )
    );
  }

  function AverageTimesScreen({ averageTimes }) {
    const [query, setQuery] = useState("");
    const [trackFilter, setTrackFilter] = useState("");
    const filtered = averageTimes.filter((item) => {
      const text = `${item.racecourse} ${item.surface} ${item.distance} ${item.courseType || ""} ${item.raceClass} ${item.going} ${item.averageTime}`;
      return (!trackFilter || item.racecourse === trackFilter) && text.includes(query.trim());
    });

    return h("section", { className: "screen average-screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "平均タイムマスター"),
        h("p", null, `${averageTimes.length}件の平均タイムを登録済みです。OP・重賞・G1などはOPとして扱います。馬場状態が合わない時は標準の平均タイムを使います。`)
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

  function BackupScreen({ memos, raceCards, horseRecords, averageTimes, setMemos, setRaceCards, setHorseRecords, setAverageTimes, notify, setScreen }) {
    const [importText, setImportText] = useState("");
    const [error, setError] = useState("");
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
        setRaceCards(imported.raceCards);
        setHorseRecords(imported.horseRecords.length > 0 ? imported.horseRecords : buildHorseRecordsFromRaceCards(imported.raceCards));
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

    return h("section", { className: "screen backup-screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "設定"),
        h("p", null, "スマホで入力した回顧メモ、注目馬、出走表データをJSONファイルとして保存・復元できます。")
      ),
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
    const info = race.raceInfo;
    const scoreInfo = race.scoreInfo || scoreRace(race, memos);
    return h("article", { className: `race-card score-${scoreInfo.label.slice(-1)}` },
      h("div", { className: "race-head" },
        h("div", null,
          h("h3", null, `${info.track}${info.raceNumber}R ${info.raceName || "レース名未入力"}`),
          h("p", null, `${info.raceDate}・${info.surface}${info.distance || "-"}m・${info.going}`)
        ),
        h("strong", null, `${race.entries.length}頭`)
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
      race.result && h(ResultSummary, { result: race.result }),
      h("button", { type: "button", className: "secondary result-import-button", onClick: () => openResultImport(race.id) }, race.result ? "結果を編集" : "結果インポート"),
      h("div", { className: "race-runner-stack" },
        race.entries.map((entry) => h(RaceRunnerCard, {
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
    const tags = hasMemo ? [...latestMemo.troubleTags, ...latestMemo.strongTags, ...latestMemo.buyTags] : [];
    const attention = latestMemo?.attention || "";

    return h("button", { className: `race-runner-card ${attention === "A" ? "attention-a" : ""}`, type: "button", onClick: onOpen },
      h("div", { className: "runner-main" },
        h("div", { className: "runner-number" },
          h("span", null, entry.frameNumber || "-"),
          h("strong", null, entry.horseNumber || "-")
        ),
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

  function HorseList({ horseStats, openHorse, setScreen }) {
    return h("section", { className: "screen" }, horseStats.length === 0
      ? h(EmptyState, { title: "注目馬はまだ空です", text: "メモを追加すると馬ごとにまとまります。", action: h("button", { className: "primary small", onClick: () => setScreen("add") }, "追加する") })
      : h("div", { className: "card-stack" }, horseStats.map((horse) => h(HorseCard, { key: horse.horseName, horse, onOpen: () => openHorse(horse.horseName) }))));
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

  function HorsePage({ horseName, memos, horseRecords, deleteMemo, setScreen }) {
    const [tab, setTab] = useState("records");
    const [openRecordId, setOpenRecordId] = useState("");
    const normalizedName = horseName.trim();
    const history = memos.filter((memo) => memo.horseName.trim() === normalizedName).sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));
    const records = horseRecords
      .filter((record) => normalizeHorseName(record.horseName) === normalizedName)
      .sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));
    const latestMemo = history[0];
    const sexAge = records.find((record) => record.sexAge)?.sexAge || "";
    const bestFinish = records
      .map((record) => Number(record.finish))
      .filter((finish) => Number.isFinite(finish))
      .sort((a, b) => a - b)[0];
    const recentFinishes = records.slice(0, 5).map((record) => `${record.finish || "-"}着`).join(" / ");
    const memoCountForRecords = records.filter((record) => findMemoForRecord(history, record)).length;

    return h("section", { className: "screen horse-page" }, !horseName || (history.length === 0 && records.length === 0)
      ? h(EmptyState, { title: "履歴が見つかりません", text: "注目馬リストか検索から馬を選んでください。", action: h("button", { className: "primary small", onClick: () => setScreen("list") }, "リストへ") })
      : h(React.Fragment, null,
        h("div", { className: "horse-title horse-profile-title" },
          h("div", null,
            h("h2", null, normalizedName),
            h("p", null, [sexAge, latestMemo ? `最新注目度 ${latestMemo.attention}` : ""].filter(Boolean).join("・") || "成績履歴")
          ),
          latestMemo && h("div", { className: `rank rank-${latestMemo.attention}` }, latestMemo.attention)
        ),
        h("div", { className: "horse-summary-grid" },
          h(Metric, { label: "成績数", value: records.length }),
          h(Metric, { label: "最高着順", value: bestFinish ? `${bestFinish}着` : "-" }),
          h(Metric, { label: "メモあり", value: memoCountForRecords }),
          h(Metric, { label: "最新注目度", value: latestMemo?.attention || "-" })
        ),
        h("div", { className: "recent-finishes" },
          h("span", null, "直近5走"),
          h("strong", null, recentFinishes || "-")
        ),
        h("div", { className: "tab-switch" },
          h("button", { type: "button", className: tab === "memos" ? "active" : "", onClick: () => setTab("memos") }, `回顧メモ ${history.length}`),
          h("button", { type: "button", className: tab === "records" ? "active" : "", onClick: () => setTab("records") }, `競走成績 ${records.length}`)
        ),
        tab === "memos" && (history.length === 0
          ? h(EmptyState, { title: "回顧メモはまだありません", text: "気になったレースを見返したらメモを追加できます。" })
          : h("div", { className: "card-stack" }, history.map((memo) => h(MemoCard, { key: memo.id, memo, onDelete: () => deleteMemo(memo.id) })))),
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
            });
          })))
      ));
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

  function HorseRecordCard({ record, memo, expanded, onToggle }) {
    const tags = memo ? [...memo.troubleTags, ...memo.strongTags, ...memo.buyTags] : [];
    return h("article", { className: `record-card finish-${record.finish === "1" ? "win" : "normal"}` },
      h("button", { type: "button", className: "record-main", onClick: onToggle },
        h("div", { className: "record-rank" },
          h("strong", null, record.finish || "-"),
          h("span", null, "着")
        ),
        h("div", { className: "record-body" },
          h("h3", null, `${formatDateSlash(record.raceDate)} ${record.track}${record.raceNumber}R ${record.raceName || "レース名未入力"}`),
          h("p", { className: "record-condition" }, [record.raceClass, `${record.surface || ""}${record.distance || ""}`, record.going].filter(Boolean).join(" / ")),
          h("div", { className: "record-facts" },
            h("span", null, `${record.finish || "-"}着 / ${record.fieldSize || "-"}頭 / 人気${record.popularity || "-"}`),
            h("span", null, `騎手: ${record.jockey || "-"} ${record.carriedWeight || "-"}kg`),
            h("span", null, `タイム: ${record.time || "-"} / 上がり: ${record.last3f || "-"}`),
            h("span", null, `3角: ${record.corner3 || "-"}番手 / 4角: ${record.corner4 || "-"}番手`),
            h("span", null, `${record.frameNumber || "-"}枠 ${record.horseNumber || "-"}番`)
          ),
          memo && h("div", { className: "record-memo-badge" }, "メモあり")
        )
      ),
      memo && h("p", { className: "record-memo-summary" }, memo.memo || "このレースの回顧メモがあります。"),
      expanded && h("div", { className: "record-detail" },
        h("dl", null,
          h("dt", null, "全成績情報"),
          h("dd", null, `${record.finish || "-"}着 / ${record.fieldSize || "-"}頭 / 人気${record.popularity || "-"} / ${record.frameNumber || "-"}枠${record.horseNumber || "-"}番`),
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
    return h("button", { className: "horse-card", onClick: onOpen },
      h("div", { className: `rank rank-${horse.maxAttention}` }, horse.maxAttention),
      h("div", null, h("h3", null, horse.horseName), h("p", null, `${horse.latest.raceDate}・${horse.latest.track}${horse.latest.raceNumber ? `${horse.latest.raceNumber}R` : ""}・${horse.latest.distance || "距離未入力"}`), h("div", { className: "mini-tags" }, h("span", null, `メモ ${horse.count}`), h("span", null, `成績 ${horse.recordCount || 0}`), h("span", null, `自信度 ${horse.latest.confidence}`)))
    );
  }

  function MemoCard({ memo, onOpen, onDelete }) {
    const tags = [...memo.troubleTags, ...memo.strongTags, ...memo.buyTags];
    return h("article", { className: "memo-card" },
      h("button", { className: "card-main", onClick: onOpen },
        h("div", { className: "memo-head" },
          h("div", null, h("h3", null, memo.horseName), h("p", null, h(CalendarDays, { size: 14 }), ` ${memo.raceDate}・${memo.track}${memo.raceNumber ? `${memo.raceNumber}R` : ""}・${memo.distance || "距離未入力"}`)),
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
