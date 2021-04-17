import fs from "fs/promises"

import * as N from "fp-ts/lib/number"
import * as Eq from "fp-ts/lib/Eq"
import {pipe, flow} from "fp-ts/lib/function"
import * as O from "fp-ts/lib/Option"
import {elem, findFirst, map} from "fp-ts/lib/Array"
import pkg from 'pg'
const { Pool } = pkg

import {User} from "./types"
import {requestProfile} from "../amqp/trading"
import {publish} from "../amqp"

const usersFilePath = "./users.json"
const maintenancesFilePath = "./maintenances.json"
const offersFilePath = "./offers.json"

const db = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
}

const pool = new Pool(db)

// const readUsers = () => fs.readFile(usersFilePath, "utf-8")
export const readMaintenances = () => fs.readFile(maintenancesFilePath, "utf-8")
export const readOffers = () => fs.readFile(offersFilePath, "utf-8")

// const writeUsers = (users: string) => fs.writeFile(usersFilePath, users)

// export const getUsers = async (): Promise<User[]> => {
//     const users = await readUsers()
//     return JSON.parse(users)
// }

const makeQuery = (query: string) => pool.query(query)

export const getUsers = (): Promise<User[]> => pool.query("SELECT bot_user FROM bot_users").then(res => typeof res.rows[0] === "string" ? map(JSON.parse)(res.rows) : res.rows).then(map(user => user.bot_user))
export const insertNewUser = (user: User) => pool.query(`INSERT INTO bot_users (bot_user) VALUES ('${JSON.stringify(user)}')`).then(console.log)

// const setUsers: (users: User[]) => Promise<void> = flow(
//     JSON.stringify,
//     writeUsers
// )

// const setUsers: (users: User[]) => Promise<void> = flow(
//     map(user => `('${JSON.stringify(user)}')`),
//     users => users.join(','),
//     users => `INSERT INTO users (user) VALUES ${users}`,
//     query => pool.query(query),
//     res => new Promise<void>(resolve => null)
//
// )

export const createUser = (id: number): User => ({
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


// export const updateUsers = async (fn: (arg0: User[]) => User[]) => {
//     const users = await getUsers()
//     return pipe(
//         users,
//         fn,
//         setUsers,
//     )
// }
export const mapUser = (fn: (arg0: User) => User, id: number) => map((user: User) => user.id === id ? fn(user) : user)
// export const modifyUser = flow(
//     mapUser,
//     updateUsers,
// )
export const getUserById = (id: number) => findFirst((user: User) => user.id === id)
// export const getUserById = (id: number): Promise<User> => pool.query(`SELECT bot_user FROM bot_users WHERE bot_user ->> 'id' = '${id}'`).then(res => res.rows[0])
export const selectUserById = (id: number) => getUsers().then(getUserById(id))
export const updateUserById = (fn: (arg0: User) => User) => (id: number) => selectUserById(id).then(flow(
    O.map(fn),
    O.map(user => pool.query(`UPDATE bot_users SET bot_user = bot_user || '${JSON.stringify(user)}'::jsonb WHERE bot_user ->> 'id' = '${id}'`).then(console.log),)
))

export const getOffersList = async (id: number): Promise<O.Option<[string, string][]>> => {
    const users = await getUsers()
    return pipe(
        users,
        getUserById(id),
        O.map(user => user.offersList)
    )
}

export const setOffersList = (offersList: readonly [string, string][]) => updateUserById(user => ({...user, offersList: [...offersList]}))
    // updateUsers(mapUser(user => ({...user, offersList: [...offersList]}), id))

export const addUser = flow(
    createUser,
    insertNewUser,
)


export const setToken = (token: string) =>
    updateUserById(user => ({...user, token: token, rights: {...user.rights, basic: true, profile: true, trade: true}}))

export const getToken = async (id: number) => {
    const maybeUser = await selectUserById(id)
    return pipe(
        maybeUser,
        O.map(user => O.fromNullable(user.token)),
        O.flatten
    )
}

export const requestProfileUpdate = (id: number) =>
    getToken(id).then(O.match(
    () => false,
    flow(
        requestProfile,
        JSON.stringify,
        publish
    )
))

export const isRegistered = async (id: number) => {
    const users = await getUsers()
    return pipe(
        users,
        map((user: User) => user.id),
        elem(N.Eq)(id)
    )
}



