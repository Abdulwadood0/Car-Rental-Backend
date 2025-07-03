const { Reservation, validateCreateReservation, validateUpdateReservation } = require('../models/Reservation');
const asyncHandler = require('express-async-handler');
const { Car } = require('../models/Car');
const { User } = require('../models/User');
const { toZonedTime } = require("date-fns-tz");


function toTimeZone(date) {
    const timeZone = "Asia/Riyadh";
    const zoned = toZonedTime(new Date(date), timeZone);
    zoned.setHours(0, 0, 0, 0); // normalize to midnight KSA
    return zoned;
}


function checkDate(startDate, endDate, length, newStartDate) {
    const timeZone = "Asia/Riyadh";
    let today = toZonedTime(new Date(), timeZone)
    today.setHours(0, 0, 0, 0);

    let maxStartDate = new Date(today);
    maxStartDate.setDate(today.getDate() + 5);

    if (newStartDate) {
        today = toZonedTime(new Date(newStartDate), timeZone)
        today.setHours(0, 0, 0, 0);
        maxStartDate = new Date(today);
        maxStartDate.setDate(today.getDate() + 5);
    }

    if (length === 0) {
        if (startDate < today || startDate > maxStartDate) {
            return "Start date must be between today and the next 5 days";
        }
    }


    const maxEndDate = new Date(startDate);
    maxEndDate.setDate(startDate.getDate() + 30);

    if (endDate <= startDate) {
        return "End date must be after the start date";
    }

    if (endDate > maxEndDate) {
        return "End date must be within 30 days of the start date";
    }

    return null;
}


/**------------------------------------------
 * @desc     Create Reservation
 * @route    /api/reservation
 * @method   POST
 * @access   private 
 ------------------------------------------*/
module.exports.CreateReservation = asyncHandler(async (req, res) => {
    const startDate = toTimeZone(req.body.startDate);
    const endDate = toTimeZone(req.body.endDate);

    const { error } = validateCreateReservation({ ...req.body, startDate, endDate });
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    const reservations = await Reservation.find({
        carId: req.body.carId,
        status: { $in: ["ongoing", "upcoming"] }
    });

    const dateError = checkDate(startDate, endDate, reservations.length);
    if (dateError) {
        return res.status(400).json({ message: dateError });
    }

    const car = await Car.findById(req.body.carId);
    if (!car) {
        return res.status(404).json({ message: "Car not found" });
    }



    if (reservations.length >= 2) {
        const upcomingReservation = reservations.find(res => res.status === "Upcoming");
        let availableDate = new Date(upcomingReservation.endDate);
        availableDate.setDate(availableDate.getDate() + 1);
        const formattedAvailableDate = availableDate.toLocaleDateString("en-GB");
        return res.status(400).json({ message: `Car is not available until ${formattedAvailableDate}` });
    }

    if (reservations.length === 1) {
        if (reservations[0].endDate > startDate) {
            return res.status(400).json({ message: `car is not available until ${reservations[0].endDate.toLocaleDateString("en-GB")}` });
        }
    }

    const totalPrice = car.pricePerDay * ((endDate - startDate) / (1000 * 60 * 60 * 24));

    const reservation = new Reservation({
        userId: req.user._id,
        carId: req.body.carId,
        startDate,
        endDate,
        totalPrice
    });

    await reservation.save();

    return res.status(200).json(reservation);
});



/**------------------------------------------
 * @desc     update a Reservation (startDate, endDate)
 * @route    /api/reservation/:id
 * @method   PATCH
 * @access   private  
 ------------------------------------------*/
