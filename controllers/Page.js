const Page = require("../models/Page");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");
const User = require("../models/User");
const AdvertisedPost=require("../models/AdvertisedPost");
const Community=require("../models/Community");
exports.createPage = async (req, res) => {
  try {
    // Destructure and validate required fields
    const {
      businessName,
      businessCategory,
      businessDescription,
      businessUrl,
      businessPhoneNumber,
      businessEmail,
      businessAddress,
      businessCity,
      businessPostCode,
    } = req.body;
    const userId = req.user.id;

    if (
      !businessName ||
      !businessCategory ||
      !businessPhoneNumber ||
      !businessEmail ||
      !businessAddress ||
      !businessCity ||
      !businessPostCode
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // Check for the presence of profile picture
    if (!req.files || !req.files.businessProfilePicture) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required.",
      });
    }

    const businessProfilePicture = req.files.businessProfilePicture;

    // Upload the profile picture to Cloudinary
    const [imageUploadResult] = await uploadFilesToCloudinary(
      [businessProfilePicture], // Ensure it's treated as an array
      process.env.FOLDER_NAME
    );

    if (!imageUploadResult || !imageUploadResult.secure_url) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload the profile picture.",
      });
    }

    // Create a new page with uploaded image URL and other details
    const newPage = new Page({
      businessName,
      businessCategory,
      businessDescription,
      businessUrl,
      businessPhoneNumber,
      businessEmail,
      businessAddress,
      businessCity,
      businessPostCode,
      businessProfilePicture: imageUploadResult.secure_url,
    });

    // Save the new page to the database
    const savedPage = await newPage.save();

    // Add the page ID to the user's pages array
    const userDetails = await User.findByIdAndUpdate(
      userId,
      { $push: { pages: savedPage._id } },
      { new: true }
    ).populate("pages");

    // Respond with success and return the saved page data
    return res.status(201).json({
      success: true,
      message: "Business page created successfully.",
      data: savedPage,
      userDetails,
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error in createPage:", error);

    // Respond with a generic error message
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



exports.viewPage = async (req, res) => {
  try {
    const { pageId } = req.body;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: "Page ID is required.",
      });
    }

    // Fetch the page with populated advertisedPosts
    const page = await Page.findById(pageId)
    .populate({
      path: "advertisedPosts",
      populate: [
        {
          path: "createdBy",
          select: "firstName lastName email city state communityDetails image",
          populate: { path: "communityDetails" }
        },
        {
          path: "like",
          select: "firstName lastName email image" // Assuming you want basic user details for likes
        },
        {
          path: "comments",
          populate: [
            {
              path: "commentedBy",
              select: "firstName lastName email city state communityDetails image",
              populate: { path: "communityDetails" }
            },
            {
              path: "replies",
              populate: [
                {
                  path: "repliedBy",
                  select: "firstName lastName email city state communityDetails image",
                  populate: { path: "communityDetails" }
                }
              ]
            }
          ]
        },
        {
          path: "communities",
          select: "communityName" // Populating community details if required
        }
        
      ]
    })
    .exec();

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Page fetched successfully.",
      data: page,
    });
  } catch (error) {
    console.error("Error in viewPage:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Update Page and Related Advertised Posts
exports.updatePage = async (req, res) => {
  try {
    const { pageId } = req.body; // Page ID from request body
    const {
      businessName,
      businessCategory,
      businessDescription,
      businessUrl,
      businessPhoneNumber,
      businessEmail,
      businessAddress,
      businessCity,
      businessPostCode,
    } = req.body;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: "Page ID is required.",
      });
    }

    // Find the page to ensure it exists
    const page = await Page.findById(pageId).populate({
      path: "advertisedPosts",
      populate: [
        {
          path: "createdBy",
          select: "firstName lastName email city state communityDetails image",
          populate: { path: "communityDetails" },
        },
        {
          path: "like",
          select: "firstName lastName email image",
        },
        {
          path: "comments",
          populate: [
            {
              path: "commentedBy",
              select: "firstName lastName email city state communityDetails image",
              populate: { path: "communityDetails" },
            },
            {
              path: "replies",
              populate: [
                {
                  path: "repliedBy",
                  select: "firstName lastName email city state communityDetails image",
                  populate: { path: "communityDetails" },
                },
              ],
            },
          ],
        },
        {
          path: "communities",
          select: "communityName",
        },
      ],
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found.",
      });
    }

    // Update the profile picture if provided
    let updatedProfilePicture = page.businessProfilePicture;
    if (req.files && req.files.businessProfilePicture) {
      const [imageUploadResult] = await uploadFilesToCloudinary(
        [req.files.businessProfilePicture],
        process.env.FOLDER_NAME
      );

      if (!imageUploadResult || !imageUploadResult.secure_url) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload the new profile picture.",
        });
      }

      updatedProfilePicture = imageUploadResult.secure_url;
    }

    // Update page details while preserving the `advertisedPosts` array
    const updatedPage = await Page.findByIdAndUpdate(
      pageId,
      {
        $set: {
          businessName,
          businessCategory,
          businessDescription,
          businessUrl,
          businessPhoneNumber,
          businessEmail,
          businessAddress,
          businessCity,
          businessPostCode,
          businessProfilePicture: updatedProfilePicture,
        },
      },
      { new: true }
    );

    // Re-populate the updated page with `advertisedPosts`
    await updatedPage.populate({
      path: "advertisedPosts",
      populate: [
        {
          path: "createdBy",
          select: "firstName lastName email city state communityDetails image",
          populate: { path: "communityDetails" },
        },
        {
          path: "like",
          select: "firstName lastName email image",
        },
        {
          path: "comments",
          populate: [
            {
              path: "commentedBy",
              select: "firstName lastName email city state communityDetails image",
              populate: { path: "communityDetails" },
            },
            {
              path: "replies",
              populate: [
                {
                  path: "repliedBy",
                  select: "firstName lastName email city state communityDetails image",
                  populate: { path: "communityDetails" },
                },
              ],
            },
          ],
        },
        {
          path: "communities",
          select: "communityName",
        },
      ],
    });

    // Update all related advertised posts with the new page details
    await AdvertisedPost.updateMany(
      { pageId },
      {
        $set: {
          businessName: updatedPage.businessName,
          businessCategory: updatedPage.businessCategory,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Page updated successfully.",
      data: updatedPage,
    });
  } catch (error) {
    console.error("Error in updatePage:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



// Delete Page and Related Advertised Posts
exports.deletePage = async (req, res) => {
  try {
    const { pageId } = req.body;
    const userId = req.user.id; // Logged-in user ID

    // Check if pageId is provided
    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: "Page ID is required.",
      });
    }

    // Find the page in the database
    const page = await Page.findById(pageId);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found.",
      });
    }

    // Remove the page from the user's `pages` array
    await User.findByIdAndUpdate(userId, { $pull: { pages: pageId } });

    // Fetch all advertised posts related to the page
    const advertisedPosts = await AdvertisedPost.find({ pageId }).select('_id'); 

    // If there are related advertised posts, proceed with deletion
    if (advertisedPosts.length > 0) {
      // Store the IDs of the advertised posts for reference
      const advertisedPostIds = advertisedPosts.map(post => post._id);

      // Remove the advertised posts from the AdvertisedPost collection
      await AdvertisedPost.deleteMany({ pageId });

      // Remove references to these advertised posts from all communities
      await Community.updateMany(
        { advertisedPosts: { $in: advertisedPostIds } },  // Communities having these posts
        { $pull: { advertisedPosts: { $in: advertisedPostIds } } }  // Remove the posts from communities
      );
    }

    // Finally, delete the page itself from the database
    await Page.findByIdAndDelete(pageId);

    // Send success response
    res.status(200).json({
      success: true,
      message: "Page and related advertised posts deleted successfully.",
    });
  } catch (error) {
    // Handle any errors during the process
    console.error("Error in deletePage:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


exports.getAllPages = async (req, res) => {
  try {
    // Fetch all pages and populate their associated advertisedPosts
    const pages = await Page.find()
      .populate({
        path: "advertisedPosts",
        populate: [
          {
            path: "createdBy",
            select: "firstName lastName email city state communityDetails image",
            populate: { path: "communityDetails" },
          },
          {
            path: "like",
            select: "firstName lastName email image", // Populating user details for likes
          },
          {
            path: "comments",
            populate: [
              {
                path: "commentedBy",
                select: "firstName lastName email city state communityDetails image",
                populate: { path: "communityDetails" },
              },
              {
                path: "replies",
                populate: [
                  {
                    path: "repliedBy",
                    select: "firstName lastName email city state communityDetails image",
                    populate: { path: "communityDetails" },
                  },
                ],
              },
            ],
          },
          {
            path: "communities",
            select: "communityName", // Populating community details
          },
        ],
      })
      .exec();

    if (!pages || pages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No pages found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Pages fetched successfully.",
      data: pages,
    });
  } catch (error) {
    console.error("Error fetching all pages:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};




