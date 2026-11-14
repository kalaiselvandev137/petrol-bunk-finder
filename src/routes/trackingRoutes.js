import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import {
  getConsent, saveConsent, startSession, saveLocationPoints, endSession,
  getTrackingSessions, getSessionPoints,
} from '../controllers/trackingController.js'

const trackingRouter = express.Router()

const salesman = authMiddleware(['Sales_Man'])
const management = authMiddleware(['Admin'])

// salesman app: consent + write only
trackingRouter.get('/apigetconsent', salesman, getConsent)
trackingRouter.post('/apisaveconsent', salesman, saveConsent)
trackingRouter.post('/apistartsession', salesman, startSession)
trackingRouter.post('/apisavelocationpoints', salesman, saveLocationPoints)
trackingRouter.put('/apiendsession', salesman, endSession)

// admin / management: read only
trackingRouter.get('/apigettrackingsessions', management, getTrackingSessions)
trackingRouter.get('/apigetsessionpoints', management, getSessionPoints)

export default trackingRouter