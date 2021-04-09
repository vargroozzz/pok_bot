import { Kafka } from 'kafkajs'
import { printMaintenances } from "./maintenances";
import { pipe } from "fp-ts/lib/function";

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['digest-api.chtwrs.com:9092']
})
const run = async () => {
    // const producer = kafka.producer()
    // console.log(1)
    // await producer.connect()
    // await producer.send({
    //     topic: 'test-topic',
    //     messages: [
    //         {value: 'Hello KafkaJS user!'},
    //     ],
    // })

    // await producer.disconnect()

    const consumer = kafka.consumer({groupId: 'test-group'})

    await consumer.connect()
    // await consumer.subscribe({topic: 'cw3-offers', fromBeginning: false})
    await consumer.subscribe({topic: 'cw3-yellow_pages', fromBeginning: false})


    await consumer.run({
        eachMessage: async ({topic, partition, message}) => {
            pipe(
                message.value?.toString() ?? "",
                JSON.parse,
                printMaintenances,
                // offersPrinter,
                console.log
            )
        },
    })
}
// const kafka = new Kafka({
//     clientId: 'my-app',
//     brokers: ['cw3-digest-api.chtwrs.com:9092']
// })
//
// const consumer = kafka.consumer({ groupId: 'test-group' })
// await consumer.connect()
// await consumer.subscribe({ topic: 'cw3-deals', fromBeginning: false })
//
// const run = async () => {
//     await consumer.run({
//         eachMessage: async ({ topic, partition, message }) => {
//             console.log({
//                 value: message.value?.toString(),
//             })
//         },
//     })
// }

export default run
