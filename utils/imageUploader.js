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

    const uploadPromises = files.map(async file => {
        const mimeType = file.mimetype || '';
        const isVideo = mimeType.startsWith('video/');
        
        // Different size limits for images vs videos
        const MAX_SIZE = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for videos, 10MB for images
        
        // Check file size if available
        if (file.size && file.size > MAX_SIZE) {
            const limitMB = isVideo ? 100 : 10;
            throw new Error(`File ${file.name || ''} exceeds ${limitMB}MB Cloudinary limit.`);
        }
        
        try {
            // ✅ For videos, use async processing to avoid blocking
            if (isVideo) {
                return await cloudinary.uploader.upload(file.tempFilePath, {
                    ...options,
                    folder: `${folder}/videos`,
                    resource_type: "video",
                    eager_async: true, // Process in background
                    eager: [
                        { width: 1280, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
                        { width: 640, crop: 'scale', format: 'mp4', quality: 'auto' }
                    ],
                    chunk_size: 6000000 // 6MB chunks
                });
            } 
            // For images, upload with aggressive compression
            else {
                return await cloudinary.uploader.upload(file.tempFilePath, {
                    ...options,
                    folder: `${folder}/images`,
                    resource_type: "auto",
                    // ✅ Aggressive optimization for faster uploads & loads
                    quality: 'auto:low', // Compress images automatically
                    fetch_format: 'auto', // Auto-convert to webp for modern browsers
                    width: 1920, // Max width - resize larger images
                    height: 1920, // Max height
                    crop: 'limit', // Only resize if larger
                    flags: 'lossy', // Allow lossy compression
                    // ✅ Generate responsive image variants
                    eager: [
                        { width: 640, crop: 'scale', quality: 'auto:low', fetch_format: 'auto' },  // Mobile
                        { width: 1280, crop: 'scale', quality: 'auto:low', fetch_format: 'auto' }  // Desktop
                    ],
                    eager_async: true // Don't wait for variants
                });
            }
        } catch (err) {
            console.error('Cloudinary upload error:', err);
            throw err;
        }
    });

    return Promise.all(uploadPromises);
};
