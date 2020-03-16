// Testing Authentication API Routes
import * as usersDB from '../db/users'
import axios from 'axios'
import {resetDb} from 'utils/db-utils'
import * as generate from 'utils/generate'
import startServer from '../start'
import {getData, handleRequestFailure, resolve} from 'utils/async'

const baseURL = 'http://localhost:8000/api'
const api = axios.create({baseURL})
api.interceptors.response.use(getData, handleRequestFailure)

let server

//Ejecuta una función antes de ejecutar cualquiera de las pruebas en este archivo
beforeAll(async () => {
  server = await startServer({port: 8000})
})

//Ejecuta una función después de que se hayan completado todas las pruebas en este archivo
afterAll(() => server.close())

//Ejecuta una función antes de que se ejecute cada una de las pruebas en este archivo.
beforeEach(() => resetDb())

test('auth flow', async () => {
  const {username, password} = generate.loginForm()

  // register
  const rData = await api.post('auth/register', {
    username,
    password,
  })

  expect(rData.user).toEqual({
    id: expect.any(String),
    username: expect.any(String),
    token: expect.any(String),
  })

  //login
  const lData = await api.post('auth/login', {
    username,
    password,
  })

  expect(lData.user).toEqual(rData.user)

  // authenticated request
  const mData = await api.get('auth/me', {
    headers: {
      Authorization: `Bearer ${lData.user.token}`,
    },
  })
  expect(mData.user).toEqual(lData.user)
})

test('username must be unique', async () => {
  const {username, password} = generate.loginForm()
  await usersDB.insert(generate.buildUser({username}))
  await api.post('auth/register', {username, password}).catch(resolve)
})

test('get me unauthenticated returns error', async () => {
  const error = await api.get('auth/me').catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 401: {"code":"credentials_required","message":"No authorization token was found"}]`,
  )
})

test('username required to register', async () => {
  const error = await api
    .post('auth/register', {password: generate.password()})
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"username can't be blank"}]`,
  )
})

test('password required to register', async () => {
  const error = await api
    .post('auth/register', {username: generate.username()})
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"password can't be blank"}]`,
  )
})

test('username required to login', async () => {
  const error = await api
    .post('auth/login', {password: generate.password()})
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"username can't be blank"}]`,
  )
})

test('password required to login', async () => {
  const error = await api
    .post('auth/login', {username: generate.username()})
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"password can't be blank"}]`,
  )
})

test('user must exist to login', async () => {
  const error = await api
    .post('auth/login', generate.loginForm({username: '__will_never_exist__'}))
    .catch(resolve)
  expect(error).toMatchInlineSnapshot(
    `[Error: 400: {"message":"username or password is invalid"}]`,
  )
})
