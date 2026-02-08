import * as XLSX from 'xlsx';

// Função auxiliar para converter datas do Excel ou Strings
const parseExcelDate = (value) => {
  if (!value) return null;

  // Se for número (serial do Excel - ex: 45289.123)
  if (typeof value === 'number') {
    // Converte serial Excel para JS Date (Excel epoch começa em 1899-12-30)
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    
    // Ajuste de Fuso Horário: O Excel geralmente salva sem timezone.
    // Se o horário ficar errado por horas fixas, ajustamos aqui. 
    // Por enquanto, retornamos UTC puro para o parseador da API decidir.
    // date.setHours(date.getHours() + 3); 
    
    // Retorna string ISO para facilitar
    return date.toISOString();
  }

  // Se for string, retornamos ela inteira para a API processar
  // O ERRO ANTERIOR ERA AQUI: return parts[0] cortava a hora.
  if (typeof value === 'string') {
    return value.trim(); 
  }

  return value;
};

export const parseFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // raw: false força o xlsx a tentar ler o valor formatado se possível, 
        // mas true é mais seguro para processarmos manualmente os números
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: true }); 
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const normalizeData = (data) => {
  return data.map(row => {
    const newRow = {};
    Object.keys(row).forEach(key => {
      const cleanKey = key.trim().toLowerCase().replace(/ /g, '_');
      
      // Aplicamos o parser de data especificamente na coluna 'hour' se ela existir
      let value = row[key];
      if (cleanKey === 'hour') {
          value = parseExcelDate(value);
      }
      
      newRow[cleanKey] = value;
    });
    return newRow;
  });
};