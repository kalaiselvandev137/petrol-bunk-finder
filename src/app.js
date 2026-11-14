// import express from 'express'
// import compression from 'compression'
// import morgan from 'morgan'
// import cors from 'cors'
// import router from './routes/index.js'
// import { getServerTemplate } from './templates/serverTemplate.js'
// const app = express()
// app.use(express.json({ limit: '200mb' })); 
// app.use(express.urlencoded({ extended: false, limit: '200mb' }));
// app.use(morgan('dev'))
// app.use(compression())
// app.use('/uploads', express.static('uploads'))
// app.use(cors({
//   origin: ['http://localhost:5173','http://13.233.167.35','http://192.168.1.8:5173','http://192.168.1.28:5173','https://znt9x1gg-5173.inc1.devtunnels.ms'],
//   credentials: true
// }))
// app.use('/', router)
// // app.get('/', (req, res) => res.send('Welcome to Backend server...'))
// app.get('/', (req, res) => {res.send(getServerTemplate())})
// export default app


import express from 'express'
import compression from 'compression'
import morgan from 'morgan'
import cors from 'cors'
import router from './routes/index.js'
import { getServerTemplate } from './templates/serverTemplate.js'

const app = express()

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: false, limit: '200mb' }));
app.use(morgan('dev'))
app.use(compression())

// CORS must come BEFORE any route/static handler that you want it applied to
app.use(cors({
  origin: ['http://localhost:5173','http://13.233.167.35','http://192.168.1.27:5173','http://192.168.1.28:5173','https://znt9x1gg-5173.inc1.devtunnels.ms',
    'http://192.168.1.17:5173'
  ],
  credentials: true
}))

app.use('/uploads', express.static('uploads'))
app.use('/', router)

app.get('/', (req, res) => { res.send(getServerTemplate()) })

export default app