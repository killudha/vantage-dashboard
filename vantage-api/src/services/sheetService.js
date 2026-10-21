const axios = require('axios');
const Papa = require('papaparse');

const fetchSheetData = async () => {
    const sheetUrl = process.env.SHEET_CSV_URL;
    const response = await axios.get(sheetUrl);
    
    return new Promise((resolve, reject) => {
        Papa.parse(response.data, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => resolve(result.data),
            error: (error) => reject(error.message)
        });
    });
};

module.exports = { fetchSheetData };