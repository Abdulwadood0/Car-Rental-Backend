// src/server.js
require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/ConnectDB");
const { startReservationCleanup } = require("./services/cron");

const PORT = process.env.PORT || 5000;

// connect DB
connectDB();

// start cron jobs
startReservationCleanup();

// start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
