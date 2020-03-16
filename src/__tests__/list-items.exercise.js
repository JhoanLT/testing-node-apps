// Testing CRUD API Routes

import axios from 'axios'
import {resetDb, insertTestUser} from 'utils/db-utils'
import {getData, handleRequestFailure, resolve} from 'utils/async'
import * as generate from 'utils/generate'
import * as booksDB from '../db/books'
import startServer from '../start'

let baseURL, server

beforeAll(async () => {
  server = await startServer()
  baseURL = `http://localhost:${server.address().port}/api`
})

afterAll(() => server.close())

beforeEach(() => resetDb())

async function setup() {
  // 💰 this bit isn't as important as the rest of what you'll be learning today
  // so I'm going to give it to you, but don't just skip over it. Try to figure
  // out what's going on here.
  const testUser = await insertTestUser()
  const authAPI = axios.create({baseURL})
  authAPI.defaults.headers.common.authorization = `Bearer ${testUser.token}`
  authAPI.interceptors.response.use(getData, handleRequestFailure)
  return {testUser, authAPI}
}

test('listItem CRUD', async () => {
  const {testUser, authAPI} = await setup()
  const book = generate.buildBook()

  // CREATE
  const cData = await authAPI.post('list-items', {bookId: book.id})

  expect(cData.listItem).toMatchObject({
    ownerId: testUser.id,
    bookId: book.id,
  })
  const listItemId = cData.listItem.id
  const listItemIdUrl = `list-items/${listItemId}`

  // READ
  const rData = await authAPI.get(listItemIdUrl)
  expect(rData.listItem).toEqual(cData.listItem)

  // UPDATE
  const updates = {notes: generate.notes()}
  const uResult = await authAPI.put(listItemIdUrl, updates)
  expect(uResult.listItem).toEqual({...rData.listItem, ...updates})

  // DELETE
  const dData = await authAPI.delete(listItemIdUrl)
  expect(dData).toEqual({success: true})
  const error = await authAPI.get(listItemIdUrl).catch(resolve)
  expect(error.status).toBe(404)

  // because the ID is generated, we need to replace it in the error message
  // so our snapshot remains consistent
  const idlessMessage = error.data.message.replace(listItemId, 'LIST_ITEM_ID')
  expect(idlessMessage).toMatchInlineSnapshot(
    `"No list item was found with the id of LIST_ITEM_ID"`,
  )
})

/* eslint no-unused-vars:0 */
