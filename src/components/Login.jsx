import React, { useState } from 'react';
import axios from 'axios';
import '../styles/Login.css';
import { FiUser, FiLock, FiEyeOff, FiEye } from 'react-icons/fi';

const Login = () => {
    // State untuk fungsi autentikasi
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // State untuk fungsi mata (show/hide password) bawaan UI Anda
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password
            });

            if (response.data.success) {
                // Simpan tiket token dan arahkan ke Dashboard
                localStorage.setItem('vantage_token', response.data.token);
                window.location.href = '/'; 
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login gagal. Periksa email atau password Anda.');
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="logo-circle">
          <span className="logo-text">VANTAGE</span>
        </div>

        {/* Gunakan handleLogin untuk memicu API saat tombol ditekan */}
        <form className="login-form" onSubmit={handleLogin}>
          
          {/* Menampilkan pesan error jika login ditolak API */}
          {error && <p style={{ color: '#ff4d4f', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>{error}</p>}

          <div className="input-field">
            <FiUser className="field-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-field">
            <FiLock className="field-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={togglePasswordVisibility}
              aria-label="Toggle password visibility"
            >
              {showPassword ? (
                <FiEye className="field-icon toggle-icon" />
              ) : (
                <FiEyeOff className="field-icon toggle-icon" />
              )}
            </button>
          </div>

          {/* Tombol otomatis mati saat sedang loading memeriksa ke database */}
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Memeriksa...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;