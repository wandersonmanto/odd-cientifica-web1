import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, Calendar, Search, TrendingUp, AlertCircle } from 'lucide-react';

import GameModal from '../components/GameModal';

const Dashboard = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // Hoje
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    fetchGames();
  }, [filterDate]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      // Busca jogos do dia selecionado
      // Usamos range para pegar o dia inteiro independente da hora exata
      const startDate = `${filterDate}T00:00:00`;
      const endDate = `${filterDate}T23:59:59`;

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .gte('match_date', startDate)
        .lte('match_date', endDate)
        .order('match_date', { ascending: true });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Erro ao buscar jogos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtragem local por nome do time
  const filteredGames = games.filter(g => 
    g.home_team.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.league.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col relative">
      {/* Header com Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6 bg-brand-card p-4 rounded-xl border border-brand-gray">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Jogos do Dia</h1>
          <p className="text-text-secondary text-sm">Monitoramento e análise de oportunidades</p>
        </div>

        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-text-secondary" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar time ou liga..." 
                    className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-gray rounded-lg text-white focus:border-brand-green outline-none w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-text-secondary" size={18} />
                <input 
                    type="date" 
                    className="pl-10 pr-4 py-2 bg-brand-dark border border-brand-gray rounded-lg text-white focus:border-brand-green outline-none"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                />
            </div>
        </div>
      </div>

      {/* Tabela de Jogos */}
      <div className="flex-1 bg-brand-card rounded-xl border border-brand-gray overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-dark sticky top-0 z-10 text-xs uppercase text-text-secondary font-bold">
              <tr>
                <th className="p-3 border-b border-brand-gray w-20">Hora</th>
                <th className="p-3 border-b border-brand-gray">Liga</th>
                <th className="p-3 border-b border-brand-gray text-right">Mandante (Eff%)</th>
                <th className="p-3 border-b border-brand-gray text-center w-8">x</th>
                <th className="p-3 border-b border-brand-gray">Visitante (Eff%)</th>
                <th className="p-3 border-b border-brand-gray text-center text-brand-green">Odd Casa</th>
                <th className="p-3 border-b border-brand-gray text-center text-brand-green">Odd Visit</th>
                <th className="p-3 border-b border-brand-gray text-center">O 2.5</th>
                <th className="p-3 border-b border-brand-gray text-center">U 3.5</th>
                <th className="p-3 border-b border-brand-gray text-center">Global</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan="10" className="p-8 text-center text-text-secondary">Carregando jogos...</td></tr>
              ) : filteredGames.length === 0 ? (
                <tr><td colSpan="10" className="p-8 text-center text-text-secondary">Nenhum jogo encontrado para esta data.</td></tr>
              ) : (
                filteredGames.map((game) => (
                  <tr 
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className="hover:bg-brand-gray/30 border-b border-brand-gray/50 transition-colors group cursor-pointer">
                    <td className="p-3 font-mono text-text-secondary">
                        {game.match_time ? game.match_time.split(':').slice(0, 2).join(':'): '--:--'}
                    </td>
                    <td className="p-3 text-xs text-brand-green truncate max-w-[120px]" title={game.league}>
                        {game.country} - {game.league}
                    </td>
                    
                    {/* Mandante */}
                    <td className="p-3 text-right">
                        <span className="font-bold text-white block">{game.home_team}</span>
                        <div className="text-xs text-text-secondary flex justify-end gap-2">
                            <span>Rk: {game.rank_home || '-'}</span>
                            <span className={game.efficiency_home > 70 ? 'text-green-400' : ''}>
                                Eff: {game.efficiency_home}%
                            </span>
                        </div>
                    </td>

                    <td className="p-3 text-center text-text-secondary">vs</td>

                    {/* Visitante */}
                    <td className="p-3">
                        <span className="font-bold text-white block">{game.away_team}</span>
                        <div className="text-xs text-text-secondary flex gap-2">
                             <span className={game.efficiency_away > 70 ? 'text-green-400' : ''}>
                                Eff: {game.efficiency_away}%
                            </span>
                            <span>Rk: {game.rank_away || '-'}</span>
                        </div>
                    </td>

                    {/* Odds */}
                    <td className="p-3 text-center font-mono font-bold text-brand-green">{game.odd_home?.toFixed(2) || '-'}</td>
                    <td className="p-3 text-center font-mono font-bold text-brand-green">{game.odd_away?.toFixed(2) || '-'}</td>
                    
                    {/* Goals Odds */}
                    <td className="p-3 text-center font-mono text-text-secondary">{game.odd_over25?.toFixed(2) || '-'}</td>
                    <td className="p-3 text-center font-mono text-text-secondary">{game.odd_under35?.toFixed(2) || '-'}</td>
                    
                    {/* Estatistica Global */}
                    <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                            game.global_goals_match > 3 ? 'bg-green-500/20 text-green-400' : 'bg-brand-gray text-text-secondary'
                        }`}>
                            {game.global_goals_match || '-'}
                        </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-brand-gray text-xs text-text-secondary text-right">
            Total: {filteredGames.length} jogos
        </div>
      </div>
      {/* MODAL RENDERIZADO AQUI */}
      {selectedGame && (
        <GameModal 
            game={selectedGame} 
            onClose={() => setSelectedGame(null)} 
        />
      )}
    </div>
  );
};

export default Dashboard;