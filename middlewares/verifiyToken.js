const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {

        try {
            const token = authHeader.split(" ")[1];
            const decodedPayload = jwt.verify(token, process.env.JWT_SECRET)

            req.user = decodedPayload;
            next();


        } catch (error) {
            return res.status(401).json({ message: "Invalid token" });
        }

    } else {
        return res.status(401).json({ message: "No token provided" });

    }
}


function optionalVerifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decodedPayload;
        } catch (err) {
            // ignore
        }
    }
    // no token → req.user stays undefined
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