import React, { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { getFinancialExtract } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MethodExtract = ({ method, onBack }) => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ profit: 0, wins: 0, losses: 0, roi: 0 });
  const [range, setRange] = useState('30'); // dias

  useEffect(() => {
    const loadExtract = async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - parseInt(range));
      
      const result = await getFinancialExtract(
          method, 
          start.toISOString().split('T')[0], 
          end.toISOString().split('T')[0]
      );

      // Processa dados para o gráfico (Acumulado)
      let acc = 0;
      let w = 0;
      let l = 0;
      const chartData = result.map(d => {
        acc += d.profit_loss;
        if (d.status === 'green') w++;
        if (d.status === 'red') l++;
        return {
          date: new Date(d.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
          daily: d.profit_loss,
          accumulated: acc
        };
      });

      setData(chartData);
      setSummary({
          profit: acc,
          wins: w,
          losses: l,
          roi: result.length > 0 ? (acc / result.reduce((s, i) => s + i.stake_amount, 0)) * 100 : 0
      });
    };
    loadExtract();
  }, [method, range]);

  return (
    <div className="p-6 h-full flex flex-col animate-in fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 bg-brand-card rounded hover:text-brand-green">
            <ArrowLeft />
        </button>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
            Extrato Financeiro: <span className="text-brand-green">{method.replace('_', ' ')}</span>
        </h2>
        
        <select 
            value={range} 
            onChange={(e) => setRange(e.target.value)}
            className="ml-auto bg-brand-card border border-brand-gray text-white p-2 rounded outline-none"
        >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
        </select>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-brand-card p-4 rounded-xl border border-brand-gray">
              <span className="text-xs text-text-secondary uppercase">Lucro Líquido</span>
              <div className={`text-2xl font-bold mt-1 ${summary.profit >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                  R$ {summary.profit.toFixed(2)}
              </div>
          </div>
          <div className="bg-brand-card p-4 rounded-xl border border-brand-gray">
              <span className="text-xs text-text-secondary uppercase">Dias Green</span>
              <div className="text-2xl font-bold mt-1 text-green-400 flex items-center gap-2">
                  <TrendingUp size={20} /> {summary.wins}
              </div>
          </div>
          <div className="bg-brand-card p-4 rounded-xl border border-brand-gray">
              <span className="text-xs text-text-secondary uppercase">Dias Red</span>
              <div className="text-2xl font-bold mt-1 text-red-400 flex items-center gap-2">
                  <TrendingDown size={20} /> {summary.losses}
              </div>
          </div>
          <div className="bg-brand-card p-4 rounded-xl border border-brand-gray">
              <span className="text-xs text-text-secondary uppercase">ROI (Aprox)</span>
              <div className="text-2xl font-bold mt-1 text-blue-400">
                  {summary.roi.toFixed(1)}%
              </div>
          </div>
      </div>

      {/* Gráfico */}
      <div className="flex-1 bg-brand-card p-4 rounded-xl border border-brand-gray min-h-[300px]">
          <h3 className="text-sm font-bold text-text-secondary mb-4">Curva de Lucratividade</h3>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#26ffbe" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#26ffbe" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#383838" />
              <XAxis dataKey="date" stroke="#a1a1a1" fontSize={12} />
              <YAxis stroke="#a1a1a1" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#383838', color: '#fff' }}
                itemStyle={{ color: '#26ffbe' }}
              />
              <Area 
                type="monotone" 
                dataKey="accumulated" 
                stroke="#26ffbe" 
                fillOpacity={1} 
                fill="url(#colorProfit)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MethodExtract;