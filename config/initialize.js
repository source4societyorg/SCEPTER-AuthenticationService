const fs = require('fs')
const utilities = require('@source4society/scepter-utility-lib')
console.log('Be aware that this service depends on a services.json configuration in your /config file. See the README there for more information')
console.log('For Azure, currently only http/https invocation supported at the moment via this gateway. Specify azure:http in the provider within services.json. We recommend using api keys in the url querystring for security.')
let credentials = require(process.cwd() + '/../../config/credentials.json')

Object.keys(credentials.environments).map((environment) => {
  credentials.environments[environment].jwtKeySecret = utilities.keyGenerator(46)
})
fs.writeFileSync(process.cwd() + '/../../config/credentials.json', JSON.stringify(credentials), 'utf-8')
console.log('The jwtKeySecret property has been initialized to a random value for each existing environment in your credentials.json. Be sure to modify these if necessary')
