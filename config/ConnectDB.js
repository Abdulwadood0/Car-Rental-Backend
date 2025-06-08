const mongoose = require('mongoose');

module.exports = async () => {
    try {
        mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to mongoDB');
    } catch (error) {
        console.log("faild to connect to mongoDB", error);
    }
}