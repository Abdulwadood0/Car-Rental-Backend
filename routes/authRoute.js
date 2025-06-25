const rourter = require('express').Router();

const { signUp, logIn, me, logout } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/verifiyToken');


// api/auth/signUp
rourter.post('/signup', signUp)

// api/auth/logIn
rourter.post('/login', logIn)

// api/auth/me
rourter.get('/me', verifyToken, me)

// api/auth/logout
rourter.post('/logout', verifyToken, logout)

module.exports = rourter;