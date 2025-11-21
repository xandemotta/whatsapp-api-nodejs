// src/config/mongo.js
const { MongoClient } = require('mongodb')
const logger = require('pino')()

// URL padrão, altere se necessário (ex: Mongo Atlas)
const uri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017'

// Cria cliente global reutilizável
const mongoClient = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

// Função para conectar uma vez só
async function connectMongo() {
    try {
        if (!mongoClient.topology?.isConnected()) {
            await mongoClient.connect()
            logger.info('🟢 Conectado ao MongoDB com sucesso!')
        }
        return mongoClient
    } catch (err) {
        logger.error('❌ Falha ao conectar no MongoDB:')
        logger.error(err)
        process.exit(1)
    }
}

module.exports = { mongoClient, connectMongo }
