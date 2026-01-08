const express = require('express')
const path = require('path')
const logger = require('pino')()
const exceptionHandler = require('express-exception-handler')
exceptionHandler.handle()
const app = express()
const error = require('../api/middlewares/error')
const tokenCheck = require('../api/middlewares/tokenCheck')
const { protectRoutes } = require('./config')

app.use(express.json())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../api/views'))
global.WhatsAppInstances = {}

app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
            logger.warn({
                msg: 'AUTH: Request blocked',
                status: res.statusCode,
                method: req.method,
                path: req.originalUrl,
                key: req.query?.key || req.body?.key || null,
                hasAuthHeader: Boolean(req.headers.authorization),
                ip: req.ip,
                userAgent: req.headers['user-agent'] || null,
                reason: res.locals.authFailureReason || null,
                durationMs: Date.now() - start,
            })
        }
    })
    next()
})

const routes = require('../api/routes/')
if (protectRoutes) {
    app.use(tokenCheck)
}
app.use('/', routes)
app.use(error.handler)

module.exports = app
