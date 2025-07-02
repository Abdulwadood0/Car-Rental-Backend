const { User, validateSignUpUser, validateLogInUser, generateToken } = require('../models/User');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');


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
    let user = await User.findOne({ username: req.body.username });
    if (!user) {
        return res.status(404).json({ message: "Password or username is incorrect" });
    }

    const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordMatch) {
        return res.status(400).json({ message: "Password or username is incorrect" });
    }

    const token = generateToken(user);


    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // only send over HTTPS in prod
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // ✅ allows cookies from same origin
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // ✅ Send user info WITHOUT token
    res.status(200).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        phone: user.phone,
        isAdmin: user.isAdmin,
    });

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
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None"
    });
    res.status(200).json({ message: "Logout successful" });
});
