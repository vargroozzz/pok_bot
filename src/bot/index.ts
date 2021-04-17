import {Telegraf, Markup, Scenes, session} from "Telegraf"
import {flow, pipe} from "fp-ts/lib/function";
import * as N from "fp-ts/lib/number";
import * as Eq from "fp-ts/lib/Eq";
import { watchFile } from "fs";
import * as fs from "fs/promises";
import {maintenancesPrinter} from "../kafka/maintenances";
import {elem, findFirst, map, takeLeft} from "fp-ts/lib/Array";
import {createAuthCode, grantToken} from "../amqp/trading";
import {messageObservable, publish} from "../amqp/index";
import * as O from "fp-ts/lib/Option";
import {User} from "../db/types";
import {addUser, getUsers, isRegistered, readMaintenances, setToken} from "../db/utils";

const token = process.env.BOT_TOKEN ?? "762533086:AAHfI2Ffdp4DGQwkKE90GjbaY3nO2spRaMs"


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
        if (typeof data === "string" && isResultOk(data)) ctx.reply('Регистрация успешна!')
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
    const users = await getUsers()
    return pipe(
        users,
        findFirst((user: User) => user.id === ctx.from.id),
        // console.log,
        O.match(
            () => 'a none',
            (a) => `a some containing ${a}`
        )
    )
})


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

export default bot