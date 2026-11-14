import express from 'express'
import authRouter from './authroutes.js';
import bookingRouter from './bookingroutes.js';
import notificationRouter from './notificationroutes.js';
import settingsRouter from './settingroutes.js';
import employeesRouter from './employeeRoutes.js';
import borrowersRouter from './borrowerroutes.js';
import salesmanRouter from './salesmanroutes.js';
import dailyupdatesRouter from './dailyupdateroutes.js';
import fieldupdatesRouter from './fieldupdateroutes.js';
import dealersRouter from './dealerroutes.js';
import attendanceRouter from './attendanceroutes.js';
import dpdcollectionRouter from './dpdcollectionroutes.js';
import trackingRouter from './trackingRoutes.js';
import dealerVisitsRouter from './Dealervisitroutes.js';

const router = express.Router()
router.use('/auth',authRouter);
router.use('/bookings',bookingRouter);
router.use('/notifications',notificationRouter);
router.use('/settings',settingsRouter);
router.use('/employees', employeesRouter)
router.use('/borrowers', borrowersRouter);
router.use('/salesman', salesmanRouter);
router.use('/dailyupdates',dailyupdatesRouter)
router.use('/fieldupdates',fieldupdatesRouter)
router.use('/dealers',dealersRouter)
router.use('/attendance',attendanceRouter)
router.use('/dpd-collection',dpdcollectionRouter)
router.use('/tracking', trackingRouter)
router.use('/dealervisits', dealerVisitsRouter)



export default router;