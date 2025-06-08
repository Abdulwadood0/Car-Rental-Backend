const rourter = require('express').Router();

const { signUp, logIn } = require('../controllers/authController');


// api/auth/signUp
rourter.post('/signup', signUp)

// api/auth/logIn
rourter.post('/login', logIn)

module.exports = rourter;