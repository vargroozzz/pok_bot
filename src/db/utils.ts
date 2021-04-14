import fs from "fs/promises";
import {pipe} from "fp-ts/function";
import * as O from "fp-ts/Option";
import {elem, findFirst, map} from "fp-ts/Array";
import * as N from "fp-ts/number";
import {watchFile} from "fs";
import {User} from "./types";
import {flow} from "fp-ts/lib/function";

const usersFilePath = "./users.json"
const maintenancesFilePath = "./maintenances.json"
const offersFilePath = "./offers.json"

const readUsers = () => fs.readFile(usersFilePath, "utf-8")
export const readMaintenances = () => fs.readFile(maintenancesFilePath, "utf-8")
export const readOffers = () => fs.readFile(offersFilePath, "utf-8")

const writeUsers = (users: string) => fs.writeFile(usersFilePath, users)

export const getUsers = async (): Promise<User[]> => {
    const users = await readUsers()
    return JSON.parse(users)
}

const setUsers: (users: User[]) => Promise<void> = flow(
    JSON.stringify,
    writeUsers
)

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


export const updateUsers = async (fn: (arg0: User[]) => User[]) => {
    const users = await getUsers()
    return pipe(
        users,
        fn,
        setUsers,
    )
}
export const mapUser = (fn: (arg0: User) => User, id: number) => map((user: User) => user.id === id ? fn(user) : user)
export const getUserById = (id: number) => findFirst((user: User) => user.id === id)
export const updateUserById = flow(
    mapUser,
    updateUsers,
)

export const getOffersList = async (id: number): Promise<O.Option<[string, string][]>> => {
    const users = await getUsers()
    return pipe(
        users,
        getUserById(id),
        O.map(user => user.offersList)
    )
}

export const setOffersList = (id: number, offersList: [string, string][]) =>
    updateUsers(mapUser(user => ({...user, offersList}), id))


// export const addUser = (id: number) =>
//     fs.writeFileSync(usersFilePath, JSON.stringify([...JSON.parse(readUsers()), createUser(id)]))
export const addUser = flow(
    createUser,
    user => updateUsers(users => [...users, user]),
)


export const setToken = async (id: number, token: string) =>
    updateUserById(user => ({...user, token: token, rights: {...user.rights, basic: true, profile: true, trade: true}}), id)

// fs.writeFileSync(usersFilePath, JSON.stringify([...JSON.parse(readUsers()), createUser(id)]))

// export const isRegistered = (id: number) => elem(N.Eq)(id)(map((user: User) => user.id)(JSON.parse(readUsers())))
export const isRegistered = async (id: number) => {
    const users = await getUsers()
    return pipe(
        users,
        map((user: User) => user.id),
        elem(N.Eq)(id)
    )
}

watchFile(offersFilePath, () => readOffers().then((offer) => console.log(offer)))

