const AuthService = require('../service')
const bcrypt = require('bcrypt')
const jsonwebtoken = require('jsonwebtoken')
const jsonDecode = require('jwt-decode')
const testcredentials = require('./credentials.json')

test('authenticate will return a valid jwt when matching username and password in payload ', (done) => {
  const service = new AuthService('test', './test/credentials.json')
  const salt = bcrypt.genSaltSync(8)
  const hash = bcrypt.hashSync('fakepassword', salt)

  // mock DynamoDB
  const getItemMock = (tableName, key, projectionExpression, foundUserCallback) => {
    if (key.recordId === 'fakeusername') {
      foundUserCallback(null, {
        Item: {
          userId: 'fakeuserid',
          recordId: 'fakeusername'
        }
      })
    } else {
      foundUserCallback(null, {
        Item: {
          recordId: 'fakeuserid',
          roles: ['FAKE_ROLE'],
          passwordHash: hash
        }
      })
    }
  }

  service.dynamoDB = { getItem: getItemMock }

  const callback = (err, data) => {
    expect(err).toBeNull()
    expect(data).not.toBeNull()
    expect(data).not.toBeUndefined()
    const jwt = data
    jsonwebtoken.verify(jwt, testcredentials.environments['test'].jwtKeySecret)
    const jwtClaims = jsonDecode(jwt)
    expect(jwtClaims.username).toEqual('fakeusername')
    expect(jwtClaims.roles).toEqual(['FAKE_ROLE'])
    expect(jwtClaims.recordId).toEqual('fakeuserid')
    done()
  }

  service.authenticate(callback, 'fakeusername', 'fakepassword')
})

test('authenticate will return an error message when username not found', (done) => {
  const service = new AuthService('test', './test/credentials.json')
  // mock DynamoDB
  const getItemMock = (tableName, key, projectionExpression, foundUserCallback) => {
    foundUserCallback(new Error('Cant find user', 404))
  }

  service.dynamoDB = { getItem: getItemMock }

  const callback = (err, data) => {
    expect(err).not.toBeNull()
    expect(data).toBeUndefined()
    done()
  }

  service.authenticate(callback, 'fakeusername', 'fakepassword')
})

test('authenticate will return an error message when username found but password doesnt match hash', (done) => {
  const service = new AuthService('test', './test/credentials.json')
  const salt = bcrypt.genSaltSync(8)
  const hash = bcrypt.hashSync('fakepassword', salt)

  // mock DynamoDB
  const getItemMock = (tableName, key, projectionExpression, foundUserCallback) => {
    if (key.recordId === 'fakeusername') {
      foundUserCallback(null, {
        Item: {
          userId: 'fakeuserid',
          recordId: 'fakeusername'
        }
      })
    } else {
      foundUserCallback(null, {
        Item: {
          recordId: 'fakeuserid',
          roles: ['FAKE_ROLE'],
          passwordHash: hash
        }
      })
    }
  }

  service.dynamoDB = { getItem: getItemMock }

  const callback = (err, data) => {
    expect(err).not.toBeNull()
    expect(data).toBeUndefined()
    done()
  }

  service.authenticate(callback, 'fakeusername', 'wrongfakepassword')
})

test('authenticate will return an error message when errors occur seeking user data with user id', (done) => {
  const service = new AuthService('test', './test/credentials.json')

  // mock DynamoDB
  const getItemMock = (tableName, key, projectionExpression, foundUserCallback) => {
    if (key.recordId === 'fakeusername') {
      foundUserCallback(null, {
        Item: {
          userId: 'fakeuserid',
          recordId: 'fakeusername'
        }
      })
    } else {
      foundUserCallback(new Error('Couldn\'t find record in table with userId'))
    }
  }

  service.dynamoDB = { getItem: getItemMock }

  const callback = (err, data) => {
    expect(err).not.toBeNull()
    expect(data).toBeUndefined()
    done()
  }

  service.authenticate(callback, 'fakeusername', 'wrongfakepassword')
})

test('authenticate will return an error message when errors occur using bcrypt', (done) => {
  const service = new AuthService('test', './test/credentials.json')
  const salt = bcrypt.genSaltSync(8)
  const hash = bcrypt.hashSync('fakepassword', salt)

  // mock DynamoDB
  const getItemMock = (tableName, key, projectionExpression, foundUserCallback) => {
    if (key.recordId === 'fakeusername') {
      foundUserCallback(null, {
        Item: {
          userId: 'fakeuserid',
          recordId: 'fakeusername'
        }
      })
    } else {
      foundUserCallback(null, {
        Item: {
          recordId: 'fakeuserid',
          roles: ['FAKE_ROLE'],
          passwordHash: hash
        }
      })
    }
  }

  // mock bcrypt
  const compareMock = (password, hash, bcryptCallback) => bcryptCallback(new Error('Bcrypt failed'))
  service.bcrypt = { compare: compareMock }

  service.dynamoDB = { getItem: getItemMock }

  const callback = (err, data) => {
    expect(err).not.toBeNull()
    expect(data).toBeUndefined()
    done()
  }

  service.authenticate(callback, 'fakeusername', 'wrongfakepassword')
})

test('authenticate will return an error message when errors occur using jsonwebtoken', (done) => {
  const service = new AuthService('test', './test/credentials.json')
  const salt = bcrypt.genSaltSync(8)
  const hash = bcrypt.hashSync('fakepassword', salt)

  // mock DynamoDB
  const getItemMock = (tableName, key, projectionExpression, foundUserCallback) => {
    if (key.recordId === 'fakeusername') {
      foundUserCallback(null, {
        Item: {
          userId: 'fakeuserid',
          recordId: 'fakeusername'
        }
      })
    } else {
      foundUserCallback(null, {
        Item: {
          recordId: 'fakeuserid',
          roles: ['FAKE_ROLE'],
          passwordHash: hash
        }
      })
    }
  }

  // mock bcrypt
  const signMock = (userData, key, jwtCallback) => jwtCallback(new Error('jsonwebtoken failed'))
  service.jsonwebtoken = { sign: signMock }

  service.dynamoDB = { getItem: getItemMock }

  const callback = (err, data) => {
    expect(err).not.toBeNull()
    expect(data).toBeUndefined()
    done()
  }

  service.authenticate(callback, 'fakeusername', 'fakepassword')
})
