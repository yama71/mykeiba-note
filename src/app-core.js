const MEMO_STORAGE_KEY = "keiba-review-memos-v1";
const RACE_STORAGE_KEY = "keiba-race-cards-v1";
const BACKUP_VERSION = 1;

const tracks = ["東京", "中山", "阪神", "京都", "中京", "札幌", "函館", "福島", "新潟", "小倉"];
const goingOptions = ["良", "稍重", "重", "不良"];
const surfaceOptions = ["芝", "ダート"];
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
  surface: "芝",
  distance: "",
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

function buildBackup(memos, raceCards) {
  return {
    appName: "MyKeiba Note",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      memos,
      raceCards,
    },
  };
}

function parseBackup(text) {
  const parsed = JSON.parse(text);
  const data = parsed.data || parsed;
  return {
    memos: Array.isArray(data.memos) ? data.memos : [],
    raceCards: Array.isArray(data.raceCards) ? data.raceCards : [],
  };
}

function parseRaceEntries(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines
    .filter((line) => !/^(枠|枠番|馬番|印|人気|単勝|性齢|馬体重)/.test(line))
    .map(parseRaceLine);
  return rows.length > 0 ? rows : [makeUnparsedRow("")];
}

function parseRaceLine(line) {
  const normalized = line.replace(/\u3000/g, " ").replace(/[|｜]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (tokens.length >= 5 && isFrame(tokens[0]) && isHorseNumber(tokens[1])) {
    return {
      id: crypto.randomUUID(),
      frameNumber: tokens[0],
      horseNumber: tokens[1],
      horseName: tokens.slice(2, -2).join(" "),
      jockey: tokens[tokens.length - 2],
      carriedWeight: tokens[tokens.length - 1],
      raw: line,
      parsed: true,
    };
  }

  const matched = normalized.match(/^([1-8])\s*[-]?\s*(\d{1,2})\s+(.+?)\s+([^\s]+)\s+(\d{2}(?:\.\d)?|[0-9０-９]{2}(?:\.[0-9])?)$/);
  if (matched) {
    return {
      id: crypto.randomUUID(),
      frameNumber: matched[1],
      horseNumber: matched[2],
      horseName: matched[3].trim(),
      jockey: matched[4],
      carriedWeight: matched[5],
      raw: line,
      parsed: true,
    };
  }

  return makeUnparsedRow(line);
}

function makeUnparsedRow(raw) {
  return {
    id: crypto.randomUUID(),
    frameNumber: "",
    horseNumber: "",
    horseName: "",
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

function parseResultRows(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines
    .filter((line) => !/^(着順|順位|馬名|タイム|通過|上がり|人気)/.test(line))
    .map(parseResultLine);
  return rows.length > 0 ? rows : [makeResultRow("")];
}

function parseResultLine(line) {
  const normalized = line.replace(/\u3000/g, " ").replace(/[|｜]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const finish = tokens[0] || "";
  const timeIndex = tokens.findIndex((token) => /^\d{1,2}:\d{2}\.\d$/.test(token) || /^\d{2,3}\.\d$/.test(token));
  const positionIndex = tokens.findIndex((token) => /^\d{1,2}(?:-\d{1,2})+$/.test(token));
  const last3fIndex = tokens.findLastIndex((token) => /^\d{2}\.\d$/.test(token));

  if (/^\d{1,2}$/.test(finish) && timeIndex > 1) {
    const horseName = tokens.slice(1, timeIndex).join(" ");
    const margin = positionIndex > timeIndex ? tokens.slice(timeIndex + 1, positionIndex).join(" ") : "";
    const position = positionIndex >= 0 ? tokens[positionIndex] : "";
    const last3f = last3fIndex > positionIndex ? tokens[last3fIndex] : "";

    return {
      id: crypto.randomUUID(),
      finish,
      horseName,
      time: tokens[timeIndex],
      margin,
      position,
      corner4: deriveCorner4(position),
      last3f,
      raw: line,
      parsed: true,
    };
  }

  return makeResultRow(line);
}

function makeResultRow(raw) {
  return {
    id: crypto.randomUUID(),
    finish: "",
    horseName: "",
    time: "",
    margin: "",
    position: "",
    corner4: "",
    last3f: "",
    raw,
    parsed: false,
  };
}

function deriveCorner4(position) {
  const parts = position.split("-").map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || "";
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
    const [selectedHorse, setSelectedHorse] = useState("");
    const [selectedRaceId, setSelectedRaceId] = useState("");
    const [toast, setToast] = useState("");

    useEffect(() => saveJson(MEMO_STORAGE_KEY, memos), [memos]);
    useEffect(() => saveJson(RACE_STORAGE_KEY, raceCards), [raceCards]);

    const horseStats = useMemo(() => {
      const map = new Map();
      memos.forEach((memo) => {
        const current = map.get(memo.horseName) || { horseName: memo.horseName, count: 0, latest: memo, maxAttention: "C" };
        current.count += 1;
        if (new Date(memo.raceDate) > new Date(current.latest.raceDate)) current.latest = memo;
        if ("ABC".indexOf(memo.attention) < "ABC".indexOf(current.maxAttention)) current.maxAttention = memo.attention;
        map.set(memo.horseName, current);
      });
      return [...map.values()].sort((a, b) => new Date(b.latest.raceDate) - new Date(a.latest.raceDate));
    }, [memos]);

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

    function saveRaceResult(raceId, result) {
      setRaceCards((current) => current.map((race) => race.id === raceId ? { ...race, result } : race));
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
        screen === "result" && h(ResultImport, { raceCards, selectedRaceId, onSave: saveRaceResult }),
        screen === "backup" && h(BackupScreen, { memos, raceCards, setMemos, setRaceCards, notify, setScreen }),
        screen === "list" && h(HorseList, { horseStats, openHorse, setScreen }),
        screen === "search" && h(HorseSearch, { horseStats, openHorse }),
        screen === "horse" && h(HorseHistory, { horseName: selectedHorse, memos, deleteMemo, setScreen })
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
      backup: "バックアップ",
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
        h("button", { onClick: () => setScreen("backup") }, h(ClipboardList, { size: 18 }), " バックアップ")
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
        raceInfo: { ...raceInfo, distance: raceInfo.distance.trim(), raceName: raceInfo.raceName.trim() },
        entries: entries.map(({ id, frameNumber, horseNumber, horseName, jockey, carriedWeight, raw, parsed }) => ({
          id,
          frameNumber: frameNumber.trim(),
          horseNumber: horseNumber.trim(),
          horseName: horseName.trim(),
          jockey: jockey.trim(),
          carriedWeight: carriedWeight.trim(),
          raw,
          parsed,
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
      h(Field, { label: "出走表テキスト" }, h("textarea", {
        value: pasteText,
        onChange: (event) => setPasteText(event.target.value),
        placeholder: "例：1 1 サンプルホース 横山武史 57.0",
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
        h(Field, { label: "枠番" }, h("input", { inputMode: "numeric", value: entry.frameNumber, onChange: (event) => updateEntry(entry.id, "frameNumber", event.target.value) })),
        h(Field, { label: "馬番" }, h("input", { inputMode: "numeric", value: entry.horseNumber, onChange: (event) => updateEntry(entry.id, "horseNumber", event.target.value) })),
        h(Field, { label: "馬名" }, h("input", { value: entry.horseName, onChange: (event) => updateEntry(entry.id, "horseName", event.target.value) })),
        h(Field, { label: "騎手" }, h("input", { value: entry.jockey, onChange: (event) => updateEntry(entry.id, "jockey", event.target.value) })),
        h(Field, { label: "斤量" }, h("input", { inputMode: "decimal", value: entry.carriedWeight, onChange: (event) => updateEntry(entry.id, "carriedWeight", event.target.value) }))
      )
    );
  }

  function ResultImport({ raceCards, selectedRaceId, onSave }) {
    const initialRaceId = selectedRaceId || raceCards[0]?.id || "";
    const [raceId, setRaceId] = useState(initialRaceId);
    const currentRace = raceCards.find((race) => race.id === raceId);
    const [pasteText, setPasteText] = useState("");
    const [averageWinningTime, setAverageWinningTime] = useState(currentRace?.result?.averageWinningTime || "");
    const [rows, setRows] = useState(currentRace?.result?.rows || []);
    const resultPreview = buildRaceResult(rows, averageWinningTime);
    const canSave = Boolean(raceId) && rows.length > 0;

    function updateRow(id, field, value) {
      setRows((current) => current.map((row) => row.id === id ? {
        ...row,
        [field]: value,
        corner4: field === "position" ? deriveCorner4(value) : row.corner4,
        parsed: true,
      } : row));
    }

    function analyze() {
      setRows(parseResultRows(pasteText));
    }

    function addManualRow() {
      setRows((current) => [...current, makeResultRow("")]);
    }

    function submit(event) {
      event.preventDefault();
      if (!canSave) return;
      onSave(raceId, buildRaceResult(rows.map((row) => ({
        ...row,
        finish: row.finish.trim(),
        horseName: row.horseName.trim(),
        time: row.time.trim(),
        margin: row.margin.trim(),
        position: row.position.trim(),
        corner4: row.corner4.trim(),
        last3f: row.last3f.trim(),
      })), averageWinningTime.trim()));
    }

    return h("form", { className: "screen form-screen", onSubmit: submit },
      raceCards.length === 0
        ? h(EmptyState, { title: "出走表がありません", text: "先に出走表を登録してください。" })
        : h(React.Fragment, null,
          h(Field, { label: "対象レース" }, h("select", { value: raceId, onChange: (event) => {
            const nextRace = raceCards.find((race) => race.id === event.target.value);
            setRaceId(event.target.value);
            setAverageWinningTime(nextRace?.result?.averageWinningTime || "");
            setRows(nextRace?.result?.rows || []);
          } }, raceCards.map((race) => h("option", { key: race.id, value: race.id }, `${race.raceInfo.track}${race.raceInfo.raceNumber}R ${race.raceInfo.raceName || "レース名未入力"}`)))),
          h(Field, { label: "平均勝ち時計" }, h("input", {
            value: averageWinningTime,
            onChange: (event) => setAverageWinningTime(event.target.value),
            placeholder: "例：1:33.5 / 93.5",
          })),
          h(Field, { label: "レース結果テキスト" }, h("textarea", {
            value: pasteText,
            onChange: (event) => setPasteText(event.target.value),
            placeholder: "例：1 テストホース 1:33.2 - 3-3-2 34.1",
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
            : h("div", { className: "entry-stack" }, rows.map((row, index) => h(ResultRowEditor, { key: row.id, row, index, updateRow }))),
          h("div", { className: "form-actions" },
            h("button", { type: "button", className: "secondary", onClick: () => setRows([]) }, "結果クリア"),
            h("button", { className: "primary", disabled: !canSave }, "保存")
          )
        )
    );
  }

  function BackupScreen({ memos, raceCards, setMemos, setRaceCards, notify, setScreen }) {
    const [importText, setImportText] = useState("");
    const [error, setError] = useState("");
    const backupText = JSON.stringify(buildBackup(memos, raceCards), null, 2);

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

    function importBackup(event) {
      event.preventDefault();
      try {
        const imported = parseBackup(importText);
        setMemos(imported.memos);
        setRaceCards(imported.raceCards);
        setImportText("");
        setError("");
        notify("バックアップを読み込みました");
        setScreen("home");
      } catch {
        setError("JSONの形が正しくありません。書き出したバックアップ内容をそのまま貼り付けてください。");
      }
    }

    return h("section", { className: "screen backup-screen" },
      h("div", { className: "backup-panel" },
        h("h2", null, "JSONバックアップ"),
        h("p", null, "メモと出走表をまとめて保存できます。スマホの機種変更前や、念のため残したい時に使います。"),
        h("button", { type: "button", className: "primary full-button", onClick: exportBackup }, "JSONを書き出す"),
        h(Field, { label: "現在のバックアップJSON" }, h("textarea", {
          value: backupText,
          readOnly: true,
          rows: 8,
        }))
      ),
      h("form", { className: "backup-panel", onSubmit: importBackup },
        h("h2", null, "JSONを読み込む"),
        h(Field, { label: "バックアップJSON" }, h("textarea", {
          value: importText,
          onChange: (event) => setImportText(event.target.value),
          placeholder: "ここにバックアップJSONを貼り付け",
          rows: 10,
        })),
        error && h("p", { className: "error-text" }, error),
        h("button", { className: "primary full-button", disabled: !importText.trim() }, "読み込む")
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

  function ResultRowEditor({ row, index, updateRow }) {
    return h("article", { className: `entry-card result-row ${row.parsed ? "" : "unparsed"}` },
      h("div", { className: "entry-head" },
        h("strong", null, row.parsed ? `${index + 1}頭目` : "未解析"),
        row.raw && h("span", null, row.raw)
      ),
      h("div", { className: "result-grid" },
        h(Field, { label: "着順" }, h("input", { inputMode: "numeric", value: row.finish, onChange: (event) => updateRow(row.id, "finish", event.target.value) })),
        h(Field, { label: "馬名" }, h("input", { value: row.horseName, onChange: (event) => updateRow(row.id, "horseName", event.target.value) })),
        h(Field, { label: "走破タイム" }, h("input", { value: row.time, onChange: (event) => updateRow(row.id, "time", event.target.value), placeholder: "1:33.2" })),
        h(Field, { label: "着差" }, h("input", { value: row.margin, onChange: (event) => updateRow(row.id, "margin", event.target.value), placeholder: "-" })),
        h(Field, { label: "通過順" }, h("input", { value: row.position, onChange: (event) => updateRow(row.id, "position", event.target.value), placeholder: "3-3-2" })),
        h(Field, { label: "4角位置" }, h("input", { inputMode: "numeric", value: row.corner4, onChange: (event) => updateRow(row.id, "corner4", event.target.value) })),
        h(Field, { label: "上がり3F" }, h("input", { inputMode: "decimal", value: row.last3f, onChange: (event) => updateRow(row.id, "last3f", event.target.value), placeholder: "34.1" }))
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
          h("p", null, `${entry.jockey || "騎手未入力"}・${entry.carriedWeight || "-"}kg`)
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
      onSave({ ...form, horseName: form.horseName.trim(), distance: form.distance.trim() });
      setForm(emptyMemoForm);
    }
    return h("form", { className: "screen form-screen", onSubmit: submit },
      h(Field, { label: "馬名", required: true }, h("input", { value: form.horseName, onChange: (event) => update("horseName", event.target.value), placeholder: "例：サンプルホース" })),
      h("div", { className: "two-col" },
        h(Field, { label: "レース日", required: true }, h("input", { type: "date", value: form.raceDate, onChange: (event) => update("raceDate", event.target.value) })),
        h(Field, { label: "競馬場" }, h("select", { value: form.track, onChange: (event) => update("track", event.target.value) }, tracks.map((track) => h("option", { key: track }, track))))
      ),
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

  function HorseHistory({ horseName, memos, deleteMemo, setScreen }) {
    const normalizedName = horseName.trim();
    const history = memos.filter((memo) => memo.horseName.trim() === normalizedName).sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));
    return h("section", { className: "screen" }, !horseName || history.length === 0
      ? h(EmptyState, { title: "履歴が見つかりません", text: "注目馬リストか検索から馬を選んでください。", action: h("button", { className: "primary small", onClick: () => setScreen("list") }, "リストへ") })
      : h(React.Fragment, null,
        h("div", { className: "horse-title" }, h("h2", null, normalizedName), h("span", null, `${history.length}件`)),
        h("div", { className: "card-stack" }, history.map((memo) => h(MemoCard, { key: memo.id, memo, onDelete: () => deleteMemo(memo.id) })))
      ));
  }

  function HorseCard({ horse, onOpen }) {
    return h("button", { className: "horse-card", onClick: onOpen },
      h("div", { className: `rank rank-${horse.maxAttention}` }, horse.maxAttention),
      h("div", null, h("h3", null, horse.horseName), h("p", null, `${horse.latest.raceDate}・${horse.latest.track}・${horse.latest.distance || "距離未入力"}`), h("div", { className: "mini-tags" }, h("span", null, `メモ ${horse.count}`), h("span", null, `自信度 ${horse.latest.confidence}`)))
    );
  }

  function MemoCard({ memo, onOpen, onDelete }) {
    const tags = [...memo.troubleTags, ...memo.strongTags, ...memo.buyTags];
    return h("article", { className: "memo-card" },
      h("button", { className: "card-main", onClick: onOpen },
        h("div", { className: "memo-head" },
          h("div", null, h("h3", null, memo.horseName), h("p", null, h(CalendarDays, { size: 14 }), ` ${memo.raceDate}・${memo.track}・${memo.distance || "距離未入力"}`)),
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
