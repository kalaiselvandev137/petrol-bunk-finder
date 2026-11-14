
import express from 'express'
import multer from 'multer'
import { deleteEmployee, getallEmployees, getemployee,getProfile, saveEmployee, updateEmployee,updateProfile } from '../controllers/employeeController.js'
import authMiddleware from '../middleware/authMiddleware.js'
const storage = multer.memoryStorage()
const upload = multer({ storage })
const employeesRouter = express.Router()
const employeeUploads = upload.fields([
  { name: 'Image', maxCount: 1 },
  { name: 'face_verify_reference_image', maxCount: 1 },
])
employeesRouter.get('/apigetallemployees', authMiddleware(['Admin']), getallEmployees)
employeesRouter.get('/apigetemployee',getemployee)
employeesRouter.post('/apisaveemployee', authMiddleware(['Admin']),employeeUploads, saveEmployee)
employeesRouter.put('/apiupdateemployee', authMiddleware(['Admin']),employeeUploads , updateEmployee)
employeesRouter.delete('/apideleteemployee', authMiddleware(['Admin']), deleteEmployee)
employeesRouter.get('/apigetprofile', authMiddleware(['Admin', 'Sales_Man']), getProfile)
employeesRouter.put('/apiupdateprofile', authMiddleware(['Admin', 'Sales_Man']), employeeUploads, updateProfile)
export default employeesRouter
