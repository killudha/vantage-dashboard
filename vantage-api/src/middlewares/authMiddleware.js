const supabase = require('../config/supabaseClient');

const verifyToken = async (req, res, next) => {
    // 1. Ambil token dari header 'Authorization'
    const authHeader = req.headers.authorization;

    // 2. Cek apakah token ada dan formatnya "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Akses ditolak. Anda belum login (Token tidak ditemukan).' 
        });
    }

    // 3. Pisahkan teks "Bearer " untuk mengambil token aslinya saja
    const token = authHeader.split(' ')[1];

    try {
        // 4. Minta Supabase memvalidasi apakah token ini asli dan belum kedaluwarsa
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.',
                error: error?.message
            });
        }

        // 5. Simpan identitas user ke object request, agar controller bisa tahu siapa yang sedang akses
        req.user = data.user;

        // 6. Token aman! Loloskan ke Controller tujuan
        next();
        
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan internal saat memvalidasi otentikasi.' });
    }
};

module.exports = { verifyToken };