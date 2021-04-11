import {Telegraf, Markup, Scenes, session} from "Telegraf"
import {flow, pipe} from "fp-ts/lib/function";
import * as N from "fp-ts/lib/number";
import * as Eq from "fp-ts/lib/Eq";
import { watchFile } from "fs";
import * as fs from "fs/promises";
import {maintenancesPrinter} from "../kafka/maintenances";
import {elem, findFirst, map, takeLeft} from "fp-ts/lib/Array";
import {createAuthCode, grantToken} from "../kafka/trading";
import {messageObservable, publish} from "../amqp/index";

const token = process.env.BOT_TOKEN ?? "762533086:AAHfI2Ffdp4DGQwkKE90GjbaY3nO2spRaMs"
const usersFilePath = "./users.json"
const maintenancesFilePath = "./maintenances.json"
const offersFilePath = "./offers.json"

const isResultOk = flow(
    JSON.parse,
    data => data.result === "Ok"
)

messageObservable.subscribe(data => {
    if (typeof data === "string") {
        const dataJSON = JSON.parse(data)
        if (isResultOk(data)){
            switch (dataJSON.action){
                case "grantToken":
                    setToken(dataJSON.payload.userId, dataJSON.payload.token)
                    break;
                default:
                    console.log(data)
            }
        } else console.log(data)
    } else console.log(data)
})
// Handler factories
const { enter, leave } = Scenes.Stage

// auth scene
const authCW = new Scenes.BaseScene<Scenes.SceneContext>('auth')
authCW.enter((ctx) => {
    if (ctx.from === undefined) return leave<Scenes.SceneContext>()(ctx)
    pipe(
        ctx.from.id,
        createAuthCode,
        JSON.stringify,
        publish,
    )
    return ctx.reply('Напиши код, который тебе отправил чвбот')
})
authCW.leave((ctx) => ctx.reply('Процесс аутентификации закончен, но возможно что-то пошло не так'))
authCW.hears(/(\d+)/, (ctx) => {
    pipe(
        grantToken(ctx.from.id, ctx.match[1] ?? ""),
        JSON.stringify,
        publish,
    )
    const subscription = messageObservable.subscribe(data => {
        if (typeof data === "string" && isResultOk(data)) ctx.reply('Регисттрация успешна!')
        else ctx.reply('Произошла ошибка регистрации')
            subscription.unsubscribe()
            leave<Scenes.SceneContext>()(ctx)
    })

    return ctx.replyWithMarkdown('Send `hi`')
})
authCW.on('message', (ctx) => ctx.replyWithMarkdown('Send `hi`'))

// Echo scene
// const echoScene = new Scenes.BaseScene<Scenes.SceneContext>('echo')
// echoScene.enter((ctx) => ctx.reply('echo scene'))
// echoScene.leave((ctx) => ctx.reply('exiting echo scene'))
// echoScene.command('back', leave<Scenes.SceneContext>())
// echoScene.on('text', (ctx) => ctx.reply(ctx.message.text))
// echoScene.on('message', (ctx) => ctx.reply('Only text messages please'))

const bot = new Telegraf<Scenes.SceneContext>(token)

const stage = new Scenes.Stage<Scenes.SceneContext>([authCW, ], {
    ttl: 10,
})

bot.use(session()); // to  be precise, session is not a must have for Scenes to work, but it sure is lonely without one
bot.use(stage.middleware());
bot.command('auth', (ctx) => ctx.scene.enter('auth'))
// bot.command('echo', (ctx) => ctx.scene.enter('echo'))
const start_btns = Markup.keyboard(["Я", "В разработке..."]).resize()

type User = {
    id: number,
    token: string | null,
    gold: number,
    rights: {
        basic: boolean,
        profile: boolean,
        gear: boolean,
        stock: boolean,
        trade: boolean,
        guild: boolean,
    },
    offersList: [string, string][]
}

const createUser = (id: number):User => ({
    id: id,
    token: null,
    gold: 0,
    rights: {
        basic: false,
        profile: false,
        gear: false,
        stock: false,
        trade: false,
        guild: false,
    },
    offersList: []
})

const readUsers = () => fs.readFile(usersFilePath, "utf-8")
const readMaintenances = () => fs.readFile(maintenancesFilePath, "utf-8")
const readOffers = () => fs.readFile(offersFilePath, "utf-8")
// const addUser = (id: number) =>
//     fs.writeFileSync(usersFilePath, JSON.stringify([...JSON.parse(readUsers()), createUser(id)]))
const addUser = async (id: number) => {
    const users = await readUsers()
    return pipe(
        id,
        createUser,
        user => [...JSON.parse(users), user],
        JSON.stringify,
        data => fs.writeFile(usersFilePath, data)
    )
}

const setToken = async (id: number, token: string) => {
    const users = await readUsers()
    return pipe(
        users,
        JSON.parse,
        map((user: User) => user.id === id ? {...user, token: token, rights: {...user.rights, basic: true, profile: true, trade: true}} : user),
        JSON.stringify,
        data => fs.writeFile(usersFilePath, data)
    )
}

    // fs.writeFileSync(usersFilePath, JSON.stringify([...JSON.parse(readUsers()), createUser(id)]))

// const isRegistered = (id: number) => elem(N.Eq)(id)(map((user: User) => user.id)(JSON.parse(readUsers())))
const isRegistered = async (id: number) => {
    const users = await readUsers()
    return pipe(
        users,
        JSON.parse,
        map((user: User) => user.id),
        elem(N.Eq)(id)
    )
}

watchFile(offersFilePath, () => readOffers().then((offer) => console.log(offer)))

bot.start(async ctx => {
    if (await isRegistered(ctx.from.id)) return ctx.reply("Привет!")
    else {
        await addUser(ctx.from.id)
        return ctx.reply("Новый пользователь зарегистрирован!")
    }
})

bot.command('repair', async (ctx) => {
    const maintenances = await readMaintenances()
    return pipe(
        maintenances,
        JSON.parse,
        takeLeft(20),
        maintenancesPrinter,
        // console.log,
        text => ctx.reply(text)
    )
})
bot.command('list', async (ctx) => {
    const users = await readUsers()
    return pipe(
        users,
        JSON.parse,
        takeLeft(20),
        maintenancesPrinter,
        // console.log,
        text => ctx.reply(text)
    )
})


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

export default bot