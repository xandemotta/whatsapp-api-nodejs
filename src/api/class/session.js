/* eslint-disable no-unsafe-optional-chaining */
const { WhatsAppInstance } = require('../class/instance')
const logger = require('pino')()
const config = require('../../config/config')
const { mongoClient } = require('../../config/mongo') // certifique-se que está exportado aqui
const WhatsAppInstances = {}

class Session {
    async restoreSessions() {
        const restoredSessions = []
        try {
            const db = mongoClient.db('whatsapp-api')
            const collections = await db.listCollections().toArray()

            if (!collections.length) {
                logger.info('⚠️ Nenhuma sessão encontrada no MongoDB.')
                return []
            }

            for (const collection of collections) {
                const sessionId = collection.name

                // Evita duplicação
                if (WhatsAppInstances[sessionId]) {
                    logger.warn(`⚠️ Sessão ${sessionId} já ativa, pulando...`)
                    continue
                }

                logger.info(`🔄 Restaurando sessão: ${sessionId}`)

                const webhook =
                    config.webhookEnabled && config.webhookUrl
                        ? config.webhookUrl
                        : undefined

                const instance = new WhatsAppInstance(
                    sessionId,
                    config.webhookEnabled,
                    webhook
                )

                try {
                    await instance.init()
                    WhatsAppInstances[sessionId] = instance
                    restoredSessions.push(sessionId)
                    logger.info(`✅ Sessão ${sessionId} restaurada com sucesso.`)
                } catch (err) {
                    logger.error(`❌ Erro ao restaurar sessão ${sessionId}:`)
                    logger.error(err)
                }

                // Delay pequeno para evitar race conditions com o Baileys
                await new Promise((r) => setTimeout(r, 2000))
            }

            logger.info(`🟢 Total de sessões restauradas: ${restoredSessions.length}`)
        } catch (e) {
            logger.error('❌ Erro geral ao restaurar sessões:')
            logger.error(e)
        }

        return restoredSessions
    }
}

exports.Session = Session
exports.WhatsAppInstances = WhatsAppInstances
