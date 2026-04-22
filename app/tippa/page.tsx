"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase"; 
import { 
  worldCup2026Matches, 
  teams, 
  GROUP_CODES, 
  GroupCode, 
  WorldCupMatch 
} from "../../lib/worldcup2026";

const WORLD_CUP_START_TIME = new Date("2026-06-11T20:00:00Z");

export default function Page() {
  const [isLocked, setIsLocked] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); 
  const [koStep, setKoStep] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "", phone: "", topScorer: "" });
  const [groupResults, setGroupResults] = useState<Record<string, { h: string, a: string }>>({});
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
    { id: "FINAL", label: "FINAL & BRONSMATCH", title: "MEDALJMATCHERNA" }
  ];

  const groupFunFacts: Record<string, string> = {
    "A": "Värdnationen Mexiko har aldrig förlorat en öppningsmatch på hemmaplan.",
    "B": "Här har vi 'Dödens Grupp'. Lägsta snittåldern i VM-historien!",
    "C": "Argentina kommer med en enorm vinstsvit. Håller den hela vägen?"
  };

  const reglerRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const getFlag = (n: string) => {
    const t = Object.values(teams).find(x => x.name === n);
    return t ? `https://flagcdn.com/w40/${t.flagCode.toLowerCase()}.png` : null;
  };

  const handleScoreChange = (matchId: string, side: 'h' | 'a', value: string) => {
    if (value === "" || /^\d+$/.test(value)) {
      setGroupResults(prev => ({
        ...prev,
        [matchId]: { ...(prev[matchId] || { h: "", a: "" }), [side]: value }
      }));
    }
  };

  const calculateStandings = (group: GroupCode) => {
    const standings: Record<string, any> = {};
    worldCup2026Matches.filter(m => m.group === group).forEach(m => {
      [m.home.name, m.away.name].forEach(n => { if(!standings[n]) standings[n] = { name: n, pts: 0, gd: 0 }; });
      const r = groupResults[m.id];
      if (r?.h && r?.a) {
        const h = parseInt(r.h), a = parseInt(r.a);
        if (!isNaN(h) && !isNaN(a)) {
          standings[m.home.name].gd += (h-a); 
          standings[m.away.name].gd += (a-h);
          if (h > a) standings[m.home.name].pts += 3; 
          else if (a > h) standings[m.away.name].pts += 3; 
          else { standings[m.home.name].pts += 1; standings[m.away.name].pts += 1; }
        }
      }
    });
    return Object.values(standings).sort((a, b) => b.pts - a.pts || b.gd - a.gd);
  };

  const getDisplayTeam = (match: WorldCupMatch, side: 'home' | 'away'): string => {
    const t = side === 'home' ? match.home : match.away;
    if (/^[12][A-L]$/.test(t.id)) {
      const rank = parseInt(t.id[0]), g = t.id[1] as GroupCode;
      const s = calculateStandings(g);
      return s[rank-1]?.name || t.name;
    }
    if (t.id.startsWith("W")) {
      const prevId = t.id.replace("W", "");
      return koWinners[prevId] || t.name;
    }
    return t.name;
  };

  const submitTotalTip = async () => {
    if (!userInfo.name) return alert("Fyll i namn!");
    setIsSubmitting(true);
    try {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{ name: userInfo.name, phone: userInfo.phone, top_scorer_pick: userInfo.topScorer }])
        .select().single();
      if (userError) throw userError;

      const allPicks = worldCup2026Matches.map(match => ({
        user_id: newUser.id,
        match_id: match.id,
        predicted_home_goals: groupResults[match.id]?.h ? parseInt(groupResults[match.id].h) : null,
        predicted_away_goals: groupResults[match.id]?.a ? parseInt(groupResults[match.id].a) : null,
        winner_team: koWinners[match.id] || null
      }));

      await supabase.from('picks').insert(allPicks);
      alert("TIPSET ÄR INSICKAT!");
      window.location.href = "/leaderboard";
    } catch (err: any) {
      alert("Fel: " + err.message);
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
        <h2 className="text-4xl md:text-6xl font-black italic uppercase text-white mb-4 tracking-tighter">TIPPANDE STÄNGT</h2>
        <p className="text-blue-400 font-bold uppercase tracking-[0.2em] mb-12">VM 2026 HAR STARTAT - BOLLEN RULLAR!</p>
        <button onClick={() => window.location.href = "/leaderboard"} className="bg-blue-600 px-12 py-5 rounded-full font-black italic uppercase text-xl shadow-2xl">SE LEADERBOARD ❯</button>
      </div>
    );
  }

  if (currentStep < 3) return (
    <div className="bg-black text-white selection:bg-blue-500 overflow-x-hidden">
      {/* SLIDE 1: HERO */}
      <section className="h-screen flex flex-col items-center justify-center relative px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center z-0 opacity-60" style={{ backgroundImage: "url('/hero-bg.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 z-1" />
        <h1 className="text-[14vw] font-black italic uppercase z-10 leading-[0.8]">
          <span className="block text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">WULFENS</span>
          <span className="block text-[#001D81]">VM TIP</span>
        </h1>
        <div className="z-10 mt-16">
          <button onClick={() => reglerRef.current?.scrollIntoView({behavior:'smooth'})} className="p-4 rounded-full border-2 border-white/40 bg-black/30 backdrop-blur-md animate-bounce">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          </button>
        </div>
      </section>

      {/* SLIDE 2: REGLER & POÄNG */}
      <section ref={reglerRef} className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-[#00041a] py-12 md:py-20">
        <div className="max-w-5xl w-full space-y-8 md:space-y-12 relative z-10">
          <div className="text-center">
            <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white mb-2">POÄNGSYSTEM</h2>
            <p className="text-blue-500 font-black tracking-[0.3em] uppercase text-xs md:text-sm">Hur du vinner potten</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-6">⚽</div>
              <h3 className="text-xl md:text-2xl font-black italic uppercase mb-4">Gruppspel</h3>
              <ul className="space-y-3 md:space-y-4 font-bold italic text-white/70 text-xs md:text-sm">
                <li className="flex justify-between border-b border-white/5 pb-2"><span>Rätt tecken</span><span className="text-blue-500">+2P</span></li>
                <li className="flex justify-between border-b border-white/5 pb-2"><span>Rätt mål H</span><span className="text-blue-500">+1P</span></li>
                <li className="flex justify-between border-b border-white/5 pb-2"><span>Rätt mål B</span><span className="text-blue-500">+1P</span></li>
                <li className="text-green-400">Exakt tabellrad +2P</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-6">🏆</div>
              <h3 className="text-xl md:text-2xl font-black italic uppercase mb-4">Slutspel</h3>
              <ul className="space-y-3 font-bold italic text-white/70 text-[10px] md:text-xs">
                <li className="flex justify-between border-b border-white/5"><span>R32</span><span>+1P</span></li>
                <li className="flex justify-between border-b border-white/5"><span>R16</span><span>+2P</span></li>
                <li className="flex justify-between border-b border-white/5"><span>QF</span><span>+4P</span></li>
                <li className="flex justify-between border-b border-white/5"><span>SF</span><span>+8P</span></li>
                <li className="text-yellow-500 font-black">Världsmästare +25P</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-6">✨</div>
              <h3 className="text-xl md:text-2xl font-black italic uppercase mb-4">Specials</h3>
              <div className="space-y-3 md:space-y-4">
                <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                    <p className="text-[10px] md:text-xs font-black italic uppercase">Skytteliga: +15P</p>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                    <p className="text-[10px] md:text-xs font-black italic uppercase">Finalpar: +10P</p>
                </div>
              </div>
            </div>
          </div>

          <button onClick={() => infoRef.current?.scrollIntoView({behavior:'smooth'})} className="w-full py-6 md:py-10 bg-white text-black rounded-[2rem] md:rounded-[3rem] text-2xl md:text-4xl font-black uppercase italic transition-all hover:scale-105 active:scale-95 shadow-2xl">NU KÖR VI ❯</button>
        </div>
      </section>

      {/* SLIDE 3: ANVÄNDARINFO */}
      <section ref={infoRef} className="min-h-screen flex items-center justify-center p-6 md:p-8 bg-blue-950 text-white">
        <div className="max-w-xl w-full space-y-8 md:space-y-12">
          <h2 className="text-5xl md:text-7xl font-black italic uppercase text-center leading-none">VEM ÄR DU?</h2>
          <div className="space-y-4 md:space-y-6">
            <input placeholder="Namn" className="w-full p-6 md:p-8 bg-white/10 border-2 border-white/10 rounded-2xl md:rounded-3xl text-xl md:text-2xl font-bold outline-none focus:border-white transition-all" value={userInfo.name} onChange={e => setUserInfo({...userInfo, name: e.target.value})} />
            <input type="tel" placeholder="Telefonnummer" className="w-full p-6 md:p-8 bg-white/10 border-2 border-white/10 rounded-2xl md:rounded-3xl text-xl md:text-2xl font-bold outline-none focus:border-white transition-all" value={userInfo.phone} onChange={e => setUserInfo({...userInfo, phone: e.target.value})} />
            <input placeholder="Vem vinner skytteligan?" className="w-full p-6 md:p-8 bg-blue-600 rounded-2xl md:rounded-3xl text-xl md:text-3xl font-black border-4 border-blue-400 outline-none placeholder:text-blue-200" value={userInfo.topScorer} onChange={e => setUserInfo({...userInfo, topScorer: e.target.value})} />
          </div>
          <button 
            disabled={!userInfo.name || !userInfo.phone} 
            onClick={() => { window.scrollTo(0,0); setCurrentStep(3); }} 
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
        <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">WULFENS TIP</h1>
        <div className="text-right">
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">TIPPARE</p>
          <p className="text-sm font-black italic uppercase">{userInfo.name || "GÄST"}</p>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-8">
        {GROUP_CODES.map(g => (
          <div key={g} className="mb-20 md:mb-40">
            <div className="flex items-center gap-4 mb-8 md:mb-12">
                <div className="h-px flex-grow bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
                <h2 className="text-2xl md:text-4xl font-black italic uppercase text-white tracking-[0.2em] md:tracking-[0.3em]">GRUPP {g}</h2>
                <div className="h-px flex-grow bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
            </div>

            <div className="grid lg:grid-cols-[1fr_340px] gap-8 md:gap-12 items-start">
              <div className="space-y-8 md:space-y-12">
                <div className="space-y-4">
                  {worldCup2026Matches.filter(m => m.group === g).map(m => (
                    <div key={m.id} className="group">
                      <div className="flex justify-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-white/60 mb-1.5 italic">
                        <span className="bg-white/5 px-3 py-0.5 rounded-full">{m.city} • 21:00</span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        {getFlag(m.home.name) && <img src={getFlag(m.home.name)!} className="w-6 h-4 md:w-8 md:h-5 object-cover rounded shadow-lg" alt="" />}
                        <div className="relative flex-grow h-10 md:h-12 overflow-hidden rounded-full border border-white/10 bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-xl">
                          <div className="px-3 md:px-6 flex items-center justify-between gap-1 md:gap-4 h-full text-black">
                            <span className="text-[10px] md:text-base font-black italic uppercase tracking-tighter truncate w-[35%]">{m.home.name}</span>
                            <div className="flex gap-1 md:gap-2">
                              <input type="text" inputMode="numeric" className="w-7 h-7 md:w-9 md:h-9 bg-black/10 border border-black/10 rounded-lg text-center text-sm md:text-lg font-black outline-none" value={groupResults[m.id]?.h || ""} onChange={e => handleScoreChange(m.id, 'h', e.target.value)} />
                              <input type="text" inputMode="numeric" className="w-7 h-7 md:w-9 md:h-9 bg-black/10 border border-black/10 rounded-lg text-center text-sm md:text-lg font-black outline-none" value={groupResults[m.id]?.a || ""} onChange={e => handleScoreChange(m.id, 'a', e.target.value)} />
                            </div>
                            <span className="text-[10px] md:text-base font-black italic uppercase tracking-tighter truncate w-[35%] text-right">{m.away.name}</span>
                          </div>
                        </div>
                        {getFlag(m.away.name) && <img src={getFlag(m.away.name)!} className="w-6 h-4 md:w-8 md:h-5 object-cover rounded shadow-lg" alt="" />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/5 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 border border-white/5 backdrop-blur-sm overflow-x-hidden">
                  <h4 className="text-center font-black italic uppercase tracking-widest text-[10px] mb-4 md:mb-6 text-white/30">LIVE-TABELL</h4>
                  <div className="space-y-2">
                    {calculateStandings(g).map((t: any, i: number) => (
                      <div key={t.name} className={`flex items-center px-3 py-2 md:px-4 md:py-3 rounded-full ${i < 2 ? 'bg-blue-600/10 border border-blue-500/20 text-white shadow-lg' : 'text-white/30'}`}>
                        <span className="w-5 md:w-6 text-[10px] font-black italic opacity-40">{i+1}</span>
                        <span className="flex-grow font-black italic uppercase text-[11px] md:text-sm truncate">{t.name}</span>
                        <span className="w-8 md:w-12 text-center font-bold text-[10px] md:text-xs">{t.gd > 0 ? `+${t.gd}` : t.gd}</span>
                        <span className="w-8 md:w-12 text-center font-black text-yellow-400 text-sm md:text-lg">{t.pts}</span>
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
                        <h3 className="text-[10px] font-black italic uppercase text-blue-400 tracking-widest">WULFENS ANALYS</h3>
                    </div>
                    <p className="text-xs md:text-sm font-bold italic leading-relaxed text-white/80">
                        "{groupFunFacts[g as keyof typeof groupFunFacts] || "Spännande grupp där allt kan hända!"}"
                    </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div id="slutspel" className="mt-10 md:mt-20 px-1">
           <div className="flex flex-col items-center mb-10 md:mb-16">
            <div className="flex items-center gap-4 md:gap-8 mb-6">
              <button onClick={() => setKoStep(Math.max(0, koStep-1))} className="p-2 md:p-3 text-white/30 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10">
                <svg className="w-5 h-5 md:w-6 md:h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
              </button>
              <h2 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter text-center">{stages[koStep].title}</h2>
              <button onClick={() => setKoStep(Math.min(4, koStep+1))} className="p-2 md:p-3 text-white/30 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>

          <div key={koStep} className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            {worldCup2026Matches
              .filter(m => stages[koStep].id === "FINAL" ? (m.stage === "FINAL" || m.stage === "BRONZE") : m.stage === stages[koStep].id)
              .map((m) => {
                const h = getDisplayTeam(m, 'home');
                const a = getDisplayTeam(m, 'away');
                const win = koWinners[m.id];
                const isFinal = m.stage === "FINAL";

                return (
                  <div key={m.id} className="group">
                    <div className="flex justify-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-white/50 mb-2 italic">
                        <span className="bg-black/40 px-3 py-0.5 rounded-full border border-white/5 shadow-sm">
                            {isFinal ? "VM-FINAL" : `${m.city} • 21:00`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      {getFlag(h) && <img src={getFlag(h)!} className="w-6 h-4 md:w-8 md:h-5 object-cover rounded shadow-md" alt="" />}
                      <div className={`relative flex-grow h-12 md:h-14 overflow-hidden rounded-full border shadow-xl flex items-center px-1
                        ${isFinal ? 'border-yellow-500 bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-white/20 bg-gradient-to-b from-[#f3f4f6] to-[#9ca3af]'}
                      `}>
                        <button onClick={() => setKoWinners(prev => ({...prev, [m.id]: h}))} className={`flex-1 h-10 md:h-11 mx-1 rounded-full font-black italic uppercase text-[9px] md:text-xs transition-all flex items-center justify-center gap-1 md:gap-2 ${win === h ? 'bg-black text-white' : 'bg-black/5 text-black hover:bg-black/20'}`}>
                          <span className="truncate">{h}</span>
                          {win === h && <span className="text-green-400 text-sm md:text-lg">●</span>}
                        </button>
                        <div className="px-0.5 md:px-1 font-black italic text-[9px] md:text-[10px] text-black/20">VS</div>
                        <button onClick={() => setKoWinners(prev => ({...prev, [m.id]: a}))} className={`flex-1 h-10 md:h-11 mx-1 rounded-full font-black italic uppercase text-[9px] md:text-xs transition-all flex items-center justify-center gap-1 md:gap-2 ${win === a ? 'bg-black text-white' : 'bg-black/5 text-black hover:bg-black/20'}`}>
                          {win === a && <span className="text-green-400 text-sm md:text-lg">●</span>}
                          <span className="truncate">{a}</span>
                        </button>
                      </div>
                      {getFlag(a) && <img src={getFlag(a)!} className="w-6 h-4 md:w-8 md:h-5 object-cover rounded shadow-md" alt="" />}
                    </div>
                  </div>
                );
              })}

            <div className="mt-12 md:mt-24 flex justify-center pb-20">
              {koStep < 4 ? (
                <button onClick={() => setKoStep(koStep + 1)} className="bg-blue-600 text-white px-8 md:px-10 py-3 md:py-4 rounded-full font-black italic uppercase text-[11px] md:text-sm hover:bg-blue-500 transition-all shadow-xl hover:scale-105 active:scale-95">NÄSTA OMGÅNG ❯</button>
              ) : (
                <button onClick={submitTotalTip} disabled={isSubmitting} className="bg-yellow-500 text-black px-10 md:px-16 py-4 md:py-6 rounded-full font-black italic uppercase text-lg md:text-xl shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">SKICKA TIPSET 🏆</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}