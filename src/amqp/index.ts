import amqp from 'amqplib'
import {fromEvent, Observable} from "rxjs"
import EventEmitter from "events"

const appName = "ibogdan_cwutils"
const apiToken = process.env.CWAPI_TOKEN
if (apiToken === undefined) throw new Error("CW API token is required")
const host = "api.chtwrs.com"
const port = 5673
const connectionURL = `amqps://${appName}:${apiToken}@${host}:${port}/`
const directExchange = `${appName}_ex`
const inboundQueue = `${appName}_i`
const routingKey = `${appName}_o`

const connection = await amqp.connect(connectionURL)
const publisherChannel = await connection.createChannel()

export const publish = (data: string) => publisherChannel.publish(directExchange, routingKey, Buffer.from(data))

// Consumer
const messageEmitter = new EventEmitter()
export const messageObservable = fromEvent(messageEmitter, 'message')

const consumerChannel = await connection.createChannel()

export const runAMQPConsumer = () => consumerChannel.consume(inboundQueue,
    (msg) => {
    if (msg !== null) {
        console.log(msg.content.toString())
        messageEmitter.emit("message", msg.content.toString())
        consumerChannel.ack(msg)
    }
})