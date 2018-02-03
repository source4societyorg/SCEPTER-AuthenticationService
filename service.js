'use strict'

const DynamoDB = require('@source4society/scepter-dynamodb-lib')
const immutable = require('immutable')

class AuthService {
  constructor (stage = 'dev', credentialsPath = './credentials.json', parametersPath = './parameters.json') {
    const bcrypt = require('bcrypt')
    const jsonwebtoken = require('jsonwebtoken')

    this.bcrypt = bcrypt
    this.jsonwebtoken = jsonwebtoken
    this.credentials = immutable.fromJS(require(credentialsPath))
    this.parameters = immutable.fromJS(require(parametersPath))
    this.keySecret = this.credentials.getIn(['environments', stage, 'jwtKeySecret'])
    this.dynamoDB = new DynamoDB()
    this.dynamoDB.setConfiguration(this.credentials, stage)
    this.userTable = this.parameters.getIn(['environments', stage, 'userTable'], 'users')
    this.tokenDuration = this.parameters.getIn(['environments', stage, 'tokenDuration'], '3h')
  }

  authenticate (callback, username = '', password = '') {
    this.dynamoDB.getItem(this.userTable, { recordId: username, recordType: 'user-name' }, null, (err, data) => {
      if ((typeof err === 'undefined' || err === null) && typeof data.Item !== 'undefined') {
        this.obtainPasswordHash(data, username, password, callback)
      } else {
        callback(err || {message: 'Username not found', code: 404})
      }
    })
  }

  obtainPasswordHash (usernameData, username, password, callback) {
    const userId = usernameData.Item.userId
    this.dynamoDB.getItem(this.userTable, { recordId: userId, recordType: 'user-data' }, null, (err, userData) => {
      if (typeof err !== 'undefined' && err !== null) {
        callback(err)
      } else {
        userData.Item.roles = userData.Item.roles.values || userData.Item.roles
        this.validatePassword(userData, username, password, callback)
      }
    })
  }

  validatePassword (userData, username, password, callback) {
    const hash = userData.Item.passwordHash
    this.bcrypt.compare(password, hash, (err, res) => {
      if (err) {
        callback(err)
      } else if (res === false) {
        callback(new Error('Invalid password'))
      } else {
        this.createJwt(userData, username, callback)
      }
    })
  }

  createJwt (userData, username, callback) {
    try {
      let finalUserData = Object.assign(userData.Item, {username: username})
      let jwt = this.jsonwebtoken.sign(finalUserData, this.keySecret, { expiresIn: this.tokenDuration })
      callback(null, jwt)
    } catch (error) {
      callback(error)
    }
  }
};

module.exports = AuthService
