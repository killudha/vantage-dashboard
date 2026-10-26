const { fetchSheetData } = require('../services/sheetService');

// In-Memory Cache Setup
let cachedProjects = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache berlaku 5 menit (300.000 ms)

const getDaysDifference = (targetDateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    let targetDate;
    if (targetDateString.includes('/')) {
        const parts = targetDateString.split('/');
        targetDate = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
        targetDate = new Date(targetDateString);
    }

    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const getProjects = async (req, res) => {
    try {
        let rawProjects;

        // 1. Cek Cache: Memangkas waktu loading drastis
        if (cachedProjects && (Date.now() - lastFetchTime < CACHE_DURATION)) {
            rawProjects = cachedProjects;
        } else {
            // 2. Fetch Data Baru jika cache kadaluarsa / kosong
            const fetchedData = await fetchSheetData();
            
            // 3. Filter Baris Kosong (Memperbaiki Bug Pagination)
            rawProjects = fetchedData.filter(row => {
                const projName = row['Project Name'] || row['Title'] || row['Nama Project'];
                // Pastikan nama proyek ada dan tidak hanya spasi kosong
                return projName && projName.toString().trim() !== '';
            });

            // 4. Simpan ke Memori Cache
            cachedProjects = rawProjects;
            lastFetchTime = Date.now();
        }

        const { startDate, endDate, highlight } = req.query;

        // 5. Proses Logika Tanggal & Status[cite: 12]
        let processedProjects = rawProjects.map(project => {
            const planEnd = project['Plan End'];
            const status = project['Status'] ? String(project['Status']).trim() : '';
            const normalizedStatus = status.toLowerCase();

            let computedStatus = 'On Going';
            if (normalizedStatus.includes('completed') || normalizedStatus.includes('done')) {
                computedStatus = 'Completed';
            } else if (normalizedStatus.includes('plan') || normalizedStatus.includes('not started')) {
                computedStatus = 'Planning';
            }

            let daysRemaining = null;
            let condition = 'On Track';

            if (computedStatus !== 'Completed' && planEnd) {
                daysRemaining = getDaysDifference(planEnd);

                if (daysRemaining < 0) {
                    condition = 'Delayed';
                } else if (daysRemaining >= 0 && daysRemaining <= 10) {
                    condition = 'Due Soon';
                }
            }

            return {
                ...project,
                computedStatus,
                condition,
                daysRemaining
            };
        });

        // 6. Filter Rentang Tanggal[cite: 12]
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0); 
            
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); 

            processedProjects = processedProjects.filter(p => {
                const planEndStr = p['Plan End'];
                if (!planEndStr) return false; 

                let pEnd;
                if (planEndStr.includes('/')) {
                    const parts = planEndStr.split('/');
                    pEnd = new Date(parts[2], parts[1] - 1, parts[0]);
                } else {
                    pEnd = new Date(planEndStr);
                }
                return pEnd >= start && pEnd <= end;
            });
        }

        // Filter Highlight[cite: 12]
        if (highlight) {
            processedProjects = processedProjects.filter(p => p['Highlight Project'] === highlight);
        }

        // Kalkulasi Metrik[cite: 12]
        const metrics = {
            onGoing: processedProjects.filter(p => p.computedStatus === 'On Going' || p.computedStatus === 'Planning').length,
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

module.exports = { getProjects };