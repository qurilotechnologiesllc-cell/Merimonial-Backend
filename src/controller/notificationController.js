import Notification from "../modal/Notification.js";
import RegisterModel from "../modal/register.js";
import { sendExpoPush } from "../utils/expoPush.js";

export const sendNotification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: "Title and message are required",
            });
        }

        const saved = await Notification.create({
            user: userId,
            title,
            message,
            read: false,
        });

        // ✅ SOCKET
        const io = global.io;
        io?.to(String(userId)).emit("new-notification", saved);

        // ✅ PUSH
        const user = await RegisterModel.findById(userId);
        if (user?.expoPushToken) {
            await sendExpoPush(
                user.expoPushToken,
                title,
                message
            );
        }

        return res.json({ success: true, data: saved });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;

        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 });

        return res.json({ success: true, data: notifications });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.userId;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { read: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }

        return res.json({ success: true, message: "Marked as read" });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.userId;

        await Notification.updateMany(
            { user: userId, read: false },
            { read: true }
        );

        return res.json({ success: true, message: "All notifications marked as read" });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.userId;

        await Notification.findOneAndDelete({
            _id: notificationId,
            user: userId,
        });

        return res.json({ success: true, message: "Notification deleted" });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteAllNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;

        await Notification.deleteMany({ user: userId });

        return res.json({ success: true, message: "All notifications deleted" });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};