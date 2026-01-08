/* eslint-disable no-unused-vars */
const APIError = require('../../api/errors/api.error')

const handler = (err, req, res, next) => {
    const statusCode = err.statusCode ? err.statusCode : 500
    const sessionId = req?.query?.key || req?.body?.key || null

    res.setHeader('Content-Type', 'application/json')
    res.status(statusCode)
    res.json({
        error: true,
        code: statusCode,
        message: err.message,
        sessionId,
    })
}

exports.handler = handler

exports.notFound = (req, res, next) => {
    const err = new APIError({
        message: 'Not found',
        status: 404,
    })
    return handler(err, req, res)
}
