const axios = require('axios');

const MAPMYINDIA_BASE_URL = process.env.MAPMYINDIA_BASE_URL 
const CLIENT_ID = process.env.CLIENT_ID 
const CLIENT_SECRET = process.env.CLIENT_SECRET 

// Ensure that the required environment variables are set
if (!MAPMYINDIA_BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing required environment variables: MAPMYINDIA_BASE_URL, CLIENT_ID, or CLIENT_SECRET');
}

// Controller to fetch the access token
exports.getAccessToken = async (req, res) => {
    try {
        const response = await axios.post(
            `https://outpost.mapmyindia.com/api/security/oauth/token?grant_type=client_credentials`,
            null,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
                },
            }
        );

        res.status(200).json(response.data); // Send the token response to the fronten
    } catch (error) {
        res.status(error.response?.status || 500).json({
            message: 'Failed to fetch access token',
            error: error.message,
        });
    }
};

// Controller to fetch areas based on a query parameter (e.g., pincode)
exports.getAreas = async (req, res) => {
    console.log(req.body);
    const { access_token, address } = req.body; // Extract token and query from the request body
   
    console.log(address);
    if (!access_token || !address) {
        return res.status(400).json({ message: 'Missing token or query parameter' });
    }

    try {
        const response = await axios.get(
            `https://atlas.mapmyindia.com/api/places/geocode?address=${address}&itemCount=10`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`, // Add your token here
                },
            }
        );
        

        res.status(200).json(response.data); // Send the areas data to the frontend
    } catch (error) {
        res.status(error.response?.status || 500).json({
            message: 'Failed to fetch areas',
            error: error.message,
        });
    }
};
