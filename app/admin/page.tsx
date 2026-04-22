"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { worldCup2026Matches, GROUP_CODES } from "@/lib/worldcup2026";
import Link from "next/link";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [actualResults, setActualResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userPicks, setUserPicks] = useState<any[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);

  useEffect(() => { fetchLeaderboard(); }, []);

  // Förhindra scroll när modalen är öppen
  useEffect(() => {
    document.body.style.overflow = selectedUser ? 'hidden' : 'unset';
  }, [selectedUser]);

  const calculateStandings = (matches: any[], picks: any[]) => {
    const stats: Record<string, { pts: number; gd: number; gs: number }> = {};
    matches.forEach(m => {
      const p = picks.find(pick => pick.match_id === m.id);
      if (!p || p.predicted_home_goals === null || p.predicted_home_goals === undefined) return;
      const hG = Number(p.predicted_home_goals);
      const aG = Number(p.predicted_away_goals);
      if (!stats[m.home.name]) stats[m.home.name] = { pts: 0, gd: 0, gs: 0 };
      if (!stats[m.away.name]) stats[m.away.name] = { pts: 0, gd: 0, gs: 0 };
      stats[m.home.name].gs += hG;
      stats[m.away.name].gs += aG;
      stats[m.home.name].gd += (hG - aG);
      stats[m.away.name].gd += (aG - hG);
      if (hG > aG) stats[m.home.name].pts += 3;
      else if (hG < aG) stats[m.away.name].pts += 3;
      else { stats[m.home.name].pts += 1; stats[m.away.name].pts += 1; }
    });
    return Object.entries(stats)
      .sort((a, b) => b[1].pts - a[1].pts || b[1].gd - a[1].gd || b[1].gs - a[1].gs)
      .map(entry => entry[0]); 
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    const [usersRes, resultsRes, picksRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('actual_results').select('*'),
      supabase.from('picks').select('*')
    ]);

    if (usersRes.data && resultsRes.data && picksRes.data) {
      setActualResults(resultsRes.data);
      const realGroupStandings: Record<string, string[]> = {};
      
      GROUP_CODES.forEach(code => {
        const groupMatches = worldCup2026Matches.filter(m => m.group === code);
        const actualAsPicks = resultsRes.data
          .filter(r => r.is_finished && r.match_id.startsWith(`G-${code}`))
          .map(r => ({ match_id: r.match_id, predicted_home_goals: r.home_goals, predicted_away_goals: r.away_goals }));
        realGroupStandings[code] = calculateStandings(groupMatches, actualAsPicks);
      });

      const formattedData = usersRes.data.map((user: any) => {
        const p = picksRes.data.filter(pick => pick.user_id === user.id);
        const winnerPick = p.find(pick => pick.match_id === 'FINAL')?.winner_team || "EJ VALD";
        
        let pts = 0;
        let sfWins = 0;

        // 1. Matchpoäng (Sign + Mål)
        p.forEach(pick => {
          const act = resultsRes.data.find(r => r.match_id === pick.match_id);
          if (!act || !act.is_finished) return;
          
          if (pick.match_id.startsWith('G-')) {
            const actSign = act.home_goals > act.away_goals ? '1' : act.home_goals < act.away_goals ? '2' : 'X';
            const predSign = pick.predicted_home_goals > pick.predicted_away_goals ? '1' : pick.predicted_home_goals < pick.predicted_away_goals ? '2' : 'X';
            if (actSign === predSign) pts += 2;
            if (Number(pick.predicted_home_goals) === act.home_goals) pts += 1; 
            if (Number(pick.predicted_away_goals) === act.away_goals) pts += 1;
          }

          // 2. Slutspels-avancemang + Brons
          if (pick.winner_team && (act.winner_team === pick.winner_team)) {
            if (pick.match_id.startsWith('R32')) pts += 1;
            else if (pick.match_id.startsWith('R16')) pts += 2;
            else if (pick.match_id.startsWith('QF')) pts += 4;
            else if (pick.match_id.startsWith('BM')) pts += 5; // BRONS TILLAGD
            else if (pick.match_id.startsWith('SF')) { pts += 8; sfWins++; }
            else if (pick.match_id === 'FINAL') pts += 25;
          }
        });

        // 3. Grupptabellspoäng (2p för exakt rätt, 1p för topp 2)
        GROUP_CODES.forEach(code => {
          const realArr = realGroupStandings[code];
          const finishedInGroup = resultsRes.data.filter(r => r.match_id.startsWith(`G-${code}`) && r.is_finished).length;
          if (finishedInGroup < 6) return;
          const groupMatches = worldCup2026Matches.filter(m => m.group === code);
          const userArr = calculateStandings(groupMatches, p);
          userArr.forEach((teamName, index) => {
            const realIdx = realArr.indexOf(teamName);
            if (realIdx === index) pts += 2; 
            else if (index < 2 && realIdx < 2) pts += 1;
          });
        });

        if (sfWins === 2) pts += 10;

        // 4. Skytteliga
        const topScorerFacit = resultsRes.data.find(r => r.match_id === 'TOP_SCORER');
        if (topScorerFacit && topScorerFacit.is_finished && user.top_scorer_pick) {
          const userPick = user.top_scorer_pick.trim().toLowerCase();
          const actualWinner = String(topScorerFacit.home_name || "").trim().toLowerCase();
          if (userPick === actualWinner && actualWinner !== "") pts += 15;
        }

        return { ...user, total_points: pts, predicted_winner: winnerPick };
      }).sort((a: any, b: any) => b.total_points - a.total_points);
      
      setLeaderboard(formattedData);
    }
    setLoading(false);
  };

  const handleShowPicks = async (user: any) => {
    setLoadingPicks(true);
    setSelectedUser(user);
    const { data } = await supabase.from('picks').select('*').eq('user_id', user.id);
    if (data) setUserPicks(data);
    setLoadingPicks(false);
  };

  const totalPot = leaderboard.length * 100;

  return (
    <main className="min-h-screen bg-[#00041a] text-white font-sans pb-40">
      <header className="p-4 flex justify-between items-start border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-[#00041a]/90">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase">WULFENS <span className="text-blue-500">LIVE</span></h1>
        <div className="text-right">
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">REALTIME SYNC</p>
          <p className="text-sm font-black italic uppercase leading-none">VM-TABELLEN 2026</p>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 mt-12">
        <div className="flex items-center gap-4 mb-16">
            <div className="h-px flex-grow bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
            <h2 className="text-5xl md:text-7xl font-black italic uppercase text-white tracking-[0.2em]">LEADERBOARD</h2>
            <div className="h-px flex-grow bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {leaderboard.map((player, index) => {
            const pos = index + 1;
            const isTop3 = pos <= 3;
            const prizeMoney = pos === 1 ? totalPot * 0.60 : pos === 2 ? totalPot * 0.25 : pos === 3 ? totalPot * 0.15 : 0;

            return (
              <div key={player.id} onClick={() => handleShowPicks(player)} className="group cursor-pointer">
                <div className={`relative flex items-center overflow-hidden rounded-full border transition-all active:scale-95 group-hover:scale-[1.02] ${isTop3 ? 'h-24' : 'h-16 opacity-80'}
                  ${pos === 1 ? 'border-yellow-500 bg-yellow-400 text-black shadow-[0_0_30px_rgba(234,179,8,0.2)]' : pos === 2 ? 'border-slate-300 bg-slate-300 text-black' : pos === 3 ? 'border-[#cd7f32] bg-[#cd7f32] text-black' : 'border-white/10 bg-white/5'}`}>
                  <div className="w-full px-8 flex items-center justify-between">
                    <span className="text-4xl font-black italic tracking-tighter">#{pos}</span>
                    <div className="flex flex-col flex-grow ml-6">
                      <p className={`font-black italic uppercase leading-tight ${isTop3 ? 'text-2xl' : 'text-lg'}`}>{player.name}</p>
                      <p className={`text-[10px] font-bold uppercase ${isTop3 ? 'text-black/50' : 'text-white/40'}`}>Vinnare: {player.predicted_winner}</p>
                    </div>
                    <div className="text-right">
                      <div className={`font-black italic leading-none ${isTop3 ? 'text-3xl' : 'text-xl text-blue-400'}`}>{player.total_points}P</div>
                      {isTop3 && <div className="text-[10px] font-black opacity-40 uppercase mt-1 tracking-tighter">+ {Math.floor(prizeMoney)} KR</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL / POPUP */}
        {selectedUser && (
          <div className="fixed inset-0 bg-[#00041a]/98 flex items-center justify-center p-4 z-[100] backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setSelectedUser(null)}>
            <div className="bg-[#0b0d17] border border-white/10 w-full max-w-2xl rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              
              {/* Header */}
              <div className="flex justify-between items-start mb-6 border-l-[12px] border-blue-600 pl-6">
                <div>
                  <h2 className="text-4xl font-black uppercase italic text-white leading-tight tracking-tighter">{selectedUser.name}</h2>
                  <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mt-1 italic">Poängbevis & Tipsrad</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="bg-white text-black w-10 h-10 rounded-full font-black flex items-center justify-center hover:rotate-90 transition-all">✕</button>
              </div>

              <div className="overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                
                {/* 1. BONUSPOÄNG SEKTION */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-3xl">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Tabellpoäng</span>
                      <span className="text-2xl font-black italic text-white leading-none">+{selectedUser.group_points || 0}</span>
                    </div>
                    <p className="text-[9px] text-white/40 mt-1 uppercase font-bold tracking-tighter italic">Poäng från grupplaceringar</p>
                  </div>
                  <div className="bg-yellow-600/10 border border-yellow-500/20 p-4 rounded-3xl">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">Skytteliga</span>
                      <span className="text-2xl font-black italic text-white leading-none">+{selectedUser.bonus_points || 0}</span>
                    </div>
                    <p className="text-[9px] text-white/40 mt-1 uppercase font-bold tracking-tighter italic">Val: {selectedUser.top_scorer_pick || "Ej vald"}</p>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full my-4"></div>

                {/* 2. MATCHER SEKTION */}
                <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] text-center mb-4 italic">Matchspecifikation</h3>
                
                {loadingPicks ? (
                  <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                ) : (
                  userPicks.map((p: any) => {
                    const matchInfo = worldCup2026Matches.find(m => m.id === p.match_id);
                    const act = actualResults.find(r => r.match_id === p.match_id);
                    let breakdown = [];

                    if (act && act.is_finished) {
                      if (p.match_id.startsWith('G-')) {
                        const actSign = act.home_goals > act.away_goals ? '1' : act.home_goals < act.away_goals ? '2' : 'X';
                        const predSign = p.predicted_home_goals > p.predicted_away_goals ? '1' : p.predicted_home_goals < p.predicted_away_goals ? '2' : 'X';
                        if (actSign === predSign) breakdown.push({l: "Rätt Tecken", p: 2});
                        if (Number(p.predicted_home_goals) === act.home_goals) breakdown.push({l: "Rätt H-mål", p: 1});
                        if (Number(p.predicted_away_goals) === act.away_goals) breakdown.push({l: "Rätt B-mål", p: 1});
                      } else if (p.winner_team === (act.winner_team)) {
                        let pts = 0;
                        let label = "Avancemang";
                        if (p.match_id.startsWith('R32')) pts = 1;
                        else if (p.match_id.startsWith('R16')) pts = 2;
                        else if (p.match_id.startsWith('QF')) pts = 4;
                        else if (p.match_id.startsWith('BM')) { pts = 5; label = "Bronsvinnare"; } // BRONS BREAKDOWN
                        else if (p.match_id.startsWith('SF')) pts = 8;
                        else if (p.match_id === 'FINAL') pts = 25;
                        
                        if (pts > 0) breakdown.push({l: label, p: pts});
                      }
                    }

                    return (
                      <div key={p.id} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/[0.04] transition-all group/card">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{p.match_id}</span>
                          <div className="text-right">
                            <span className={`text-3xl font-black italic leading-none ${p.points > 0 ? 'text-white' : 'text-white/10'}`}>{p.points || 0}</span>
                            <span className="text-[8px] font-black text-white/20 block uppercase">POÄNG</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div className="text-center">
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-2">Ditt Tips</span>
                            <div className="bg-black/50 border border-white/5 py-3 rounded-2xl">
                                <p className="text-xs font-bold text-white/80 uppercase truncate px-2 mb-1">{matchInfo?.home.name || "TBD"}</p>
                                <p className="text-2xl font-black italic text-white leading-none">{p.predicted_home_goals} - {p.predicted_away_goals}</p>
                                <p className="text-xs font-bold text-white/80 uppercase truncate px-2 mt-1">{matchInfo?.away.name || "TBD"}</p>
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-widest block mb-2">Faktiskt</span>
                            <div className="bg-blue-500/5 border border-blue-500/10 py-3 rounded-2xl">
                              {act?.is_finished ? (
                                <>
                                  <p className="text-xs font-bold text-blue-400 uppercase truncate px-2 mb-1">{act.home_name || matchInfo?.home.name}</p>
                                  <p className="text-2xl font-black italic text-blue-400 leading-none">{act.home_goals} - {act.away_goals}</p>
                                  <p className="text-xs font-bold text-blue-400 uppercase truncate px-2 mt-1">{act.away_name || matchInfo?.away.name}</p>
                                </>
                              ) : (
                                <p className="text-[10px] font-black text-white/10 uppercase py-4 italic">Ej avgjord</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {breakdown.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                            {breakdown.map((b, i) => (
                              <span key={i} className={`text-[9px] font-black border px-3 py-1 rounded-full uppercase italic ${b.l === "Bronsvinnare" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                                {b.l} +{b.p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}