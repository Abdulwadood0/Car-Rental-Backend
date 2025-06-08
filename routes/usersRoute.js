const router = require('express').Router();
const { getAllUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middlewares/verifiyToken');
const validateObjectId = require('../middlewares/verifiyObjectId');


// /api/users
router.get("/", verifyToken, verifyAdmin, getAllUsers)

// /api/users/:id
router.get("/:id", validateObjectId, verifyToken, getUser)

// /api/users/:id
router.put("/:id", validateObjectId, verifyToken, updateUser)

// /api/users/:id
router.delete("/:id", validateObjectId, verifyToken, deleteUser)


module.exports = router;