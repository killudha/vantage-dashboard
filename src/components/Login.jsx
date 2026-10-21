import React, { useState } from 'react';
import '../styles/Login.css';
import { FiUser, FiLock, FiEyeOff, FiEye } from 'react-icons/fi';

const Login = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="logo-circle">
          <span className="logo-text">VANTAGE</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
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

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;