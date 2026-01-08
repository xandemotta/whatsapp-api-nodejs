
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const axios = require('axios')
const logger = require('pino')()
dotenv.config()
process.env.NODE_OPTIONS = "--dns-result-order=ipv4first"

const app = require('./config/express')
const config = require('./config/config')

const { Session } = require('./api/class/session')
const connectToCluster = require('./api/helper/connectMongoClient')
const Chat = require('./api/models/chat.model')

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

async function performDailySessionReset() {
    try {
        if (!global.mongoClient) {
            logger.warn(
                'STATE: Daily session reset skipped (mongoClient not initialized)'
            )
            return
        }

        logger.warn('STATE: Daily session reset triggered (midnight job)')

        // gracefully close and cleanup all in-memory instances
        if (global.WhatsAppInstances) {
            const entries = Object.entries(global.WhatsAppInstances)
            for (const [key, instance] of entries) {
                try {
                    if (instance && typeof instance.deleteInstance === 'function') {
                        await instance.deleteInstance(key)
                    }
                } catch (e) {
                    logger.error(e)
                    logger.error(
                        `STATE: Error deleting instance ${key} during daily reset`
                    )
                } finally {
                    delete global.WhatsAppInstances[key]
                }
            }
        }

        // drop Baileys/libsignal auth database
        try {
            const db = global.mongoClient.db('whatsapp-api')
            await db.dropDatabase()
            logger.warn(
                'STATE: whatsapp-api database dropped successfully by daily reset'
            )
        } catch (e) {
            logger.error(e)
            logger.error(
                'STATE: Failed to drop whatsapp-api database during daily reset'
            )
        }

        // clear Chat snapshots, if mongoose is enabled
        if (config.mongoose.enabled) {
            try {
                await Chat.deleteMany({})
                logger.info('STATE: All Chat documents removed by daily reset')
            } catch (e) {
                logger.error(e)
                logger.error(
                    'STATE: Failed to delete Chat documents during daily reset'
                )
            }
        }

        // notify external system (Delphi) that sessions were reset
        if (config.webhookEnabled && config.webhookUrl) {
            try {
                await axios.post(config.webhookUrl, {
                    type: 'system',
                    event: 'daily_session_reset',
                    message: 'sessões resetadas',
                    timestamp: new Date().toISOString(),
                })
                logger.info(
                    'WEBHOOK: Daily session reset ping sent successfully'
                )
            } catch (e) {
                logger.error(e)
                logger.error(
                    'WEBHOOK: Failed to send daily session reset ping'
                )
            }
        } else {
            logger.info(
                'WEBHOOK: Daily session reset ping skipped (webhook disabled or URL not configured)'
            )
        }
    } catch (error) {
        logger.error('STATE: Unexpected error during daily session reset')
        logger.error(error)
    }
}

function scheduleDailySessionReset() {
    if (!config.dailyResetSessionsAtMidnight) {
        logger.info(
            'STATE: Daily session reset at midnight is disabled by configuration'
        )
        return
    }

    const now = new Date()
    const next = new Date(now)
    next.setHours(24, 0, 0, 0) // próximo meia-noite
    const msUntilNextMidnight = next.getTime() - now.getTime()

    logger.info(
        `STATE: Daily session reset scheduled to run in ${Math.round(
            msUntilNextMidnight / 1000
        )} seconds`
    )

    setTimeout(() => {
        performDailySessionReset().catch((e) => {
            logger.error(e)
            logger.error(
                'STATE: performDailySessionReset() unhandled error (initial run)'
            )
        })

        // subsequent runs every 24h
        setInterval(() => {
            performDailySessionReset().catch((e) => {
                logger.error(e)
                logger.error(
                    'STATE: performDailySessionReset() unhandled error (recurring run)'
                )
            })
        }, 24 * 60 * 60 * 1000)
    }, msUntilNextMidnight)
}

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

            // schedule optional daily reset of all sessions at midnight
            scheduleDailySessionReset()
        })
    } catch (error) {
        logger.error('FATAL: Error during server bootstrap')
        logger.error(error)
        process.exit(1)
    }
}

start()

module.exports = server
