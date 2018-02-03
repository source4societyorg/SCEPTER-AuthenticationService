const testcredentials = './test/credentials.json'
const testparameters = './test/parameters.json'
process.env.STAGE = 'test'
process.env.CREDENTIALS_PATH = testcredentials
process.env.PARAMETERS_PATH = testparameters
const handler = require('../handler')

test('handler returns proper response when service succeeds', (done) => {
  // Mock the service
  const mockAuthenticate = (authCallback, username, password) => authCallback(null, 'fakejwt')
  const mockService = {
    authenticate: mockAuthenticate
  }

  const callback = (err, data) => {
    expect(err).toBeNull()
    expect(data).toEqual({status: true, result: {jwt: 'fakejwt'}})
    done()
  }

  global.service = mockService
  handler.authenticate({username: 'someusername', password: 'somepassword'}, null, callback)
})

test('handler returns error response when service fails', (done) => {
  // Mock the service
  const mockAuthenticate = (authCallback, username, password) => authCallback(new Error('Failed service'))
  const mockService = {
    authenticate: mockAuthenticate
  }

  const callback = (err, data) => {
    expect(err).toBeNull()
    expect('errors' in data).toBe(true)
    done()
  }

  global.service = mockService
  process.env.CREDENTIALS_PATH = testcredentials
  process.env.PARAMETERS_PATH = testparameters
  handler.authenticate({username: 'someusername', password: 'somepassword'}, null, callback)
})

test('handler returns error response when username invalid', (done) => {
  // Mock the service
  const mockAuthenticate = (authCallback, username, password) => authCallback(null, {})
  const mockService = {
    authenticate: mockAuthenticate
  }

  const callback = (err, data) => {
    expect(err).toBeNull()
    done()
  }

  global.service = mockService
  process.env.CREDENTIALS_PATH = testcredentials
  process.env.PARAMETERS_PATH = testparameters
  handler.authenticate({username: 'badusername', password: 'somepassword'}, null, callback)
})

test('handler catches errors and returns information with a 200 status', (done) => {
  // Mock the service
  const mockAuthenticate = (authCallback, username, password) => { throw new Error('Test error') }
  const mockService = {
    authenticate: mockAuthenticate
  }

  const callback = (err, data) => {
    expect(err).toBeNull()
    expect(data).not.toBeUndefined()
    expect(data.status).toBe(false)
    done()
  }

  global.service = mockService
  process.env.CREDENTIALS_PATH = testcredentials
  process.env.PARAMETERS_PATH = testparameters
  handler.authenticate({username: 'badusername', password: 'somepassword'}, null, callback)
})
