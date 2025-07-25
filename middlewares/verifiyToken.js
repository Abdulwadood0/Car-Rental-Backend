const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedPayload;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
}



function optionalVerifyToken(req, res, next) {
    const token = req.cookies.token;

    if (token) {
        try {
            const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decodedPayload;
        } catch (err) {
            // ignore invalid token
        }
    }

    next();
}


function verifyAdmin(req, res, next) {

    if (req.user && req.user.isAdmin) {
        next();
    }
    else {
        return res.status(401).json({ message: "only admin" });
    }

}

module.exports = {
    verifyToken,
    verifyAdmin,
    optionalVerifyToken

}