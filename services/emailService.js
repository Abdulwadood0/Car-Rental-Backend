const nodemailer = require('nodemailer');

module.exports.sendEmail = async (email, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_ADDRESS, //sender
                pass: process.env.EMAIL_PASSWORD
            }
        })

        const mailOptions = {
            from: `"Car Rental" <${process.env.EMAIL_ADDRESS}>`, // sender
            to: email, // receiver
            subject: subject,
            html: html
        }

        const info = await transporter.sendMail(mailOptions);


    } catch (error) {
        console.log(error);
        throw new Error("Failed to send email");
    }
}