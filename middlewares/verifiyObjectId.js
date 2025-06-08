const mongoose = require('mongoose');

function verifyObjectId(req, res, next) {

    if (!req.params.id) {
        return next(); // Skip verification for routes without :id
    }

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        next();
    }
    else {

        return res.status(400).json({ message: "Invalid id" });
    }
}

module.exports = verifyObjectId