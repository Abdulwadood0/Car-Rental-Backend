const asyncHandler = require("express-async-handler");
const { Car, validateCreateCar, validateUpdateCar } = require("../models/Car");
const { Reservation } = require("../models/Reservation");
const { CarCompany } = require("../models/CarCompany");
const { uploadImages, deleteImages, deleteImage } = require("../services/cloudImagesService");
const { model } = require("mongoose");
const e = require("express");


/**------------------------------------------
 * @desc     Create Car
 * @route    /api/cars
 * @method   POST
 * @access   private (only admin) 
 ------------------------------------------*/
module.exports.addCar = asyncHandler(async (req, res) => {


    const { error } = validateCreateCar(req.body);

    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    if (req.files.length > 2 || req.files.length < 2 || !req.files) {
        return res.status(400).json({ message: 'Please upload exactly two images' });
    }

    // Check if all files are images
    for (let file of req.files) {
        if (!file.mimetype.startsWith('image/')) {
            return res.status(400).json({ message: 'All files must be images' });
        }
    }


    const result = await uploadImages(req.files);

    const car = new Car({
        carCompanyId: req.body.carCompanyId,
        model: req.body.model,
        images: result,
        year: req.body.year,
        pricePerDay: req.body.pricePerDay,
        fuelType: req.body.fuelType,
        transmission: req.body.transmission,
        plateNumber: req.body.plateNumber,
    });

    await car.save();

    return res.status(200).json(car);

})


/**------------------------------------------
 * @desc     Delete Car
 * @route    /api/cars/:id
 * @method   Delete
 * @access   private (only admin) 
 ------------------------------------------*/
module.exports.deleteCar = asyncHandler(async (req, res) => {

    const car = await Car.findById(req.params.id);
    if (!car) {
        return res.status(404).json({ message: "Car not found" });
    }

    const publicIds = car.images.map((image) => image.publicId);



    if (publicIds.length === 1) {
        await deleteImage(publicIds[0]);
    } else {
        await deleteImages(publicIds);

    }

    await Car.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Car deleted successfully" });

})


/**------------------------------------------
 * @desc     Update Car
 * @route    /api/cars/:id
 * @method   PUT
 * @access   private (only admin) 
 ------------------------------------------*/
module.exports.updateCar = asyncHandler(async (req, res) => {

    req.body.images = JSON.parse(req.body.images)
    req.body.publicIds = JSON.parse(req.body.publicIds || "[]");


    let car = await Car.findById(req.params.id);
    if (!car) {
        return res.status(404).json({ message: "Car not found" });
    }

    const { error } = validateUpdateCar(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }


    // Delete images from cloud if Admin want to delete them
    if (req.body.publicIds && req.body.publicIds.length > 0) {

        const publicIds = req.body.publicIds;

        if (publicIds.length === 1) {
            await deleteImage(publicIds[0]);
        } else {
            await deleteImages(publicIds);
        }

        car.images = car.images.filter((image) => !publicIds.includes(image.publicId));

    }



    // Upload new images to cloud if Admin want to
    if (req.files) {

        if (req.files.length > 2) {
            res.status(400).json({ message: 'You can upload a maximum of 2 images' });
        }

        // Check if all files are images
        for (let file of req.files) {
            if (!file.mimetype.startsWith('image/')) {
                res.status(400).json({ message: 'All files must be images' });
            }
        }


        const result = await uploadImages(req.files);


        car.images = [...car.images, ...result];



    }



    const updatedCar = await Car.findByIdAndUpdate(req.params.id,
        {
            $set: {
                model: req.body.model,
                year: req.body.year,
                pricePerDay: req.body.pricePerDay,
                fuelType: req.body.fuelType,
                transmission: req.body.transmission,
                status: req.body.status,
                images: car.images
            }
        },
        { new: true });

    return res.status(200).json(updatedCar);


})



/**------------------------------------------
 * @desc     Get All Cars
 * @route    /api/cars
 * @method   GET
 * @access   public 
 ------------------------------------------*/
module.exports.getAllCars = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, model, search, companyId, sortBy } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const isAdmin = req.user?.isAdmin === true;

    let query = {};

    // handle unique-years by model if needed
    if (model && !search) {
        const yearsDocs = await Car
            .find({ model })
            .sort({ year: -1 })
            .select("year -_id");
        const uniqueYears = [...new Set(yearsDocs.map(d => d.year))];
        return res.status(200).json(uniqueYears);
    }

    // build common OR-clauses array
    const orClauses = [];

    if (search) {
        const rx = { $regex: search, $options: "i" };

        // always allow model
        orClauses.push({ model: rx });

        // only admin search by plateNumber
        if (isAdmin) {
            orClauses.push({ plateNumber: rx });
        }

        const companies = await CarCompany
            .find({ name: rx })
            .select("_id");

        const companyIds = companies.map(c => c._id);
        if (companyIds.length) {
            orClauses.push({ carCompanyId: { $in: companyIds } });
        }
    }

    if (orClauses.length) {
        query.$or = orClauses;
    }

    if (companyId) {
        query.carCompanyId = companyId;
    }

    let sortObj = { year: -1 };
    if (sortBy) {
        const direction = sortBy === "asc" ? 1 : -1;
        sortObj = { pricePerDay: direction };
    }


    const cars = await Car.find(query)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .sort(sortObj)
        .populate("carCompanyId");

    const total = await Car.countDocuments(query);
    const pageCount = Math.ceil(total / limitNum);


    return res.status(200).json({ cars, count: pageCount });
});




