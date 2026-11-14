import express from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/authMiddleware.js'
import {
  getalldealers,
  savedealer,
  updatedealer,
  deletedealer,
  bulkuploaddealers,
  getdealerstatsforsalesman,
  getdealersbysalesman,
  getalldealersforMap,
} from '../controllers/DealerController.js'

// memory storage — we parse the workbook straight from the buffer, nothing hits disk
const upload = multer({ storage: multer.memoryStorage() })

const dealersRouter = express.Router()

dealersRouter.get('/apigetalldealers', authMiddleware(['Admin', 'Sales_Man']), getalldealers)
dealersRouter.get('/apigetdealerstats', authMiddleware(['Admin', 'Sales_Man']), getdealerstatsforsalesman)
dealersRouter.get('/apigetdealersbysalesman', authMiddleware(['Admin', 'Sales_Man']), getdealersbysalesman)
dealersRouter.get('/apigetalldealersformap', authMiddleware(['Admin', 'Sales_Man']), getalldealersforMap)
dealersRouter.post('/apisavedealer', authMiddleware(['Admin', 'Sales_Man']), savedealer)
dealersRouter.put('/apiupdatedealer', authMiddleware(['Admin', 'Sales_Man']), updatedealer)
dealersRouter.delete('/apideletedealer/:id', authMiddleware(['Admin', 'Sales_Man']), deletedealer)
dealersRouter.post(
  '/apibulkuploaddealers',
  authMiddleware(['Admin', 'Sales_Man']),
  upload.single('file'),
  bulkuploaddealers
)

export default dealersRouter