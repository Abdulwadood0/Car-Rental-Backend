const { User, validateSignUpUser, validateLogInUser, generateRefreshToken, generateAccessToken } = require('../models/User');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


/**------------------------------------------
 * @desc     sign up
 * @route    /api/auth/signUp
 * @method   POST
 * @access   public 
 ------------------------------------------*/
module.exports.signUp = asyncHandler(async (req, res) => {

    //validation
    const { error } = validateSignUpUser(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message })

    }


    //check if user exists
    let user = await User.findOne({
        $or: [
            { email: req.body.email },
            { username: req.body.username },
            { phone: req.body.phone }
        ]
    });
    if (user) {
        return res.status(400).json({ message: "User already exists" });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    user = new User({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        username: req.body.username,
        phone: req.body.phone,
        email: req.body.email,
        password: hashedPassword,
    })

    await user.save();

    res.status(201).json({ message: "User created successfully" });

})



/**------------------------------------------
 * @desc     log in
 * @route    /api/auth/logIn
 * @method   POST
 * @access   public 
 ------------------------------------------*/
module.exports.logIn = asyncHandler(async (req, res) => {

    //validation
    const { error } = validateLogInUser(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message })

    }


    //check if user exists
    let user = await User.findOne({
        $or: [
            { username: req.body.usernameOrEmail },
            { email: req.body.usernameOrEmail }
        ]
    });
    if (!user) {
        return res.status(404).json({ message: "Password or username is incorrect" });
    }

    const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordMatch) {
        return res.status(400).json({ message: "Password or username is incorrect" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);


    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // only send over HTTPS in prod
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // ✅ allows cookies from same origin
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });


    res.status(200).json({
        accessToken,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            phone: user.phone,
            isAdmin: user.isAdmin,
        }
    });

})



/**------------------------------------------
 * @desc     Refresh Token
 * @route    /api/auth/refresh
 * @method   POST
 * @access   public 
 ------------------------------------------*/
module.exports.refreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken


    if (!token) {
        return res.status(401).json({ message: "No refresh token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded._id)


        if (!user) {
            return res.status(403).json({ message: "User not found" });
        }

        // Issue new access token
        const accessToken = jwt.sign(
            { _id: user._id.toString(), isAdmin: user.isAdmin },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "20m" } // short-lived
        );

        res.json({ accessToken });
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired refresh token" });
    }
})

/**------------------------------------------
 * @desc     Get current logged-in user's info
 * @route    /api/auth/me
 * @method   Get
 * @access   private 
 ------------------------------------------*/
module.exports.me = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
        _id: req.user._id,
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        phone: user.phone,
        isAdmin: req.user.isAdmin,
    });
})


/**------------------------------------------
 * @desc     Logout user (clear authentication cookie)
 * @route    /api/auth/logout
 * @method   POST
 * @access   private 
 ------------------------------------------*/
module.exports.logout = asyncHandler(async (req, res) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        path: "/"
    });

    res.status(200).json({ message: "Logout successful" });
});
