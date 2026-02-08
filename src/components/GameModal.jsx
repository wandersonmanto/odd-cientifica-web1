import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const BET_OPTIONS = [
  { id: 'home_win', label: 'Casa (1)', group: 'Resultado' },
  { id: 'draw', label: 'Empate (X)', group: 'Resultado' },
  { id: 'away_win', label: 'Visitante (2)', group: 'Resultado' },
  { id: 'home_draw', label: '1X', group: 'Dupla Chance' },
  { id: 'away_draw', label: '2X', group: 'Dupla Chance' },
  { id: 'over_0.5', label: '+ 0.5 Gols', group: 'Gols' },
  { id: 'under_0.5', label: '- 0.5 Gols', group: 'Gols' },
  { id: 'over_1.5', label: '+ 1.5 Gols', group: 'Gols' },
  { id: 'under_1.5', label: '- 1.5 Gols', group: 'Gols' },
  { id: 'over_2.5', label: '+ 2.5 Gols', group: 'Gols' },
  { id: 'under_2.5', label: '- 2.5 Gols', group: 'Gols' },
  { id: 'over_3.5', label: '+ 3.5 Gols', group: 'Gols' },
  { id: 'under_3.5', label: '- 3.5 Gols', group: 'Gols' },
  { id: 'over_4.5', label: '+ 4.5 Gols', group: 'Gols' },
  { id: 'under_4.5', label: '- 4.5 Gols', group: 'Gols' },
];

const GameModal = ({ game, onClose }) => {
  const [selectedBet, setSelectedBet] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedBet) return;
    setSaving(true);
    try {
      // 1. Verifica se já salvou esse jogo em "Meus Jogos" para não duplicar
      const { data: existing } = await supabase
        .from('method_entries')
        .select('id')
        .eq('game_id', game.id)
        .eq('method_type', 'my_games')
        .maybeSingle();

      if (existing) {
        alert('Este jogo já foi adicionado aos "Meus Jogos"!');
        setSaving(false);
        return;
      }

      // 2. Salva na tabela unificada method_entries
      const { error } = await supabase.from('method_entries').insert({
        game_id: game.id,
        method_type: 'my_games', // Tipo unificado
        selection: selectedBet,  // O que você escolheu (ex: home_win)
        result_status: 'pending',
        is_main_pick: true       // Já entra marcado como principal
      });

      if (error) throw error;
      
      onClose();
      alert('Aposta salva em "Meus Jogos" na aba Métodos!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar seleção.');
    } finally {
      setSaving(false);
    }
  };

  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-brand-card w-full max-w-2xl rounded-xl border border-brand-gray shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-brand-gray flex justify-between items-center bg-brand-dark rounded-t-xl">
          <div>
            <span className="text-xs text-brand-green uppercase font-bold tracking-wider">{game.league}</span>
            <h2 className="text-xl font-bold text-white flex gap-2 items-center">
              {game.home_team} <span className="text-text-secondary text-sm">vs</span> {game.away_team}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-gray rounded-full text-text-secondary">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-brand-dark p-3 rounded-lg border border-brand-gray text-center">
                <span className="text-xs text-text-secondary block">Horário</span>
                <span className="font-mono text-white text-lg">
                    {game.match_time?.substring(0,5)}
                </span>
            </div>
            <div className="bg-brand-dark p-3 rounded-lg border border-brand-gray text-center">
                <span className="text-xs text-text-secondary block">Eficiência (Casa vs Fora)</span>
                <span className="font-mono text-white text-lg">{game.efficiency_home}% <span className="text-text-secondary text-xs">vs</span> {game.efficiency_away}%</span>
            </div>
          </div>

          <h3 className="text-sm font-bold text-text-secondary uppercase mb-3 flex items-center gap-2">
            <AlertCircle size={16} /> Selecione sua Entrada
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            {BET_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedBet(opt.id)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  selectedBet === opt.id 
                    ? 'bg-brand-green text-brand-dark border-brand-green font-bold shadow-glow' 
                    : 'bg-brand-dark border-brand-gray text-text-secondary hover:border-brand-green hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-gray bg-brand-dark rounded-b-xl flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={!selectedBet || saving}
            className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                !selectedBet 
                    ? 'bg-brand-gray text-text-secondary cursor-not-allowed' 
                    : 'bg-brand-green text-brand-dark hover:bg-brand-green-hover shadow-lg'
            }`}
          >
            {saving ? 'Salvando...' : <><Save size={18} /> Adicionar a Meus Jogos</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameModal;