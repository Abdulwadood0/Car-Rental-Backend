const mongoose = require('mongoose');
const Joi = require('joi');

const ReservationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    carId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Car",
        required: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        default: null
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "ongoing", "upcoming", "completed", "cancelled"],
        default: "pending"
    },
    cancelReason: {
        type: String,
        default: null
    },

}, {
    timestamps: true
})

const Reservation = mongoose.model('Reservation', ReservationSchema);

function validateCreateReservation(obj) {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today (midnight)

    const schema = Joi.object({
        carId: Joi.string().required(),
        startDate: Joi.date().min(now).required(),
        endDate: Joi.date().greater(Joi.ref("startDate")).required(), // Ensures endDate is after startDate
        totalPrice: Joi.number().required(),
    });
    return schema.validate(obj);
}

function validateUpdateReservation(obj) {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today (midnight)
    const schema = Joi.object({
        startDate: Joi.date().min(now).optional(),
        endDate: Joi.date()
            .greater(Joi.ref("startDate"))
            .when("startDate", {
                is: Joi.exist(),
                then: Joi.required(),
                otherwise: Joi.optional()
            }),
        totalPrice: Joi.number().optional(),
        status: Joi.string()
            .valid("pending", "ongoing", "upcoming", "completed", "cancelled")
            .optional(),
    })
        // require at least one key:
        .min(1)
        .messages({
            "object.min": "At least one of startDate, endDate, totalPrice or status must be provided"
        });

    return schema.validate(obj);
}


module.exports = {
    Reservation,
    validateCreateReservation,
    validateUpdateReservation,
}