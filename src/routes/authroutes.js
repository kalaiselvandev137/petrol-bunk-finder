import express from 'express'
import { login } from '../controllers/authentication/loginController.js';

const authRouter = express.Router()
authRouter.post('/apilogin',login);

export default authRouter;