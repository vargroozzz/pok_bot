import {Telegraf, Scenes, session} from "telegraf"
import {flow, pipe} from "fp-ts/lib/function";
import {maintenancesPrinter} from "../kafka/maintenances";
import {findFirst, foldMap, takeLeft} from "fp-ts/lib/Array";
import {createAuthCode, grantToken, requestProfile, wantToBuy} from "../amqp/trading";
import {messageObservable, publish} from "../amqp/index";
import * as O from "fp-ts/lib/Option";
import {User} from "../db/types";
import {
    addUser,
    getToken,
    getUsers,
    isRegistered,
    readMaintenances, requestProfileUpdate,
    setOffersList,
    setToken,
    updateUserById
} from "../db/utils";
import * as S from "fp-ts/lib/string";
import {offerObservable} from "../kafka";
import {Subscription} from "rxjs";

const token = process.env.BOT_TOKEN
if (token === undefined) throw new Error("Telegram Bot token is required")


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
const bot = new Telegraf<Scenes.SceneContext>(token)
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
// authCW.leave((ctx) => ctx.reply('Процесс аутентификации закончен, но возможно что-то пошло не так'))
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
// authCW.on('message', (ctx) => ctx.replyWithMarkdown('Send `hi`'))

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