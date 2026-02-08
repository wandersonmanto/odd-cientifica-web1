import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Target, Save, BarChart2, Check, X, AlertCircle, ChevronDown, ChevronUp, Activity, Microscope } from 'lucide-react'; // Import Microscope
import { getDailyFinancial, saveDailyStake, closeDailyResult } from '../services/api';
import MethodExtract from '../components/MethodExtract';
import MethodAnalytics from '../components/MethodAnalytics'; // <--- IMPORTANTE

const METHODS = [
  { id: 'under_85', label: 'Under 85 min', color: 'text-yellow-400' },
  { id: 'over_25', label: 'Over 2.5', color: 'text-blue-400' },
  { id: 'under_35', label: 'Under 3.5', color: 'text-red-400' },
  { id: 'over_0.5_ht', label: 'Over 0.5 HT', color: 'text-purple-400' },
  { id: 'over_0.5_ft', label: 'Over 0.5 FT', color: 'text-orange-400' },
  { id: 'my_games', label: 'Meus Jogos', color: 'text-green-400' },
];

const Methods = () => {
  const [activeMethod, setActiveMethod] = useState('under_85');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Visualização: 'list' | 'extract' | 'analytics'
  const [viewMode, setViewMode] = useState('list'); 

  const [expandedRow, setExpandedRow] = useState(null);
  const [dailyStake, setDailyStake] = useState(0);
  const [dailyOdd, setDailyOdd] = useState(1.65);
  const [dailyResult, setDailyResult] = useState(null); 

  useEffect(() => {
    if (viewMode === 'list') {
        fetchData();
        setExpandedRow(null);
    }
  }, [activeMethod, selectedDate, viewMode]);

  const fetchData = async () => {
    // ... (MANTENHA A FUNÇÃO fetchData EXATAMENTE IGUAL AO QUE JÁ ESTAVA)
    setLoading(true);
    try {
      const { data: gamesData, error } = await supabase
        .from('method_entries')
        .select(`
          id, result_status, is_main_pick, selection,
          games (
            id, home_team, away_team, match_date, match_time, league, country,
            home_score, away_score, home_score_ht, away_score_ht, status,
            odd_home, odd_away, odd_over05, odd_over15, odd_over25, odd_under25, odd_under35,
            efficiency_home, efficiency_away, rank_home, rank_away,
            wins_percent_home, wins_percent_away,
            avg_goals_scored_home, avg_goals_scored_away,
            avg_goals_conceded_home, avg_goals_conceded_away,
            avg_goals_conceded_2h_home, avg_goals_conceded_2h_away,
            global_goals_match, global_goals_league
          )
        `)
        .eq('method_type', activeMethod)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const filteredData = (gamesData || []).filter(item => {
          if (!item.games) return false;
          const gameDate = item.games.match_date.split('T')[0];
          return gameDate === selectedDate;
      });
      
      filteredData.sort((a, b) => {
          if (!a.games.match_time || !b.games.match_time) return 0;
          return a.games.match_time.localeCompare(b.games.match_time);
      });

      setEntries(filteredData);

      const finance = await getDailyFinancial(activeMethod, selectedDate);
      if (finance) {
          setDailyStake(finance.stake_amount);
          setDailyOdd(finance.daily_odd || 1.65);
          setDailyResult({ status: finance.status, profit: finance.profit_loss });
      } else {
          setDailyStake(0);
          setDailyOdd(1.65);
          setDailyResult(null);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ... (MANTENHA toggleMainPick, handleSaveStake, handleCloseDay, setGameStatus, toggleRow IGUAIS)
  const toggleMainPick = async (entry) => {
    if (dailyResult && dailyResult.status !== 'pending') { alert("Dia fechado."); return; }
    const newVal = !entry.is_main_pick;
    setEntries(prev => prev.map(e => e.id === entry.id ? {...e, is_main_pick: newVal} : e));
    await supabase.from('method_entries').update({ is_main_pick: newVal }).eq('id', entry.id);
  };

  const handleSaveStake = async () => {
    try { await saveDailyStake(activeMethod, selectedDate, dailyStake, activeMethod === 'my_games' ? dailyOdd : null); alert("Salvo!"); } 
    catch (e) { alert("Erro."); }
  };

  const handleCloseDay = async () => {
      try { await closeDailyResult(activeMethod, selectedDate, entries, dailyStake, dailyOdd); fetchData(); } 
      catch (e) { alert(e.message); }
  };
  
  const setGameStatus = async (id, status) => {
      await supabase.from('method_entries').update({ result_status: status }).eq('id', id);
      setEntries(prev => prev.map(e => e.id === id ? {...e, result_status: status} : e));
  };

  const toggleRow = (id) => {
      if (expandedRow === id) setExpandedRow(null); else setExpandedRow(id);
  };

  // --- RENDERIZAÇÃO CONDICIONAL ---

  if (viewMode === 'extract') {
      return <MethodExtract method={activeMethod} onBack={() => setViewMode('list')} />;
  }

  if (viewMode === 'analytics') {
      return <MethodAnalytics method={activeMethod} onBack={() => setViewMode('list')} />;
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header Abas */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex gap-2 bg-brand-card p-1 rounded-lg border border-brand-gray overflow-x-auto max-w-full">
          {METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMethod(m.id)}
              className={`px-4 py-2 rounded-md font-bold whitespace-nowrap transition-all ${
                activeMethod === m.id 
                  ? 'bg-brand-dark text-brand-green shadow-sm border border-brand-green/30' 
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        
        {/* Botões de Ação */}
        <div className="flex gap-2">
            <button 
                onClick={() => setViewMode('analytics')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-card border border-brand-gray text-purple-400 hover:border-purple-400 hover:bg-purple-400/10 transition-all"
            >
                <Microscope size={18} /> Análise de Padrões
            </button>
            <button 
                onClick={() => setViewMode('extract')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-card border border-brand-gray text-brand-green hover:border-brand-green hover:bg-brand-green/10 transition-all"
            >
                <BarChart2 size={18} /> Extrato
            </button>
        </div>
      </div>

      {/* ... RESTO DO COMPONENTE (Painel de Gestão e Tabela) MANTIDO IGUAL ... */}
      {/* Painel de Gestão */}
      <div className="bg-brand-card p-6 rounded-xl border border-brand-gray mb-6 flex flex-col lg:flex-row items-end justify-between gap-6">
          {/* ... (Copie o conteúdo do Painel de Gestão anterior aqui) ... */}
           <div className="flex items-end gap-4 flex-wrap">
              <div className="flex flex-col">
                  <label className="text-xs text-text-secondary uppercase font-bold mb-1">Data</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-brand-dark border border-brand-gray text-white rounded p-2 outline-none h-10" />
              </div>
              <div className="flex flex-col">
                  <label className="text-xs text-text-secondary uppercase font-bold mb-1">Entrada (R$)</label>
                  <input type="number" value={dailyStake} onChange={e => setDailyStake(e.target.value)} className="bg-brand-dark border border-brand-gray text-white font-mono rounded p-2 w-28 outline-none h-10" placeholder="0.00" disabled={dailyResult && dailyResult.status !== 'pending'} />
              </div>
              {activeMethod === 'my_games' && (
                  <div className="flex flex-col">
                      <label className="text-xs text-brand-green uppercase font-bold mb-1">Odd Total</label>
                      <input type="number" value={dailyOdd} onChange={e => setDailyOdd(e.target.value)} className="bg-brand-dark border border-brand-green/50 text-brand-green font-mono rounded p-2 w-24 outline-none h-10" placeholder="1.65" step="0.01" disabled={dailyResult && dailyResult.status !== 'pending'} />
                  </div>
              )}
              <button onClick={handleSaveStake} className="p-2 h-10 bg-brand-gray rounded hover:bg-brand-green hover:text-black transition-colors"><Save size={20} /></button>
          </div>
          <div className="flex items-center gap-4 bg-brand-dark p-4 rounded-lg border border-brand-gray min-w-[200px] justify-center h-24">
              {dailyResult && dailyResult.status !== 'pending' ? (
                  <div className="text-center animate-in fade-in zoom-in">
                      <span className="text-xs text-text-secondary uppercase">Resultado Dia</span>
                      <div className={`text-3xl font-bold ${dailyResult.status === 'green' ? 'text-brand-green' : 'text-red-500'}`}>{dailyResult.status === 'green' ? '+' : ''}R$ {dailyResult.profit?.toFixed(2)}</div>
                      <span className="text-xs uppercase tracking-widest font-bold text-white">{dailyResult.status}</span>
                  </div>
              ) : (
                  <button onClick={handleCloseDay} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all">Fechar Dia</button>
              )}
          </div>
      </div>

      {activeMethod === 'under_85' && (
          <div className="mb-4 flex items-center gap-2 text-yellow-400 text-sm bg-yellow-400/10 p-3 rounded-lg border border-yellow-400/20">
              <AlertCircle size={16} /><span>Para "Under 85 min", defina manualmente o status (WIN/LOSS).</span>
          </div>
      )}

      {/* Tabela de Jogos */}
      <div className="flex-1 overflow-auto bg-brand-card rounded-xl border border-brand-gray">
        {/* ... (Copie a Tabela Completa com o map e o expandedRow anterior aqui) ... */}
         <table className="w-full text-left border-collapse">
            <thead className="bg-brand-dark sticky top-0 text-xs uppercase text-text-secondary font-bold z-10">
                <tr>
                    <th className="p-3 w-10 text-center"></th>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3 text-center">Sel.</th>
                    <th className="p-3">Partida</th>
                    {activeMethod === 'my_games' && <th className="p-3 text-center text-brand-green">Aposta</th>}
                    <th className="p-3 text-center">HT</th>
                    <th className="p-3 text-center">FT</th>
                    <th className="p-3 text-center">Status</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {loading ? (
                    <tr><td colSpan="8" className="p-8 text-center text-text-secondary">Carregando...</td></tr>
                ) : entries.length === 0 ? (
                    <tr><td colSpan="8" className="p-8 text-center text-text-secondary">Nenhum jogo encontrado nesta data.</td></tr>
                ) : (
                    entries.map((entry, idx) => (
                        <React.Fragment key={entry.id}>
                            <tr className={`border-b border-brand-gray/50 ${entry.is_main_pick ? 'bg-brand-green/5' : 'hover:bg-brand-gray/20'}`}>
                                <td className="p-3 text-center"><button onClick={() => toggleRow(entry.id)} className="text-text-secondary hover:text-white">{expandedRow === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></td>
                                <td className="p-3 text-center text-text-secondary">{idx + 1}</td>
                                <td className="p-3 text-center"><button onClick={() => toggleMainPick(entry)} className={`p-2 rounded-full transition-colors ${entry.is_main_pick ? 'bg-brand-green text-brand-dark shadow-glow' : 'bg-brand-gray text-text-secondary hover:text-white'}`}><Target size={20} /></button></td>
                                <td className="p-3">
                                    <div className="font-mono text-xs text-text-secondary">{entry.games.match_time ? entry.games.match_time.substring(0,5) : '--:--'}</div>
                                    <div className="font-bold text-white text-lg">{entry.games.home_team} <span className="text-text-secondary text-sm mx-1">vs</span> {entry.games.away_team}</div>
                                    <div className="text-xs text-brand-green">{entry.games.country ? `${entry.games.country} - ` : ''}{entry.games.league}</div>
                                </td>
                                {activeMethod === 'my_games' && (<td className="p-3 text-center"><span className="px-2 py-1 rounded bg-brand-gray border border-brand-gray text-white text-xs font-bold uppercase">{entry.selection?.replace(/_/g, ' ').replace('win', 'Vence').replace('draw', 'Empate') || 'Manual'}</span></td>)}
                                <td className="p-3 text-center font-mono text-text-secondary">{entry.games.home_score_ht !== null ? `${entry.games.home_score_ht}-${entry.games.away_score_ht}` : '-'}</td>
                                <td className="p-3 text-center font-bold font-mono text-xl">{entry.games.status === 'FT' || entry.games.home_score !== null ? `${entry.games.home_score}-${entry.games.away_score}` : '--'}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-1">
                                        <button onClick={() => setGameStatus(entry.id, 'win')} className={`p-1.5 rounded flex items-center gap-1 transition-all ${entry.result_status === 'win' ? 'bg-green-500 text-black font-bold' : 'bg-brand-gray text-text-secondary hover:bg-green-500/20 hover:text-green-400'}`}><Check size={14} /></button>
                                        <button onClick={() => setGameStatus(entry.id, 'loss')} className={`p-1.5 rounded flex items-center gap-1 transition-all ${entry.result_status === 'loss' ? 'bg-red-500 text-white font-bold' : 'bg-brand-gray text-text-secondary hover:bg-red-500/20 hover:text-red-400'}`}><X size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                            {/* LINHA EXPANDIDA (Igual ao anterior) */}
                            {expandedRow === entry.id && (
                                <tr className="bg-brand-dark border-b border-brand-gray">
                                    <td colSpan="8" className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm animate-in slide-in-from-top-2">
                                            <div className="space-y-2 border-r border-brand-gray pr-4"><h4 className="text-brand-green font-bold text-xs uppercase flex items-center gap-1"><Activity size={14} /> Odds & Probabilidades</h4><div className="grid grid-cols-2 gap-2 text-xs"><div>Home: <span className="text-white font-mono">{entry.games.odd_home?.toFixed(2) || '-'}</span></div><div>Away: <span className="text-white font-mono">{entry.games.odd_away?.toFixed(2) || '-'}</span></div><div>O 2.5: <span className="text-white font-mono">{entry.games.odd_over25?.toFixed(2) || '-'}</span></div><div>U 3.5: <span className="text-white font-mono">{entry.games.odd_under35?.toFixed(2) || '-'}</span></div><div className="col-span-2 text-text-secondary mt-1">Win Prob: {entry.games.wins_percent_home}% vs {entry.games.wins_percent_away}%</div></div></div>
                                            <div className="space-y-2 border-r border-brand-gray pr-4"><h4 className="text-brand-green font-bold text-xs uppercase">Desempenho Geral</h4><div className="space-y-1 text-xs"><div className="flex justify-between"><span className="text-text-secondary">Eficiência:</span><span className="text-white">{entry.games.efficiency_home}% vs {entry.games.efficiency_away}%</span></div><div className="flex justify-between"><span className="text-text-secondary">Ranking:</span><span className="text-white">#{entry.games.rank_home} vs #{entry.games.rank_away}</span></div></div></div>
                                            <div className="space-y-2 border-r border-brand-gray pr-4"><h4 className="text-brand-green font-bold text-xs uppercase">Médias de Gols</h4><div className="space-y-1 text-xs"><div className="flex justify-between"><span className="text-text-secondary">Marcados:</span><span className="text-white font-mono">{entry.games.avg_goals_scored_home} | {entry.games.avg_goals_scored_away}</span></div><div className="flex justify-between"><span className="text-text-secondary">Sofridos:</span><span className="text-white font-mono">{entry.games.avg_goals_conceded_home} | {entry.games.avg_goals_conceded_away}</span></div><div className="flex justify-between text-yellow-400"><span>Sofr. 2ºT:</span><span className="font-mono">{entry.games.avg_goals_conceded_2h_home} | {entry.games.avg_goals_conceded_2h_away}</span></div></div></div>
                                            <div className="space-y-2"><h4 className="text-brand-green font-bold text-xs uppercase">Estatística Global</h4><div className="space-y-1 text-xs"><div className="flex justify-between"><span className="text-text-secondary">Gols/Jogo (Match):</span><span className="text-white font-mono font-bold">{entry.games.global_goals_match}</span></div><div className="flex justify-between"><span className="text-text-secondary">Média Liga:</span><span className="text-white font-mono">{entry.games.global_goals_league}</span></div></div></div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Methods;