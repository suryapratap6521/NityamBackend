const nodemailer = require("nodemailer");

// Create transporter ONCE, globally
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: 465, // or 587
    secure: true, // true for 465, false for 587
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    pool: true,             // Use pooled connections
    maxConnections: 5,      // Up to 5 SMTP connections
    maxMessages: 100,       // Reuse each connection for 100 mails
    rateLimit: 5,           // Prevent hitting provider rate limit
    tls: {
        rejectUnauthorized: false,
    },
});

// Optional: Keep the connection warm
setInterval(async () => {
    try {
        await transporter.verify();
        console.log("SMTP connection alive ✅");
    } catch (err) {
        console.log("SMTP connection dropped, reconnecting…");
    }
}, 5 * 60 * 1000); // every 5 minutes

const mailSender = async (email, title, body) => {
    try {
        const info = await transporter.sendMail({
            from: 'Truepadosi <noreply@truepadosi.com>',
            to: email,
            subject: title,
            html: body,
        });

        console.log("✅ Email sent:", info.response);
        return info;
    } catch (error) {
        console.error("❌ Error sending email:", error);
        throw error;
    }
};

module.exports = mailSender;