/**------------------------------------------
 * @desc     Get Car
 * @route    /api/cars/:id
 * @method   GET
 * @access   public 
 ------------------------------------------*/
module.exports.getCar = asyncHandler(async (req, res) => {

    let car = await Car.findById(req.params.id).populate("carCompanyId");
    if (!car) {
        return res.status(404).json({ message: "Car not found" });
    }

    return res.status(200).json(car);


})


/**------------------------------------------
 * @desc     Get Car by year and model
 * @route    /api/cars/by-year
 * @method   GET
 * @access   public 
 ------------------------------------------*/
module.exports.getCarByYearAndModel = asyncHandler(async (req, res) => {

    const { year, model, carId } = req.query;

    if (!year || !model) {
        return res.status(400).json({ message: "Year and model are required" });
    }

    let cars = await Car.find({ year: year, model: model }).populate("carCompanyId");
    if (cars.length === 0) {
        return res.status(404).json({ message: "No cars found" });
    }

    if (carId) {
        const reservation = await Reservation.find({ carId: carId, status: { $in: ["ongoing", "upcoming"] } })

        if (reservation.length > 1) {
            reservation.status = "cancelled"
            await reservation.save();
            return res.status(404).json({ message: "Car is no longer avalible" });
        }

        if (reservation.length === 1) {
            const endDate = new Date(reservation[0].endDate);
            return res.status(200).json({ car: cars[0], endDate });
        }

        return res.status(200).json(cars[0]);
    }


    const carIds = cars.map((car) => car._id.toString());

    const carsObjectIds = cars.map((car) => car._id);


    const reservations = await Reservation.aggregate([
        {
            $match: {
                carId: { $in: carsObjectIds },
                status: { $in: ["ongoing", "upcoming"] }
            }
        },
        {
            $sort: { endDate: -1 }

        },
        {
            $group: {
                _id: "$carId",
                count: { $sum: 1 },
                earliestEndDate: { $first: "$endDate" }
            }
        },
        {
            $sort: { count: 1, earliestEndDate: 1 }

        },

    ]);


    if (reservations.length === 0) {

        return res.status(200).json(cars[0]);

    }



    // all the code below is to find the car with the least number of reservations
    // and the earliest end date

    const reservationCarIds = reservations.map((reservation) => reservation._id.toString());

    // check if there is a car with no reservations
    for (let i = 0; i < carIds.length; i++) {
        if (!reservationCarIds.includes(carIds[i])) {

            return res.status(200).json(cars[i]);
        }
    }

    const reservationCountMap = {};
    reservations.forEach(item => {
        reservationCountMap[item._id.toString()] = item.count;
    });


    const values = Object.values(reservationCountMap);
    const allEqual = values.every(value => value === values[0]);


    // only two reservations for ech car
    if (allEqual && values[0] === 2) {

        const date = new Date(reservations[0].earliestEndDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        const car = await Car.findById(reservations[0]._id).populate("carCompanyId");
        return res.status(200).json({ message: `${date}`, car, endDate: reservations[0].earliestEndDate });

    }

    if (allEqual && values[0] === 1) {

        const date = new Date(reservations[0].earliestEndDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        const car = await Car.findById(reservations[0]._id).populate("carCompanyId");
        return res.status(200).json({ car, endDate: reservations[0].earliestEndDate });

    }

    const car = await Car.findById(reservations[0]._id).populate("carCompanyId");
    return res.status(200).json({ car, endDate: reservations[0].earliestEndDate });

})


/**------------------------------------------
 * @desc     Get Price ranges for each car
 * @route    /api/cars/priceranges
 * @method   GET
 * @access   public 
 ------------------------------------------*/
module.exports.getPriceRanges = asyncHandler(async (req, res) => {

    const priceRanges = await Car.aggregate([
        {
            $group: {
                _id: "$model",
                minPrice: { $min: "$pricePerDay" },
                maxPrice: { $max: "$pricePerDay" }
            }
        },
        {
            $project: {
                _id: 0,
                model: "$_id",
                minPrice: 1,
                maxPrice: 1
            }
        }

    ]);

    if (!priceRanges) {
        return res.status(404).json({ message: "no cars found" });
    }

    return res.status(200).json(priceRanges);
})

/**------------------------------------------
 * @desc     Get Cars Count 
 * @route    /api/cars/count
 * @method   GET
 * @access   public 
 ------------------------------------------*/
module.exports.getCarsCount = asyncHandler(async (req, res) => {

    let carsCount = await Car.countDocuments();

    if (!carsCount) {
        return res.status(404).json({ message: "no cars found" });
    }

    return res.status(200).json(carsCount);


})

module.exports.uploadCarImage = asyncHandler(async (req, res) => {

    return res.status(200).json({ message: "Image uploaded successfully" });
})