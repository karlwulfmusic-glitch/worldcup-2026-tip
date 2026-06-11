"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { worldCup2026Matches, GROUP_CODES } from "@/lib/worldcup2026";

const getStageKey = (matchId: string) => {
  if (matchId.startsWith("R32")) return "R32";
  if (matchId.startsWith("R16")) return "R16";
  if (matchId.startsWith("QF")) return "QF";
  if (matchId.startsWith("SF")) return "SF";
  if (matchId === "BM") return "BM";
  if (matchId === "FINAL") return "FINAL";
  return "";
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

  BM: { home: "SF-1", away: "SF-2", isLoser: true },
  FINAL: { home: "SF-1", away: "SF-2" },
};

const STAGE_ORDER: Record<string, number> = {
  G: 1,
  R32: 2,
  R16: 3,
  QF: 4,
  SF: 5,
  BM: 6,
  FINAL: 7,
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [actualResults, setActualResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [userPicks, setUserPicks] = useState<any[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel("leaderboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "actual_results" },
        () => fetchLeaderboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "picks" },
        () => fetchLeaderboard()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedUser || showInfo ? "hidden" : "unset";
  }, [selectedUser, showInfo]);

  const calculateStandings = (matches: any[], picks: any[]) => {
    const stats: Record<string, { pts: number; gd: number; gs: number }> = {};
    const groupMatches = matches.filter((m) => m.group);

    groupMatches.forEach((m) => {
      const p = picks.find((pick) => pick.match_id === m.id);

      if (
        !p ||
        p.predicted_home_goals === null ||
        p.predicted_home_goals === undefined
      ) {
        return;
      }

      const hG = Number(p.predicted_home_goals);
      const aG = Number(p.predicted_away_goals);

      if (!m.home?.name || !m.away?.name) return;

      if (!stats[m.home.name]) {
        stats[m.home.name] = { pts: 0, gd: 0, gs: 0 };
      }

      if (!stats[m.away.name]) {
        stats[m.away.name] = { pts: 0, gd: 0, gs: 0 };
      }

      stats[m.home.name].gs += hG;
      stats[m.away.name].gs += aG;

      stats[m.home.name].gd += hG - aG;
      stats[m.away.name].gd += aG - hG;

      if (hG > aG) {
        stats[m.home.name].pts += 3;
      } else if (hG < aG) {
        stats[m.away.name].pts += 3;
      } else {
        stats[m.home.name].pts += 1;
        stats[m.away.name].pts += 1;
      }
    });

    return Object.entries(stats)
      .sort(
        (a, b) =>
          b[1].pts - a[1].pts ||
          b[1].gd - a[1].gd ||
          b[1].gs - a[1].gs
      )
      .map((e) => e[0]);
  };

  const calculateGroupMatchPoints = (pick: any, actual: any) => {
    if (!actual || !actual.is_finished) return 0;

    const predHome = Number(pick.predicted_home_goals);
    const predAway = Number(pick.predicted_away_goals);
    const actHome = Number(actual.home_goals);
    const actAway = Number(actual.away_goals);

    if (
      Number.isNaN(predHome) ||
      Number.isNaN(predAway) ||
      Number.isNaN(actHome) ||
      Number.isNaN(actAway)
    ) {
      return 0;
    }

    let pts = 0;

    const actSign = actHome > actAway ? "1" : actHome < actAway ? "2" : "X";
    const predSign = predHome > predAway ? "1" : predHome < predAway ? "2" : "X";

    if (actSign === predSign) pts += 2;
    if (predHome === actHome) pts += 1;
    if (predAway === actAway) pts += 1;

    return pts;
  };

  const normalizeTeamName = (team: any) => {
    return String(team || "").trim().toLowerCase();
  };


  const calculateFinalTeamBonus = (picks: any[], actuals: any[]) => {
    const finalMatch = actuals.find((r) => r.match_id === "FINAL");

    if (!finalMatch || !finalMatch.is_finished) return 0;

    const actualFinalists = [finalMatch.home_name, finalMatch.away_name]
      .filter(Boolean)
      .map((team) => String(team).trim().toLowerCase());

    if (actualFinalists.length < 2) return 0;

    const userFinalists = picks
      .filter((p) => p.match_id === "SF-1" || p.match_id === "SF-2")
      .map((p) => p.winner_team)
      .filter(Boolean)
      .map((team) => String(team).trim().toLowerCase());

    const uniqueUserFinalists = [...new Set(userFinalists)];

    const correctFinalTeams = actualFinalists.filter((team) =>
      uniqueUserFinalists.includes(team)
    ).length;

    return correctFinalTeams * 10;
  };

  const fetchAllRows = async (tableName: string) => {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const rows = data || [];
      allRows = [...allRows, ...rows];

      if (rows.length < pageSize) break;

      from += pageSize;
    }

    return allRows;
  };

  const fetchLeaderboard = async () => {
    setLoading(true);

    try {
      const [allUsers, allResults, allPicks] = await Promise.all([
        fetchAllRows("users"),
        fetchAllRows("actual_results"),
        fetchAllRows("picks"),
      ]);

      setActualResults(allResults);

      const realGS: Record<string, string[]> = {};

      GROUP_CODES.forEach((c) => {
        const gm = worldCup2026Matches.filter((m) => m.group === c);

        const act = allResults
          .filter((r) => r.is_finished && r.match_id.startsWith(`G-${c}`))
          .map((r) => ({
            match_id: r.match_id,
            predicted_home_goals: r.home_goals,
            predicted_away_goals: r.away_goals,
          }));

        realGS[c] = calculateStandings(gm, act);
      });

      const formatted = [...allUsers]
        .map((u: any) => {
          const p = allPicks.filter((x) => x.user_id === u.id);

          let matchPts = 0;
          let groupPts = 0;
          let specialPts = 0;

          p.filter((x) => x.match_id.startsWith("G-")).forEach((x) => {
            const act = allResults.find((r) => r.match_id === x.match_id);
            matchPts += calculateGroupMatchPoints(x, act);
          });

          const knockoutStages = ["R32", "R16", "QF", "SF", "BM", "FINAL"];

          knockoutStages.forEach((stage) => {
            const stagePoints: Record<string, number> = {
              R32: 1,
              R16: 2,
              QF: 4,
              SF: 8,
              BM: 5,
              FINAL: 25,
            };

            const actualWinnersInStage = [
              ...new Set(
                allResults
                  .filter(
                    (r) =>
                      r.is_finished &&
                      r.winner_team &&
                      getStageKey(r.match_id) === stage
                  )
                  .map((r) => r.winner_team)
              ),
            ];

            const userPredictionsInStage = [
              ...new Set(
                p
                  .filter(
                    (x) =>
                      x.winner_team && getStageKey(x.match_id) === stage
                  )
                  .map((x) => x.winner_team)
              ),
            ];

            const normalizedUserPredictions = userPredictionsInStage.map(normalizeTeamName);

            actualWinnersInStage.forEach((winner) => {
              if (normalizedUserPredictions.includes(normalizeTeamName(winner))) {
                matchPts += stagePoints[stage] || 0;
              }
            });
          });

          GROUP_CODES.forEach((c) => {
            const groupMatches = worldCup2026Matches.filter(
              (m) => m.group === c
            );

            const finishedGroupMatches = allResults.filter(
              (r) => r.match_id.startsWith(`G-${c}`) && r.is_finished
            ).length;

            if (finishedGroupMatches < 6) return;

            calculateStandings(groupMatches, p).forEach((team, i) => {
              const rIdx = realGS[c] ? realGS[c].indexOf(team) : -1;

              if (rIdx === i) {
                groupPts += 2;
              } else if (i < 2 && rIdx < 2 && rIdx !== -1) {
                groupPts += 1;
              }
            });
          });

          specialPts += calculateFinalTeamBonus(p, allResults);

          const ts = allResults.find((r) => r.match_id === "TOP_SCORER");

          if (
            ts?.is_finished &&
            u.top_scorer_pick?.trim().toLowerCase() ===
              String(ts.home_name || "").trim().toLowerCase()
          ) {
            specialPts += 15;
          }

          return {
            ...u,
            total_points: matchPts + groupPts + specialPts,
            group_points: groupPts,
            bonus_points: specialPts,
            winner:
              p.find((x) => x.match_id === "FINAL")?.winner_team || "EJ VALD",
          };
        })
        .sort((a: any, b: any) => b.total_points - a.total_points);

      setLeaderboard([...formatted]);
    } catch (err) {
      console.error("LEADERBOARD FETCH ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowPicks = async (u: any) => {
    setLoadingPicks(true);
    setSelectedUser(u);

    const { data } = await supabase
      .from("picks")
      .select("*")
      .eq("user_id", u.id);

    if (data) {
      const sortedPicks = data.sort((a, b) => {
        const prefixA = a.match_id.split("-")[0];
        const prefixB = b.match_id.split("-")[0];

        const orderA = STAGE_ORDER[prefixA] || 99;
        const orderB = STAGE_ORDER[prefixB] || 99;

        if (orderA !== orderB) return orderA - orderB;

        return a.match_id.localeCompare(b.match_id, undefined, {
          numeric: true,
        });
      });

      setUserPicks(sortedPicks);
    }

    setLoadingPicks(false);
  };

  const calculateLiveMatchPoints = (p: any, act: any) => {
    let pts = 0;

    if (p.match_id.startsWith("G-")) {
      return calculateGroupMatchPoints(p, act);
    }

    if (!p.winner_team) return 0;

    const stage = getStageKey(p.match_id);

    const stagePoints: Record<string, number> = {
      R32: 1,
      R16: 2,
      QF: 4,
      SF: 8,
      BM: 5,
      FINAL: 25,
    };

    const actualWinnersInStage = actualResults
      .filter(
        (r) =>
          r.is_finished &&
          r.winner_team &&
          getStageKey(r.match_id) === stage
      )
      .map((r) => r.winner_team);

    return actualWinnersInStage
      .map(normalizeTeamName)
      .includes(normalizeTeamName(p.winner_team))
      ? stagePoints[stage] || 0
      : 0;
  };

  const getSimulatedMatchup = (matchId: string, picksSource: any[]) => {
    const getWinner = (id: string) =>
      picksSource.find((p) => p.match_id === id)?.winner_team || "?";

    const getLoser = (id: string) => {
      const match = picksSource.find((p) => p.match_id === id);
      const tree = KNOCKOUT_TREE[id];

      if (!match || !tree) return "?";

      const t1 = getWinner(tree.home);
      const t2 = getWinner(tree.away);

      if (t1 === "?" || t2 === "?" || !match.winner_team) return "?";

      return match.winner_team === t1 ? t2 : t1;
    };

    if (KNOCKOUT_TREE[matchId]) {
      const { home, away, isLoser } = KNOCKOUT_TREE[matchId];

      const teamA = isLoser ? getLoser(home) : getWinner(home);
      const teamB = isLoser ? getLoser(away) : getWinner(away);

      return `${teamA} - ${teamB}`;
    }

    return matchId.startsWith("R32") ? "Sextondelsfinal" : "Slutspel";
  };

  const getStageName = (matchId: string) => {
    if (matchId.startsWith("G-")) return "Gruppspel";
    if (matchId.startsWith("R32")) return "Sextondel";
    if (matchId.startsWith("R16")) return "Åttondel";
    if (matchId.startsWith("QF")) return "Kvartsfinal";
    if (matchId.startsWith("SF")) return "Semifinal";
    if (matchId === "BM") return "Bronsmatch";
    if (matchId === "FINAL") return "FINAL";
    return matchId;
  };

  const pot = leaderboard.length * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#00041a] flex items-center justify-center text-white font-sans font-black italic">
        LADDAR LIVE-DATA...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#00041a] text-white font-sans pb-20">
      <header className="p-4 flex justify-between items-center border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#00041a]/90">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">
          WULFENS <span className="text-blue-500">LIVE</span>
        </h1>

        <button
          onClick={() => setShowInfo(true)}
          className="bg-blue-600 px-4 py-1.5 rounded-full font-black uppercase italic text-[10px] tracking-widest"
        >
          Poäng & Regler
        </button>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 mt-10">
        <div className="text-center mb-10">
          <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-4">
            LEADERBOARD
          </h2>

          <div className="inline-block bg-white/5 border border-white/10 px-8 py-3 rounded-2xl backdrop-blur-sm">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">
              Total Potential Pot
            </p>
            <p className="text-3xl font-black italic">{pot} KR</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-3">
          {leaderboard.map((p, i) => {
            const pos = i + 1;
            const top = pos <= 3;

            const prize =
              pos === 1 ? pot * 0.6 : pos === 2 ? pot * 0.25 : pos === 3 ? pot * 0.15 : 0;

            return (
              <div
                key={p.id}
                onClick={() => handleShowPicks(p)}
                className="group cursor-pointer"
              >
                <div
                  className={`relative flex items-center rounded-2xl border transition-all active:scale-[0.99] ${
                    pos === 1
                      ? "h-24 border-yellow-500 bg-yellow-400 text-black"
                      : top
                        ? "h-20 border-slate-300 bg-slate-200 text-black"
                        : "h-16 border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="w-full px-8 flex items-center justify-between">
                    <div className="flex items-center gap-6 min-w-0 flex-1">
                      <span
                        className={`text-3xl font-black italic ${
                          top ? "opacity-30" : "text-blue-500 w-10"
                        }`}
                      >
                        #{pos}
                      </span>

                      <div className="truncate">
                        <p
                          className={`font-black italic uppercase leading-none truncate ${
                            top ? "text-2xl" : "text-lg"
                          }`}
                        >
                          {p.name}
                        </p>

                        <p
                          className={`text-[10px] font-black uppercase mt-1 truncate ${
                            top ? "text-black/60" : "text-white/40"
                          }`}
                        >
                          🏆 {p.winner} | ⚽ {p.top_scorer_pick || "EJ VALD"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-black italic leading-none ${
                          top ? "text-4xl" : "text-2xl text-blue-400"
                        }`}
                      >
                        {p.total_points}P
                      </div>

                      {top && (
                        <div className="text-[10px] font-black opacity-40 mt-1 uppercase tracking-tighter">
                          +{Math.floor(prize)} KR
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showInfo && (
        <div
          className="fixed inset-0 bg-[#00041a]/98 flex items-center justify-center p-4 z-[200] backdrop-blur-2xl"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-[#0b0d17] border border-white/10 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-3xl font-black italic uppercase text-blue-500 mb-8 tracking-tighter">
              POÄNGSYSTEM
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-green-400 font-black italic uppercase tracking-widest mb-3">
                  Gruppspel
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="font-bold italic">Rätt tecken</span>
                    <span className="font-black text-green-400">+2P</span>
                  </div>

                  <div className="flex justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="font-bold italic">Rätt hemmamål</span>
                    <span className="font-black text-green-400">+1P</span>
                  </div>

                  <div className="flex justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="font-bold italic">Rätt bortamål</span>
                    <span className="font-black text-green-400">+1P</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-blue-400 font-black italic uppercase tracking-widest mb-3">
                  Grupptabell
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                    <span className="font-bold italic">Exakt rätt placering</span>
                    <span className="font-black text-blue-400">+2P</span>
                  </div>

                  <div className="flex justify-between bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                    <span className="font-bold italic">
                      Rätt topp 2, fel ordning
                    </span>
                    <span className="font-black text-blue-400">+1P</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-orange-400 font-black italic uppercase tracking-widest mb-3">
                  Slutspel
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase text-white/40 font-black">
                      R32
                    </p>
                    <p className="text-2xl font-black italic text-orange-400">
                      +1P
                    </p>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase text-white/40 font-black">
                      R16
                    </p>
                    <p className="text-2xl font-black italic text-orange-400">
                      +2P
                    </p>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase text-white/40 font-black">
                      Kvartsfinal
                    </p>
                    <p className="text-2xl font-black italic text-orange-400">
                      +4P
                    </p>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase text-white/40 font-black">
                      Semifinal
                    </p>
                    <p className="text-2xl font-black italic text-orange-400">
                      +8P
                    </p>
                  </div>
                </div>

                <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex justify-between">
                  <span className="font-bold italic">
                    Rätt bronsmatchvinnare
                  </span>
                  <span className="font-black text-yellow-400">+5P</span>
                </div>

                <div className="mt-3 bg-green-500/10 border border-green-500/30 p-4 rounded-2xl flex justify-between">
                  <span className="font-bold italic">Rätt världsmästare</span>
                  <span className="font-black text-green-400">+25P</span>
                </div>
              </div>

              <div>
                <h4 className="text-yellow-400 font-black italic uppercase tracking-widest mb-3">
                  Specialpoäng
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl">
                    <span className="font-bold italic">Rätt lag till final</span>
                    <span className="font-black text-yellow-400">+10P / lag</span>
                  </div>

                  <div className="flex justify-between bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl">
                    <span className="font-bold italic">
                      Rätt skytteligavinnare
                    </span>
                    <span className="font-black text-yellow-400">+15P</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInfo(false)}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black italic uppercase transition-colors"
            >
              STÄNG
            </button>
          </div>
        </div>
      )}

      {selectedUser && (
        <div
          className="fixed inset-0 bg-[#00041a]/95 flex items-center justify-center p-4 z-[100] backdrop-blur-md"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-[#0b0d17] w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="border-l-8 border-blue-600 pl-4">
                <h2 className="text-3xl font-black italic uppercase leading-none">
                  {selectedUser.name}
                </h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                  Fullständigt tips & resultat
                </p>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 custom-scrollbar space-y-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                    Tabellpoäng
                  </span>
                  <div className="text-2xl font-black italic text-white mt-1">
                    +{selectedUser.group_points || 0}P
                  </div>
                </div>

                <div className="bg-yellow-600/10 border border-yellow-500/20 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">
                    Specialpoäng
                  </span>
                  <div className="text-2xl font-black italic text-white mt-1">
                    +{selectedUser.bonus_points || 0}P
                  </div>
                </div>
              </div>

              {loadingPicks ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead className="text-[9px] font-black text-white/20 uppercase tracking-widest sticky top-0 bg-[#0b0d17] z-10">
                      <tr>
                        <th className="px-4 py-2">Fas / Match</th>
                        <th className="px-4 py-2">Tippade Lag</th>
                        <th className="px-4 py-2 text-center">
                          Tippad Vinnare / Resultat
                        </th>
                        <th className="px-4 py-2 text-center">
                          Faktiskt Resultat
                        </th>
                        <th className="px-4 py-2 text-right">Poäng</th>
                      </tr>
                    </thead>

                    <tbody className="text-sm font-black italic uppercase">
                      {userPicks.map((p) => {
                        const m = worldCup2026Matches.find(
                          (x) => x.id === p.match_id
                        );

                        const a = actualResults.find(
                          (r) => r.match_id === p.match_id
                        );

                        const fin = a?.is_finished;
                        const isGroup = p.match_id.startsWith("G-");
                        const livePts = calculateLiveMatchPoints(p, a);

                        const userSimulatedMatchup = !isGroup
                          ? getSimulatedMatchup(p.match_id, userPicks)
                          : "";

                        return (
                          <tr
                            key={p.id}
                            className={`${
                              fin ? "bg-white/[0.04]" : "bg-white/[0.01] opacity-60"
                            } rounded-xl transition-all hover:bg-white/[0.06]`}
                          >
                            <td className="px-4 py-3 rounded-l-xl border-l border-y border-white/5">
                              <span className="text-[10px] text-blue-500 block mb-0.5">
                                {getStageName(p.match_id)}
                              </span>
                              <span className="text-xs text-white/40">
                                {p.match_id}
                              </span>
                            </td>

                            <td className="px-4 py-3 border-y border-white/5">
                              {isGroup ? (
                                <span>
                                  {m?.home?.name || "TBD"} -{" "}
                                  {m?.away?.name || "TBD"}
                                </span>
                              ) : (
                                <span className="text-orange-400/80 text-[11px] tracking-wide">
                                  {userSimulatedMatchup}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center border-y border-white/5">
                              {isGroup ? (
                                <span className="bg-black/40 px-3 py-1 rounded-lg border border-white/5 text-xs">
                                  {p.predicted_home_goals}-
                                  {p.predicted_away_goals}
                                </span>
                              ) : (
                                <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg border border-orange-500/30 text-xs shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                                  {p.winner_team || "EJ VALD"}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center border-y border-white/5">
                              <span
                                className={
                                  fin
                                    ? "text-blue-400 font-bold text-xs"
                                    : "text-white/10 text-xs"
                                }
                              >
                                {fin
                                  ? isGroup
                                    ? `${a.home_goals}-${a.away_goals}`
                                    : `Vinnare: ${a.winner_team || "TBD"}`
                                  : "Spelas ej än"}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right rounded-r-xl border-r border-y border-white/5 font-black text-xl">
                              <span
                                className={
                                  livePts > 0
                                    ? "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                                    : "text-white/20"
                                }
                              >
                                {livePts}
                              </span>
                              <span className="text-[9px] ml-1 opacity-40">
                                P
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}