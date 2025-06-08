const mongoose = require('mongoose');
const Joi = require('joi');

const CarCompanySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    logo: {
        type: Object,
        default: {
            url: "",
            publicId: null,
        }

    },

}, {
    timestamps: true
});

const CarCompany = mongoose.model('CarCompany', CarCompanySchema);

function validateCreateCarCompany(obj) {
    const schema = Joi.object({
        name: Joi.string().trim().required(),
    });
    return schema.validate(obj);
}

function validateUpdateCarCompany(obj) {
    const schema = Joi.object({
        name: Joi.string(),
    });
    return schema.validate(obj);
}

module.exports = {
    CarCompany,
    validateCreateCarCompany,
    validateUpdateCarCompany,
};