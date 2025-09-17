const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();

const connectDB = require('./config/ConnectDB');
require("dotenv").config();


const cors = require('cors');

const xss = require('xss-clean');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

connectDB();

const { startReservationCleanup } = require('./services/cron');

startReservationCleanup();

const usersRoute = require("./routes/usersRoute")
const passwordRoute = require("./routes/passwordRoute")
const authRoute = require("./routes/authRoute")
const carsRoute = require("./routes/carsRoute")
const carCompanyRoute = require("./routes/carCompanyRoute")
const reservationRoute = require("./routes/reservationRoute")
const paymentRoute = require("./routes/paymentRoute");
const { notFound, errorHandler } = require('./middlewares/error');

//middlewares
app.use(cookieParser());
app.use(express.json());

//security
app.use(xss());
app.use(helmet());
app.use(hpp());

// Rate Limit
app.use(rateLimit({
    windowMs: 10 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."  // error message to send
}))

// Cors Policy
app.use(cors({
    // origin: 'http://localhost:3000',
    credentials: true,// << this MUST be true to allow cookies
    origin: "https://car-rental-frontend-lwuc.vercel.app"
}))

//Routes
app.use("/api/users", usersRoute)

app.use("/api/password", passwordRoute)

app.use("/api/auth", authRoute);

app.use("/api/cars", carsRoute);

app.use("/api/companies", carCompanyRoute);

app.use("/api/reservation", reservationRoute);

app.use("/api/payment", paymentRoute);


//error handler
app.use(notFound)
app.use(errorHandler)



app.listen(process.env.PORT)