require('dotenv').config();
const express = require('express');
const cors = require('cors');
const projectRoutes = require('./src/routes/projectRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Di bagian atas bersama import lainnya
const authRoutes = require('./src/routes/authRoutes');


// Middleware
app.use(cors());
app.use(express.json());

// Daftarkan Routes
app.use('/api/projects', projectRoutes);

// Di bagian bawah, di bawah app.use('/api/projects', ...)
app.use('/api/auth', authRoutes);

// Test Route
app.get('/', (req, res) => {
    res.send('Vantage Backend API is running smoothly!');
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server nyala di http://localhost:${PORT}`);
});

