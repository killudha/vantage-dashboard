const supabase = require('../config/supabaseClient');

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            // Error 401 berarti kredensial salah
            return res.status(401).json({ success: false, message: error.message });
        }

        // Supabase mengembalikan object 'session' yang berisi access_token (JWT)
        res.status(200).json({
            success: true,
            message: 'Otentikasi berhasil',
            user: {
                id: data.user.id,
                email: data.user.email
            },
            token: data.session.access_token 
        });

    } catch (error) {
        console.error("Auth Error:", error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server otentikasi' });
    }
};

module.exports = { loginUser };