module.exports.PatchReservation = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id);
    let message = ""

    if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
    }

    if (req.body.status !== "cancelled") {
        const startDate = toTimeZone(req.body.startDate);
        const endDate = toTimeZone(req.body.endDate);

        const { error } = validateUpdateReservation({ ...req.body, startDate, endDate });
        if (error) {

            return res.status(400).json({ message: error.details[0].message });
        }

        if (reservation.status === "cancelled" || reservation.status === "completed") {
            return res.status(400).json({ message: "Cannot update a cancelled or completed reservation" });
        }

        // Check if the logged-in user owns the reservation or is an admin
        if (reservation.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const reservations = await Reservation.find({
            carId: reservation.carId,
            status: { $in: ["ongoing", "upcoming"] }
        });

        if (reservations.length >= 2 || (reservations.length === 1 && reservations[0].endDate > startDate)) {
            reservation.status = "cancelled"
            await reservation.save();
            return res.status(400).json({ message: `Car is not available` });
        }

        let newStartDate = null
        if (reservations.length === 1) {
            newStartDate = reservations[0].endDate
        }




        // update startDate and endDate if provided
        if (req.body.startDate || req.body.endDate) {
            const dateError = checkDate(startDate, endDate, null, newStartDate);
            if (dateError) {
                return res.status(400).json({ message: dateError });
            }

            // Prevent updates on ongoing or upcoming reservations
            if (reservation.status === "ongoing" || reservation.status === "upcoming") {
                return res.status(400).json({ message: "Cannot update this reservation" });
            }

            reservation.startDate = startDate;
            reservation.endDate = endDate;
            reservation.totalPrice = req.body.totalPrice;
            message = "Reservation updated successfully"

        }

    }


    if (req.body.status) {
        const from = reservation.status;
        const to = req.body.status;

        const allowed = {
            pending: ["ongoing", "cancelled"],
            ongoing: ["completed", "cancelled"],
            upcoming: ["ongoing", "cancelled"],
        };

        if (!allowed[from]?.includes(to)) {
            return res.status(400).json({ message: `Invalid transition: ${from} → ${to}` });
        }

        if (to === "ongoing") {
            reservation.actualStart = new Date();
            message = "Reservation started successfully";
        }
        if (to === "completed") {
            reservation.actualEnd = new Date();
            message = "Reservation completed successfully";
        }
        if (to === "cancelled") {
            message = "Reservation cancelled successfully";
        }

        reservation.status = to;
    }

    await reservation.save();
    return res.status(200).json({
        message: message,
    });

})



/**------------------------------------------
 * @desc     Get Reservation
 * @route    /api/reaservation/:id
 * @method   GET
 * @access   private  
 ------------------------------------------*/
module.exports.getReservation = asyncHandler(async (req, res) => {


    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
    }

    if ((reservation.userId.toString() === req.user._id) || req.user.isAdmin) {
        return res.status(200).json(reservation);

    } else
        return res.status(401).json({ message: "Unauthorized" });

})


/**------------------------------------------
 * @desc     Get All Reservation
 * @route    /api/reservation
 * @method   GET
 * @access   private  
 ------------------------------------------*/
module.exports.getAllReservation = asyncHandler(async (req, res) => {

    const { page, limit, status, search } = req.query;

    // Initialize the query object
    let query = {};

    if (!req.user.isAdmin) {
        query.userId = req.user._id
    }

    // If status is provided, filter by status
    if (status) {
        query.status = status;
    }

    // Set pagination values
    const skip = (page - 1) * limit;
    const count = Math.ceil(await Reservation.countDocuments(query) / limit);

    // If the user is an admin and a search term is provided
    if (req.user.isAdmin && search) {
        // Find the user based on email or phone
        const user = await User.find({
            $or: [
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ]
        }).select('_id');

        if (user.length === 1) {
            // If the user is found, filter reservations by the user's ID
            query.userId = user[0]._id;
        } else {
            return res.status(404).json({ message: "User not found" });
        }
    }

    // Fetch the reservations based on the query
    const reservations = await Reservation
        .find(query)
        .populate("paymentId") // Populate payment information
        .populate("carId") // Populate car information
        .sort({ createdAt: -1 }) // Sort by creation date (descending)
        .skip(skip) // Apply pagination skip
        .limit(limit); // Apply pagination limit


    if (reservations.length === 0) {
        return res.status(404).json({ message: "No reservations found" });
    }

    // Return the reservations and the count
    return res.status(200).json({ reservations, count });
});




