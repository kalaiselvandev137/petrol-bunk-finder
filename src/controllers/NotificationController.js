import Notification from "../models/NotificationModel.js";



export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find() .sort({ createdAt: -1 }).limit(20);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    return res.send({ notifications,unreadCount});
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.send({ message: "Server error", error: error.message });
  }
};


export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false },{ isRead: true });
    return res.send({ message: "All notifications marked as read" });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return res.send({  message: "Server error",  error: error.message });
  }
};