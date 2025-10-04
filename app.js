const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const xss = require('xss-clean');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
require("dotenv").config();

const usersRoute = require("./routes/usersRoute");
const passwordRoute = require("./routes/passwordRoute");
const authRoute = require("./routes/authRoute");
const carsRoute = require("./routes/carsRoute");
const carCompanyRoute = require("./routes/carCompanyRoute");
const reservationRoute = require("./routes/reservationRoute");
const paymentRoute = require("./routes/paymentRoute");
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();

// middlewares
app.use(cookieParser());
app.use(express.json());

// security
app.use(xss());
app.use(helmet());
app.use(hpp());

// rate limiting
app.use(rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 200,
    message: "Too many requests from this IP, please try again later."
}));

// cors
app.use(cors({
    // origin: "http://localhost:3000",
    credentials: true,
    origin: "https://car-rental-frontend-lwuc.vercel.app"
}));

// routes
app.use("/api/users", usersRoute);
app.use("/api/password", passwordRoute);
app.use("/api/auth", authRoute);
app.use("/api/cars", carsRoute);
app.use("/api/companies", carCompanyRoute);
app.use("/api/reservation", reservationRoute);
app.use("/api/payment", paymentRoute);

// error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
