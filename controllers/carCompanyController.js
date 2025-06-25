const asyncHandler = require('express-async-handler');

const { CarCompany, validateUpdateCarCompany, validateCreateCarCompany, } = require('../models/CarCompany');
const { uploadImage, deleteImage } = require('../services/cloudImagesService');

/**------------------------------------------
 * @desc     Create Car Company
 * @route    /api/companies
 * @method   POST
 * @access   private (only admin) 
 ------------------------------------------*/
module.exports.addCarCompany = asyncHandler(async (req, res) => {

    const { error } = validateCreateCarCompany(req.body);

    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    if (!req.file) {
        res.status(400).json({ message: 'Please upload one image' });
    }

    if (!req.file.mimetype.startsWith('image/')) {
        res.status(400).json({ message: 'file must be image' });
    }

    const result = await uploadImage(req.file);



    const carCompany = new CarCompany({
        name: req.body.name,
        logo: result,
    });

    await carCompany.save();

    return res.status(200).json({ message: "car company created successfully" });

})


/**------------------------------------------
 * @desc     Delete Car Company
 * @route    /api/companies/:id
 * @method   Delete
 * @access   private (only admin) 
 ------------------------------------------*/
module.exports.deleteCarCompany = asyncHandler(async (req, res) => {

    const carCompany = await CarCompany.findById(req.params.id);

    if (!carCompany) {
        return res.status(404).json({ message: "Car Company not found" });
    }

    const publicId = carCompany.logo.publicId
    await deleteImage(publicId);

    await CarCompany.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: "Car Company deleted successfully" });
})
/**------------------------------------------
 * @desc     Update Car Company
 * @route    /api/companies/:id
 * @method   Patch
 * @access   private (only admin) 
 ------------------------------------------*/
module.exports.updateCarCompany = asyncHandler(async (req, res) => {
    const carCompany = await CarCompany.findById(req.params.id);

    if (!carCompany) {
        return res.status(404).json({ message: "Car Company not found" });
    }

    const { error } = validateUpdateCarCompany(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    if (req.file) {
        const publicId = carCompany.logo.publicId


        await deleteImage(publicId);
        const result = await uploadImage(req.file);
        req.body.logo = result;
    }

    await CarCompany.findByIdAndUpdate(req.params.id, {
        $set: {
            name: req.body.name,
            country: req.body.country,
            logo: req.body.logo,
        }
    },
        { new: true });

    return res.status(200).json({ message: "Car Company updated successfully" });

})

/**------------------------------------------
 * @desc     Get Car Company
 * @route    /api/companies/:id
 * @method   GET
 * @access   public 
 ------------------------------------------*/
module.exports.getCarCompany = asyncHandler(async (req, res) => {

    const carCompany = await CarCompany.findById(req.params.id);

    if (!carCompany) {
        return res.status(404).json({ message: "Car Company not found" });
    }

    return res.status(200).json(carCompany);
})

/**------------------------------------------
 * @desc     Get All Cars Companies
 * @route    /api/companies
 * @method   GET
 * @access   public 
 ------------------------------------------*/
module.exports.getAllCarCompanies = asyncHandler(async (req, res) => {

    const carCompanies = await CarCompany.find();


    if (!carCompanies) {
        return res.status(404).json({ message: "no car companies found" });
    }

    return res.status(200).json(carCompanies);
})