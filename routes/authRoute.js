const rourter = require('express').Router();

const { signUp, logIn, me, logout, refreshToken } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/verifiyToken');


// api/auth/signUp
rourter.post('/signup', signUp)

// api/auth/logIn
rourter.post('/login', logIn)

// api/auth/refresh
rourter.post('/refresh', refreshToken)

// api/auth/me
rourter.get('/me', verifyToken, me)

// api/auth/logout
rourter.post('/logout', verifyToken, logout)

module.exports = rourter;