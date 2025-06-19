const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected');
        });
        await mongoose.connect(process.env.MONGODB_URI + '/Booking');
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1); // Exit process on DB connection failure
    }
};

module.exports = connectDB;