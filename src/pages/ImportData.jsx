import React, { useState } from 'react';
import { Upload, FileType, CheckCircle, AlertCircle } from 'lucide-react';
import { parseFile, normalizeData } from '../utils/xlsxParser';
import { saveGames, saveMethodEntries, saveResults } from '../services/api';

const FILE_TYPES = [
  { id: 'games_day', label: '1 - Jogos do Dia', icon: '📅' },
  { id: 'method_under_85', label: '2 - Under 85 min', icon: '📉' },
  { id: 'method_over_25', label: '3 - Over 2.5', icon: '📈' },
  { id: 'method_under_35', label: '4 - Under 3.5', icon: '🛡️' },
  { id: 'method_over_0.5_ht', label: 'Extra - Over 0.5 HT', icon: '⚡' },
  { id: 'method_over_0.5_ft', label: 'Extra - Over 0.5 FT', icon: '🔥' },
  { id: 'results', label: '5 - Resultados', icon: '🏁' },
];

const ImportData = () => {
  const [selectedType, setSelectedType] = useState('games_day');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg, type = 'info') => {
    setLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    addLog(`Iniciando leitura de: ${file.name}...`);

    try {
      // 1. Ler e Parsear
      const rawData = await parseFile(file);
      const data = normalizeData(rawData);
      
      addLog(`Arquivo lido. ${data.length} linhas encontradas.`);
      console.log('Dados processados (debug):', data[0]); // Para ver os nomes das colunas

      // 2. Enviar para o Banco conforme o tipo
      let count = 0;

      if (selectedType === 'games_day') {
        // Mapeamento direto das chaves que você identificou no console
        // O normalizeData já deixa tudo lowercase e snake_case (odds_1, casa_|_fora)
        
        // Passamos 'data' direto para a API, pois a API agora trata o mapeamento complexo
        const count = await saveGames(data);
        addLog(`${count} Jogos do Dia salvos com sucesso!`, 'success');
        
      } else if (['method_under_85', 'method_over_25', 'method_under_35', 'method_over_0.5_ht', 'method_over_0.5_ft'].includes(selectedType)) {
        const methodKey = selectedType.replace('method_', ''); // vira 'over_0.5_ht'
        console.log("data", data)
        count = await saveMethodEntries(data, methodKey);
        addLog(`${count} jogos vinculados ao método ${methodKey}.`, 'success');

      } else if (selectedType === 'results') {
        count = await saveResults(data);
        addLog(`${count} resultados atualizados.`, 'success');
      }

      addLog('Processo finalizado com sucesso!', 'success');

    } catch (error) {
      console.error(error);
      addLog(`Erro: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-text-primary">
      <h1 className="text-3xl font-bold text-brand-green mb-8 flex items-center gap-3">
        <Upload /> Importação de Dados
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card de Seleção e Upload */}
        <div className="bg-brand-card p-6 rounded-xl border border-brand-gray">
          <label className="block text-sm font-medium mb-2 text-text-secondary">Selecione o Tipo de Arquivo</label>
          <div className="space-y-2 mb-6">
            {FILE_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all border ${
                  selectedType === type.id 
                    ? 'bg-brand-green/10 border-brand-green text-brand-green' 
                    : 'bg-brand-dark border-transparent hover:bg-brand-gray'
                }`}
              >
                <span className="text-xl">{type.icon}</span>
                <span className="font-medium">{type.label}</span>
                {selectedType === type.id && <CheckCircle size={16} className="ml-auto" />}
              </button>
            ))}
          </div>

          <div className="relative border-2 border-dashed border-brand-gray rounded-xl p-8 text-center hover:border-brand-green transition-colors group">
            <input 
              type="file" 
              accept=".csv, .xlsx, .xls" 
              onChange={handleFileUpload}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2 text-text-secondary group-hover:text-brand-green">
              <Upload size={32} />
              <span className="font-medium">
                {loading ? 'Processando...' : 'Clique ou arraste o arquivo CSV aqui'}
              </span>
              <span className="text-xs text-text-secondary/50">Suporta CSV e Excel</span>
            </div>
          </div>
        </div>

        {/* Card de Logs */}
        <div className="bg-brand-card p-6 rounded-xl border border-brand-gray flex flex-col h-full max-h-[500px]">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FileType size={18} /> Logs de Importação
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 bg-brand-dark p-4 rounded-lg font-mono text-sm">
            {log.length === 0 && <span className="text-text-secondary/50 italic">Aguardando ações...</span>}
            {log.map((l, i) => (
              <div key={i} className={`flex gap-2 ${l.type === 'error' ? 'text-red-400' : l.type === 'success' ? 'text-brand-green' : 'text-text-secondary'}`}>
                <span className="opacity-50">[{l.time}]</span>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;