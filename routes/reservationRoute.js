const router = require('express').Router();
const { verifyToken, verifyAdmin } = require('../middlewares/verifiyToken');

const {
    CreateReservation,
    getReservation,
    getAllReservation,
    cancelReservation,
    PatchReservation,
} = require('../controllers/reservationController');
const verifyObjectId = require('../middlewares/verifiyObjectId');


// /api/reservation
router.post("/", verifyToken, CreateReservation)

// /api/reservation/:id
router.patch("/:id", verifyObjectId, verifyToken, PatchReservation)

// /api/reservation/:id
router.get("/:id", verifyObjectId, verifyToken, getReservation)

// /api/reservation
router.get("/", verifyToken, getAllReservation)



module.exports = router;