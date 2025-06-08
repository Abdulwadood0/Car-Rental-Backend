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

    const token = generateToken(user)

    res.status(200).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        phone: user.phone,
        isAdmin: user.isAdmin,
        token: token,
    });

})

