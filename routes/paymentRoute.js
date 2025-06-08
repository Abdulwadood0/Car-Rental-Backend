const router = require('express').Router();
const { createPayment, handelPaymentCallback, retryPayment } = require('../controllers/paymentController');
const { verifyToken } = require('../middlewares/verifiyToken');
const verifyobjectId = require('../middlewares/verifiyObjectId');
// /api/payment/:id
router.post("/:id", verifyobjectId, verifyToken, createPayment)

// /api/payment/retry/:id
router.post("/retry/:id", verifyToken, retryPayment)

// /api/payment/callback
router.get("/callback", handelPaymentCallback)



module.exports = router;