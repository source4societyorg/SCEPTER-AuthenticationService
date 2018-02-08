const utilities = require('@source4society/scepter-utility-lib')

test('Service constructor initializes variables', () => {
  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  expect(service.stage).toBe('test')
  expect(service.keySecret).toEqual('dummy')
  expect(service.userTable).toEqual('users')
})

test('authenticate method initiates authentication sequence', (done) => {
  const mockCallback = (err, data) => {
    expect(err).toBeNull()
    expect(data).toEqual('mockjwt')
    done()
  }
  function * mockAuthenticationSequence (callback, sequenceCallback, username, password) {
    expect(username).toEqual('username')
    expect(password).toEqual('password')
    callback(null, 'mockjwt')
  }
  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  service.authenticationSequence = mockAuthenticationSequence
  service.authenticate(mockCallback, 'username', 'password')
})

test('authenticationSequence will return jwt if user is found and password hash matches', (done) => {
  const mockUserData = { Items: [{ passwordHash: 'mockhash' }, { enabled: true }] }
  const mockCallback = (error, data) => {
    expect(error).toBeNull()
    expect(data).toEqual('mockjwt')
    done()
  }
  const mockLookupUser = (username, callback) => {
    expect(username).toEqual('username')
    setTimeout(() => callback(null, mockUserData), 10) // simulate async call
  }
  const mockValidateUserData = (userData) => {
    expect(userData).toEqual(mockUserData)
  }
  const mockValidatePassword = (password, passwordHash, callback) => {
    expect(password).toEqual('password')
    expect(passwordHash).toEqual('mockhash')
    setTimeout(() => callback(null, true), 10) // simulate async call
  }
  const mockCreateJwt = (combinedUserData, username, callback) => {
    expect(combinedUserData).toEqual({
      passwordHash: 'mockhash',
      enabled: true
    })
    expect(username).toEqual(username)
    return 'mockjwt'
  }

  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  service.lookupUser = mockLookupUser
  service.validateUserData = mockValidateUserData
  service.validatePassword = mockValidatePassword
  service.createJwt = mockCreateJwt
  utilities.initiateHandledSequence((callback, sequenceCallback) => service.authenticationSequence(callback, sequenceCallback, 'username', 'password'), mockCallback)
})

test('validateUserData throws error if data is empty or user is not enabled', () => {
  const mockEmptyUserData = {}
  const mockDisabledUserData = { Items: [{}, { enabled: false }] }
  const mockValidUserData = { Items: [{}, { enabled: true }] }
  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  expect(() => service.validateUserData(mockEmptyUserData)).toThrow()
  expect(() => service.validateUserData(mockDisabledUserData)).toThrow()
  service.validateUserData(mockValidUserData)
})

test('lookupUser queries dynamoDB for user recordset based on userName', (done) => {
  const mockCallback = (err, data) => {
    expect(err).toBeNull()
    expect(data).toEqual({})
    done()
  }
  const mockDynamoDB = {
    query: (userTable, keyConditionExpression, callback, options) => {
      expect(userTable).toEqual('users')
      expect(keyConditionExpression).toEqual('#userName = :userName')
      expect(options).toEqual({
        ExpressionAttributeNames: {
          '#userName': 'userName'
        },
        ExpressionAttributeValues: {
          ':userName': 'username'
        },
        IndexName: 'userName-recordType-index'
      })
      callback(null, {})
    }
  }

  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  service.dynamoDB = mockDynamoDB
  service.lookupUser('username', mockCallback)
})

test('validatePassword calls bcrypt compare with proper arguments', (done) => {
  const mockCallback = (err, data) => {
    expect(err).toBeNull()
    expect(data).toEqual(true)
    done()
  }
  const mockBcrypt = {
    compare: (password, hash, callback) => {
      expect(hash).toEqual('mockhash')
      expect(password).toEqual('password')
      callback(null, true)
    }
  }

  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  service.bcrypt = mockBcrypt
  service.validatePassword('password', 'mockhash', mockCallback)
})

test('createJwt calls jsonwebtoken.sign with proper arguments', () => {
  const mockJsonWebToken = {
    sign: (userData, keySecret, options) => {
      expect(userData).toEqual({})
      expect(keySecret).toEqual(service.keySecret)
      expect(options).toEqual({
        expiresIn: service.tokenDuration
      })
      return 'mockjwt'
    }
  }

  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  service.jsonwebtoken = mockJsonWebToken
  expect(service.createJwt({}, 'mocksecret')).toEqual('mockjwt')
})

test('Prepare error response returns proper error object', () => {
  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  const mockError = new Error('test error')
  expect(service.prepareErrorResponse(mockError)).toEqual({
    status: false,
    error: mockError.message
  })
})

test('Prepare success response returns proper success object', () => {
  const AuthService = require('../service')
  const service = new AuthService('test', './test/credentials', './test/services', './test/parameters')
  const mockData = 'mockjwt'
  expect(service.prepareSuccessResponse(mockData)).toEqual({
    status: true,
    result: mockData
  })
})
