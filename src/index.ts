import runKafka from "./kafka/index.js"
import bot from "./bot";
import {runAMQPConsumer} from "./amqp";

const TOKEN = process.env.BOT_TOKEN
const HOST_URL = process.env.HOST_URL
const PORT = parseInt(process.env.PORT ?? "")
if (isNaN(PORT)) throw new Error("Port is required")

runKafka()
runAMQPConsumer()
bot.launch({
    webhook: {
        domain: HOST_URL,
        port: PORT,
        // tlsOptions: null,
        hookPath: `/bot${TOKEN}`
    }
});