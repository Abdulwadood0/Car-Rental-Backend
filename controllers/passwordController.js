const crypto = require('crypto');
const { User, validateEmail, validateNewPassword } = require('../models/User');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { VerificationToken } = require('../models/VerificationToken');
const { sendEmail } = require('../services/emailService');

/**------------------------------------------
 * @desc     Send Reset Password Link
 * @route    /api/password/reset-password-link
 * @method   POST
 * @access   public
 ------------------------------------------*/
module.exports.sendResetPasswordLink = asyncHandler(async (req, res) => {

    const { error } = validateEmail(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(404).json({ message: "No account associated with this email" });
    }

    let verificationToken = await VerificationToken.findOne({ userId: user._id });
    if (!verificationToken) {
        verificationToken = new VerificationToken({
            userId: user._id,
            token: crypto.randomBytes(32).toString('hex'),
        })
    }

    await verificationToken.save();
    const link = `https://car-rental-frontend-lwuc.vercel.app/reset-password/${user._id}/${verificationToken.token}`;


    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
            <p style="color: #555; font-size: 16px;">Hello,</p>
            <p style="color: #555; font-size: 16px;">
                We received a request to reset your password. Click the button below to proceed.
            </p>
            <div style="text-align: center; margin: 20px 0;">
                <a href="${link}" 
                   style="background-color: #007bff; color: #ffffff; padding: 12px 20px; 
                   text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block;">
                   Reset Password
                </a>
            </div>
            <p style="color: #555; font-size: 14px;">
                If you did not request a password reset, please ignore this email.
            </p>
            <hr style="border: 0; height: 1px; background: #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                &copy; ${new Date().getFullYear()} CAR RENTAL. All rights reserved.
            </p>
        </div>
    </div>
    `;

    await sendEmail(user.email, "Password Reset Request", html);

    res.status(200).json({ message: "Password reset link sent successfully, check your email" });
})


/**------------------------------------------
 * @desc     Reset Password 
 * @route    /api/password/reset-password/:id/:token
 * @method   GET
 * @access   public
 ------------------------------------------*/
module.exports.verifiyPasswordResetLink = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const verificationToken = await VerificationToken.findOne({ userId: user._id, token: req.params.token });
    if (!verificationToken) {
        return res.status(404).json({ message: "Verification token not found" });
    }

    res.status(200).json({ message: "Verification successful" });
})

/**------------------------------------------
 * @desc     Reset Password 
 * @route    /api/password/reset-password/:id/:token
 * @method   PUT
 * @access   public
 ------------------------------------------*/
module.exports.resetPassword = asyncHandler(async (req, res) => {

    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const verificationToken = await VerificationToken.findOne({ userId: user._id, token: req.params.token });
    if (!verificationToken) {
        return res.status(404).json({ message: "Verification token not found" });
    }

    const { error } = validateNewPassword(req.body);
    if (error) {

        return res.status(400).json({ message: error.details[0].message });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    user.password = hashedPassword;
    await user.save();

    await VerificationToken.deleteOne({ userId: user._id });


    res.status(200).json({ message: "Password reset successfully" });
})