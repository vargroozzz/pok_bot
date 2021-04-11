import { Kafka } from 'kafkajs'
import {sortByPriceByMana, storesToMaintenances} from "./maintenances";
import { pipe } from "fp-ts/lib/function";
import * as fs from "fs";
import {writeOfferJSON} from "./offers";

const maintenancesFilePath = "./maintenances.json"
const offersFilePath = "./offers.json"

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['digest-api.chtwrs.com:9092']
})

const runKafka = async () => {
    const consumer = kafka.consumer({groupId: 'test-group'})

    await consumer.connect()
    await consumer.subscribe({topic: 'cw3-offers', fromBeginning: false})
    await consumer.subscribe({topic: 'cw3-yellow_pages', fromBeginning: false})

    await consumer.run({
            eachMessage: async ({topic, partition, message}) => {
                switch (topic){
                    case 'cw3-offers':
                        const offer = JSON.parse(message.value?.toString() ?? "")
                        pipe(
                            offer,
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
}

export default runKafka
