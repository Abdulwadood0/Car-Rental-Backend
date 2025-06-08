const mongoose = require('mongoose');
const joi = require('joi');

const PaymentSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    reservationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reservation",
        required: true
    },
    transactionId: {
        type: String,
        required: true,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    paymentDate: {
        type: Date,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ["Debit Card", "Credit Card"],
        required: true
    },
    status: {
        type: String,
        default: "Pending"
    },
})

const Payment = mongoose.model("Payment", PaymentSchema);


module.exports = {
    Payment,

}