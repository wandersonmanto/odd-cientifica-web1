import { NULL } from 'sass';
import { supabase } from '../lib/supabase';

// Helper para tratar números e nulos
const parseNum = (val) => {
  if (val === "" || val === undefined || val === null) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

// Helper para separar estatísticas "77 | 30"
const splitStats = (strVal) => {
  if (!strVal || typeof strVal !== 'string') return [null, null];
  const parts = strVal.split('|');
  return [parseNum(parts[0]), parseNum(parts[1])];
};

/**
 * LÓGICA DE DATA E HORA BASEADA NO SEU CÓDIGO
 * Recebe o valor cru (number ou string) do Excel
 * Retorna objeto pronto para o Supabase
 */
const processDateTime = (rawHour) => {
  if (!rawHour) return { fullDate: null, timeOnly: null };

  let dateObj = null;
  let dataFormatadaISO = ""; // YYYY-MM-DD
  let horaFormatada = "";    // HH:mm:ss

  // 1. Lógica para Número (Serial Excel)
  if (typeof rawHour === "number") {
    // Sua fórmula exata: (Excel - 25569) * dias * ms + fuso horário
    dateObj = new Date(Math.round((rawHour - 25569) * 86400 * 1000) + 3 * 60 * 60 * 1000);
  }

  // 2. Extração das Strings
  if (dateObj) {
    console.log(dateObj)
    // Se temos um objeto Date válido
    // Formata para ISO YYYY-MM-DD (Banco precisa disso, não DD/MM/YYYY)
    dataFormatadaISO = dateObj.toISOString().split('T')[0];
    // Formata hora HH:mm:ss
    horaFormatada = dateObj.toTimeString().split(" ")[0];
  } else if (typeof rawHour === "string") {
    console.log("string");
    // Se for String "28-12-2025 18:00"
    const parts = rawHour.trim().split('T');
    const datePart = parts[0]; // 28-12-2025
    const timePart = parts[1]; // 18:00

    if (datePart) {
      // Converte DD-MM-YYYY para YYYY-MM-DD
      const [y, m, d] = datePart.split('-');
      dataFormatadaISO = `${y}-${m}-${d}`;
    }
    
    // Garante formato HH:mm:ss (adiciona :00 se faltar)
    if (timePart) {
        horaFormatada = timePart.length === 5 ? `${timePart}:00` : timePart;
    }
  }

  // Retorna os campos separados para o Banco
  return {
    // Data completa (Timestamp)
    fullDate: (dataFormatadaISO && horaFormatada) ? `${dataFormatadaISO}T${horaFormatada}` : null,
    // Apenas a hora (Time)
    timeOnly: horaFormatada || null 
  };
};

// --- SERVIÇOS ---

export const saveGames = async (gamesData) => {
  const formattedData = gamesData.map(d => {
    // Processa a data e hora usando a nova lógica
    const { fullDate, timeOnly } = processDateTime(d.hour);

    const [effHome, effAway] = splitStats(d['casa_|_fora']);
    const [rankHome, rankAway] = splitStats(d['casa_|_fora_1']);
    const [winsHome, winsAway] = splitStats(d['casa_|_fora_2']);
    const [avgScoredHome, avgScoredAway] = splitStats(d['casa_|_fora_3']);
    const [avgConcededHome, avgConcededAway] = splitStats(d['casa_|_fora_4']);
    const [avgConceded2hHome, avgConceded2hAway] = splitStats(d['casa_|_fora_5']);

    return {
      league: d.league,
      country: d.country,
      home_team: d.home_team,
      away_team: d.visitor_team,
      
      // AQUI ESTÁ A CORREÇÃO: Salvando nos campos certos
      match_date: fullDate, // Coluna TIMESTAMP
      match_time: timeOnly, // Coluna TIME (agora não será mais NULL)
      
      status: d.status || 'NS',
      
      odd_home: parseNum(d.odds),
      odd_away: parseNum(d.odds_1),
      
      odd_over05: parseNum(d.odds_2),
      odd_over15: parseNum(d.odds_3),
      odd_under25: parseNum(d.odds_4),
      odd_under35: parseNum(d.odds_5),
      odd_over25: parseNum(d.odds_6),

      efficiency_home: effHome,
      efficiency_away: effAway,
      rank_home: rankHome,
      rank_away: rankAway,
      wins_percent_home: winsHome,
      wins_percent_away: winsAway,
      avg_goals_scored_home: avgScoredHome,
      avg_goals_scored_away: avgScoredAway,
      avg_goals_conceded_home: avgConcededHome,
      avg_goals_conceded_away: avgConcededAway,
      avg_goals_conceded_2h_home: avgConceded2hHome,
      avg_goals_conceded_2h_away: avgConceded2hAway,
      
      global_goals_match: parseNum(d.global),
      global_goals_league: parseNum(d.global_1),
    };
  });

  const validGames = formattedData.filter(g => g.home_team && g.away_team && g.match_date);

  // Upsert considerando a data completa para evitar duplicatas
  const { data, error } = await supabase
  .from('games')
  .upsert(validGames, { 
    onConflict: 'home_team, away_team, match_date, odd_home, odd_away',
    ignoreDuplicates: false 
  })
  .select();

  if (error) {
    console.error("Erro Supabase:", error);
    throw new Error(`Erro ao salvar no banco: ${error.message}`);
  }
  
  return data ? data.length : 0;
};

// Funções auxiliares mantidas iguais
export const saveMethodEntries = async (entries, methodType) => {
  let savedCount = 0;
  for (const entry of entries) {
    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('home_team', entry.home_team)
      .eq('away_team', entry.visitor_team)
      .eq('status', entry.status || 'NS')
      .limit(1)
      .single();

    if (game) {
      const { data: existing } = await supabase
        .from('method_entries')
        .select('id')
        .eq('game_id', game.id)
        .eq('method_type', methodType)
        .single();

      if (!existing) {
        await supabase.from('method_entries').insert({
          game_id: game.id,
          method_type: methodType,
          stake_value: 0, 
          result_status: 'pending'
        });
        savedCount++;
      }
    }
  }
  return savedCount;
};

// --- ATUALIZAÇÃO NO saveResults ---
export const saveResults = async (resultsData) => {
  let updatedCount = 0;
  for (const row of resultsData) {
    const homeScore = parseInt(row.result_home);
    const awayScore = parseInt(row.result_visitor);
    // Captura o HT (verificando se existe no CSV)
    const homeScoreHT = row.result_home_ht !== "" ? parseInt(row.result_home_ht) : null;
    const awayScoreHT = row.result_visitor_ht !== "" ? parseInt(row.result_visitor_ht) : null;
    
    if (!isNaN(homeScore) && !isNaN(awayScore)) {
       const updatePayload = { 
            home_score: homeScore, 
            away_score: awayScore,
            status: 'FT' 
       };

       // Só atualiza HT se vier no arquivo
       if (homeScoreHT !== null) updatePayload.home_score_ht = homeScoreHT;
       if (awayScoreHT !== null) updatePayload.away_score_ht = awayScoreHT;

       const { error } = await supabase
        .from('games')
        .update(updatePayload)
        .eq('home_team', row.home_team)
        .eq('away_team', row.visitor_team);
       
       if (!error) updatedCount++;
    }
  }
  return updatedCount;
};

// --- GESTÃO FINANCEIRA DIÁRIA ---

// Busca o financeiro de um método em uma data específica
export const getDailyFinancial = async (methodType, dateStr) => {
  const { data, error } = await supabase
    .from('daily_method_financials')
    .select('*')
    .eq('method_type', methodType)
    .eq('date', dateStr)
    .maybeSingle(); // Retorna null se não existir, sem dar erro
    
  if (error) throw error;
  return data;
};

// --- ATUALIZAÇÃO NO saveDailyStake (Aceita Odd agora) ---
export const saveDailyStake = async (methodType, dateStr, stakeAmount, dailyOdd = null) => {
  const payload = {
      method_type: methodType,
      date: dateStr,
      stake_amount: stakeAmount
  };
  // Só salva a odd se ela for passada (caso de Meus Jogos)
  if (dailyOdd) payload.daily_odd = dailyOdd;

  const { data, error } = await supabase
    .from('daily_method_financials')
    .upsert(payload, { onConflict: 'method_type, date' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// --- ATUALIZAÇÃO CRÍTICA NO closeDailyResult ---
export const closeDailyResult = async (methodType, dateStr, gamesEntries, stakeAmount, dailyOdd = 1) => {
  const mainPicks = gamesEntries.filter(e => e.is_main_pick);
  if (mainPicks.length === 0) throw new Error("Selecione os jogos principais antes de fechar.");

  let allGreen = true;
  let anyRed = false;

  // VERIFICAÇÃO DE STATUS
  for (const pick of mainPicks) {
      let isWin = false;
      let isLoss = false;

      // Lógica específica por método
      if (methodType === 'under_85') {
          // Under 85: Confia EXCLUSIVAMENTE no status manual (win/loss) definido pelo usuário
          if (pick.result_status === 'win') isWin = true;
          else if (pick.result_status === 'loss') isLoss = true;
          else throw new Error(`O jogo ${pick.games.home_team} precisa de definição manual (Win/Loss).`);
      
      } else if (methodType === 'over_0.5_ht') {
          // Over 0.5 HT: Verifica placar HT automaticamente
          const goalsHT = (pick.games.home_score_ht || 0) + (pick.games.away_score_ht || 0);
          if (pick.games.status === 'FT') {
              if (goalsHT >= 1) isWin = true;
              else isLoss = true;
          } else {
              // Se não tiver placar HT e não tiver manual
              if (pick.result_status === 'win') isWin = true;
              else if (pick.result_status === 'loss') isLoss = true;
              else throw new Error("Jogos sem placar HT. Defina manualmente ou importe resultados.");
          }

      } else if (methodType === 'over_0.5_ft') { // <--- NOVO BLOCO
          // Over 0.5 FT: Verifica placar Final automaticamente
          // Soma gols Casa + Gols Fora do tempo regulamentar
          const goalsFT = (pick.games.home_score || 0) + (pick.games.away_score || 0);
          
          if (pick.games.status === 'FT') {
              if (goalsFT >= 1) isWin = true; // 1 ou mais gols = Green
              else isLoss = true;             // 0 gols = Red
          } else {
              // Fallback para manual se o jogo não tiver status FT mas o usuário marcou manual
              if (pick.result_status === 'win') isWin = true;
              else if (pick.result_status === 'loss') isLoss = true;
              else throw new Error("Jogos Over 0.5 FT sem placar final. Importe resultados ou defina manualmente.");
          }

      } else {
           // Padrão (Over 2.5, Under 3.5, Meus Jogos): Confia no status já processado ou manual
           if (pick.result_status === 'win') isWin = true;
           else if (pick.result_status === 'loss') isLoss = true;
           else throw new Error("Existem jogos com status Pendente.");
      }

      if (!isWin) allGreen = false;
      if (isLoss) anyRed = true;
  }

  let finalStatus = 'pending';
  let profitLoss = 0;
  const stake = parseFloat(stakeAmount);

  if (allGreen) {
      finalStatus = 'green';
      if (methodType === 'my_games') {
          // Meus Jogos: Lucro = (Stake * Odd) - Stake
          // Ex: 100 * 1.65 = 165 total. Lucro liquido 65.
          const odd = parseFloat(dailyOdd) || 1;
          profitLoss = (stake * odd) - stake;
      } else {
          // Outros Métodos: Lucro = Stake (Dobra o valor)
          profitLoss = stake;
      }
  } else {
      finalStatus = 'red';
      profitLoss = -stake; // Perde tudo
  }

  const { error } = await supabase
    .from('daily_method_financials')
    .upsert({
      method_type: methodType,
      date: dateStr,
      stake_amount: stake,
      daily_odd: dailyOdd, // Salva a odd usada no fechamento
      status: finalStatus,
      profit_loss: profitLoss
    }, { onConflict: 'method_type, date' });

  if (error) throw error;
  return { status: finalStatus, profit: profitLoss };
};

// Busca extrato por período
export const getFinancialExtract = async (methodType, startDate, endDate) => {
  const { data, error } = await supabase
    .from('daily_method_financials')
    .select('*')
    .eq('method_type', methodType)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data;
};

// --- ATUALIZAÇÃO DE ESTATÍSTICAS DE JOGO ---
export const updateGameStats = async (gameId, field, value) => {
  // field será 'first_goal_minute_1h' ou 'last_goal_minute_2h'
  const payload = {};
  payload[field] = parseInt(value) || 0;

  const { data, error } = await supabase
    .from('games')
    .update(payload)
    .eq('id', gameId)
    .select();

  if (error) {
    console.error("Erro ao atualizar estatística:", error);
    throw error;
  }
  return data;
};