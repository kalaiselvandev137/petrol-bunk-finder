import express from 'express';
import { getAvailableSlotsForDate, getSettings, saveSettings } from '../controllers/SettingController.js';


const settingsRouter = express.Router();

settingsRouter.get('/apigetsettings', getSettings);
settingsRouter.post('/apisavesettings', saveSettings);
settingsRouter.get('/apigetsettingslots/slots', getAvailableSlotsForDate);

export default settingsRouter;