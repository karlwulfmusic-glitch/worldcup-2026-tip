// 1. TYPER (Vi använder any på funktionerna för att tysta TypeScript vid deploy)
export type Team = { id: string; name: string; flagCode: string };

export type WorldCupMatch = {
  id: string;
  stage: "GROUP" | "R32" | "R16" | "QF" | "SF" | "BRONZE" | "FINAL";
  group?: string;
  dateUtc: string;
  city: string;
  stadium: string;
  home: Team;
  away: Team;
};

// Räknar ut tabellen - Fixad med :any för att slippa build-fel
export const calculateGroupTable = (picks: any, groupMatches: any) => {
  const table: any = {}; 
  
  groupMatches.forEach((m: any) => {
    const pick = picks.find((p: any) => p.match_id === m.id);
    if (!pick) return;

    const home = m.home.name;
    const away = m.away.name;

    if (!table[home]) table[home] = { pts: 0, gd: 0, gf: 0 };
    if (!table[away]) table[away] = { pts: 0, gd: 0, gf: 0 };

    const hg = pick.predicted_home_goals;
    const ag = pick.predicted_away_goals;

    if (hg !== null && ag !== null) {
      table[home].gf += hg;
      table[away].gf += ag;
      table[home].gd += (hg - ag);
      table[away].gd += (ag - hg);

      if (hg > ag) table[home].pts += 3;
      else if (hg < ag) table[away].pts += 3;
      else {
        table[home].pts += 1;
        table[away].pts += 1;
      }
    }
  });

  return Object.keys(table)
    .map(name => ({ name, ...table[name] }))
    .sort((a: any, b: any) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
};

export const TBD_TEAM: Team = { id: "TBD", name: "TBD", flagCode: "un" };

export type GroupCode = "A"|"B"|"C"|"D"|"E"|"F"|"G"|"H"|"I"|"J"|"K"|"L";
export const GROUP_CODES: GroupCode[] = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export const formatSwedishDateTime = (dateUtc: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateUtc));

// 2. ALLA LAG
export const teams: Record<string, Team> = {
  MEX: { id: "MEX", name: "Mexico", flagCode: "mx" }, RSA: { id: "RSA", name: "South Africa", flagCode: "za" },
  KOR: { id: "KOR", name: "Korea Republic", flagCode: "kr" }, CZE: { id: "CZE", name: "Czechia", flagCode: "cz" },
  CAN: { id: "CAN", name: "Canada", flagCode: "ca" }, BIH: { id: "BIH", name: "Bosnia & Herzegovina", flagCode: "ba" },
  QAT: { id: "QAT", name: "Qatar", flagCode: "qa" }, SUI: { id: "SUI", name: "Switzerland", flagCode: "ch" },
  BRA: { id: "BRA", name: "Brazil", flagCode: "br" }, MAR: { id: "MAR", name: "Morocco", flagCode: "ma" },
  HAI: { id: "HAI", name: "Haiti", flagCode: "ht" }, SCO: { id: "SCO", name: "Scotland", flagCode: "gb-sct" },
  USA: { id: "USA", name: "USA", flagCode: "us" }, PAR: { id: "PAR", name: "Paraguay", flagCode: "py" },
  AUS: { id: "AUS", name: "Australia", flagCode: "au" }, TUR: { id: "TUR", name: "Türkiye", flagCode: "tr" },
  GER: { id: "GER", name: "Germany", flagCode: "de" }, CUW: { id: "CUW", name: "Curaçao", flagCode: "cw" },
  CIV: { id: "CIV", name: "Côte d’Ivoire", flagCode: "ci" }, ECU: { id: "ECU", name: "Ecuador", flagCode: "ec" },
  NED: { id: "NED", name: "Netherlands", flagCode: "nl" }, JPN: { id: "JPN", name: "Japan", flagCode: "jp" },
  SWE: { id: "SWE", name: "Sweden", flagCode: "se" }, TUN: { id: "TUN", name: "Tunisia", flagCode: "tn" },
  BEL: { id: "BEL", name: "Belgium", flagCode: "be" }, EGY: { id: "EGY", name: "Egypt", flagCode: "eg" },
  IRN: { id: "IRN", name: "IR Iran", flagCode: "ir" }, NZL: { id: "NZL", name: "New Zealand", flagCode: "nz" },
  ESP: { id: "ESP", name: "Spain", flagCode: "es" }, CPV: { id: "CPV", name: "Cabo Verde", flagCode: "cv" },
  KSA: { id: "KSA", name: "Saudi Arabia", flagCode: "sa" }, URU: { id: "URU", name: "Uruguay", flagCode: "uy" },
  FRA: { id: "FRA", name: "France", flagCode: "fr" }, SEN: { id: "SEN", name: "Senegal", flagCode: "sn" },
  IRQ: { id: "IRQ", name: "Iraq", flagCode: "iq" }, NOR: { id: "NOR", name: "Norway", flagCode: "no" },
  ARG: { id: "ARG", name: "Argentina", flagCode: "ar" }, ALG: { id: "ALG", name: "Algeria", flagCode: "dz" },
  AUT: { id: "AUT", name: "Austria", flagCode: "at" }, JOR: { id: "JOR", name: "Jordan", flagCode: "jo" },
  POR: { id: "POR", name: "Portugal", flagCode: "pt" }, COD: { id: "COD", name: "Congo DR", flagCode: "cd" },
  UZB: { id: "UZB", name: "Uzbekistan", flagCode: "uz" }, COL: { id: "COL", name: "Colombia", flagCode: "co" },
  ENG: { id: "ENG", name: "England", flagCode: "gb-eng" }, CRO: { id: "CRO", name: "Croatia", flagCode: "hr" },
  GHA: { id: "GHA", name: "Ghana", flagCode: "gh" }, PAN: { id: "PAN", name: "Panama", flagCode: "pa" },
};

