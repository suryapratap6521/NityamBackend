const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');

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
   postPayload: {
    type: Object, // ✅ Fixed: Accepts raw JS object
    required: true,
  },
communities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Community" }],

}, { timestamps: true });

// ✅ Apply soft delete plugin
transactionSchema.plugin(softDeletePlugin);

const User = mongoose.model('Transactions', transactionSchema);
module.exports = User;
