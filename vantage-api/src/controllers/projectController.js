const { fetchSheetData } = require('../services/sheetService');
const { getDaysDifference, parseDate, processTask } = require('../services/projectService');

// In-Memory Cache Setup
let cachedProjects = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache berlaku 5 menit (300.000 ms)

const getCachedProjects = async () => {
    if (cachedProjects && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        return cachedProjects;
    }

    const fetchedData = await fetchSheetData();
    cachedProjects = fetchedData.filter(row => {
        const projName = row['Project Name'] || row['Title'] || row['Nama Project'];
        return projName && projName.toString().trim() !== '';
    });
    lastFetchTime = Date.now();
    return cachedProjects;
};

const getProjects = async (req, res) => {
    try {
        const rawProjects = await getCachedProjects();

        const { startDate, endDate, highlight } = req.query;

        let processedProjects = rawProjects.map(processTask);

        // 6. Filter Rentang Tanggal[cite: 12]
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0); 
            
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); 

            processedProjects = processedProjects.filter(p => {
                const planEndStr = p['Plan End'];
                if (!planEndStr) return false;

                const pEnd = parseDate(planEndStr);
                if (!pEnd) return false;
                return pEnd >= start && pEnd <= end;
            });
        }

        // Filter Highlight[cite: 12]
        if (highlight) {
            processedProjects = processedProjects.filter(p =>
                String(p['Highlight Project'] || '').trim() === String(highlight).trim()
            );
        }

        // Kalkulasi Metrik[cite: 12]
        const metrics = {
            onGoing: processedProjects.filter(p => p.computedStatus === 'On Going').length,
            planning: processedProjects.filter(p => p.computedStatus === 'Planning').length,
            dueSoon: processedProjects.filter(p => p.condition === 'Due Soon').length,
            delayed: processedProjects.filter(p => p.condition === 'Delayed').length,
            completed: processedProjects.filter(p => p.computedStatus === 'Completed').length,
        };

        res.status(200).json({
            success: true,
            totalData: processedProjects.length,
            metrics: metrics,
            data: processedProjects
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil atau memproses data', error });
    }
};

module.exports = { getProjects, getCachedProjects };