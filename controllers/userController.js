const { User, validateUpdateUser } = require('../models/User');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { sendEmail } = require('../services/emailService');



/**------------------------------------------
 * @desc     get all users (with optional search)
 * @route    GET /api/users
 * @access   private (admin only)
 ------------------------------------------*/
module.exports.getAllUsers = asyncHandler(async (req, res) => {
    // only admin can list users
    if (!req.user.isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // search filter
    const search = req.query.search?.trim();
    const filter = search
        ? {
            $or: [
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ]
        }
        : {};


    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 7;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments(filter);
    const count = Math.ceil(totalUsers / limit);

    const users = await User
        .find(filter)
        .skip(skip)
        .limit(limit)
        .select("-password -__v -createdAt -updatedAt");

    res.status(200).json({
        users,
        count
    });
});



/**------------------------------------------
 * @desc     get user
 * @route    /api/users/:id
 * @method   get
 * @access   private 
 ------------------------------------------*/
module.exports.getUser = asyncHandler(async (req, res) => {

    const user = await User.findById(req.params.id).select("-password -__v -createdAt -updatedAt");


    if ((req.user._id.toString() !== user._id.toString())) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
})

/**------------------------------------------
 * @desc     Update user
 * @route    /api/users/:id
 * @method   PUT
 * @access   private 
 ------------------------------------------*/
module.exports.updateUser = asyncHandler(async (req, res) => {


    let user = await User.findById(req.params.id).lean();

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if ((req.user._id.toString() !== user._id.toString())) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { error } = validateUpdateUser(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const query = [];
    if (req.body.email) query.push({ email: req.body.email });
    if (req.body.phone) query.push({ phone: req.body.phone });

    if (query.length > 0) {
        const existingUser = await User.findOne({
            $or: query,
            _id: { $ne: req.params.id } // Exclude the current user
        });


        if (existingUser) {
            let message = "";
            if (existingUser.email === req.body.email) message = "Email is already in use";
            else if (existingUser.phone === req.body.phone) message = "Phone number is already in use";

            return res.status(400).json({ message });
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            $set: {
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                phone: req.body.phone,
            }
        }, { new: true }).select("-password -__v -createdAt -updatedAt");

        res.status(200).json({ message: "Account updated successfully", user: updatedUser });
    }
})


/**------------------------------------------
 * @desc     Delete user
 * @route    /api/users/:id
 * @method   Delete
 * @access   private 
 ------------------------------------------*/
module.exports.deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if ((req.user._id.toString() !== user._id.toString()) && !req.user.isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
    }


    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User deleted successfully" });
})