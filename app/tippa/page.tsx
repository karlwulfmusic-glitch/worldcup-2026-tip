"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  worldCup2026Matches,
  teams,
  GROUP_CODES,
  GroupCode,
  WorldCupMatch,
} from "../../lib/worldcup2026";

const WORLD_CUP_START_TIME = new Date("2026-06-12T02:04:00+02:00");

const formatMatchDateTime = (dateUtc: string) => {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(dateUtc));

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  return `${get("day")} ${get("month")} ${get("hour")}:${get("minute")}`;
};

const KNOCKOUT_TREE: Record<
  string,
  { home: string; away: string; isLoser?: boolean }
> = {
  "R16-1": { home: "R32-1", away: "R32-2" },
  "R16-2": { home: "R32-3", away: "R32-4" },
  "R16-3": { home: "R32-5", away: "R32-6" },
  "R16-4": { home: "R32-7", away: "R32-8" },
  "R16-5": { home: "R32-9", away: "R32-10" },
  "R16-6": { home: "R32-11", away: "R32-12" },
  "R16-7": { home: "R32-13", away: "R32-14" },
  "R16-8": { home: "R32-15", away: "R32-16" },

  "QF-1": { home: "R16-1", away: "R16-2" },
  "QF-2": { home: "R16-3", away: "R16-4" },
  "QF-3": { home: "R16-5", away: "R16-6" },
  "QF-4": { home: "R16-7", away: "R16-8" },

  "SF-1": { home: "QF-1", away: "QF-2" },
  "SF-2": { home: "QF-3", away: "QF-4" },

  FINAL: { home: "SF-1", away: "SF-2" },
  BRONZE: { home: "SF-1", away: "SF-2", isLoser: true },
  BM: { home: "SF-1", away: "SF-2", isLoser: true },
};

