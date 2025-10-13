const mongoose = require('mongoose');
const Joi = require('joi');

const CarSchema = new mongoose.Schema({

    carCompanyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CarCompany",
        required: true
    },
    model: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    bodyType: {
        type: String,
        enum: ["Sedan", "SUV", "Hatchback", "Truck", "Van"],
        required: true
    },
    pricePerDay: {
        type: Number,
        required: true
    },
    fuelType: {
        type: String,
        enum: ["Gasoline", "Diesel", "Electric", "Hybrid"],
        required: true
    },
    plateNumber: {
        type: String,
        required: true
    },
    images: [
        {
            url: { type: String, default: "" },
            publicId: { type: String, default: null }
        }
    ],
    transmission: {
        type: String,
        enum: ["Automatic", "Manual"],
        required: true
    },
    status: {
        type: String,
        enum: ["Available", "Unavailable", "Maintenance", "Reserved"],
        default: "Available"
    },

}, {
    timestamps: true
})

const Car = mongoose.model('Car', CarSchema);

function validateCreateCar(obj) {
    const schema = Joi.object({
        carCompanyId: Joi.string().required(),
        model: Joi.string().required(),
        bodyType: Joi.string().required().valid("Sedan", "SUV", "Hatchback", "Truck", "Van"),
        plateNumber: Joi.string().required(),
        year: Joi.number().required(),
        pricePerDay: Joi.number().required(),
        fuelType: Joi.string().required().valid("Gasoline", "Diesel", "Electric", "Hybrid"),
        transmission: Joi.string().required(),
    });
    return schema.validate(obj);
}

function validateUpdateCar(obj) {
    const schema = Joi.object({
        model: Joi.string(),
        year: Joi.number(),
        pricePerDay: Joi.number(),
        bodyType: Joi.string().valid("Sedan", "SUV", "Hatchback", "Truck", "Van"),
        fuelType: Joi.string().valid("Gasoline", "Diesel", "Electric", "Hybrid"),
        transmission: Joi.string(),
        status: Joi.string().valid("Available", "Unavailable", "maintenance", "Reserved"),
        images: Joi.array(),
        publicIds: Joi.array(),

    });
    return schema.validate(obj);
}

module.exports = {
    Car,
    validateCreateCar,
    validateUpdateCar,
}