const mongoose = require("mongoose");

const OTPSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 5, // The document will be automatically deleted after 5 minutes
    },
});

const OTP = mongoose.model("OTP", OTPSchema);

module.exports = OTP;
