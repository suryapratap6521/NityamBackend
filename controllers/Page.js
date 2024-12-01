const Page=require('../models/Page');

// Controller for creating a new page
const createPage = async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      businessBio,
      contactInformation,
      location,
      profilePicture,
    } = req.body;

    // Validate required fields
    if (
      !businessName ||
      !businessType ||
      !businessBio ||
      !contactInformation.phoneNumber ||
      !contactInformation.emailAddress ||
      !location.address ||
      !location.town ||
      !location.city ||
      !location.postcode 
    ) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    // Create a new page
    const newPage = new Page({
      businessName,
      businessType,
      businessBio,
      contactInformation,
      location,
      // profilePicture || profilePicture:`ttps://api.dicebear.com/9.x/initials/svg?seed=${businessName}`,
    });

    // Save the page to the database
    const savedPage = await newPage.save();

    return res.status(201).json({ 
      message: "Page created successfully.", 
      page: savedPage 
    });
  } catch (error) {
    console.error("Error creating page:", error);
    return res.status(500).json({ 
      message: "Internal Server Error. Please try again later." 
    });
  }
};

module.exports = { createPage };
