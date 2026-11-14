import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { deletedpdcollection,  deleteDpdEntry, getAdminDpdCollections, getalldpdcollections, getEmployeeDpdDetails, getSalespersonDpdCollections, savedpdcollection, updatedpdcollection, getAdminDpdCollectionsRange } from '../controllers/DPDCollectionController.js';
import { getSalespersonDpdMonthlySummary } from '../controllers/Salespersonmonthlycontrollers.js';


const dpdcollectionRouter = express.Router();
dpdcollectionRouter.post('/apisavedpdcollection',authMiddleware(['Admin', 'Sales_Man']), savedpdcollection);
dpdcollectionRouter.get('/apigetalldpdcollection',authMiddleware(['Admin', 'Sales_Man']), getalldpdcollections);
dpdcollectionRouter.get('/apigetadmindpdcollections',authMiddleware(['Admin', 'Sales_Man']), getAdminDpdCollections);
dpdcollectionRouter.get('/apigetsalespersondpdcollections',authMiddleware(['Admin', 'Sales_Man']), getSalespersonDpdCollections);
dpdcollectionRouter.put('/apiupdatedpdcollection',authMiddleware(['Admin', 'Sales_Man']),updatedpdcollection)
dpdcollectionRouter.delete('/apideletedpdcollection',authMiddleware(['Admin', 'Sales_Man']),deletedpdcollection)
dpdcollectionRouter.delete('/apideletedpdentry', authMiddleware(['Admin']), deleteDpdEntry);
dpdcollectionRouter.get('/employee/:employeeId', authMiddleware(['Admin', 'Sales_Man']), getEmployeeDpdDetails);
dpdcollectionRouter.get('/apigetadmindpdcollectionsrange', authMiddleware(['Admin']), getAdminDpdCollectionsRange);
dpdcollectionRouter.get('/apigetsalespersonmonthlysummary', authMiddleware(['Sales_Man']), getSalespersonDpdMonthlySummary);
export default dpdcollectionRouter;