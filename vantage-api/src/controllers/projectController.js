const { fetchSheetData } = require('../services/sheetService');

// Fungsi pembantu: Menghitung selisih hari dengan dukungan format DD/MM/YYYY
const getDaysDifference = (targetDateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    let targetDate;

    // Deteksi jika Google Sheets mengirim format tanggal DD/MM/YYYY (contoh: 28/10/2026)
    if (targetDateString.includes('/')) {
        const parts = targetDateString.split('/');
        // JS menghitung bulan dari angka 0, jadi parts[1] harus dikurangi 1
        // new Date(Tahun, Bulan, Tanggal)
        targetDate = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
        // Untuk format standar internasional (YYYY-MM-DD)
        targetDate = new Date(targetDateString);
    }

    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};
const getProjects = async (req, res) => {
    try {
        const rawProjects = await fetchSheetData();
        const { startDate, endDate, highlight } = req.query;

        let processedProjects = rawProjects.map(project => {
            const planEnd = project['Plan End'];
            const status = project['Status'] ? project['Status'].trim() : '';
            const normalizedStatus = status.toLowerCase();
            
            let computedStatus = status; // Bawaan awal: langsung ambil teks dari kolom Status
            let daysRemaining = null;

            // PRIORITAS 1: Baca langsung dari kolom Status
            // Jika tertulis Completed/Done, langsung kunci statusnya, abaikan perhitungan tanggal
            if (normalizedStatus === 'completed' || normalizedStatus === 'done') {
                computedStatus = 'Completed';
            } 
            // PRIORITAS 2: Jika belum selesai, jalankan deteksi tanggal (Delayed / Due Soon)
            else if (planEnd) {
                daysRemaining = getDaysDifference(planEnd);
                
                if (daysRemaining < 0) {
                    computedStatus = 'Delayed';   // Lewat dari Plan End
                } else if (daysRemaining >= 0 && daysRemaining <= 10) {
                    computedStatus = 'Due Soon';  // Sisa waktu 0 - 10 hari
                } else {
                    // Waktu masih aman (>10 hari), kembali baca teks dari kolom Status (misal: "On Going")
                    // Jika kolom status kosong di Excel, otomatis beri label 'On Going'
                    computedStatus = status === '' ? 'On Going' : status;
                }
            }

            return {
                ...project,
                computedStatus,
                daysRemaining
            };
        });

        // Filter Rentang Tanggal
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0); // Set ke jam 00:00:00
            
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Set ke jam 23:59:59

            processedProjects = processedProjects.filter(p => {
                const planEndStr = p['Plan End'];
                // Jika proyek tidak punya tanggal Plan End, jangan tampilkan di hasil filter
                if (!planEndStr) return false; 

                let pEnd;
                // Terjemahkan format DD/MM/YYYY dari Google Sheets
                if (planEndStr.includes('/')) {
                    const parts = planEndStr.split('/');
                    pEnd = new Date(parts[2], parts[1] - 1, parts[0]);
                } else {
                    pEnd = new Date(planEndStr);
                }

                // Cocokkan apakah tanggal Plan End berada di dalam rentang filter
                return pEnd >= start && pEnd <= end;
            });
        }

        // Filter Highlight
        if (highlight) {
            processedProjects = processedProjects.filter(p => p['Highlight Project'] === highlight);
        }

        // Kalkulasi Metrik (On Going merangkum semua yang belum Completed)
        const metrics = {
            // Menghitung semua proyek KECUALI yang sudah 'Completed'
            onGoing: processedProjects.filter(p => p.computedStatus !== 'Completed').length,
            
            // Due Soon dan Delayed tetap dihitung terpisah untuk kartu metrik spesifik
            dueSoon: processedProjects.filter(p => p.computedStatus === 'Due Soon').length,
            delayed: processedProjects.filter(p => p.computedStatus === 'Delayed').length,
            
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