export default function Page() {
  const [isLocked, setIsLocked] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [koStep, setKoStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    phone: "",
    topScorer: "",
  });
  const [groupResults, setGroupResults] = useState<
    Record<string, { h: string; a: string }>
  >({});
  const [koWinners, setKoWinners] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkStatus = () => {
      if (new Date() >= WORLD_CUP_START_TIME) setIsLocked(true);
    };

    checkStatus();
    const timer = setInterval(checkStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  const stages = [
    { id: "R32", label: "32-DELSFINAL", title: "32-DELSFINALER" },
    { id: "R16", label: "ÅTTONDELSFINAL", title: "ÅTTONDELSFINALER" },
    { id: "QF", label: "KVARTSFINAL", title: "KVARTSFINALER" },
    { id: "SF", label: "SEMIFINAL", title: "SEMIFINALER" },
    { id: "FINAL", label: "FINAL & BRONSMATCH", title: "MEDALJMATCHERNA" },
  ];

  const groupFunFacts: Record<string, string> = {
  A: "MEXICO har med målvakt och snart pensionär OCHOA igen, Sydafrika utan 50 tusen vuvuzelor.",

  B: "För Schweiz del finns det chans som när Federer dominerade, vackrast, ärligast och bäst. Dzekos Bosnien kanske har något, Kanada kan nada?",

  C: "NEYMAR 90 MINUTER MOT HAITI, om 20 år på YouTube är detta fortfarande highlight, trust my words.",

  D: "USA är gruppens influencer. Hemmaplan, kameror överallt och enormt självförtroende. Men med turkisk kebab ligger Instagram och USA jävligt risigt till, iallafall enligt mig.",

  E: "Ingen Müller eller Klose, därav ej målrekord. Jag själv tror på hörnornas grupp, flängiga matcher och en jävla massa offensiv.",

  F: "Nach rechts, nach links - ORANJE dansar sig igenom. SVERIGE kommer aldrig dö? Eller vad säger du Stenström... var mer optimistisk innan träningsmatcher mot Norge och Grekland, tyvärr.",

  G: "Belgien är gruppens gamla stjärna som fortfarande tror att detta är deras era. Egypten sitter bredvid med Salah-energi och väntar på att sno rubrikerna... ps. direkt från ChatGPT ;).",

  H: "Spanien kommer in med 900 passningar. Uruguay bryr sig inte — de kommer bara sparka sönder hela skiten!",

  I: "Mbappés diktatur räcker hur långt då? Haaland kommer att RO hem Norge utan guld, men istället med sjukt mycket BRUNOST. De har med sig sjuka mängder brunost till Amerikat... otroligt.",

  J: "NI MÅSTE GOOGLA KAISERTRIKOT - Österrike och världens snyggaste fotbollströja. Beställde hem en i maj! Jaja... Messi Messi Messi Messi Messi, spanska kommentatorn.",

  K: "Ronaldo står i centrum, och hela gruppen känns som ett avsnitt där alla väntar på vem som ska ta över showen.",

  L: "England är huvudpersonen som vanligt, mest för att de själva bestämt det. Men Kroatien med erfarenhet säger: vi har sett detta förr.",
};

  const reglerRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const getFlag = (n: string) => {
    const t = Object.values(teams).find((x) => x.name === n);
    return t ? `https://flagcdn.com/w40/${t.flagCode.toLowerCase()}.png` : null;
  };

  const handleScoreChange = (
    matchId: string,
    side: "h" | "a",
    value: string
  ) => {
    if (value === "" || /^\d+$/.test(value)) {
      setGroupResults((prev) => ({
        ...prev,
        [matchId]: {
          ...(prev[matchId] || { h: "", a: "" }),
          [side]: value,
        },
      }));
    }
  };

  const calculateStandings = (group: GroupCode) => {
    const standings: Record<string, any> = {};

    worldCup2026Matches
      .filter((m) => m.group === group)
      .forEach((m) => {
        [m.home.name, m.away.name].forEach((n) => {
          if (!standings[n]) standings[n] = { name: n, pts: 0, gd: 0, gs: 0 };
        });

        const r = groupResults[m.id];

        if (r?.h !== "" && r?.a !== "" && r?.h !== undefined && r?.a !== undefined) {
          const h = parseInt(r.h);
          const a = parseInt(r.a);

          if (!isNaN(h) && !isNaN(a)) {
            standings[m.home.name].gs += h;
            standings[m.away.name].gs += a;
            standings[m.home.name].gd += h - a;
            standings[m.away.name].gd += a - h;

            if (h > a) standings[m.home.name].pts += 3;
            else if (a > h) standings[m.away.name].pts += 3;
            else {
              standings[m.home.name].pts += 1;
              standings[m.away.name].pts += 1;
            }
          }
        }
      });

    return Object.values(standings).sort(
      (a, b) => b.pts - a.pts || b.gd - a.gd || b.gs - a.gs
    );
  };

  const isPlaceholderTeam = (teamName: string) => {
    return (
      /^[123][A-L]$/i.test(teamName) ||
      /^W\d+$/i.test(teamName) ||
      /^Vinnare/i.test(teamName) ||
      /^Förlorare/i.test(teamName) ||
      teamName === "?" ||
      teamName === "TBD" ||
      teamName === "Utslagen 3:a"
    );
  };

  const isGroupComplete = (group: GroupCode) => {
    const groupMatches = worldCup2026Matches.filter((m) => m.group === group);

    if (groupMatches.length === 0) return false;

    return groupMatches.every((m) => {
      const r = groupResults[m.id];

      return (
        r !== undefined &&
        r.h !== "" &&
        r.a !== "" &&
        r.h !== undefined &&
        r.a !== undefined
      );
    });
  };

  const areAllGroupsComplete = () => {
    return GROUP_CODES.every((g) => isGroupComplete(g as GroupCode));
  };

  type ThirdPlaceSlot = {
    key: string;
    matchId: string;
    side: "home" | "away";
    candidates: GroupCode[];
  };

  // FIFA 2026: de 8 bästa treorna går vidare.
  // Exakt vilken 3:a som hamnar mot vilken gruppvinnare beror på vilka grupper
  // som får tredjeplatser vidare. Här används R32-slotarnas giltiga kandidatgrupper.
  const THIRD_PLACE_SLOTS: ThirdPlaceSlot[] = [
    { key: "R32-2-away", matchId: "R32-2", side: "away", candidates: ["A", "B", "C", "D", "F"] },
    { key: "R32-5-away", matchId: "R32-5", side: "away", candidates: ["C", "D", "F", "G", "H"] },
    { key: "R32-1-away", matchId: "R32-1", side: "away", candidates: ["C", "E", "F", "H", "I"] },
    { key: "R32-9-away", matchId: "R32-9", side: "away", candidates: ["E", "H", "I", "J", "K"] },
    { key: "R32-7-away", matchId: "R32-7", side: "away", candidates: ["B", "E", "F", "I", "J"] },
    { key: "R32-8-away", matchId: "R32-8", side: "away", candidates: ["A", "E", "H", "I", "J"] },
    { key: "R32-11-away", matchId: "R32-11", side: "away", candidates: ["E", "F", "G", "I", "J"] },
    { key: "R32-13-away", matchId: "R32-13", side: "away", candidates: ["D", "E", "I", "J", "L"] },
  ];

  const getThirdPlaceRanking = () => {
    if (!areAllGroupsComplete()) return [];

    return GROUP_CODES.map((g) => {
      const table = calculateStandings(g as GroupCode);
      const third = table[2] as any;

      if (!third) return null;

      return {
        group: g as GroupCode,
        name: third.name,
        pts: third.pts,
        gd: third.gd,
        gs: third.gs || 0,
      };
    })
      .filter(Boolean)
      .sort((a: any, b: any) =>
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gs - a.gs ||
        String(a.group).localeCompare(String(b.group))
      ) as Array<{
        group: GroupCode;
        name: string;
        pts: number;
        gd: number;
        gs: number;
      }>;
  };

  const getQualifiedThirdGroups = () => {
    return getThirdPlaceRanking()
      .slice(0, 8)
      .map((x) => x.group);
  };

  const getAssignedThirdGroups = () => {
    const qualified = getQualifiedThirdGroups();

    if (qualified.length < 8) {
      return {} as Record<string, GroupCode>;
    }

    const qualifiedSet = new Set<GroupCode>(qualified);
    const rankingOrder = new Map<GroupCode, number>(
      qualified.map((g, i) => [g, i])
    );

    const slots = [...THIRD_PLACE_SLOTS].sort((a, b) => {
      const aCount = a.candidates.filter((g) => qualifiedSet.has(g)).length;
      const bCount = b.candidates.filter((g) => qualifiedSet.has(g)).length;
      return aCount - bCount;
    });

    const assigned: Record<string, GroupCode> = {};
    const used = new Set<GroupCode>();

    const solve = (index: number): boolean => {
      if (index >= slots.length) return true;

      const slot = slots[index];

      const options = slot.candidates
        .filter((g) => qualifiedSet.has(g) && !used.has(g))
        .sort((a, b) => (rankingOrder.get(a) ?? 99) - (rankingOrder.get(b) ?? 99));

      for (const group of options) {
        assigned[slot.key] = group;
        used.add(group);

        if (solve(index + 1)) return true;

        used.delete(group);
        delete assigned[slot.key];
      }

      return false;
    };

    solve(0);

    return assigned;
  };

  const getThirdPlaceTeamForSlot = (
    matchId: string,
    side: "home" | "away",
    fallback: string
  ) => {
    if (!areAllGroupsComplete()) return fallback;

    const assigned = getAssignedThirdGroups();
    const assignedGroup = assigned[`${matchId}-${side}`];

    if (!assignedGroup) return "Utslagen 3:a";

    const table = calculateStandings(assignedGroup);
    const third = table[2] as any;

    return third?.name || fallback;
  };

  const getDisplayTeam = (match: WorldCupMatch, side: "home" | "away"): string => {
    const t = side === "home" ? match.home : match.away;

    // Slutspel låses tills ALLA grupper är färdigtippade.
    // Då visas bara placeholders från worldcup2026.ts: 1A, 3C, Vinnare R32-1 osv.
    if (match.stage !== "GROUP" && !areAllGroupsComplete()) {
      return t.name;
    }

    // Bronsmatchen ska alltid visa förlorarna från semifinalerna.
    // Räknas ut direkt från SF-1 och SF-2, inte från sparad placeholder.
    if (match.stage === "BRONZE" || match.id === "BRONZE" || match.id === "BM") {
      return side === "home" ? getLoser("SF-1") : getLoser("SF-2");
    }

    const tree = KNOCKOUT_TREE[match.id];

    if (tree) {
      const sourceId = side === "home" ? tree.home : tree.away;

      if (tree.isLoser) {
        return getLoser(sourceId);
      }

      return koWinners[sourceId] || t.name;
    }

    const groupMatch =
      t.name.match(/^([123])([A-L])$/i) || t.id.match(/^([123])([A-L])$/i);

    // Bästa treorna: 3A/3B osv får inte automatiskt gå vidare.
    // De placeras först efter att alla gruppers treor har rankats globalt.
    if (groupMatch && parseInt(groupMatch[1]) === 3 && match.stage === "R32") {
      return getThirdPlaceTeamForSlot(match.id, side, `${groupMatch[1]}${groupMatch[2].toUpperCase()}`);
    }

    if (groupMatch) {
      const rank = parseInt(groupMatch[1]);
      const g = groupMatch[2].toUpperCase() as GroupCode;

      if (!isGroupComplete(g)) {
        return `${rank}${g}`;
      }

      const s = calculateStandings(g);

      return s[rank - 1]?.name || t.name;
    }

    return t.name;
  };

  const getMatchTeams = (matchId: string): [string, string] => {
    const match = worldCup2026Matches.find((m) => m.id === matchId);
    if (!match) return ["?", "?"];

    return [getDisplayTeam(match, "home"), getDisplayTeam(match, "away")];
  };

  const getLoser = (matchId: string): string => {
    const winner = koWinners[matchId];
    const [home, away] = getMatchTeams(matchId);

    if (
      !winner ||
      isPlaceholderTeam(winner) ||
      isPlaceholderTeam(home) ||
      isPlaceholderTeam(away)
    ) {
      return matchId === "SF-1" ? "Förlorare SF-1" : matchId === "SF-2" ? "Förlorare SF-2" : "?";
    }

    return winner === home ? away : home;
  };

  const selectKoWinner = (matchId: string, teamName: string) => {
    if (!teamName || isPlaceholderTeam(teamName)) return;

    setKoWinners((prev) => ({
      ...prev,
      [matchId]: teamName,
    }));
  };

  const getStageMatches = (stageId: string) => {
    return worldCup2026Matches.filter((m) =>
      stageId === "FINAL"
        ? m.stage === "FINAL" || m.stage === "BRONZE"
        : m.stage === stageId
    );
  };

  const isCurrentKoStepComplete = () => {
    const currentStageId = stages[koStep].id;

    if (!areAllGroupsComplete()) {
      return false;
    }

    const currentMatches = getStageMatches(currentStageId);

    return currentMatches.every((m) => {
      const h = getDisplayTeam(m, "home");
      const a = getDisplayTeam(m, "away");

      return (
        !isPlaceholderTeam(h) &&
        !isPlaceholderTeam(a) &&
        Boolean(koWinners[m.id])
      );
    });
  };

  const goToNextKoStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();

    if (!areAllGroupsComplete()) {
      alert("Fyll i alla gruppspelsmatcher först. Slutspelet låses upp först när alla grupper är färdigtippade.");
      return;
    }

    if (!isCurrentKoStepComplete()) {
      alert("Välj vinnare i alla matcher i denna runda innan du går vidare.");
      return;
    }

    const y = window.scrollY;

    setKoStep(Math.min(4, koStep + 1));

    requestAnimationFrame(() => {
      window.scrollTo({
        top: y,
        behavior: "auto",
      });
    });
  };

  const submitTotalTip = async () => {
    if (!userInfo.name.trim()) {
      alert("Fyll i namn!");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert([
          {
            name: userInfo.name.trim(),
            phone: userInfo.phone.trim(),
            top_scorer_pick: userInfo.topScorer.trim(),
          },
        ])
        .select()
        .single();

      if (userError) {
        console.error("USER INSERT ERROR:", userError);
        throw userError;
      }

      if (!newUser?.id) {
        throw new Error("Kunde inte skapa användare i Supabase.");
      }

      const allPicks = worldCup2026Matches.map((match) => {
        const predictedHome =
          groupResults[match.id]?.h !== "" &&
          groupResults[match.id]?.h !== undefined
            ? parseInt(groupResults[match.id].h)
            : null;

        const predictedAway =
          groupResults[match.id]?.a !== "" &&
          groupResults[match.id]?.a !== undefined
            ? parseInt(groupResults[match.id].a)
            : null;

        const selectedWinner = koWinners[match.id];

        return {
          user_id: newUser.id,
          match_id: match.id,
          predicted_home_goals: Number.isFinite(predictedHome)
            ? predictedHome
            : null,
          predicted_away_goals: Number.isFinite(predictedAway)
            ? predictedAway
            : null,
          winner_team:
            selectedWinner && !isPlaceholderTeam(selectedWinner)
              ? selectedWinner
              : null,
        };
      });

      const { error: picksError } = await supabase
        .from("picks")
        .insert(allPicks);

      if (picksError) {
        console.error("PICKS INSERT ERROR:", picksError);
        throw picksError;
      }

      alert("TIPSET ÄR INSKICKAT!");
      window.location.assign("/leaderboard");
    } catch (err: any) {
      console.error("SUBMIT ERROR:", err);
      alert(
        "Fel när tipset skulle skickas in: " +
          (err?.message || JSON.stringify(err))
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#00041a] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
        </div>
        <h2 className="text-4xl md:text-6xl font-black italic uppercase text-white mb-4 tracking-tighter">
          TIPPANDE STÄNGT
        </h2>
        <p className="text-blue-400 font-bold uppercase tracking-[0.2em] mb-12">
          VM 2026 HAR STARTAT - BOLLEN RULLAR!
        </p>
        <button
          onClick={() => (window.location.href = "/leaderboard")}
          className="bg-blue-600 px-12 py-5 rounded-full font-black italic uppercase text-xl shadow-2xl"
        >
          SE LEADERBOARD ❯
        </button>
      </div>
    );
  }

  if (currentStep < 3)
    return (
      <div className="bg-black text-white selection:bg-blue-500 overflow-x-hidden">
        <section className="h-screen flex flex-col items-center justify-start pt-[15vh] md:justify-center relative px-4 text-center overflow-hidden">
          <div
            className="absolute inset-0 hidden md:block bg-cover bg-center bg-no-repeat z-0 opacity-60"
            style={{ backgroundImage: "url('/hero-bg.jpg')" }}
          />
          <div
            className="absolute inset-0 block md:hidden bg-cover bg-center bg-no-repeat z-0 opacity-60"
            style={{ backgroundImage: "url('/hero-bg-mobile.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 z-1" />

          <h1 className="text-[14vw] md:text-[10vw] font-black italic uppercase z-10 leading-[0.8] mt-10 md:mt-0">
            <span className="block text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
              WULFENS
            </span>
            <span className="block text-[#001D81]">VM TIP</span>
          </h1>

          <div className="z-10 mt-auto mb-10 md:mt-16 md:mb-0">
            <button
              onClick={() => reglerRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="p-4 rounded-full border-2 border-white/40 bg-black/30 backdrop-blur-md animate-bounce"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        </section>

        <section
          ref={reglerRef}
          className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-[#00041a] py-12 md:py-20"
        >
          <div className="max-w-5xl w-full space-y-8 md:space-y-12 relative z-10">
            <div className="text-center">
              <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white mb-2">
                POÄNGSYSTEM
              </h2>
              <p className="text-blue-500 font-black tracking-[0.3em] uppercase text-xs md:text-sm">
                Hur du vinner potten
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-md">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-6">
                  ⚽
                </div>
                <h3 className="text-xl md:text-2xl font-black italic uppercase mb-4">
                  Gruppspel
                </h3>
                <ul className="space-y-3 md:space-y-4 font-bold italic text-white/70 text-xs md:text-sm">
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>Rätt tecken</span>
                    <span className="text-blue-500">+2P</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>Rätt mål H</span>
                    <span className="text-blue-500">+1P</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 pb-2">
                    <span>Rätt mål B</span>
                    <span className="text-blue-500">+1P</span>
                  </li>
                  <li className="text-green-400">Exakt tabellrad +2P</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-md">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-6">
                  🏆
                </div>
                <h3 className="text-xl md:text-2xl font-black italic uppercase mb-4">
                  Slutspel
                </h3>
                <ul className="space-y-3 font-bold italic text-white/70 text-[10px] md:text-xs">
                  <li className="flex justify-between border-b border-white/5">
                    <span>R32</span>
                    <span>+1P</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5">
                    <span>R16</span>
                    <span>+2P</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5">
                    <span>QF</span>
                    <span>+4P</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5">
                    <span>SF</span>
                    <span>+8P</span>
                  </li>
                  <li className="text-yellow-500 font-black">Världsmästare +25P</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-md">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-6">
                  ✨
                </div>
                <h3 className="text-xl md:text-2xl font-black italic uppercase mb-4">
                  Specials
                </h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                    <p className="text-[10px] md:text-xs font-black italic uppercase">
                      Skytteliga: +15P
                    </p>
                  </div>
                  <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                    <p className="text-[10px] md:text-xs font-black italic uppercase">
                      Rätt lag till final: +10P / lag
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => infoRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="w-full py-6 md:py-10 bg-white text-black rounded-[2rem] md:rounded-[3rem] text-2xl md:text-4xl font-black uppercase italic transition-all hover:scale-105 active:scale-95 shadow-2xl"
            >
              NU KÖR VI ❯
            </button>
          </div>
        </section>

        <section
          ref={infoRef}
          className="min-h-screen flex items-center justify-center p-6 md:p-8 bg-blue-950 text-white"
        >
          <div className="max-w-xl w-full space-y-8 md:space-y-12">
            <h2 className="text-5xl md:text-7xl font-black italic uppercase text-center leading-none">
              VEM ÄR DU?
            </h2>
            <div className="space-y-4 md:space-y-6">
              <input
                placeholder="Namn"
                className="w-full p-6 md:p-8 bg-white/10 border-2 border-white/10 rounded-2xl md:rounded-3xl text-xl md:text-2xl font-bold outline-none focus:border-white transition-all"
                value={userInfo.name}
                onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
              />
              <input
                type="tel"
                placeholder="Telefonnummer"
                className="w-full p-6 md:p-8 bg-white/10 border-2 border-white/10 rounded-2xl md:rounded-3xl text-xl md:text-2xl font-bold outline-none focus:border-white transition-all"
                value={userInfo.phone}
                onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
              />
              <input
                placeholder="Vem vinner skytteligan?"
                className="w-full p-6 md:p-8 bg-blue-600 rounded-2xl md:rounded-3xl text-xl md:text-3xl font-black border-4 border-blue-400 outline-none placeholder:text-blue-200"
                value={userInfo.topScorer}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, topScorer: e.target.value })
                }
              />
            </div>
            <button
              disabled={!userInfo.name || !userInfo.phone}
              onClick={() => {
                window.scrollTo(0, 0);
                setCurrentStep(3);
              }}
              className="w-full py-6 md:py-10 bg-white text-blue-950 rounded-[2rem] md:rounded-[3rem] text-2xl md:text-3xl font-black uppercase italic disabled:opacity-20 transition-all hover:scale-105 active:scale-95 shadow-2xl"
            >
              TILL TIPPNINGEN 🏆
            </button>
          </div>
        </section>
      </div>
    );

  return (
    <main className="min-h-screen bg-[#00041a] text-white font-sans pb-40 overflow-x-hidden">
      <header className="p-4 flex justify-between items-start border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#00041a]/90">
        <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">
          WULFENS TIP
        </h1>
        <div className="text-right">
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">
            TIPPARE
          </p>
          <p className="text-sm font-black italic uppercase">
            {userInfo.name || "GÄST"}
          </p>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-8">
        {GROUP_CODES.map((g) => (
          <div key={g} className="mb-20 md:mb-40">
            <div className="flex items-center gap-4 mb-8 md:mb-12">
              <div className="h-px flex-grow bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
              <h2 className="text-2xl md:text-4xl font-black italic uppercase text-white tracking-[0.2em] md:tracking-[0.3em]">
                GRUPP {g}
              </h2>
              <div className="h-px flex-grow bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
            </div>

            <div className="grid lg:grid-cols-[1fr_340px] gap-8 md:gap-12 items-start">
              <div className="space-y-8 md:space-y-12">
                <div className="space-y-4">
                  {worldCup2026Matches
                    .filter((m) => m.group === g)
                    .map((m) => (
                      <div key={m.id} className="group">
                        <div className="flex justify-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-white/60 mb-1.5 italic">
                          <span className="bg-white/5 px-3 py-0.5 rounded-full">
                            {formatMatchDateTime(m.dateUtc)} - {m.city} - {m.stadium}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                          {getFlag(m.home.name) && (
                            <img
                              src={getFlag(m.home.name)!}
                              className="w-6 h-4 md:w-8 md:h-5 object-cover rounded shadow-lg"
                              alt=""
                            />
                          )}
                          <div className="relative flex-grow h-10 md:h-12 overflow-hidden rounded-full border border-white/10 bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-xl">
                            <div className="px-3 md:px-6 flex items-center justify-between gap-1 md:gap-4 h-full text-black">
                              <span className="text-[10px] md:text-base font-black italic uppercase tracking-tighter truncate w-[35%]">
                                {m.home.name}
                              </span>
                              <div className="flex gap-1 md:gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className="w-7 h-7 md:w-9 md:h-9 bg-black/10 border border-black/10 rounded-lg text-center text-sm md:text-lg font-black outline-none"
                                  value={groupResults[m.id]?.h || ""}
                                  onChange={(e) =>
                                    handleScoreChange(m.id, "h", e.target.value)
                                  }
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className="w-7 h-7 md:w-9 md:h-9 bg-black/10 border border-black/10 rounded-lg text-center text-sm md:text-lg font-black outline-none"
                                  value={groupResults[m.id]?.a || ""}
                                  onChange={(e) =>
                                    handleScoreChange(m.id, "a", e.target.value)
                                  }
                                />
                              </div>
                              <span className="text-[10px] md:text-base font-black italic uppercase tracking-tighter truncate w-[35%] text-right">
                                {m.away.name}
                              </span>
                            </div>
                          </div>
                          {getFlag(m.away.name) && (
                            <img
                              src={getFlag(m.away.name)!}
                              className="w-6 h-4 md:w-8 md:h-5 object-cover rounded shadow-lg"
                              alt=""
                            />
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="bg-white/5 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 border border-white/5 backdrop-blur-sm overflow-x-hidden">
                  <h4 className="text-center font-black italic uppercase tracking-widest text-[10px] mb-4 md:mb-6 text-white/30">
                    LIVE-TABELL
                  </h4>
                  <div className="space-y-2">
                    {calculateStandings(g).map((t: any, i: number) => (
                      <div
                        key={t.name}
                        className={`flex items-center px-3 py-2 md:px-4 md:py-3 rounded-full ${
                          i < 2
                            ? "bg-blue-600/10 border border-blue-500/20 text-white shadow-lg"
                            : "text-white/30"
                        }`}
                      >
                        <span className="w-5 md:w-6 text-[10px] font-black italic opacity-40">
                          {i + 1}
                        </span>
                        <span className="flex-grow font-black italic uppercase text-[11px] md:text-sm truncate">
                          {t.name}
                        </span>
                        <span className="w-8 md:w-12 text-center font-bold text-[10px] md:text-xs">
                          {t.gd > 0 ? `+${t.gd}` : t.gd}
                        </span>
                        <span className="w-8 md:w-12 text-center font-black text-yellow-400 text-sm md:text-lg">
                          {t.pts}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:sticky lg:top-32 mt-8 lg:mt-0">
                <div className="bg-gradient-to-br from-blue-900/40 to-black p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full"></div>
                  <div className="flex items-center gap-2 mb-4 md:mb-6">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <h3 className="text-[10px] font-black italic uppercase text-blue-400 tracking-widest">
                      WULFENS ANALYS
                    </h3>
                  </div>
                  <p className="text-xs md:text-sm font-bold italic leading-relaxed text-white/80">
                    "
                    {groupFunFacts[g as keyof typeof groupFunFacts] ||
                      "Spännande grupp där allt kan hända!"}
                    "
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div id="slutspel" className="mt-10 md:mt-20 px-1">
          <div className="flex flex-col items-center mb-10 md:mb-16">
            <div className="flex items-center gap-4 md:gap-8 mb-6">
              <button
                onClick={() => setKoStep(Math.max(0, koStep - 1))}
                className="p-2 md:p-3 text-white/30 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <h2 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter text-center">
                {stages[koStep].title}
              </h2>
              <button
                onClick={goToNextKoStep}
                className="p-2 md:p-3 text-white/30 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div key={koStep} className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            {!areAllGroupsComplete() && (
              <div className="text-center bg-white/5 border border-white/10 rounded-[2rem] p-6 mb-6">
                <p className="text-blue-400 font-black italic uppercase tracking-widest text-xs">
                  Fyll i alla gruppspelsmatcher först
                </p>
                <p className="text-white/40 font-bold italic text-xs mt-2">
                  Slutspelet låses upp när alla grupper är färdigtippade.
                </p>
              </div>
            )}

            {getStageMatches(stages[koStep].id).map((m) => {
                const h = getDisplayTeam(m, "home");
                const a = getDisplayTeam(m, "away");
                const win = koWinners[m.id];
                const isFinal = m.stage === "FINAL";
                const hIsPlaceholder = isPlaceholderTeam(h);
                const aIsPlaceholder = isPlaceholderTeam(a);

                return (
                  <div key={m.id} className="group">
                    <div className="flex justify-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-white/50 mb-2 italic">
                      <span className="bg-black/40 px-3 py-0.5 rounded-full border border-white/5 shadow-sm">
                        {isFinal
                          ? `VM-FINAL - ${formatMatchDateTime(m.dateUtc)} - ${m.city} - ${m.stadium}`
                          : `${formatMatchDateTime(m.dateUtc)} - ${m.city} - ${m.stadium}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                      {getFlag(h) && (
                        <img
                          src={getFlag(h)!}
                          className="w-6 h-4 md:w-8 md:h-5 object-cover rounded shadow-md"
                          alt=""
                        />
                      )}

                      <div
                        className={`relative flex-grow h-12 md:h-14 overflow-hidden rounded-full border shadow-xl flex items-center px-1 ${
                          isFinal
                            ? "border-yellow-500 bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                            : "border-white/20 bg-gradient-to-b from-[#f3f4f6] to-[#9ca3af]"
                        }`}
                      >
                        <button
                          onClick={() => selectKoWinner(m.id, h)}
                          disabled={hIsPlaceholder}
                          className={`flex-1 h-10 md:h-11 mx-1 rounded-full font-black italic uppercase text-[9px] md:text-xs transition-all flex items-center justify-center gap-1 md:gap-2 disabled:opacity-30 ${
                            win === h
                              ? "bg-black text-white"
                              : "bg-black/5 text-black hover:bg-black/20"
                          }`}
                        >
                          <span className="truncate">{h}</span>
                          {win === h && (
                            <span className="text-green-400 text-sm md:text-lg">●</span>
                          )}
                        </button>

                        <div className="px-0.5 md:px-1 font-black italic text-[9px] md:text-[10px] text-black/20">
                          VS
                        </div>

                        <button
                          onClick={() => selectKoWinner(m.id, a)}
                          disabled={aIsPlaceholder}
                          className={`flex-1 h-10 md:h-11 mx-1 rounded-full font-black italic uppercase text-[9px] md:text-xs transition-all flex items-center justify-center gap-1 md:gap-2 disabled:opacity-30 ${
                            win === a
                              ? "bg-black text-white"
                              : "bg-black/5 text-black hover:bg-black/20"
                          }`}
                        >
                          {win === a && (
                            <span className="text-green-400 text-sm md:text-lg">●</span>
                          )}
                          <span className="truncate">{a}</span>
                        </button>
                      </div>

                      {getFlag(a) && (
                        <img
                          src={getFlag(a)!}
                          className="w-6 h-4 md:w-8 md:h-5 object-cover rounded shadow-md"
                          alt=""
                        />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="max-w-3xl mx-auto mt-12 flex flex-col md:flex-row gap-4">
            {koStep > 0 && (
              <button
                onClick={() => setKoStep(Math.max(0, koStep - 1))}
                className="flex-1 py-5 bg-white/5 border border-white/10 rounded-[2rem] font-black italic uppercase hover:bg-white/10 transition-all"
              >
                ❮ Tillbaka
              </button>
            )}

            {koStep < 4 ? (
              <button
                onClick={goToNextKoStep}
                className="flex-1 py-5 bg-blue-600 rounded-[2rem] font-black italic uppercase hover:bg-blue-500 transition-all shadow-2xl"
              >
                Nästa runda ❯
              </button>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={submitTotalTip}
                className="flex-1 py-6 bg-yellow-400 text-black rounded-[2rem] font-black italic uppercase text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl disabled:opacity-40"
              >
                {isSubmitting ? "SKICKAR..." : "SKICKA IN TIPSET 🏆"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
