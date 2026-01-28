    const mongoose = require("mongoose");
    const softDeletePlugin = require('../plugins/softDelete');

    const messageSchema = new mongoose.Schema({
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        content: {
            type: String,
            trim: true,
        },
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat", 
        },
        sharedPost: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Post",
  default: null,
},
        isSystemMessage: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "seen"],
            default: "sent"
        },
        deliveredTo: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        seenBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }]

    }, {
        timestamps: true, 
    });

    // ✅ Apply soft delete plugin
    messageSchema.plugin(softDeletePlugin);

    const Message = mongoose.model("Message", messageSchema);
    module.exports = Message;
