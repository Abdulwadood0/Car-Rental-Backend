const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,


});



const User = mongoose.model('User', UserSchema);


function generateAccessToken(user) {
    return jwt.sign({
        _id: user._id,
        isAdmin: user.isAdmin,
    },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: "20m"
        })
}

function generateRefreshToken(user) {
    return jwt.sign({
        _id: user._id,

    },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: "30d"
        })
}

function validateSignUpUser(obj) {
    const schema = Joi.object({
        firstname: Joi.string().trim().min(3).max(25).lowercase().required(),
        lastname: Joi.string().trim().min(3).max(25).lowercase().required(),
        username: Joi.string().trim().min(3).max(25).lowercase().pattern(/^[a-z0-9_]+$/)
            .messages({
                "string.pattern.base": "Username must contain only lowercase English letters and numbers."
            }).required(),
        email: Joi.string().trim().max(100).email().lowercase().required(),
        phone: Joi.string().trim().min(9).max(10).pattern(/^[0-9]+$/)
            .messages({
                "string.pattern.base": "Phone number must contain only numbers."
            }).required(),
        password: Joi.string().trim().min(6).pattern(/^[\x00-\x7F]+$/)
            .messages({
                "string.pattern.base": "Password must only contain English characters, numbers, and special characters."
            }).required()
    });
    return schema.validate(obj);
}

function validateLogInUser(obj) {
    const schema = Joi.object({
        username: Joi.string().trim().min(3).max(25).lowercase().required(),
        password: Joi.string().trim().min(6).required()
    });
    return schema.validate(obj);
}

function validateUpdateUser(obj) {
    const schema = Joi.object({
        firstname: Joi.string().trim().min(3).max(30).lowercase(),
        lastname: Joi.string().trim().min(3).max(30).lowercase(),
        email: Joi.string().trim().max(100).email().lowercase(),
        phone: Joi.string().trim().min(9).max(10).pattern(/^[0-9]+$/).messages({
            "string.pattern.base": "Phone number must contain only numbers."
        })
    });
    return schema.validate(obj);
}

function validateEmail(obj) {
    const shcema = Joi.object({
        email: Joi.string().trim().max(100).required().email(),
    })

    return shcema.validate(obj);
}

//Validate New Password
function validateNewPassword(obj) {
    const shcema = Joi.object({
        password: Joi.string().trim().min(6)
            .pattern(/^[\x00-\x7F]+$/)
            .messages({
                "string.pattern.base": "Password must only contain English characters, numbers, and special characters."
            }).required(),

    })

    return shcema.validate(obj);
}
module.exports = {
    User,
    validateSignUpUser,
    validateLogInUser,
    generateAccessToken,
    generateRefreshToken,
    validateUpdateUser,
    validateEmail,
    validateNewPassword,

};
