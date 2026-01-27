const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Generate access and refresh tokens
 * Access token: short-lived (1 hour)
 * Refresh token: long-lived (30 days)
 */
exports.generateTokens = (user) => {
    const payload = {
        email: user.email,
        id: user._id,
        accountType: user.accountType
    };

    // Access token - short lived
    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' } // 1 hour
    );

    // Refresh token - long lived
    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, // Use separate secret if available
        { expiresIn: '30d' } // 30 days
    );

    // Calculate refresh token expiry date
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

    return {
        accessToken,
        refreshToken,
        refreshTokenExpiry
    };
};

/**
 * Verify refresh token
 */
exports.verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        );
        return { valid: true, decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

/**
 * Verify access token
 */
exports.verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { valid: true, decoded, expired: false };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { valid: false, expired: true, error: 'Token expired' };
        }
        return { valid: false, expired: false, error: error.message };
    }
};
