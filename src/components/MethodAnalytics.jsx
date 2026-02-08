import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Activity, Trophy, Filter, Target, Shield, 
  Clock, ChevronDown, ChevronUp, Star, TrendingUp, TrendingDown, Zap, Layers
} from 'lucide-react';

const MethodAnalytics = ({ method, onBack }) => {
  const [range, setRange] = useState('15'); // Dias
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [activeFilter, setActiveFilter] = useState('total');

  const [stats, setStats] = useState({
    total: 0,
    homeWinsFT: 0, awayWinsFT: 0, drawsFT: 0,
    homeWinsHT: 0, awayWinsHT: 0, drawsHT: 0,
    
    // Gols HT/FT
    over05HT: 0, 
    over05FT: 0, // Novo
    over15FT: 0, // Novo
    over25FT: 0, 
    under35FT: 0,
    
    // Stats de Favoritos
    favWins: 0, 
    favLost: 0, // Novo (Fav perdeu o jogo)
    favTotal: 0,
    favRange1Wins: 0, favRange1Total: 0,
    favRange2Wins: 0, favRange2Total: 0,
    favRange3Wins: 0, favRange3Total: 0
  });

  useEffect(() => {
    fetchData();
  }, [method, range]);

  const fetchData = async () => {
    setLoading(true);
    setActiveFilter('total');
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(range));

      const { data, error } = await supabase
        .from('method_entries')
        .select(`
          id, result_status, selection,
          games!inner (
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
        .eq('method_type', method)
        .eq('games.status', 'FT')
        .gte('games.match_date', startDate.toISOString())
        .lte('games.match_date', endDate.toISOString())
        .order('games(match_date)', { ascending: false });

      if (error) throw error;
      
      const gameList = data || [];
      setGames(gameList);
      calculateStats(gameList);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (list) => {
    const s = {
        total: list.length,
        homeWinsFT: 0, awayWinsFT: 0, drawsFT: 0,
        homeWinsHT: 0, awayWinsHT: 0, drawsHT: 0,
        
        over05HT: 0, 
        over05FT: 0, 
        over15FT: 0, 
        over25FT: 0, 
        under35FT: 0,
        
        favWins: 0, 
        favLost: 0,
        favTotal: 0,
        favRange1Wins: 0, favRange1Total: 0,
        favRange2Wins: 0, favRange2Total: 0,
        favRange3Wins: 0, favRange3Total: 0
    };

    list.forEach(entry => {
        const g = entry.games;
        const hFT = g.home_score || 0;
        const aFT = g.away_score || 0;
        const hHT = g.home_score_ht || 0;
        const aHT = g.away_score_ht || 0;

        // Placar FT
        if (hFT > aFT) s.homeWinsFT++;
        else if (aFT > hFT) s.awayWinsFT++;
        else s.drawsFT++;

        // Placar HT
        if (hHT > aHT) s.homeWinsHT++;
        else if (aHT > hHT) s.awayWinsHT++;
        else s.drawsHT++;

        // Gols
        const goalsHT = hHT + aHT;
        const goalsFT = hFT + aFT;

        if (goalsHT >= 1) s.over05HT++;
        if (goalsFT >= 1) s.over05FT++; // Novo
        if (goalsFT >= 2) s.over15FT++; // Novo
        if (goalsFT > 2.5) s.over25FT++;
        if (goalsFT < 3.5) s.under35FT++;

        // --- Lógica Favoritos ---
        const oddHome = parseFloat(g.odd_home);
        const oddAway = parseFloat(g.odd_away);
        
        if (!isNaN(oddHome) && !isNaN(oddAway)) {
            let favOdd = 0;
            let favWon = false;
            let favLostMatch = false; // Favorito perdeu o jogo

            // Determina Favorito
            if (oddHome < oddAway) {
                favOdd = oddHome;
                if (hFT > aFT) favWon = true; 
                if (hFT < aFT) favLostMatch = true; // Casa Favorito perdeu
            } else if (oddAway < oddHome) {
                favOdd = oddAway;
                if (aFT > hFT) favWon = true; 
                if (aFT < hFT) favLostMatch = true; // Fora Favorito perdeu
            }

            if (favOdd > 0) {
                s.favTotal++;
                if (favWon) s.favWins++;
                if (favLostMatch) s.favLost++; // Novo

                // Faixas de Odd (apenas vitórias)
                if (favOdd >= 1.01 && favOdd <= 1.40) {
                    s.favRange1Total++;
                    if (favWon) s.favRange1Wins++;
                } else if (favOdd >= 1.41 && favOdd <= 1.80) {
                    s.favRange2Total++;
                    if (favWon) s.favRange2Wins++;
                } else if (favOdd >= 1.81 && favOdd <= 2.70) {
                    s.favRange3Total++;
                    if (favWon) s.favRange3Wins++;
                }
            }
        }
    });
    setStats(s);
  };

  const getFilteredGames = () => {
      if (activeFilter === 'total') return games;
      
      return games.filter(entry => {
          const g = entry.games;
          const hFT = g.home_score || 0;
          const aFT = g.away_score || 0;
          const hHT = g.home_score_ht || 0;
          const aHT = g.away_score_ht || 0;
          const goalsFT = hFT + aFT;
          const goalsHT = hHT + aHT;
          const oddHome = parseFloat(g.odd_home);
          const oddAway = parseFloat(g.odd_away);

          // Filtros Básicos
          if (activeFilter === 'home_ft') return hFT > aFT;
          if (activeFilter === 'away_ft') return aFT > hFT;
          if (activeFilter === 'draw_ft') return hFT === aFT;
          if (activeFilter === 'home_ht') return hHT > aHT;
          if (activeFilter === 'away_ht') return aHT > hHT;
          if (activeFilter === 'draw_ht') return hHT === aHT;
          
          if (activeFilter === 'over_ht') return goalsHT >= 1;
          if (activeFilter === 'over_05_ft') return goalsFT >= 1;
          if (activeFilter === 'over_15_ft') return goalsFT >= 2;
          if (activeFilter === 'over_25') return goalsFT > 2.5;
          if (activeFilter === 'under_35') return goalsFT < 3.5;

          // Filtros de Favorito
          let favOdd = 0;
          let favWon = false;
          let favLostMatch = false;
          
          if (oddHome < oddAway) { 
              favOdd = oddHome; 
              if(hFT > aFT) favWon = true; 
              if(hFT < aFT) favLostMatch = true; 
          } else if (oddAway < oddHome) { 
              favOdd = oddAway; 
              if(aFT > hFT) favWon = true; 
              if(aFT < hFT) favLostMatch = true; 
          }

          if (favOdd === 0) return false;

          if (activeFilter === 'fav_win') return favWon;
          if (activeFilter === 'fav_lost') return favLostMatch; // Filtro Fav Perde
          
          if (activeFilter === 'fav_range1') return favOdd >= 1.01 && favOdd <= 1.40 && favWon;
          if (activeFilter === 'fav_range2') return favOdd >= 1.41 && favOdd <= 1.80 && favWon;
          if (activeFilter === 'fav_range3') return favOdd >= 1.81 && favOdd <= 2.70 && favWon;
          
          return true;
      });
  };

  const displayedGames = getFilteredGames();

  const StatCard = ({ id, label, value, totalBase, icon, color }) => {
      const pct = totalBase > 0 ? ((value / totalBase) * 100).toFixed(0) : 0;
      
      return (
        <button 
            onClick={() => setActiveFilter(id)}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left h-24 relative overflow-hidden group ${
                activeFilter === id 
                ? `bg-brand-dark border-${color.split('-')[1]}-400 shadow-lg ring-1 ring-${color.split('-')[1]}-400`
                : 'bg-brand-card border-brand-gray hover:bg-brand-gray/30'
            }`}
        >
            <div className="z-10 relative">
                <span className="text-[10px] text-text-secondary uppercase font-bold block mb-1">{label}</span>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-[10px] text-text-secondary mt-1">
                    {totalBase === stats.total ? `${pct}% do total` : `${pct}% acerto`}
                </div>
            </div>
            <div className={`absolute right-2 bottom-2 opacity-10 group-hover:opacity-20 transition-opacity transform scale-150 ${color}`}>{icon}</div>
        </button>
      );
  };

  const toggleRow = (id) => {
    if (expandedRow === id) setExpandedRow(null); else setExpandedRow(id);
  };

  return (
    <div className="p-6 h-full flex flex-col animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 bg-brand-card rounded hover:text-brand-green">
            <ArrowLeft />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
                Análise de Padrões: <span className="text-brand-green">{method.replace(/_/g, ' ')}</span>
            </h2>
        </div>
        
        <select 
            value={range} 
            onChange={(e) => setRange(e.target.value)}
            className="ml-auto bg-brand-card border border-brand-gray text-white p-2 rounded outline-none cursor-pointer hover:border-brand-green"
        >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
        </select>
      </div>

      {/* Grid de Cards - Organizado para acomodar os novos */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
          <StatCard id="total" label="Total Analisado" value={stats.total} totalBase={stats.total} icon={<Activity />} color="text-white" />
          
          {/* Favoritos */}
          <StatCard id="fav_win" label="Fav. Vence Geral" value={stats.favWins} totalBase={stats.favTotal} icon={<Star />} color="text-yellow-400" />
          <StatCard id="fav_lost" label="Fav. Perde Geral" value={stats.favLost} totalBase={stats.favTotal} icon={<TrendingDown />} color="text-red-500" />
          <StatCard id="fav_range1" label="Fav. 1.01 - 1.40" value={stats.favRange1Wins} totalBase={stats.favRange1Total} icon={<TrendingUp />} color="text-green-400" />
          <StatCard id="fav_range2" label="Fav. 1.41 - 1.80" value={stats.favRange2Wins} totalBase={stats.favRange2Total} icon={<TrendingUp />} color="text-blue-400" />
          <StatCard id="fav_range3" label="Fav. 1.81 - 2.70" value={stats.favRange3Wins} totalBase={stats.favRange3Total} icon={<TrendingUp />} color="text-purple-400" />
          
          {/* Gols e Resultados */}
          <StatCard id="over_05_ft" label="Over 0.5 FT" value={stats.over05FT} totalBase={stats.total} icon={<Zap />} color="text-green-300" />
          <StatCard id="over_15_ft" label="Over 1.5 FT" value={stats.over15FT} totalBase={stats.total} icon={<Layers />} color="text-blue-300" />
          <StatCard id="over_25" label="Over 2.5 FT" value={stats.over25FT} totalBase={stats.total} icon={<Target />} color="text-purple-400" />
          <StatCard id="over_ht" label="Over 0.5 HT" value={stats.over05HT} totalBase={stats.total} icon={<Activity />} color="text-yellow-400" />
          <StatCard id="under_35" label="Under 3.5 FT" value={stats.under35FT} totalBase={stats.total} icon={<Shield />} color="text-red-400" />
          <StatCard id="draw_ft" label="Empates FT" value={stats.drawsFT} totalBase={stats.total} icon={<Filter />} color="text-gray-400" />
      </div>

      {/* Lista Filtrada */}
      <div className="flex-1 bg-brand-card rounded-xl border border-brand-gray overflow-hidden flex flex-col">
        <div className="p-3 bg-brand-dark border-b border-brand-gray flex justify-between items-center">
            <span className="text-xs font-bold text-text-secondary uppercase">
                Listando: {activeFilter === 'total' ? 'Todos os Jogos' : activeFilter.replace(/_/g, ' ').toUpperCase()} ({displayedGames.length})
            </span>
        </div>
        
        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-brand-dark sticky top-0 text-xs uppercase text-text-secondary font-bold z-10">
                    <tr>
                        <th className="p-3 w-10"></th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Partida</th>
                        <th className="p-3 text-center">Odd Fav</th>
                        <th className="p-3 text-center">HT</th>
                        <th className="p-3 text-center">FT</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {loading ? (
                        <tr><td colSpan="6" className="p-8 text-center text-text-secondary">Carregando análise...</td></tr>
                    ) : displayedGames.length === 0 ? (
                        <tr><td colSpan="6" className="p-8 text-center text-text-secondary">Nenhum jogo encontrado com este filtro.</td></tr>
                    ) : (
                        displayedGames.map((entry) => {
                            const oH = parseFloat(entry.games.odd_home);
                            const oA = parseFloat(entry.games.odd_away);
                            let favInfo = "-";
                            let favColor = "text-text-secondary";
                            
                            if (oH < oA) { favInfo = `Casa (${oH.toFixed(2)})`; favColor = "text-brand-green"; }
                            else if (oA < oH) { favInfo = `Fora (${oA.toFixed(2)})`; favColor = "text-blue-400"; }

                            return (
                                <React.Fragment key={entry.id}>
                                    <tr className="border-b border-brand-gray/50 hover:bg-brand-gray/20 transition-colors">
                                        <td className="p-3 text-center">
                                            <button onClick={() => toggleRow(entry.id)} className="text-text-secondary hover:text-white">
                                                {expandedRow === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                        </td>
                                        <td className="p-3 font-mono text-text-secondary text-xs">
                                            {new Date(entry.games.match_date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-white">
                                                {entry.games.home_team} <span className="text-text-secondary text-xs">vs</span> {entry.games.away_team}
                                            </div>
                                            <div className="text-xs text-brand-green">{entry.games.league}</div>
                                        </td>
                                        <td className={`p-3 text-center text-xs font-bold ${favColor}`}>
                                            {favInfo}
                                        </td>
                                        <td className="p-3 text-center font-mono text-text-secondary">
                                            {entry.games.home_score_ht ?? '-'} - {entry.games.away_score_ht ?? '-'}
                                        </td>
                                        <td className="p-3 text-center font-bold font-mono text-white">
                                            {entry.games.home_score} - {entry.games.away_score}
                                        </td>
                                    </tr>

                                    {/* DETALHES EXPANDIDOS */}
                                    {expandedRow === entry.id && (
                                        <tr className="bg-brand-dark border-b border-brand-gray">
                                            <td colSpan="6" className="p-4">
                                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm animate-in slide-in-from-top-2">
                                                     {/* Odds */}
                                                    <div className="space-y-2 border-r border-brand-gray pr-4">
                                                        <h4 className="text-brand-green font-bold text-xs uppercase flex items-center gap-1">Odds Iniciais</h4>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>H: <span className="text-white font-mono">{entry.games.odd_home?.toFixed(2)}</span></div>
                                                            <div>A: <span className="text-white font-mono">{entry.games.odd_away?.toFixed(2)}</span></div>
                                                            <div>O2.5: <span className="text-white font-mono">{entry.games.odd_over25?.toFixed(2)}</span></div>
                                                            <div className="col-span-2 text-text-secondary mt-1">Win Prob: {entry.games.wins_percent_home}% vs {entry.games.wins_percent_away}%</div>
                                                        </div>
                                                    </div>
                                                    {/* Stats */}
                                                    <div className="space-y-2 border-r border-brand-gray pr-4">
                                                        <h4 className="text-brand-green font-bold text-xs uppercase">Pré-Live Stats</h4>
                                                        <div className="space-y-1 text-xs">
                                                            <div>Eff: <span className="text-white">{entry.games.efficiency_home}% vs {entry.games.efficiency_away}%</span></div>
                                                            <div>Rank: <span className="text-white">#{entry.games.rank_home} vs #{entry.games.rank_away}</span></div>
                                                        </div>
                                                    </div>
                                                    {/* Goals */}
                                                    <div className="space-y-2 border-r border-brand-gray pr-4">
                                                        <h4 className="text-brand-green font-bold text-xs uppercase">Médias Gols</h4>
                                                        <div className="space-y-1 text-xs">
                                                            <div>Marc: <span className="text-white font-mono">{entry.games.avg_goals_scored_home} | {entry.games.avg_goals_scored_away}</span></div>
                                                            <div>Sofr: <span className="text-white font-mono">{entry.games.avg_goals_conceded_home} | {entry.games.avg_goals_conceded_away}</span></div>
                                                        </div>
                                                    </div>
                                                    {/* Global */}
                                                     <div className="space-y-2">
                                                        <h4 className="text-brand-green font-bold text-xs uppercase">Global</h4>
                                                        <div className="space-y-1 text-xs">
                                                            <div>League Avg: <span className="text-white font-mono">{entry.games.global_goals_league}</span></div>
                                                            <div>Match Global: <span className="text-white font-mono">{entry.games.global_goals_match}</span></div>
                                                        </div>
                                                    </div>
                                                 </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default MethodAnalytics;