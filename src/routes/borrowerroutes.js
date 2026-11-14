import express from 'express'
import multer from 'multer'
import { deleteBorrower,getallBorrowers, saveBorrower,updateBorrower,bulkUploadBorrowers } from '../controllers/BorrowerController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const storage = multer.memoryStorage()
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else if (file.fieldname === 'Image') {
      // Accept images for regular upload
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
})

const borrowersRouter = express.Router()

borrowersRouter.get('/apigetallborrowers', authMiddleware(['Admin', 'Sales_Man']), getallBorrowers)
borrowersRouter.post('/apisaveborrower', authMiddleware(['Admin']), upload.single('Image'), saveBorrower)
borrowersRouter.put('/apiupdateborrower', authMiddleware(['Admin']), upload.single('Image'), updateBorrower)
borrowersRouter.delete('/apideleteborrower', authMiddleware(['Admin']), deleteBorrower)
borrowersRouter.post('/apibulkuploadborrowers', authMiddleware(['Admin']), upload.single('excelFile'), bulkUploadBorrowers)

export default borrowersRouter