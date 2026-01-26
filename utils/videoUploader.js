const cloudinary = require('cloudinary').v2;

/**
 * Upload video to Cloudinary with async processing
 * Returns immediately with URL, processes video in background
 */
exports.uploadVideoToCloudinary = async (file, folder = 'posts/videos') => {
    try {
        // Check file size (Cloudinary free: 100MB for videos)
        const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
        
        if (file.size && file.size > MAX_VIDEO_SIZE) {
            throw new Error(`Video exceeds 100MB limit. Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        }

        console.log(`📹 Uploading video: ${file.name || 'video'}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder,
            resource_type: 'video',
            
            // ✅ Async transformations - don't block the response
            eager_async: true,
            
            // ✅ Create optimized versions
            eager: [
                { 
                    width: 1280, 
                    crop: 'limit', 
                    quality: 'auto', 
                    fetch_format: 'auto' 
                },
                { 
                    width: 640, 
                    crop: 'scale', 
                    format: 'mp4',
                    quality: 'auto'
                }
            ],
            
            // ✅ Additional optimizations
            transformation: [
                { quality: 'auto', fetch_format: 'auto' }
            ],
            
            // Video-specific settings
            chunk_size: 6000000, // 6MB chunks for reliable upload
        });

        console.log(`✅ Video uploaded successfully: ${result.public_id}`);
        console.log(`📊 Duration: ${result.duration}s, Format: ${result.format}`);

        return {
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            duration: result.duration,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            created_at: result.created_at
        };
    } catch (error) {
        console.error('❌ Video upload error:', error.message);
        throw new Error(`Video upload failed: ${error.message}`);
    }
};

/**
 * Upload multiple videos concurrently
 */
exports.uploadVideosToCloudinary = async (files, folder = 'posts/videos') => {
    if (!Array.isArray(files)) {
        files = [files];
    }

    const uploadPromises = files.map(file => 
        exports.uploadVideoToCloudinary(file, folder)
    );

    return Promise.all(uploadPromises);
};

/**
 * Upload mixed media (images + videos)
 * Automatically detects and routes to correct uploader
 */
exports.uploadMixedMediaToCloudinary = async (files, folder = 'posts/media') => {
    if (!Array.isArray(files)) {
        files = [files];
    }

    const uploadPromises = files.map(async (file) => {
        const mimeType = file.mimetype || '';
        
        // Check if it's a video
        if (mimeType.startsWith('video/')) {
            return await exports.uploadVideoToCloudinary(file, `${folder}/videos`);
        } 
        // Otherwise treat as image
        else {
            return await cloudinary.uploader.upload(file.tempFilePath, {
                folder: `${folder}/images`,
                resource_type: 'image',
                quality: 'auto',
                fetch_format: 'auto'
            });
        }
    });

    return Promise.all(uploadPromises);
};
