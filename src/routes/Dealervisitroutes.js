import express from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/authMiddleware.js'
import { getAdminDealerVisits, getSalespersonDealerVisits, saveDealerVisit } from '../controllers/Dealervisitcontroller.js'
import { getVisitMarkers } from '../controllers/DealerVisitMarkersController.js'

const upload = multer({ storage: multer.memoryStorage() })

const dealerVisitsRouter = express.Router()

// Salesperson
dealerVisitsRouter.post('/apisavedealervisit',authMiddleware(['Admin', 'Sales_Man']),upload.single('Visit_Image'),saveDealerVisit)
dealerVisitsRouter.get('/apigetsalespersondealervisits',authMiddleware(['Sales_Man']),getSalespersonDealerVisits)

// Admin: all salesmen (selectedDate=YYYY-MM-DD, or startDate & endDate)
dealerVisitsRouter.get('/apigetadmindealervisits',authMiddleware(['Admin']),getAdminDealerVisits)

dealerVisitsRouter.get('/apigetvisitmarkers', authMiddleware(['Admin']), getVisitMarkers);

export default dealerVisitsRouter

