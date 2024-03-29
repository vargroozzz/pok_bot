import { Kafka } from 'kafkajs'
import {sortByPriceByMana, storesToMaintenances} from "./maintenances"
import { pipe } from "fp-ts/lib/function"
import * as fs from "fs/promises"
import {writeOfferJSON} from "./offers"
import EventEmitter from "events"
import {fromEvent} from "rxjs"

const maintenancesFilePath = "./maintenances.json"
const offersFilePath = "./offers.json"

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['digest-api.chtwrs.com:9092']
})

const offerEmitter = new EventEmitter()
export const offerObservable = fromEvent(offerEmitter, 'offer')

const runKafka = async () => {
    const consumer = kafka.consumer({groupId: 'test-group'})

    await consumer.connect()
    await consumer.subscribe({topic: 'cw3-offers', fromBeginning: false})
    await consumer.subscribe({topic: 'cw3-yellow_pages', fromBeginning: false})

    await consumer.run({
            eachMessage: async ({topic, partition, message}) => {
                switch (topic){
                    case 'cw3-offers':
                        if(message.value !== null) {
                            const data = pipe(
                                message.value.toString(),
                                JSON.parse,
                                writeOfferJSON,
                                JSON.stringify
                            )
                            offerEmitter.emit("offer", data)
                        }
                        // const offer = JSON.parse(message.value?.toString() ?? "")
                        // pipe(
                        //     offer,
                        //     writeOfferJSON,
                        //     JSON.stringify,
                        //     data => fs.writeFileSync(offersFilePath, data),
                        // )
                        break
                    case 'cw3-yellow_pages':
                        const stores = JSON.parse(message.value?.toString() ?? "")
                        pipe(
                            stores,
                            storesToMaintenances,
                            sortByPriceByMana,
                            JSON.stringify,
                            data => fs.writeFile(maintenancesFilePath, data),
                        )
                        break
                }
                },
    })
}

export default runKafka
