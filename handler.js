'use strict'

const AuthService = require('./service')

// This makes it easier to mock later
global.service = new AuthService(process.env.STAGE, process.env.CREDENTIALS_PATH, process.env.PARAMETERS_PATH)

module.exports.authenticate = (event, context, callback) => {
  const username = event.username
  const password = event.password
  const service = global.service
  try {
    const authenticationCallback = (err, data) => {
      if (err) {
        callback(null, { status: false, errors: { message: err.message } })
      } else if (Object.keys(data).length > 0) {
        callback(null, { status: true, result: {jwt: data} })
      } else {
        callback(null, { status: false, errors: { message: 'Invalid username' } })
      }
    }
    service.authenticate(authenticationCallback, username, password)
  } catch (error) {
    callback(null, { status: false, errors: {message: error, code: 403} })
  }
}
