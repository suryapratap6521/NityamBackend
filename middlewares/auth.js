const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");
const Community=require('../models/Community');
const { default: mongoose } = require("mongoose");


//auth
exports.auth = async (req, res, next) => {
    try{
        //extract token
        const token = req.cookies.token
                        || req.body.token
                        || req.header("Authorization").replace("Bearer ", "");

        //if token missing, then return response
        if(!token) {
            return res.status(401).json({
                success:false,
                message:'TOken is missing',
            });
        }

        //verify the token
        try{
            const decode =  jwt.verify(token, process.env.JWT_SECRET);
            // console.log(decode);
            req.user = decode;
        }
        catch(err) {
            //verification - issue
            // ✅ Clean logging for token errors instead of full stack trace
            if (err.name === 'TokenExpiredError') {
                console.log(`⏰ Token expired at ${err.expiredAt} - User should refresh or re-login`);
                return res.status(401).json({
                    success: false,
                    message: 'token is invalid',
                    shouldLogout: true, // Signal to frontend to logout
                });
            } else if (err.name === 'JsonWebTokenError') {
                console.log(`🔒 Invalid token: ${err.message}`);
                return res.status(401).json({
                    success: false,
                    message: 'token is invalid',
                    shouldLogout: true,
                });
            } else {
                console.log(`❌ Token verification error: ${err.message}`);
                return res.status(401).json({
                    success: false,
                    message: 'token is invalid',
                });
            }
        }
        next();
    }
    catch(error) {
        return res.status(401).json({
            success:false,
            message:'Something went wrong while validating the token',
        });
    }
}

//isAdmin
exports.isAdmin = async (req, res, next) => {
    try{
           if(req.user.accountType !== "Admin") {
               return res.status(401).json({
                   success:false,
                   message:'This is a protected route for Admin only',
               });
           }
           next();
    }
    catch(error) {
       return res.status(500).json({
           success:false,
           message:'User role cannot be verified, please try again'
       })
    }
   }

//    exports.isValidPoster=async(req,res,next)=>{
//     try {
//         const userId=req.user.id;
//         const user=await User.findById(userId);
//         const community=Community.findOne(
//             {_id:new mongoose.Types.ObjectId(user.communityDetails),
//                                             userInCommunity: {$elemMatch: {$eq: userId} },
//                                         });

        
//         if(!community){
//             return res.staus.json({
//                 success:false,
//                 message:"You donot have the access to see this post",
//             })
//         }
//         next();

//     } catch (error) {
//         return res.status(500).json({
//             success:false,
//             message:"Internal Server error in isValidPoster middleware",
            
//         })
//     }
//    }