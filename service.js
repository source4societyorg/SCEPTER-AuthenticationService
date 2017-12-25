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
    this.usernameTableName = this.credentials.environments[stage].usernameTableName
    this.tokenDuration = this.credentials.environments[stage].tokenDuration
  }

  authenticate (callback, username = '', password = '') {
    this.dynamoDB.getItem(this.usernameTableName, { username: username }, (err, data) => {
      this.obtainPasswordHash(err, data, username, password, callback)
    }
    )
  }

  obtainPasswordHash (err, userData, username, password, callback) {
    if (err || typeof userData.Item === 'undefined') {
      callback(err || {message: 'Username not found', code: 404})
    } else {
      const userId = userData.Item.userId
      this.dynamoDB.getItem(this.userTableName, { userId: userId }, (err, userData) => this.validatePassword(err, userData, username, password, callback))
    }
  }

  validatePassword (err, userData, username, password, callback) {
    if (err) {
      callback(err)
    } else {
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
