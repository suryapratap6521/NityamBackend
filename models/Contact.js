const mongoose = require("mongoose");
const softDeletePlugin = require('../plugins/softDelete');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    number: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

// ✅ Apply soft delete plugin
contactSchema.plugin(softDeletePlugin);

const Contact = mongoose.model("Contact", contactSchema);
module.exports = Contact;
