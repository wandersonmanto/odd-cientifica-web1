import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Filter, Trophy, Activity, CheckCircle, Shield } from 'lucide-react';

const Results = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [availableLeagues, setAvailableLeagues] = useState([]);

  // Stats Calculados
  const [stats, setStats] = useState({
    total: 0,
    homeWins: 0,
    draws: 0,
    awayWins: 0,
    over25: 0,
    under35: 0
  });

  useEffect(() => {
    fetchHistory();
  }, [date]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Busca apenas jogos finalizados (FT) na data
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'FT') // Apenas finalizados
        .gte('match_date', `${date}T00:00:00`)
        .lte('match_date', `${date}T23:59:59`)
        .order('match_time', { ascending: true });

      if (error) throw error;
      
      const gameList = data || [];
      setGames(gameList);

      // Extrai ligas únicas para o filtro
      const leagues = [...new Set(gameList.map(g => g.league))].sort();
      setAvailableLeagues(leagues);
      
      calculateStats(gameList);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (dataList) => {
    const s = {
      total: dataList.length,
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      over25: 0,
      under35: 0
    };

    dataList.forEach(g => {
      const h = g.home_score || 0;
      const a = g.away_score || 0;
      const totalGoals = h + a;

      if (h > a) s.homeWins++;
      else if (a > h) s.awayWins++;
      else s.draws++;

      if (totalGoals > 2.5) s.over25++;
      if (totalGoals < 3.5) s.under35++;
    });

    setStats(s);
  };

  // Filtragem local
  const displayedGames = selectedLeague === 'all' 
    ? games 
    : games.filter(g => g.league === selectedLeague);

  // Recalcula stats se filtrar liga? Opcional. 
  // Aqui opto por manter stats gerais do dia ou filtrados?
  // Vamos filtrar stats também para ser mais útil.
  useEffect(() => {
    calculateStats(displayedGames);
  }, [selectedLeague, games]);


  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6 bg-brand-card p-4 rounded-xl border border-brand-gray">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Resultados Passados</h1>
          <p className="text-text-secondary text-sm">Análise histórica e validação de padrões</p>
        </div>
        
        <div className="flex gap-3">
            <div className="flex flex-col">
                <label className="text-xs text-text-secondary mb-1">Filtrar Liga</label>
                <select 
                    value={selectedLeague}
                    onChange={(e) => setSelectedLeague(e.target.value)}
                    className="bg-brand-dark border border-brand-gray text-white p-2 rounded-lg outline-none w-48"
                >
                    <option value="all">Todas as Ligas</option>
                    {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>
            <div className="flex flex-col">
                <label className="text-xs text-text-secondary mb-1">Data</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-text-secondary" size={18} />
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-gray rounded-lg text-white focus:border-brand-green outline-none"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Jogos" value={stats.total} icon={<Activity />} color="text-white" />
          <StatCard label="Vitória Casa" value={stats.homeWins} sub={`${((stats.homeWins/stats.total)*100 || 0).toFixed(0)}%`} icon={<Trophy />} color="text-brand-green" />
          <StatCard label="Vitória Visitante" value={stats.awayWins} sub={`${((stats.awayWins/stats.total)*100 || 0).toFixed(0)}%`} icon={<Trophy />} color="text-blue-400" />
          <StatCard label="Over 2.5 Gols" value={stats.over25} sub={`${((stats.over25/stats.total)*100 || 0).toFixed(0)}%`} icon={<CheckCircle />} color="text-purple-400" />
          <StatCard label="Under 3.5 Gols" value={stats.under35} sub={`${((stats.under35/stats.total)*100 || 0).toFixed(0)}%`} icon={<Shield />} color="text-yellow-400" />
      </div>

      {/* Tabela de Resultados */}
      <div className="flex-1 bg-brand-card rounded-xl border border-brand-gray overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-dark sticky top-0 text-xs uppercase text-text-secondary font-bold">
              <tr>
                <th className="p-3 w-20">Hora</th>
                <th className="p-3">Liga</th>
                <th className="p-3 text-right">Mandante</th>
                <th className="p-3 text-center">Placar</th>
                <th className="p-3">Visitante</th>
                <th className="p-3 text-center text-xs w-24">Gols Total</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-text-secondary">Carregando histórico...</td></tr>
              ) : displayedGames.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-text-secondary">Nenhum resultado finalizado encontrado nesta data. Importe o arquivo de Resultados (Tipo 5).</td></tr>
              ) : (
                displayedGames.map((game) => {
                  const totalGoals = (game.home_score || 0) + (game.away_score || 0);
                  return (
                    <tr key={game.id} className="hover:bg-brand-gray/30 border-b border-brand-gray/50 transition-colors">
                        <td className="p-3 font-mono text-text-secondary">
                            {game.match_time ? game.match_time.substring(0,5) : '--:--'}
                        </td>
                        <td className="p-3 text-xs text-brand-green truncate max-w-[150px]">{game.league}</td>
                        <td className="p-3 text-right font-medium text-white">{game.home_team}</td>
                        <td className="p-3 text-center font-bold font-mono text-lg bg-black/20">
                            {game.home_score} - {game.away_score}
                        </td>
                        <td className="p-3 font-medium text-white">{game.away_team}</td>
                        <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${totalGoals > 2.5 ? 'bg-purple-500/20 text-purple-400' : 'text-text-secondary'}`}>
                                {totalGoals} Gols
                            </span>
                        </td>
                    </tr>
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

const StatCard = ({ label, value, sub, icon, color }) => (
    <div className="bg-brand-card p-4 rounded-xl border border-brand-gray flex items-center justify-between">
        <div>
            <span className="text-xs text-text-secondary uppercase font-bold">{label}</span>
            <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
            {sub && <div className="text-xs text-text-secondary">{sub}</div>}
        </div>
        <div className={`opacity-20 ${color}`}>{icon}</div>
    </div>
);

export default Results;