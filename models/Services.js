const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');
const servicesSchema = new mongoose.Schema({
    firstName: {
        type: String,
    },
    lastName: {
        type: String,
    },
    profession: {
        type: String,
    },
    phoneNumber: {
        type: Number,
    },
    address: {
        type: String,
    },
    image: {
        type: String,
    },
    price: {
        type: Number,
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// ✅ Apply soft delete plugin
servicesSchema.plugin(softDeletePlugin);

const Services = mongoose.model('Services', servicesSchema);
module.exports = Services;
