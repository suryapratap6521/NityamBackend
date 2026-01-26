const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { uploadVideoToCloudinary } = require('../utils/videoUploader');

/**
 * @route   POST /api/v1/upload/video
 * @desc    Upload a single video file to Cloudinary
 * @access  Private (requires auth)
 * @returns {Object} { success, url, public_id, duration, format }
 */
router.post('/video', auth, async (req, res) => {
    try {
        // Check if video file exists in request
        if (!req.files || !req.files.video) {
            return res.status(400).json({ 
                success: false, 
                message: 'No video file provided. Please attach a video file.' 
            });
        }

        const videoFile = req.files.video;
        
        console.log(`📹 Received video upload request from user: ${req.user.id}`);
        console.log(`📊 File details: ${videoFile.name}, Size: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`);

        // Upload to Cloudinary (async processing enabled)
        const result = await uploadVideoToCloudinary(videoFile, 'posts/videos');

        console.log(`✅ Video uploaded successfully: ${result.public_id}`);

        return res.status(200).json({
            success: true,
            message: 'Video uploaded successfully. Processing in background.',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                duration: result.duration,
                format: result.format,
                width: result.width,
                height: result.height,
                resource_type: result.resource_type
            }
        });
    } catch (error) {
        console.error('❌ Video upload error:', error.message);
        
        // Handle specific error cases
        if (error.message.includes('exceeds')) {
            return res.status(413).json({ 
                success: false, 
                message: error.message 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Video upload failed. Please try again later.',
            error: error.message 
        });
    }
});

/**
 * @route   POST /api/v1/upload/videos
 * @desc    Upload multiple video files to Cloudinary
 * @access  Private (requires auth)
 * @returns {Object} { success, videos: [...] }
 */
router.post('/videos', auth, async (req, res) => {
    try {
        if (!req.files || !req.files.videos) {
            return res.status(400).json({ 
                success: false, 
                message: 'No video files provided.' 
            });
        }

        let videoFiles = req.files.videos;
        
        // Ensure it's an array
        if (!Array.isArray(videoFiles)) {
            videoFiles = [videoFiles];
        }

        console.log(`📹 Uploading ${videoFiles.length} videos from user: ${req.user.id}`);

        // Upload all videos concurrently
        const uploadPromises = videoFiles.map(file => 
            uploadVideoToCloudinary(file, 'posts/videos')
        );

        const results = await Promise.all(uploadPromises);

        console.log(`✅ ${results.length} videos uploaded successfully`);

        return res.status(200).json({
            success: true,
            message: `${results.length} video(s) uploaded successfully`,
            data: {
                videos: results.map(r => ({
                    url: r.secure_url,
                    public_id: r.public_id,
                    duration: r.duration,
                    format: r.format
                }))
            }
        });
    } catch (error) {
        console.error('❌ Multiple video upload error:', error.message);
        
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to upload videos. Please try again.',
            error: error.message 
        });
    }
});

module.exports = router;
