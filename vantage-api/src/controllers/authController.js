const supabase = require('../config/supabaseClient');

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    try {
        // 1. Autentikasi User[cite: 11]
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            return res.status(401).json({ success: false, message: error.message });
        }

        // 2. Ambil Displayname dari tabel 'users'
        let displayName = email.split('@')[0]; // Fallback bawaan
        
        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('displayname')
                .eq('email', email)
                .single();
                
            if (userData && userData.displayname) {
                displayName = userData.displayname;
            }
        } catch (dbErr) {
            console.error("Gagal mengambil displayname:", dbErr);
            // Abaikan error agar user tetap bisa login dengan fallback email
        }

        res.status(200).json({
            success: true,
            message: 'Otentikasi berhasil',
            user: {
                id: data.user.id,
                email: data.user.email,
                displayName: displayName // <-- Nama dari database dikirim ke frontend
            },
            token: data.session.access_token 
        });

    } catch (error) {
        console.error("Auth Error:", error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server otentikasi' });
    }
};

module.exports = { loginUser };