const { fetchSheetData } = require('../services/sheetService');

// Fungsi pembantu: Menghitung selisih hari antara Plan End dan Hari Ini
const getDaysDifference = (targetDateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset waktu ke tengah malam agar akurat
    
    // Pastikan format tanggal di Sheets terbaca JS (disarankan YYYY-MM-DD atau MM/DD/YYYY)
    const targetDate = new Date(targetDateString);
    
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Konversi milidetik ke hari
};

const getProjects = async (req, res) => {
    try {
        // 1. Ambil data mentah dari Google Sheets
        const rawProjects = await fetchSheetData();
        
        // Parameter pencarian dari Frontend (contoh: ?startDate=2026-10-01&endDate=2026-10-31)
        const { startDate, endDate, highlight } = req.query;

        // 2. Injeksi Status Dinamis (Logika Kill Switch & Countdown)
        let processedProjects = rawProjects.map(project => {
            const planEnd = project['Plan End'];
            const actualEnd = project['Actual End'];
            const status = project['Status'] || '';
            const remarks = project['Remarks'] || '';
            
            let computedStatus = 'On Going'; 
            let daysRemaining = null;

            if (planEnd) {
                daysRemaining = getDaysDifference(planEnd);
                
                // Syarat "Kill Switch": Actual End dan Remarks tidak boleh kosong, ATAU status sudah Done
                const isCompleted = (actualEnd !== '' && remarks !== '') || 
                                    status.toLowerCase() === 'completed' || 
                                    status.toLowerCase() === 'done';
                
                if (isCompleted) {
                    computedStatus = 'Completed'; // Hijau
                } else if (daysRemaining < 0) {
                    computedStatus = 'Delayed';   // Merah (Overdue)
                } else if (daysRemaining >= 0 && daysRemaining <= 10) {
                    computedStatus = 'Due Soon';  // Oren (Kritis 10 hari)
                } else {
                    computedStatus = 'On Going';  // Kuning (Aman)
                }
            }

            // Kembalikan objek proyek beserta tambahan 2 kolom baru hasil kalkulasi server
            return {
                ...project,
                computedStatus,
                daysRemaining
            };
        });

        // 3. Eksekusi Filter Rentang Tanggal (Calendar Picker)
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            processedProjects = processedProjects.filter(p => {
                const pEnd = new Date(p['Plan End']);
                return pEnd >= start && pEnd <= end;
            });
        }

        // 4. Eksekusi Filter Project Health (Commercial / Non-Commercial)
        if (highlight) {
            // Asumsi frontend mengirim parameter ?highlight=Yes
            processedProjects = processedProjects.filter(p => p['Highlight Project'] === highlight);
        }

        // 5. Kalkulasi Summary Metrics (Biar React tinggal menampilkan angkanya)
        const metrics = {
            onGoing: processedProjects.filter(p => p.computedStatus === 'On Going').length,
            dueSoon: processedProjects.filter(p => p.computedStatus === 'Due Soon').length,
            delayed: processedProjects.filter(p => p.computedStatus === 'Delayed').length,
            completed: processedProjects.filter(p => p.computedStatus === 'Completed').length,
        };

        // 6. Kirim output final ke Frontend
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