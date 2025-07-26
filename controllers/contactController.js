const Contact = require("../models/Contact");

exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, number, message } = req.body;

    if (!name || !email || !number || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const newContact = new Contact({ name, email, number, message });
    await newContact.save();

    res.status(200).json({ status: true, message: "Message submitted successfully." });
  } catch (error) {
    console.error("Contact submission failed:", error);
    res.status(500).json({ status: false, message: "Server error. Try again later." });
  }
};
