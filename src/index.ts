import runKafka from "./kafka/index.js"
import bot from "./bot";
import {runAMQPConsumer} from "./amqp";

runKafka()
runAMQPConsumer()
bot.launch()