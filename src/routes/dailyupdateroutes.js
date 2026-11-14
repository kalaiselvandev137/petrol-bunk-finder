
import express from 'express'
import multer from 'multer'
import { deleteEmployee, getallEmployees, saveEmployee, updateEmployee } from '../controllers/employeeController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import { deleteDailyupdates, getallDailyupdates, saveDailyupdates, updateDailyupdates } from '../controllers/DailyupdatesController.js'
const storage = multer.memoryStorage()
const upload = multer({ storage })
const dailyupdatesRouter = express.Router()
dailyupdatesRouter.get('/apigetalldailyupdates', authMiddleware(['Admin','Sales_Man']), getallDailyupdates)
dailyupdatesRouter.post('/apisavedailyupdate', authMiddleware(['Admin','Sales_Man']),upload.single('Image') , saveDailyupdates)
dailyupdatesRouter.put('/apiupdatedailyupdate', authMiddleware(['Admin','Sales_Man']),upload.single('Image') , updateDailyupdates)
dailyupdatesRouter.delete('/apideletedailyupdate', authMiddleware(['Admin','Sales_Man']), deleteDailyupdates)
export default dailyupdatesRouter
