"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { worldCup2026Matches, GROUP_CODES } from "@/lib/worldcup2026";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [actualResults, setActualResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [userPicks, setUserPicks] = useState<any[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);

  useEffect(() => { fetchLeaderboard(); }, []);
  useEffect(() => { document.body.style.overflow = (selectedUser || showInfo) ? 'hidden' : 'unset'; }, [selectedUser, showInfo]);

  const calculateStandings = (matches: any[], picks: any[]) => {
    const stats: Record<string, { pts: number; gd: number; gs: number }> = {};
    matches.forEach(m => {
      const p = picks.find(pick => pick.match_id === m.id);
      if (!p || p.predicted_home_goals === null) return;
      const hG = Number(p.predicted_home_goals), aG = Number(p.predicted_away_goals);
      if (!stats[m.home.name]) stats[m.home.name] = { pts: 0, gd: 0, gs: 0 };
      if (!stats[m.away.name]) stats[m.away.name] = { pts: 0, gd: 0, gs: 0 };
      stats[m.home.name].gs += hG; stats[m.away.name].gs += aG;
      stats[m.home.name].gd += (hG - aG); stats[m.away.name].gd += (aG - hG);
      if (hG > aG) stats[m.home.name].pts += 3; else if (hG < aG) stats[m.away.name].pts += 3; else { stats[m.home.name].pts += 1; stats[m.away.name].pts += 1; }
    });
    return Object.entries(stats).sort((a, b) => b[1].pts - a[1].pts || b[1].gd - a[1].gd || b[1].gs - a[1].gs).map(e => e[0]); 
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    const [uR, rR, pR] = await Promise.all([supabase.from('users').select('*'), supabase.from('actual_results').select('*'), supabase.from('picks').select('*')]);
    if (uR.data && rR.data && pR.data) {
      setActualResults(rR.data);
      const realGS: Record<string, string[]> = {};
      GROUP_CODES.forEach(c => {
        const gm = worldCup2026Matches.filter(m => m.group === c);
        const act = rR.data.filter(r => r.is_finished && r.match_id.startsWith(`G-${c}`)).map(r => ({ match_id: r.match_id, predicted_home_goals: r.home_goals, predicted_away_goals: r.away_goals }));
        realGS[c] = calculateStandings(gm, act);
      });

      const formatted = uR.data.map((u: any) => {
        const p = pR.data.filter(x => x.user_id === u.id);
        let pts = 0, sfWins = 0;
        p.forEach(x => {
          const act = rR.data.find(r => r.match_id === x.match_id);
          if (!act || !act.is_finished) return;
          if (x.match_id.startsWith('G-')) {
            if ((act.home_goals > act.away_goals ? '1' : act.home_goals < act.away_goals ? '2' : 'X') === (x.predicted_home_goals > x.predicted_away_goals ? '1' : x.predicted_home_goals < x.predicted_away_goals ? '2' : 'X')) pts += 2;
            if (Number(x.predicted_home_goals) === act.home_goals) pts += 1; if (Number(x.predicted_away_goals) === act.away_goals) pts += 1;
          } else if (x.winner_team === act.winner_team) {
            const m = x.match_id;
            pts += m.startsWith('R32') ? 1 : m.startsWith('R16') ? 2 : m.startsWith('QF') ? 4 : m.startsWith('BM') ? 5 : m.startsWith('SF') ? 8 : m === 'FINAL' ? 25 : 0;
            if (m.startsWith('SF')) sfWins++;
          }
        });
        GROUP_CODES.forEach(c => {
          if (rR.data.filter(r => r.match_id.startsWith(`G-${c}`) && r.is_finished).length < 6) return;
          calculateStandings(worldCup2026Matches.filter(m => m.group === c), p).forEach((team, i) => {
            const rIdx = realGS[c].indexOf(team);
            if (rIdx === i) pts += 2; else if (i < 2 && rIdx < 2) pts += 1;
          });
        });
        if (sfWins === 2) pts += 10;
        const ts = rR.data.find(r => r.match_id === 'TOP_SCORER');
        if (ts?.is_finished && u.top_scorer_pick && u.top_scorer_pick.trim().toLowerCase() === String(ts.home_name || "").trim().toLowerCase()) pts += 15;
        return { ...u, total_points: pts, winner: p.find(x => x.match_id === 'FINAL')?.winner_team || "EJ VALD" };
      }).sort((a: any, b: any) => b.total_points - a.total_points);
      setLeaderboard(formatted);
    }
    setLoading(false);
  };

  const handleShowPicks = async (u: any) => {
    setLoadingPicks(true); setSelectedUser(u);
    const { data } = await supabase.from('picks').select('*').eq('user_id', u.id);
    if (data) setUserPicks(data);
    setLoadingPicks(false);
  };

  const pot = leaderboard.length * 100;

  return (
    <main className="min-h-screen bg-[#00041a] text-white font-sans pb-20">
      <header className="p-4 flex justify-between items-center border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#00041a]/90">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">WULFENS <span className="text-blue-500">LIVE</span></h1>
        <button onClick={() => setShowInfo(true)} className="bg-blue-600 px-4 py-1.5 rounded-full font-black uppercase italic text-[10px] tracking-widest">Poäng & Regler</button>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 mt-10">
        <div className="text-center mb-10">
          <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-4">LEADERBOARD</h2>
          <div className="inline-block bg-white/5 border border-white/10 px-8 py-3 rounded-2xl backdrop-blur-sm">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Total Potential Pot</p>
            <p className="text-3xl font-black italic">{pot} KR</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-3">
          {leaderboard.map((p, i) => {
            const pos = i + 1; const top = pos <= 3;
            const prize = pos === 1 ? pot * 0.6 : pos === 2 ? pot * 0.25 : pos === 3 ? pot * 0.15 : 0;
            return (
              <div key={p.id} onClick={() => handleShowPicks(p)} className="group cursor-pointer">
                <div className={`relative flex items-center rounded-2xl border transition-all active:scale-[0.99] ${pos === 1 ? 'h-24 border-yellow-500 bg-yellow-400 text-black' : top ? 'h-20 border-slate-300 bg-slate-200 text-black' : 'h-16 border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                  <div className="w-full px-8 flex items-center justify-between">
                    <div className="flex items-center gap-6 min-w-0 flex-1">
                      <span className={`text-3xl font-black italic ${top ? 'opacity-30' : 'text-blue-500 w-10'}`}>#{pos}</span>
                      <div className="truncate">
                        <p className={`font-black italic uppercase leading-none truncate ${top ? 'text-2xl' : 'text-lg'}`}>{p.name}</p>
                        <p className={`text-[10px] font-black uppercase mt-1 truncate ${top ? 'text-black/60' : 'text-white/40'}`}>🏆 {p.winner} | ⚽ {p.top_scorer_pick || "EJ VALD"}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-black italic leading-none ${top ? 'text-4xl' : 'text-2xl text-blue-400'}`}>{p.total_points}P</div>
                      {top && <div className="text-[10px] font-black opacity-40 mt-1 uppercase tracking-tighter">+{Math.floor(prize)} KR</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showInfo && (
        <div className="fixed inset-0 bg-[#00041a]/98 flex items-center justify-center p-4 z-[200] backdrop-blur-2xl" onClick={() => setShowInfo(false)}>
          <div className="bg-[#0b0d17] border border-white/10 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-3xl font-black italic uppercase text-blue-500 mb-8 tracking-tighter">POÄNGSYSTEM</h3>
            <div className="space-y-6 font-black uppercase text-[11px]">
              <section className="space-y-3">
                <p className="text-blue-400 tracking-widest italic flex items-center gap-2"><span className="w-4 h-px bg-blue-400 opacity-50"></span> GRUPPSPEL</p>
                <div className="grid gap-2">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center"><span>Rätt Tecken (1X2)</span><span className="text-blue-400 text-lg">+2P</span></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center"><span>Rätt Målantal (per lag)</span><span className="text-blue-400 text-lg">+1P</span></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center"><span>Exakt Tabellplacering</span><span className="text-blue-400 text-lg">+2P</span></div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-green-400 tracking-widest italic flex items-center gap-2"><span className="w-4 h-px bg-green-400 opacity-50"></span> SLUTSPEL</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col"><span className="opacity-40 text-[9px]">R32 / R16</span><span className="text-green-400 text-lg">+1P / +2P</span></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col"><span className="opacity-40 text-[9px]">KVART / SEMI</span><span className="text-green-400 text-lg">+4P / +8P</span></div>
                  <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 text-orange-400 flex flex-col col-span-2"><span className="opacity-60 text-[9px]">BRONSMATCH (VINNARE)</span><span className="text-lg">+5P</span></div>
                  <div className="bg-green-500/10 p-5 rounded-xl border border-green-500/20 text-green-400 col-span-2 flex flex-col"><span className="opacity-60 text-[9px]">VÄRLDSMÄSTARE</span><span className="text-3xl">+25P</span></div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-yellow-500 tracking-widest italic flex items-center gap-2"><span className="w-4 h-px bg-yellow-500 opacity-50"></span> SPECIAL</p>
                <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 flex justify-between items-center"><span>Rätt Skytteligavinnare</span><span className="text-yellow-500 text-lg">+15P</span></div>
                <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-500/20 flex justify-between items-center"><span>Båda Finallagen Rätt</span><span className="text-blue-400 text-lg">+10P</span></div>
              </section>
            </div>
            <button onClick={() => setShowInfo(false)} className="mt-8 w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black italic uppercase transition-colors">STÄNG</button>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 bg-[#00041a]/95 flex items-center justify-center p-4 z-[100] backdrop-blur-md" onClick={() => setSelectedUser(null)}>
          <div className="bg-[#0b0d17] w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="border-l-8 border-blue-600 pl-4"><h2 className="text-3xl font-black italic uppercase leading-none">{selectedUser.name}</h2><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Fullständig rad & resultat</p></div>
              <button onClick={() => setSelectedUser(null)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">✕</button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead className="text-[9px] font-black text-white/20 uppercase tracking-widest sticky top-0 bg-[#0b0d17] z-10">
                  <tr><th className="px-4 py-2">Match</th><th className="px-4 py-2 text-center">Ditt Tips</th><th className="px-4 py-2 text-center">Facit</th><th className="px-4 py-2 text-right">Poäng</th></tr>
                </thead>
                <tbody className="text-sm font-black italic uppercase">
                  {userPicks.map((p) => {
                    const m = worldCup2026Matches.find(x => x.id === p.match_id); const a = actualResults.find(r => r.match_id === p.match_id); const fin = a?.is_finished;
                    return (
                      <tr key={p.id} className={`${fin ? 'bg-white/[0.03]' : 'opacity-20'} rounded-xl overflow-hidden`}>
                        <td className="px-4 py-3 rounded-l-xl border-l border-y border-white/5">
                          <span className="text-[8px] block text-blue-500 not-italic tracking-tighter mb-1">{p.match_id}</span>
                          <span className="truncate block max-w-[200px]">{m?.home.name} - {m?.away.name}</span>
                        </td>
                        <td className="px-4 py-3 text-center border-y border-white/5"><span className="bg-black/40 px-3 py-1 rounded-lg border border-white/5">{p.predicted_home_goals}-{p.predicted_away_goals}</span></td>
                        <td className="px-4 py-3 text-center border-y border-white/5"><span className={fin ? 'text-blue-400' : 'text-white/10'}>{fin ? `${a.home_goals}-${a.away_goals}` : '?-?'}</span></td>
                        <td className="px-4 py-3 text-right rounded-r-xl border-r border-y border-white/5 font-black text-lg">{fin ? (p.points || 0) : 0}<span className="text-[8px] ml-1 opacity-30">P</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}