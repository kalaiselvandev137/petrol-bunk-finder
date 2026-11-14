import express from 'express';
import { getstatsandborrowers } from '../controllers/SalesmanController.js';
import authMiddleware from '../middleware/authMiddleware.js';


const salesmanRouter = express.Router();

salesmanRouter.get('/apigetstatsandborrowers',authMiddleware("Sales_Man"), getstatsandborrowers);


export default salesmanRouter;