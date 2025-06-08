const router = require('express').Router();

const { sendResetPasswordLink, resetPassword, verifiyPasswordResetLink } = require('../controllers/passwordController');


// /api/password/reset-password-link
router.post("/reset-password-link", sendResetPasswordLink)

// /api/password/reset-password/:id/:token
router.get("/reset-password/:id/:token", verifiyPasswordResetLink)

// /api/password/reset-password/:id/:token
router.put("/reset-password/:id/:token", resetPassword)


module.exports = router;