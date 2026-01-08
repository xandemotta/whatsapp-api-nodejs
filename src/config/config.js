// Port number
const PORT = process.env.PORT || '3333'
const TOKEN = process.env.TOKEN || ''
const PROTECT_ROUTES = !!(
    process.env.PROTECT_ROUTES && process.env.PROTECT_ROUTES === 'true'
)

const RESTORE_SESSIONS_ON_START_UP = !!(
    process.env.RESTORE_SESSIONS_ON_START_UP &&
    process.env.RESTORE_SESSIONS_ON_START_UP === 'true'
)

const APP_URL = process.env.APP_URL || false

const LOG_LEVEL = process.env.LOG_LEVEL

// How many QR generations before giving up (higher is more forgiving)
const INSTANCE_MAX_RETRY_QR = process.env.INSTANCE_MAX_RETRY_QR || 5

const CLIENT_PLATFORM = process.env.CLIENT_PLATFORM || 'Whatsapp MD'
const CLIENT_BROWSER = process.env.CLIENT_BROWSER || 'Chrome'
const CLIENT_VERSION = process.env.CLIENT_VERSION || '4.0.0'

// Baileys socket behavior toggles
const MARK_ONLINE_ON_CONNECT = !!(
    process.env.MARK_ONLINE_ON_CONNECT &&
    process.env.MARK_ONLINE_ON_CONNECT === 'true'
)
const SYNC_FULL_HISTORY = !!(
    process.env.SYNC_FULL_HISTORY && process.env.SYNC_FULL_HISTORY === 'true'
)
const EMIT_OWN_EVENTS = !!(
    process.env.EMIT_OWN_EVENTS && process.env.EMIT_OWN_EVENTS === 'true'
)
const DEFAULT_QUERY_TIMEOUT_MS = parseInt(
    process.env.DEFAULT_QUERY_TIMEOUT_MS || '60000',
    10
)

// Enable or disable mongodb
const MONGODB_ENABLED = !!(
    process.env.MONGODB_ENABLED && process.env.MONGODB_ENABLED === 'true'
)
// URL of the Mongo DB
const MONGODB_URL =
    process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/WhatsAppInstance'
// Enable or disable webhook globally on project
const WEBHOOK_ENABLED = !!(
    process.env.WEBHOOK_ENABLED && process.env.WEBHOOK_ENABLED === 'true'
)
// Webhook URL
const WEBHOOK_URL = process.env.WEBHOOK_URL
// Receive message content in webhook (Base64 format)
const WEBHOOK_BASE64 = !!(
    process.env.WEBHOOK_BASE64 && process.env.WEBHOOK_BASE64 === 'true'
)
// allowed events which should be sent to webhook
const WEBHOOK_ALLOWED_EVENTS = process.env.WEBHOOK_ALLOWED_EVENTS?.split(',') || ['all']

// Daily reset of all Signal/Baileys sessions at midnight (optional)
const DAILY_RESET_SESSIONS_AT_MIDNIGHT = !!(
    process.env.DAILY_RESET_SESSIONS_AT_MIDNIGHT &&
    process.env.DAILY_RESET_SESSIONS_AT_MIDNIGHT === 'true'
)
// Mark messages as seen
const MARK_MESSAGES_READ = !!(
    process.env.MARK_MESSAGES_READ && process.env.MARK_MESSAGES_READ === 'true'
)

module.exports = {
    port: PORT,
    token: TOKEN,
    restoreSessionsOnStartup: RESTORE_SESSIONS_ON_START_UP,
    appUrl: APP_URL,
    log: {
        level: LOG_LEVEL,
    },
    instance: {
        maxRetryQr: INSTANCE_MAX_RETRY_QR,
    },
    socket: {
        markOnlineOnConnect: MARK_ONLINE_ON_CONNECT,
        syncFullHistory: SYNC_FULL_HISTORY,
        emitOwnEvents: EMIT_OWN_EVENTS,
        defaultQueryTimeoutMs: DEFAULT_QUERY_TIMEOUT_MS,
    },
    mongoose: {
        enabled: MONGODB_ENABLED,
        url: MONGODB_URL,
        options: {
            // useCreateIndex: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
    },
    browser: {
        platform: CLIENT_PLATFORM,
        browser: CLIENT_BROWSER,
        version: CLIENT_VERSION,
    },
    dailyResetSessionsAtMidnight: DAILY_RESET_SESSIONS_AT_MIDNIGHT,
    webhookEnabled: WEBHOOK_ENABLED,
    webhookUrl: WEBHOOK_URL,
    webhookBase64: WEBHOOK_BASE64,
    protectRoutes: PROTECT_ROUTES,
    markMessagesRead: MARK_MESSAGES_READ,
    webhookAllowedEvents: WEBHOOK_ALLOWED_EVENTS
}
