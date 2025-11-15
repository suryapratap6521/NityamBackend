export default function verifyApiKey(req, res, next) {
  const clientKey = req.headers['x-api-key'];

  if (!clientKey) {
    return res.status(401).json({ message: "API Key missing" });
  }

  if (clientKey !== process.env.API_KEY) {
    return res.status(403).json({ message: "Invalid API Key" });
  }

  next();
}
