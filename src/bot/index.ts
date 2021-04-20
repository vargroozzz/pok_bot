import {Telegraf, Scenes, session} from "telegraf"
import {flow, pipe} from "fp-ts/lib/function"
import {maintenancesPrinter} from "../kafka/maintenances"
import {findFirst, foldMap, takeLeft} from "fp-ts/lib/Array"
import {createAuthCode, grantToken, requestProfile, wantToBuy} from "../amqp/trading"
import {messageObservable, publish} from "../amqp/index"
import * as O from "fp-ts/lib/Option"
import {User} from "../db/types"
import {
    addUser,
    getToken,
    getUsers,
    isRegistered,
    readMaintenances, requestProfileUpdate,
    setOffersList,
    setToken,
    updateUserById
} from "../db/utils"
import * as S from "fp-ts/lib/string"
import {offerObservable} from "../kafka"
import {Subscription} from "rxjs"

const token = process.env.BOT_TOKEN
if (token === undefined) throw new Error("Telegram Bot token is required")

// const start_btns = Markup.keyboard(["Я", "В разработке..."]).resize()

const buyers = new Map<number, Subscription>()


// returns true if users existed, false otherwise
const unsubscribe = (id: number) => {
    buyers.get(id)?.unsubscribe()
    return buyers.delete(id)
}

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
                    setToken(dataJSON.payload.token)(dataJSON.payload.userId)
                    break
                case "wantToBuy":
                    bot.telegram.sendMessage(dataJSON.payload.userId, `Куплено ${dataJSON.payload.itemName} x ${dataJSON.payload.quantity}`)
                    setTimeout(() => requestProfileUpdate(dataJSON.payload.userId), 3000)
                    break
                case "requestProfile":
                    updateUserById(user => ({...user, gold: dataJSON.payload.profile.gold}))(dataJSON.payload.userId)
                    break
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

    return ctx.reply('Процесс аутентификации начат...')
})
// authCW.on('message', (ctx) => ctx.replyWithMarkdown('Send `hi`'))

const stage = new Scenes.Stage<Scenes.SceneContext>([authCW, ], {
    ttl: 10,
})

bot.use(session()) // to  be precise, session is not a must have for Scenes to work, but it sure is lonely without one
bot.use(stage.middleware())

bot.start(async ctx => {
    if (await isRegistered(ctx.from.id)) return ctx.reply("Привет!")
    else {
        await addUser(ctx.from.id)
        return ctx.reply("Новый пользователь зарегистрирован!")
    }
})

bot.command('auth', (ctx) => ctx.scene.enter('auth'))

bot.command('repair', async (ctx) => {
    const maintenances = await readMaintenances()
    return pipe(
        maintenances,
        JSON.parse,
        takeLeft(20),
        maintenancesPrinter,
        text => ctx.reply(text)
    )
})
bot.hears(/\/list\n([\s\S]+)/, async (ctx) => {
    const matchLine = (line: string) => {
        const sequenceTuple = ([a, b]: [O.Option<string>, O.Option<string>]): O.Option<[string, string]> => O.isSome(a) && O.isSome(b) ? O.some([a.value, b.value]) : O.none
        const matches = line.match(/(\d+) (\d+)/)
        if (matches === null) return O.none
        const res: [O.Option<string>, O.Option<string>] = [O.fromNullable(matches[1]), O.fromNullable(matches[2])]
        return sequenceTuple(res)
    }
    return pipe(
        ctx.match[1],
        O.fromNullable,
        O.map((match: string) => O.traverseArray(matchLine)(match.split('\n'))),
        O.flatten,
        O.match(
            () => `Напиши список ресурсов в формате:
            /list
            код цена`,
            (prices) => {
                setOffersList(prices)(ctx.from.id)
                return "Список ресурсов успешно установлен!"
            }
        ),
        text => ctx.reply(text),
    )
})

bot.command('list', async (ctx) => {
    const users = await getUsers()
    return pipe(
        users,
        findFirst((user: User) => user.id === ctx.from.id),
        // console.log,
        O.match(
            () => "Я тебя не знаю",
            flow(
                user => user.offersList,
                foldMap(S.Monoid)(([code, price]: [string, string]) => `${code} ${price}` + '\n'),
                offers => "`" + offers + "`"
            )
        ),
        text => ctx.replyWithMarkdown(text === "``" ? "Твой список ресурсов пуст" : text)
    )
})

bot.command('trade_start', async (ctx) => {
    const users = await getUsers()
    return pipe(
        users,
        findFirst((user: User) => user.id === ctx.from.id),
        // console.log,
        O.match(
            () => "Я тебя не знаю",
            (user) => {
                if(user.token === null || user.rights.trade === false) return "Ты не авторизован, чтобы начать процесс авторизации - введи /auth"
                else {
                    const buyer = offerObservable.subscribe(data => {
                        if (typeof data === "string") {
                            const {code, qty, price} = JSON.parse(data)
                            const maybeCodeAndPrice = findFirst(([c, _]) => c === code)(user.offersList)
                            const isPriceSuitable = O.isSome(O.filter(([_, p]: [string, string]) => price <= p)(maybeCodeAndPrice))
                            if (isPriceSuitable && user.token !== null /* stupid Typescript */ && user.gold >= price) {
                                publish(JSON.stringify(wantToBuy(user.token)(code, Math.min(qty, 3000, Math.floor(user.gold / price)), price), null, '  '))
                            }
                        }
                    })
                    buyers.set(user.id, buyer)
                    requestProfileUpdate(user.id)
                    return "Торговля включена!"
                }
            }
        ),
        text => ctx.reply(text)
    )
})

bot.command('trade_stop', async (ctx) => {
    const users = await getUsers()
    return pipe(
        users,
        findFirst((user: User) => user.id === ctx.from.id),
        // console.log,
        O.match(
            () => "Я тебя не знаю",
            (user) => {
                if(user.token === null || user.rights.trade === false) return "Ты не авторизован, чтобы начать процесс авторизации - введи /auth"
                else return unsubscribe(user.id) ? "Торговля выключена!" : "Торговля и не была включена"
            }
        ),
        text => ctx.reply(text)
    )
})

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

export default bot