const { Payment } = require("../models/Payment");
const asyncHandler = require('express-async-handler');
const { processPayment } = require('../services/paymentService');
const { Car } = require("../models/Car");
const { Reservation } = require("../models/Reservation");
const axios = require('axios');

/**------------------------------------------
 * @desc     Create payment
 * @route    /api/payment/:id
 * @method   POST
 * @access   private 
 ------------------------------------------*/
module.exports.createPayment = asyncHandler(async (req, res) => {


    let reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
    }


    let reservations = await Reservation.find({ carId: reservation.carId, status: { $in: ["ongoing", "upcoming"] } })
    if (reservations.length >= 2) {
        reservation.status = "cancelled"
        await reservation.save();

        return res.status(404).json({ message: "Car is no longer avalible" });
    }


    if (req.user._id.toString() !== reservation.userId.toString()) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    let car = await Car.findById(reservation.carId);
    if (!car) {
        return res.status(404).json({ message: "Car not found" });
    }


    let { description, source } = req.body
    const amount = (reservation.totalPrice * 100) // convert to hallas

    const payment = await processPayment({
        amount,
        description,
        source
    })

    const newPayment = new Payment({
        userId: req.user._id,
        reservationId: reservation._id,
        transactionId: payment.id,
        amount: amount,
        paymentDate: new Date(),
        paymentMethod: "Credit Card",
        transactionId: payment.id,
        status: payment.status

    })
    await newPayment.save()

    reservation.paymentId = newPayment._id


    await reservation.save()

    if (payment.status === "paid") {

        await updateReservation(reservation)

        return res.status(200).json({ message: "Payment successful", payment: newPayment, })

    } else if (payment.status === "initiated") {
        return res.status(200).json({
            message: "Payment requires authentication",
            redirectUrl: payment.source.transaction_url,
        })
    } else {
        return res.status(400).json({ message: "Payment failed", payment });
    }



})


/**------------------------------------------
 * @desc     Retry payment
 * @route    /api/payment/retry/:id
 * @method   POST
 * @access   private  
 ------------------------------------------*/
module.exports.retryPayment = asyncHandler(async (req, res) => {

    let reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
    }


    let reservations = await Reservation.find({ carId: reservation.carId, status: { $in: ["ongoing", "upcoming"] } })

    if (reservations.length >= 2) {
        reservation.status = "cancelled"
        await reservation.save();

        return res.status(404).json({ message: "Car is no longer avalible" });
    }


    let dbPayment = await Payment.findOne({ reservationId: reservation._id })
    if (!dbPayment) {
        return res.status(404).json({ message: "Payment not found" });
    }
    if (dbPayment.status === "paid") {
        return res.status(400).json({ message: "Payment is already successful" });
    }


    if (req.user._id.toString() !== reservation.userId.toString()) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    let car = await Car.findById(reservation.carId);
    if (!car) {
        return res.status(404).json({ message: "Car not found" });
    }


    let { description, source } = req.body
    const amount = (reservation.totalPrice * 100) // convert to hallas

    const payment = await processPayment({
        amount,
        description,
        source
    })


    await Payment.findByIdAndUpdate(dbPayment._id, {
        $set: {
            transactionId: payment.id,
            status: payment.status
        }
    })



    if (payment.status === "paid") {

        await updateReservation(reservation)

        return res.status(200).json({ message: "Payment successful", payment })

    } else if (payment.status === "initiated") {
        return res.status(200).json({
            message: "Payment requires authentication",
            redirectUrl: payment.source.transaction_url,
        })
    } else {
        return res.status(400).json({ message: "Payment failed", payment });
    }



})
async function updateReservation(reservation) {
    reservation.status = "upcoming"

    await reservation.save();
}


module.exports.handelPaymentCallback = asyncHandler(async (req, res) => {
    const paymentId = req.query.id;

    const moyasarPayment = await axios.get(
        `https://api.moyasar.com/v1/payments/${paymentId}`,
        {
            auth: {
                username: process.env.MOYASAR_SECRET_KEY,
                password: ''
            }
        }
    );

    if (!moyasarPayment) {
        return res.status(500).json({ message: 'Payment callback failed' });
    }

    const payment = await Payment.findOneAndUpdate(
        { transactionId: paymentId },
        { $set: { status: moyasarPayment.data.status } },
        { new: true }
    )

    if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
    }

    if (moyasarPayment.data.status === 'paid') {

        const reservation = await Reservation.findById(payment.reservationId);
        const car = await Car.findById(reservation.carId);
        await updateReservation(reservation);

        return res.status(200).json({ message: 'Payment has been completed successfully', payment });

    } else {
        return res.status(400).json({ message: 'Payment failed' });
    }



})