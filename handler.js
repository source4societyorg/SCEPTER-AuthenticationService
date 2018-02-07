'use strict'
const utilities = require('@source4society/scepter-utility-lib')
const genericHandlerFunction = require('@source4society/scepter-handlerutilities-lib').genericHandlerFunction

module.exports.authenticate = (event, context, callback, injectedGenericHandler) => {
  const genericHandler = utilities.valueOrDefault(injectedGenericHandler, genericHandlerFunction)
  genericHandler(event, context, callback, (service, callbackHandler, errorHandler, successHandler, eventData) => {
    const username = event.userName
    const password = event.password
    service.authenticate((err, data) => callbackHandler(err, data, errorHandler, successHandler), username, password)
  })
}