// 3. MATCHSCHEMA
export const worldCup2026Matches: WorldCupMatch[] = [
  { id: "G-A-1", stage: "GROUP", group: "A", dateUtc: "2026-06-12T00:00:00Z", city: "Mexico City", stadium: "Estadio Azteca", home: teams.MEX, away: teams.RSA },
  { id: "G-A-2", stage: "GROUP", group: "A", dateUtc: "2026-06-12T03:00:00Z", city: "Guadalajara", stadium: "Estadio Guadalajara", home: teams.KOR, away: teams.CZE },
  { id: "G-A-3", stage: "GROUP", group: "A", dateUtc: "2026-06-18T01:00:00Z", city: "Guadalajara", stadium: "Estadio Guadalajara", home: teams.MEX, away: teams.KOR },
  { id: "G-A-4", stage: "GROUP", group: "A", dateUtc: "2026-06-18T01:00:00Z", city: "Mexico City", stadium: "Estadio Azteca", home: teams.CZE, away: teams.RSA },
  { id: "G-A-5", stage: "GROUP", group: "A", dateUtc: "2026-06-25T01:00:00Z", city: "Mexico City", stadium: "Estadio Azteca", home: teams.CZE, away: teams.MEX },
  { id: "G-A-6", stage: "GROUP", group: "A", dateUtc: "2026-06-25T01:00:00Z", city: "Guadalajara", stadium: "Estadio Guadalajara", home: teams.RSA, away: teams.KOR },
  { id: "G-B-1", stage: "GROUP", group: "B", dateUtc: "2026-06-13T00:00:00Z", city: "Toronto", stadium: "BMO Field", home: teams.CAN, away: teams.BIH },
  { id: "G-B-2", stage: "GROUP", group: "B", dateUtc: "2026-06-13T22:00:00Z", city: "Vancouver", stadium: "BC Place", home: teams.QAT, away: teams.SUI },
  { id: "G-B-3", stage: "GROUP", group: "B", dateUtc: "2026-06-18T19:00:00Z", city: "Toronto", stadium: "BMO Field", home: teams.CAN, away: teams.QAT },
  { id: "G-B-4", stage: "GROUP", group: "B", dateUtc: "2026-06-19T00:00:00Z", city: "Vancouver", stadium: "BC Place", home: teams.SUI, away: teams.BIH },
  { id: "G-B-5", stage: "GROUP", group: "B", dateUtc: "2026-06-25T01:00:00Z", city: "Vancouver", stadium: "BC Place", home: teams.SUI, away: teams.CAN },
  { id: "G-B-6", stage: "GROUP", group: "B", dateUtc: "2026-06-25T01:00:00Z", city: "Toronto", stadium: "BMO Field", home: teams.BIH, away: teams.QAT },
  { id: "G-C-1", stage: "GROUP", group: "C", dateUtc: "2026-06-13T17:00:00Z", city: "Boston", stadium: "Gillette Stadium", home: teams.BRA, away: teams.MAR },
  { id: "G-C-2", stage: "GROUP", group: "C", dateUtc: "2026-06-13T20:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.HAI, away: teams.SCO },
  { id: "G-C-3", stage: "GROUP", group: "C", dateUtc: "2026-06-19T17:00:00Z", city: "Boston", stadium: "Gillette Stadium", home: teams.BRA, away: teams.HAI },
  { id: "G-C-4", stage: "GROUP", group: "C", dateUtc: "2026-06-19T20:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.SCO, away: teams.MAR },
  { id: "G-C-5", stage: "GROUP", group: "C", dateUtc: "2026-06-24T22:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.SCO, away: teams.BRA },
  { id: "G-C-6", stage: "GROUP", group: "C", dateUtc: "2026-06-24T22:00:00Z", city: "Boston", stadium: "Gillette Stadium", home: teams.MAR, away: teams.HAI },
  { id: "G-D-1", stage: "GROUP", group: "D", dateUtc: "2026-06-13T01:00:00Z", city: "Los Angeles", stadium: "SoFi Stadium", home: teams.USA, away: teams.PAR },
  { id: "G-D-2", stage: "GROUP", group: "D", dateUtc: "2026-06-14T19:00:00Z", city: "San Francisco", stadium: "Levi's Stadium", home: teams.AUS, away: teams.TUR },
  { id: "G-D-3", stage: "GROUP", group: "D", dateUtc: "2026-06-19T23:00:00Z", city: "Seattle", stadium: "Lumen Field", home: teams.USA, away: teams.AUS },
  { id: "G-D-4", stage: "GROUP", group: "D", dateUtc: "2026-06-20T02:00:00Z", city: "Los Angeles", stadium: "SoFi Stadium", home: teams.TUR, away: teams.PAR },
  { id: "G-D-5", stage: "GROUP", group: "D", dateUtc: "2026-06-25T23:00:00Z", city: "San Francisco", stadium: "Levi's Stadium", home: teams.TUR, away: teams.USA },
  { id: "G-D-6", stage: "GROUP", group: "D", dateUtc: "2026-06-25T23:00:00Z", city: "Seattle", stadium: "Lumen Field", home: teams.PAR, away: teams.AUS },
  { id: "G-E-1", stage: "GROUP", group: "E", dateUtc: "2026-06-14T17:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: teams.GER, away: teams.CUW },
  { id: "G-E-2", stage: "GROUP", group: "E", dateUtc: "2026-06-14T20:00:00Z", city: "Philadelphia", stadium: "Lincoln Financial Field", home: teams.CIV, away: teams.ECU },
  { id: "G-E-3", stage: "GROUP", group: "E", dateUtc: "2026-06-20T17:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: teams.GER, away: teams.CIV },
  { id: "G-E-4", stage: "GROUP", group: "E", dateUtc: "2026-06-20T20:00:00Z", city: "Philadelphia", stadium: "Lincoln Financial Field", home: teams.ECU, away: teams.CUW },
  { id: "G-E-5", stage: "GROUP", group: "E", dateUtc: "2026-06-24T19:00:00Z", city: "Philadelphia", stadium: "Lincoln Financial Field", home: teams.ECU, away: teams.GER },
  { id: "G-E-6", stage: "GROUP", group: "E", dateUtc: "2026-06-24T19:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: teams.CUW, away: teams.CIV },
  { id: "G-F-1", stage: "GROUP", group: "F", dateUtc: "2026-06-15T00:00:00Z", city: "Monterrey", stadium: "Estadio Monterrey", home: teams.NED, away: teams.JPN },
  { id: "G-F-2", stage: "GROUP", group: "F", dateUtc: "2026-06-15T03:00:00Z", city: "Mexico City", stadium: "Estadio Azteca", home: teams.SWE, away: teams.TUN },
  { id: "G-F-3", stage: "GROUP", group: "F", dateUtc: "2026-06-20T22:00:00Z", city: "Monterrey", stadium: "Estadio Monterrey", home: teams.NED, away: teams.SWE },
  { id: "G-F-4", stage: "GROUP", group: "F", dateUtc: "2026-06-21T01:00:00Z", city: "Guadalajara", stadium: "Estadio Guadalajara", home: teams.TUN, away: teams.JPN },
  { id: "G-F-5", stage: "GROUP", group: "F", dateUtc: "2026-06-24T22:00:00Z", city: "Monterrey", stadium: "Estadio Monterrey", home: teams.TUN, away: teams.NED },
  { id: "G-F-6", stage: "GROUP", group: "F", dateUtc: "2026-06-24T22:00:00Z", city: "Mexico City", stadium: "Estadio Azteca", home: teams.JPN, away: teams.SWE },
  { id: "G-G-1", stage: "GROUP", group: "G", dateUtc: "2026-06-15T19:00:00Z", city: "Los Angeles", stadium: "SoFi Stadium", home: teams.BEL, away: teams.EGY },
  { id: "G-G-2", stage: "GROUP", group: "G", dateUtc: "2026-06-15T22:00:00Z", city: "Seattle", stadium: "Lumen Field", home: teams.IRN, away: teams.NZL },
  { id: "G-G-3", stage: "GROUP", group: "G", dateUtc: "2026-06-21T19:00:00Z", city: "Los Angeles", stadium: "SoFi Stadium", home: teams.BEL, away: teams.IRN },
  { id: "G-G-4", stage: "GROUP", group: "G", dateUtc: "2026-06-21T22:00:00Z", city: "Seattle", stadium: "Lumen Field", home: teams.NZL, away: teams.EGY },
  { id: "G-G-5", stage: "GROUP", group: "G", dateUtc: "2026-06-26T21:00:00Z", city: "Seattle", stadium: "Lumen Field", home: teams.EGY, away: teams.IRN },
  { id: "G-G-6", stage: "GROUP", group: "G", dateUtc: "2026-06-26T21:00:00Z", city: "Los Angeles", stadium: "SoFi Stadium", home: teams.NZL, away: teams.BEL },
  { id: "G-H-1", stage: "GROUP", group: "H", dateUtc: "2026-06-16T17:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.KSA, away: teams.URU },
  { id: "G-H-2", stage: "GROUP", group: "H", dateUtc: "2026-06-16T20:00:00Z", city: "Houston", stadium: "NRG Stadium", home: teams.ESP, away: teams.CPV },
  { id: "G-H-3", stage: "GROUP", group: "H", dateUtc: "2026-06-22T17:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.URU, away: teams.CPV },
  { id: "G-H-4", stage: "GROUP", group: "H", dateUtc: "2026-06-22T20:00:00Z", city: "Houston", stadium: "NRG Stadium", home: teams.ESP, away: teams.KSA },
  { id: "G-H-5", stage: "GROUP", group: "H", dateUtc: "2026-06-26T23:00:00Z", city: "Houston", stadium: "NRG Stadium", home: teams.CPV, away: teams.KSA },
  { id: "G-H-6", stage: "GROUP", group: "H", dateUtc: "2026-06-26T23:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.URU, away: teams.ESP },
  { id: "G-I-1", stage: "GROUP", group: "I", dateUtc: "2026-06-16T23:00:00Z", city: "San Francisco", stadium: "Levi's Stadium", home: teams.FRA, away: teams.SEN },
  { id: "G-I-2", stage: "GROUP", group: "I", dateUtc: "2026-06-17T02:00:00Z", city: "Vancouver", stadium: "BC Place", home: teams.IRQ, away: teams.NOR },
  { id: "G-I-3", stage: "GROUP", group: "I", dateUtc: "2026-06-22T23:00:00Z", city: "San Francisco", stadium: "Levi's Stadium", home: teams.FRA, away: teams.IRQ },
  { id: "G-I-4", stage: "GROUP", group: "I", dateUtc: "2026-06-23T02:00:00Z", city: "Vancouver", stadium: "BC Place", home: teams.NOR, away: teams.SEN },
  { id: "G-I-5", stage: "GROUP", group: "I", dateUtc: "2026-06-27T21:00:00Z", city: "Vancouver", stadium: "BC Place", home: teams.NOR, away: teams.FRA },
  { id: "G-I-6", stage: "GROUP", group: "I", dateUtc: "2026-06-27T21:00:00Z", city: "San Francisco", stadium: "Levi's Stadium", home: teams.SEN, away: teams.IRQ },
  { id: "G-J-1", stage: "GROUP", group: "J", dateUtc: "2026-06-17T17:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: teams.ARG, away: teams.ALG },
  { id: "G-J-2", stage: "GROUP", group: "J", dateUtc: "2026-06-17T20:00:00Z", city: "Philadelphia", stadium: "Lincoln Financial Field", home: teams.AUT, away: teams.JOR },
  { id: "G-J-3", stage: "GROUP", group: "J", dateUtc: "2026-06-23T17:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: teams.ARG, away: teams.AUT },
  { id: "G-J-4", stage: "GROUP", group: "J", dateUtc: "2026-06-23T20:00:00Z", city: "Philadelphia", stadium: "Lincoln Financial Field", home: teams.JOR, away: teams.ALG },
  { id: "G-J-5", stage: "GROUP", group: "J", dateUtc: "2026-06-27T23:00:00Z", city: "Philadelphia", stadium: "Lincoln Financial Field", home: teams.ALG, away: teams.AUT },
  { id: "G-J-6", stage: "GROUP", group: "J", dateUtc: "2026-06-27T23:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: teams.JOR, away: teams.ARG },
  { id: "G-K-1", stage: "GROUP", group: "K", dateUtc: "2026-06-17T23:00:00Z", city: "Houston", stadium: "NRG Stadium", home: teams.POR, away: teams.COD },
  { id: "G-K-2", stage: "GROUP", group: "K", dateUtc: "2026-06-18T02:00:00Z", city: "Dallas", stadium: "AT&T Stadium", home: teams.UZB, away: teams.COL },
  { id: "G-K-3", stage: "GROUP", group: "K", dateUtc: "2026-06-23T23:00:00Z", city: "Houston", stadium: "NRG Stadium", home: teams.POR, away: teams.UZB },
  { id: "G-K-4", stage: "GROUP", group: "K", dateUtc: "2026-06-24T02:00:00Z", city: "Dallas", stadium: "AT&T Stadium", home: teams.COL, away: teams.COD },
  { id: "G-K-5", stage: "GROUP", group: "K", dateUtc: "2026-06-28T19:00:00Z", city: "Dallas", stadium: "AT&T Stadium", home: teams.COL, away: teams.POR },
  { id: "G-K-6", stage: "GROUP", group: "K", dateUtc: "2026-06-28T19:00:00Z", city: "Houston", stadium: "NRG Stadium", home: teams.COD, away: teams.UZB },
  { id: "G-L-1", stage: "GROUP", group: "L", dateUtc: "2026-06-18T17:00:00Z", city: "Atlanta", stadium: "Mercedes-Benz Stadium", home: teams.GHA, away: teams.PAN },
  { id: "G-L-2", stage: "GROUP", group: "L", dateUtc: "2026-06-18T20:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.ENG, away: teams.CRO },
  { id: "G-L-3", stage: "GROUP", group: "L", dateUtc: "2026-06-24T17:00:00Z", city: "Atlanta", stadium: "Mercedes-Benz Stadium", home: teams.ENG, away: teams.GHA },
  { id: "G-L-4", stage: "GROUP", group: "L", dateUtc: "2026-06-24T20:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.PAN, away: teams.CRO },
  { id: "G-L-5", stage: "GROUP", group: "L", dateUtc: "2026-06-28T22:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: teams.PAN, away: teams.ENG },
  { id: "G-L-6", stage: "GROUP", group: "L", dateUtc: "2026-06-28T22:00:00Z", city: "Atlanta", stadium: "Mercedes-Benz Stadium", home: teams.CRO, away: teams.GHA },

  // --- ROUND OF 32 (Sextondelsfinaler) ---
  { id: "R32-1", stage: "R32", dateUtc: "2026-06-29T00:00:00Z", city: "Los Angeles", stadium: "SoFi Stadium", home: { ...TBD_TEAM, name: "1A" }, away: { ...TBD_TEAM, name: "3C" } },
  { id: "R32-2", stage: "R32", dateUtc: "2026-06-29T21:00:00Z", city: "Boston", stadium: "Gillette Stadium", home: { ...TBD_TEAM, name: "1E" }, away: { ...TBD_TEAM, name: "3A" } },
  { id: "R32-3", stage: "R32", dateUtc: "2026-06-30T01:00:00Z", city: "Monterrey", stadium: "Estadio Monterrey", home: { ...TBD_TEAM, name: "1F" }, away: { ...TBD_TEAM, name: "2C" } },
  { id: "R32-4", stage: "R32", dateUtc: "2026-06-30T19:00:00Z", city: "Washington DC", stadium: "Audi Field", home: { ...TBD_TEAM, name: "2E" }, away: { ...TBD_TEAM, name: "2I" } },
  { id: "R32-5", stage: "R32", dateUtc: "2026-06-30T22:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: { ...TBD_TEAM, name: "1I" }, away: { ...TBD_TEAM, name: "3D" } },
  { id: "R32-6", stage: "R32", dateUtc: "2026-07-01T01:00:00Z", city: "Mexico City", stadium: "Estadio Azteca", home: { ...TBD_TEAM, name: "2A" }, away: { ...TBD_TEAM, name: "2B" } },
  { id: "R32-7", stage: "R32", dateUtc: "2026-07-01T18:00:00Z", city: "Seattle", stadium: "Lumen Field", home: { ...TBD_TEAM, name: "1D" }, away: { ...TBD_TEAM, name: "3B" } },
  { id: "R32-8", stage: "R32", dateUtc: "2026-07-01T21:00:00Z", city: "San Francisco", stadium: "Levi's Stadium", home: { ...TBD_TEAM, name: "1G" }, away: { ...TBD_TEAM, name: "3A" } },
  { id: "R32-9", stage: "R32", dateUtc: "2026-07-02T18:00:00Z", city: "Atlanta", stadium: "Mercedes-Benz Stadium", home: { ...TBD_TEAM, name: "1L" }, away: { ...TBD_TEAM, name: "3E" } },
  { id: "R32-10", stage: "R32", dateUtc: "2026-07-02T21:00:00Z", city: "Houston", stadium: "NRG Stadium", home: { ...TBD_TEAM, name: "1J" }, away: { ...TBD_TEAM, name: "2H" } },
  { id: "R32-11", stage: "R32", dateUtc: "2026-07-03T18:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: { ...TBD_TEAM, name: "1B" }, away: { ...TBD_TEAM, name: "3F" } },
  { id: "R32-12", stage: "R32", dateUtc: "2026-07-03T21:00:00Z", city: "Dallas", stadium: "AT&T Stadium", home: { ...TBD_TEAM, name: "2G" }, away: { ...TBD_TEAM, name: "2L" } },
  { id: "R32-13", stage: "R32", dateUtc: "2026-07-03T00:00:00Z", city: "Kansas City", stadium: "Arrowhead Stadium", home: { ...TBD_TEAM, name: "1K" }, away: { ...TBD_TEAM, name: "3G" } },
  { id: "R32-14", stage: "R32", dateUtc: "2026-07-04T18:00:00Z", city: "Toronto", stadium: "BMO Field", home: { ...TBD_TEAM, name: "1H" }, away: { ...TBD_TEAM, name: "2J" } },
  { id: "R32-15", stage: "R32", dateUtc: "2026-07-04T21:00:00Z", city: "Philadelphia", stadium: "Lincoln Financial Field", home: { ...TBD_TEAM, name: "1C" }, away: { ...TBD_TEAM, name: "2D" } },
  { id: "R32-16", stage: "R32", dateUtc: "2026-07-04T00:00:00Z", city: "Vancouver", stadium: "BC Place", home: { ...TBD_TEAM, name: "2K" }, away: { ...TBD_TEAM, name: "2F" } },

  // --- ROUND OF 16 (Åttondelsfinaler) ---
  { id: "R16-1", stage: "R16", dateUtc: "2026-07-04T20:00:00Z", city: "Philadelphia", stadium: "Lincoln Financial Field", home: { ...TBD_TEAM, name: "Vinnare R32-1" }, away: { ...TBD_TEAM, name: "Vinnare R32-2" } },
  { id: "R16-2", stage: "R16", dateUtc: "2026-07-04T23:00:00Z", city: "Houston", stadium: "NRG Stadium", home: { ...TBD_TEAM, name: "Vinnare R32-3" }, away: { ...TBD_TEAM, name: "Vinnare R32-4" } },
  { id: "R16-3", stage: "R16", dateUtc: "2026-07-05T20:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: { ...TBD_TEAM, name: "Vinnare R32-5" }, away: { ...TBD_TEAM, name: "Vinnare R32-6" } },
  { id: "R16-4", stage: "R16", dateUtc: "2026-07-05T23:00:00Z", city: "Mexico City", stadium: "Estadio Azteca", home: { ...TBD_TEAM, name: "Vinnare R32-7" }, away: { ...TBD_TEAM, name: "Vinnare R32-8" } },
  { id: "R16-5", stage: "R16", dateUtc: "2026-07-06T20:00:00Z", city: "Dallas", stadium: "AT&T Stadium", home: { ...TBD_TEAM, name: "Vinnare R32-9" }, away: { ...TBD_TEAM, name: "Vinnare R32-10" } },
  { id: "R16-6", stage: "R16", dateUtc: "2026-07-06T23:00:00Z", city: "Seattle", stadium: "Lumen Field", home: { ...TBD_TEAM, name: "Vinnare R32-11" }, away: { ...TBD_TEAM, name: "Vinnare R32-12" } },
  { id: "R16-7", stage: "R16", dateUtc: "2026-07-07T20:00:00Z", city: "Atlanta", stadium: "Mercedes-Benz Stadium", home: { ...TBD_TEAM, name: "Vinnare R32-13" }, away: { ...TBD_TEAM, name: "Vinnare R32-14" } },
  { id: "R16-8", stage: "R16", dateUtc: "2026-07-07T23:00:00Z", city: "Vancouver", stadium: "BC Place", home: { ...TBD_TEAM, name: "Vinnare R32-15" }, away: { ...TBD_TEAM, name: "Vinnare R32-16" } },

  // --- QUARTER FINALS (Kvartsfinaler) ---
  { id: "QF-1", stage: "QF", dateUtc: "2026-07-09T21:00:00Z", city: "Boston", stadium: "Gillette Stadium", home: { ...TBD_TEAM, name: "Vinnare R16-1" }, away: { ...TBD_TEAM, name: "Vinnare R16-2" } },
  { id: "QF-2", stage: "QF", dateUtc: "2026-07-10T21:00:00Z", city: "Los Angeles", stadium: "SoFi Stadium", home: { ...TBD_TEAM, name: "Vinnare R16-3" }, away: { ...TBD_TEAM, name: "Vinnare R16-4" } },
  { id: "QF-3", stage: "QF", dateUtc: "2026-07-11T19:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: { ...TBD_TEAM, name: "Vinnare R16-5" }, away: { ...TBD_TEAM, name: "Vinnare R16-6" } },
  { id: "QF-4", stage: "QF", dateUtc: "2026-07-11T23:00:00Z", city: "Kansas City", stadium: "Arrowhead Stadium", home: { ...TBD_TEAM, name: "Vinnare R16-7" }, away: { ...TBD_TEAM, name: "Vinnare R16-8" } },

  // --- SEMI FINALS (Semifinaler) ---
  { id: "SF-1", stage: "SF", dateUtc: "2026-07-15T00:00:00Z", city: "Dallas", stadium: "AT&T Stadium", home: { ...TBD_TEAM, name: "Vinnare QF-1" }, away: { ...TBD_TEAM, name: "Vinnare QF-2" } },
  { id: "SF-2", stage: "SF", dateUtc: "2026-07-16T00:00:00Z", city: "Atlanta", stadium: "Mercedes-Benz Stadium", home: { ...TBD_TEAM, name: "Vinnare QF-3" }, away: { ...TBD_TEAM, name: "Vinnare QF-4" } },

  // --- BRONZE & FINAL ---
  { id: "BRONZE", stage: "BRONZE", dateUtc: "2026-07-18T20:00:00Z", city: "Miami", stadium: "Hard Rock Stadium", home: { ...TBD_TEAM, name: "Förlorare SF-1" }, away: { ...TBD_TEAM, name: "Förlorare SF-2" } },
  { id: "FINAL", stage: "FINAL", dateUtc: "2026-07-19T18:00:00Z", city: "New York NJ", stadium: "MetLife Stadium", home: { ...TBD_TEAM, name: "Vinnare SF-1" }, away: { ...TBD_TEAM, name: "Vinnare SF-2" } },
];
