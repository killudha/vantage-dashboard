import * as XLSX from 'xlsx';

export const fetchExcelData = async () => {
  try {
    // Membaca file Excel dari folder public
    const response = await fetch('/projects.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    
    return XLSX.utils.sheet_to_json(firstSheet);
  } catch (error) {
    console.error('Gagal membaca file Excel lokal:', error);
    throw error;
  }
};