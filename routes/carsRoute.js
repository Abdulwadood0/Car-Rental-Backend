const { addCar, deleteCar, updateCar, getAllCars, getCar, getCarsCount, uploadCarImage, getPriceRanges, getCarByYearAndModel } = require('../controllers/carsController');
const { verifyToken, verifyAdmin, optionalVerifyToken } = require('../middlewares/verifiyToken');
const verifiyObjectId = require('../middlewares/verifiyObjectId');
const { handleUploadMultipleImges } = require('../services/cloudImagesService');

const router = require('express').Router();

// /api/cars
router.post("/", verifyToken, verifyAdmin, handleUploadMultipleImges, addCar)

// api/cars/:id
router.delete("/:id", verifiyObjectId, verifyToken, verifyAdmin, deleteCar)

// /api/cars/:id
router.put("/:id", verifiyObjectId, verifyToken, verifyAdmin, handleUploadMultipleImges, updateCar)

// /api/cars/:id
router.get("/", optionalVerifyToken, getAllCars)

// /api/cars/by-year
router.get("/by-year", getCarByYearAndModel)

// /api/cars/priceranges
router.get("/priceranges", getPriceRanges)

// /api/cars/count
router.get("/count", getCarsCount)

// /api/cars/:id
router.get("/:id", verifiyObjectId, getCar)




module.exports = router;