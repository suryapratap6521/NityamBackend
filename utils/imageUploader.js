const cloudinary = require('cloudinary').v2

// exports.uploadImageToCloudinary = async (file, folder, height, quality) => {
//     const options = { folder };
//     if (height) {
//         options.height = height;
//     }
//     if (quality) {
//         options.quality = quality;
//     }

//     options.resource_type = "auto";

    
//     return await cloudinary.uploader.upload(file.tempFilePath, options);
// }


// exports.uploadFilesToCloudinary = async (files, folder, options = {}) => {
//     const uploadPromises = files.map(file => {
//         return cloudinary.uploader.upload(file.tempFilePath, {
//             ...options,
//             folder,
//             resource_type: "auto"
//         });
//     });

//     return Promise.all(uploadPromises);
// };



exports.uploadFilesToCloudinary = async (files, folder, options = {}) => {
    // If files is not an array, make it an array
    if (!Array.isArray(files)) {
        files = [files];
    }

    // Cloudinary free plan file size limit (bytes)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const uploadPromises = files.map(async file => {
        // Check file size if available
        if (file.size && file.size > MAX_SIZE) {
            throw new Error(`File ${file.name || ''} exceeds 10MB Cloudinary limit.`);
        }
        try {
            return await cloudinary.uploader.upload(file.tempFilePath, {
                ...options,
                folder,
                resource_type: "auto"
            });
        } catch (err) {
            console.error('Cloudinary upload error:', err);
            throw err;
        }
    });

    return Promise.all(uploadPromises);
};
