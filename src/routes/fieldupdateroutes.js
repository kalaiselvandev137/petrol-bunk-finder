
import express from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/authMiddleware.js'
import { deleteFieldupdates, getAdminFieldupdates,getAdminFieldupdatesRange, getallFieldupdates, getSalespersonFieldupdates, saveFieldupdates, updateFieldupdates } from '../controllers/FieldupdatesController.js'
import { getSalespersonFieldupdatesMonthlySummary } from '../controllers/Salespersonmonthlycontrollers.js'

const storage = multer.memoryStorage()
const upload = multer({ storage })
const fieldupdatesRouter = express.Router()
// Separate routes for Admin and Salesperson
fieldupdatesRouter.get( '/apigetadminfieldupdates', authMiddleware(['Admin']), getAdminFieldupdates);
fieldupdatesRouter.get('/apigetsalespersonfieldupdates', authMiddleware(['Sales_Man']), getSalespersonFieldupdates);
fieldupdatesRouter.get('/apigetallfieldupdates', authMiddleware(['Admin','Sales_Man']), getallFieldupdates)
fieldupdatesRouter.post('/apisavefieldupdate', authMiddleware(['Admin','Sales_Man']), upload.single('Visit_Image'), saveFieldupdates)
fieldupdatesRouter.put('/apiupdatefieldupdate', authMiddleware(['Admin','Sales_Man']), upload.single('Visit_Image'), updateFieldupdates)
fieldupdatesRouter.delete('/apideletefieldupdate', authMiddleware(['Admin','Sales_Man']), deleteFieldupdates)
fieldupdatesRouter.get('/apigetsalespersonfieldupdatesmonthly', authMiddleware(['Sales_Man']), getSalespersonFieldupdatesMonthlySummary);

fieldupdatesRouter.get('/apigetadminfieldupdatesrange', authMiddleware(['Admin']), getAdminFieldupdatesRange);
export default fieldupdatesRouter
