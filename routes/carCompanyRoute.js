const router = require('express').Router();

const { addCarCompany, updateCarCompany, getCarCompany, getAllCarCompanies, deleteCarCompany } = require('../controllers/carCompanyController');
const { verifyToken, verifyAdmin } = require('../middlewares/verifiyToken');
const verifiyObjectId = require('../middlewares/verifiyObjectId');
const { handleUploadImage } = require('../services/cloudImagesService');


// /api/companies
router.post("/", verifyToken, verifyAdmin, handleUploadImage, addCarCompany)

// /api/companies/:id
router.patch("/:id", verifiyObjectId, verifyToken, verifyAdmin, handleUploadImage, updateCarCompany)

// /api/companies/:id
router.delete("/:id", verifiyObjectId, verifyToken, verifyAdmin, deleteCarCompany)

// /api/companies
router.get("/", getAllCarCompanies)

// /api/companies/:id
router.get("/:id", verifiyObjectId, getCarCompany)



module.exports = router;