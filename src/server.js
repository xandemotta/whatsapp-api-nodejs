
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const logger = require('pino')()
dotenv.config()
process.env.NODE_OPTIONS = "--dns-result-order=ipv4first"

const app = require('./config/express')
const config = require('./config/config')

const { Session } = require('./api/class/session')
const connectToCluster = require('./api/helper/connectMongoClient')

let server

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed')
            process.exit(1)
        })
    } else {
        process.exit(1)
    }
}

const unexpectedErrorHandler = (error) => {
    logger.error(error)
    exitHandler()
}

process.on('uncaughtException', unexpectedErrorHandler)
process.on('unhandledRejection', unexpectedErrorHandler)

process.on('SIGTERM', () => {
    logger.info('SIGTERM received')
    if (server) {
        server.close()
    }
})

async function start() {
    try {
        if (config.mongoose.enabled) {
            logger.info('MONGOOSE: Connecting to MongoDB...')
            mongoose.set('strictQuery', true)
            await mongoose.connect(config.mongoose.url, config.mongoose.options)
            logger.info('MONGOOSE: Connected to MongoDB')
        } else {
            logger.info('MONGOOSE: Disabled via configuration')
        }

        logger.info('STATE: Initializing MongoDB client for Baileys auth store')
        global.mongoClient = await connectToCluster(config.mongoose.url)

        // optional hard reset of all Signal/Baileys sessions on process start
        if (process.env.RESET_ALL_SESSIONS_ON_START === 'true') {
            try {
                logger.warn(
                    'STATE: RESET_ALL_SESSIONS_ON_START=true -> dropping whatsapp-api database'
                )
                const db = global.mongoClient.db('whatsapp-api')
                await db.dropDatabase()
                logger.warn(
                    'STATE: whatsapp-api database dropped successfully (all sessions cleared)'
                )
            } catch (e) {
                logger.error(e)
                logger.error(
                    'STATE: Failed to drop whatsapp-api database during startup reset'
                )
            }
        }

        server = app.listen(config.port, async () => {
            logger.info(`SERVER: Listening on port ${config.port}`)
            if (config.restoreSessionsOnStartup) {
                logger.info('SESSIONS: Restoring sessions on startup')
                const session = new Session()
                const restoredSessions = await session.restoreSessions()
                logger.info(
                    `SESSIONS: ${restoredSessions.length} session(s) restored`
                )
            } else {
                logger.info('SESSIONS: Auto-restore on startup is disabled')
            }
        })
    } catch (error) {
        logger.error('FATAL: Error during server bootstrap')
        logger.error(error)
        process.exit(1)
    }
}

start()

module.exports = server
