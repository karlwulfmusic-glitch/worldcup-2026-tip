import { WorldCupMatch } from "./worldcup2026";

export type TableEntry = {
  teamName: string;
  pts: number;
  goalsFor: number;
  goalsAgainst: number;
  gd: number;
};

export const calculateTable = (groupMatches: WorldCupMatch[], results: any[]) => {
  const table: Record<string, TableEntry> = {};

  groupMatches.forEach((m) => {
    const res = results.find((r) => r.match_id === m.id);
    if (!res || res.home_goals === null) return;

    const teamsInMatch = [
      { name: m.home.name, score: res.home_goals, oppScore: res.away_goals },
      { name: m.away.name, score: res.away_goals, oppScore: res.home_goals },
    ];

    teamsInMatch.forEach((t) => {
      if (!table[t.name]) {
        table[t.name] = { teamName: t.name, pts: 0, goalsFor: 0, goalsAgainst: 0, gd: 0 };
      }
      table[t.name].goalsFor += t.score;
      table[t.name].goalsAgainst += t.oppScore;
      table[t.name].gd = table[t.name].goalsFor - table[t.name].goalsAgainst;

      if (t.score > t.oppScore) table[t.name].pts += 3;
      else if (t.score === t.oppScore) table[t.name].pts += 1;
    });
  });

  // Sortering: 1. Poäng, 2. Målskillnad, 3. Gjorda mål
  return Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.goalsFor - a.goalsFor;
  });
};