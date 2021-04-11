import { Kafka } from 'kafkajs'
import {sortByPriceByMana, storesToMaintenances} from "./maintenances";
import { pipe } from "fp-ts/lib/function";
import * as fs from "fs";
import {writeOfferJSON} from "./offers";
import {Observable} from "rxjs";

const maintenancesFilePath = "./maintenances.json"
const offersFilePath = "./offers.json"

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['digest-api.chtwrs.com:9092']
})
// api.chtwrs.com:5673
// const producer = kafka.producer()
// await producer.connect()

// const send = async () => {
//     await producer.send({
//         topic: 'ibogdan_cwutils_ex',
//         messages: [
//             {value: JSON.stringify(createAuthCode(468074317))},
//         ],
//     })
// }

// await producer.disconnect()
const runKafka = async () => {
    const consumer = kafka.consumer({groupId: 'test-group'})

    await consumer.connect()
    await consumer.subscribe({topic: 'cw3-offers', fromBeginning: false})
    await consumer.subscribe({topic: 'cw3-yellow_pages', fromBeginning: false})

    // const apiReplyObserver = new Observable(subscriber => {
    await consumer.run({
            eachMessage: async ({topic, partition, message}) => {
                switch (topic){
                    case 'cw3-offers':
                        const offer = JSON.parse(message.value?.toString() ?? "")
                        pipe(
                            offer,
                            // writeOffer,
                            writeOfferJSON,
                            JSON.stringify,
                            data => fs.writeFileSync(offersFilePath, data),
                        )
                        break;
                    case 'cw3-yellow_pages':
                        const stores = JSON.parse(message.value?.toString() ?? "")
                        pipe(
                            stores,
                            storesToMaintenances,
                            sortByPriceByMana,
                            JSON.stringify,
                            data => fs.writeFileSync(maintenancesFilePath, data),
                        )
                        break;
                }
            },
        })
    // })
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
// const runKafka = async () => {
//     await consumer.run({
//         eachMessage: async ({ topic, partition, message }) => {
//             console.log({
//                 value: message.value?.toString(),
//             })
//         },
//     })
// }

export default runKafka
