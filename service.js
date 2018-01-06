'use strict'

const DynamoDB = require('@source4society/scepter-dynamodb-lib')

class AuthService {
  constructor (stage = 'dev', credentialsPath = './credentials.json') {
    const bcrypt = require('bcrypt')
    const jsonwebtoken = require('jsonwebtoken')

    this.bcrypt = bcrypt
    this.jsonwebtoken = jsonwebtoken
    this.credentials = require(credentialsPath)
    this.keySecret = this.credentials.environments[stage].jwtKeySecret
    this.dynamoDB = new DynamoDB()
    this.dynamoDB.setConfiguration(this.credentials, stage)
    this.userTableName = this.credentials.environments[stage].userTableName
    this.tokenDuration = this.credentials.environments[stage].tokenDuration
  }

  authenticate (callback, username = '', password = '', recordType, lastPass = false) {
   
    if (typeof recordType === 'undefined') {
      recordType = username.indexOf('@') > -1 ? 'user-email' : 'user-id';
    }

    this.dynamoDB.getItem(this.userTableName, { recordId: username, recordType: recordType }, null, (err, data) => {
      if ((typeof err === 'undefined' || err === null) && typeof data.Item !== 'undefined' ) {
        this.obtainPasswordHash(data, username, password, callback)
      } else {
        if (!lastPass) {
          this.authenticate(callback, username, password, (recordType === 'user-email' ? 'user-id' : 'user-email'), true)
        } else {
          callback(err || {message: 'Username not found', code: 404})
        }
      }
    })
  }

  obtainPasswordHash (userData, username, password, callback) {
    const userId = userData.Item.userId
    this.dynamoDB.getItem(this.userTableName, { recordId: userId, recordType: 'user-data' }, null, (err, userData) => {
      if (typeof err !== 'undefined' && err !== null) {
        callback(err)
      } else {
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
