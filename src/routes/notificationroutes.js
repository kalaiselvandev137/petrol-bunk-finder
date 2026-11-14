import express from 'express';
import { getNotifications, markAllAsRead } from '../controllers/NotificationController.js';


const notificationRouter = express.Router();

notificationRouter.get('/apigetnotifications', getNotifications);
notificationRouter.put('/apimarkallasread', markAllAsRead);

export default notificationRouter;