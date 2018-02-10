'use strict'
const utilities = require('@source4society/scepter-utility-lib')
const immutable = require('immutable')
const bcrypt = require('bcrypt')
const jsonwebtoken = require('jsonwebtoken')
const DynamoDB = require('@source4society/scepter-dynamodb-lib')
const assert = require('assert')

class AuthService {
  constructor (
    injectedStage,
    injectedCredentialPath,
    injectedServicesPath,
    injectedParametersPath,
    injectedBcrypt,
    injectedJsonWebToken,
    injectedDynamoDB
  ) {
    const stage = utilities.valueOrDefault(injectedStage, 'development')
    const credentialPath = utilities.valueOrDefault(injectedCredentialPath, './credentials.json')
    const servicesPath = utilities.valueOrDefault(injectedServicesPath, './services.json')
    const parametersPath = utilities.valueOrDefault(injectedParametersPath, './parameters.json')
    const DynamoDBClass = utilities.valueOrDefault(injectedDynamoDB, DynamoDB)
    this.stage = stage
    this.credentials = immutable.fromJS(require(credentialPath))
    this.parameters = immutable.fromJS(require(parametersPath))
    this.services = immutable.fromJS(require(servicesPath))
    this.bcrypt = utilities.valueOrDefault(injectedBcrypt, bcrypt)
    this.jsonwebtoken = utilities.valueOrDefault(injectedJsonWebToken, jsonwebtoken)
    this.keySecret = this.credentials.getIn(['environments', stage, 'jwtKeySecret'])
    this.dynamoDB = new DynamoDBClass()
    this.dynamoDB.setConfiguration(this.credentials, stage)
    this.userTable = this.parameters.getIn(['environments', stage, 'userTable'], 'users')
    this.tokenDuration = this.parameters.getIn(['environments', stage, 'tokenDuration'], '3h')
  }

  authenticate (callback, username, password) {
    utilities.initiateHandledSequence((finalCallback, sequenceCallback) => this.authenticationSequence(finalCallback, sequenceCallback, username, password), callback)
  }

  * authenticationSequence (finalCallback, sequenceCallback, username, password) {
    const userData = yield this.lookupUser(username, sequenceCallback)
    this.validateUserData(userData)
    const passwordHash = userData.Items[0].passwordHash
    const validPassword = yield this.validatePassword(password, passwordHash, sequenceCallback)
    assert(validPassword, 'Invalid Password')
    const combinedUserData = Object.assign(userData.Items[0], userData.Items[1])
    const jwt = this.createJwt(combinedUserData)
    assert(utilities.isNotEmpty(jwt))
    finalCallback(null, jwt)
  }

  validateUserData (injectedUserData) {
    const userData = utilities.valueOrDefault(injectedUserData, {})
    if (utilities.isEmpty(userData.Items) || userData.Items[1].enabled === false) {
      throw new Error({message: 'Username not found', code: 404})
    }
  }

  lookupUser (username, callback) {
    this.dynamoDB.query(this.userTable, '#userName = :userName', callback, {
      ExpressionAttributeNames: {
        '#userName': 'userName'
      },
      ExpressionAttributeValues: {
        ':userName': username
      },
      IndexName: 'userName-recordType-index'
    })
  }

  validatePassword (password, hash, callback) {
    this.bcrypt.compare(password, hash, callback)
  }

  createJwt (userData) {
    return this.jsonwebtoken.sign(userData, this.keySecret, { expiresIn: this.tokenDuration })
  }

  prepareErrorResponse (error) {
    return {
      status: false,
      error: utilities.valueOrDefault(error.message, error)
    }
  }

  prepareSuccessResponse (data) {
    return {
      status: true,
      result: data
    }
  }
};

module.exports = AuthService
