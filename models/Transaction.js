const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({

    amount: {
        type: String,
    },
    userId: {
        type: String,
        // required: true,
    },
    orderId: {
        type: String,
    },
    transactionId: {
        type: String,
    },
    status: {
        type: String,

    },

}, { timestamps: true });

const User = mongoose.model('Transactions', transactionSchema);
module.exports = User;
