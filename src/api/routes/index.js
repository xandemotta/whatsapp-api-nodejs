const express = require('express')
const router = express.Router()
const instanceRoutes = require('./instance.route')
const messageRoutes = require('./message.route')
const miscRoutes = require('./misc.route')
const groupRoutes = require('./group.route')

router.get('/status', (req, res) => res.send('OK'))

// simple webhook echo endpoint (useful for testing curl and payloads)
router.post('/webhook', (req, res) => {
    // just log and acknowledge; the real webhook target should be your Delphi app
    // eslint-disable-next-line no-console
    console.log('WEBHOOK TEST RECEIVED:', JSON.stringify(req.body))
    res.json({ status: 'ok' })
})

router.use('/instance', instanceRoutes)
router.use('/message', messageRoutes)
router.use('/group', groupRoutes)
router.use('/misc', miscRoutes)

module.exports = router
