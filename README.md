# SCEPTER-authentication
Authentication Service for the SCEPTER project

[![scepter-logo](http://res.cloudinary.com/source-4-society/image/upload/v1519221119/scepter_hzpcqt.png)](https://github.com/source4societyorg/SCEPTER-core)

[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)

[![Build Status](https://travis-ci.org/source4societyorg/SCEPTER-AuthenticationService.svg?branch=master)](https://travis-ci.org/source4societyorg/SCEPTER-AuthenticationService)

[![codecov](https://codecov.io/gh/source4societyorg/SCEPTER-AuthenticationService/branch/master/graph/badge.svg)](https://codecov.io/gh/source4societyorg/SCEPTER-AuthenticationService)

[![Serverless](http://public.serverless.com/badges/v1.svg)](http://serverless.com)


## Installation

We recommend forking this repository.

If you are using the [SCEPTER](https://www.github.com/source4societyorg/SCEPTER-core) framework you can install this service using the following command from your project folder:

    node bin/scepter.js service:add <your-fork-repo> git@github.com:source4societyorg/SCEPTER-AuthenticationService.git AuthenticationService

This will clone the service into your services folder as a submodule, and run `yarn install` as well as `yarn test`. We are currently working on initialization scripts that will help setup configuration files after running this command. 

Alternatively if you are running this as a standalone service, you can simply `git clone` this repository or it's fork, and setup the configuration files locally.

## Configuration

This service expects SCEPTER credentials.json, parameters.json, and services.json configuration files within the root service directory. If you are using [SCEPTER](https://www.github.com/source4societyorg/SCEPTER-core) then these files will automatically be copied to the directory when executing the `service:deploy` command for this service. If you are using this service as a standalone service, then you must add these files to the project manually.

Currently the library only supports the `aws` provider with a `dynamoDB` backend, but we hope to support others in the future.

Your configuration should have the `jwtKeySecret`, `tokenDuration`, and `userTable` properties in addition to the standard provider configuration. The `initialize.js` script in the config directory can generate your jwtKeySecret and place these in your credentials.json for you if you are using SCEPTER. The rest must be entered into the parameters.json file manually. Here is an example entry:

    "environments": {
      "development": {
        "userTable":"users",
        "tokenDuration":"2h"
      }

This service currently relies on AWS [DynamoDB](https://aws.amazon.com/dynamodb/) to store the user records. Future releases will abstract this dependence away and allow for greater flexibility with regards to how the data can be stored and accessed. 

There are two types of records to be stored in the user table for this service to work. They must each have `recordType` properties of `user-name` and `user-data`. The `user-name` record consist of two properties, a `recordId` used for enforcing a unique constraint for the username lookup, and a `userName` property that matches the recordId. This record also has a `userId` property which is the unique `recordId` of the `user-data` record (uuid recommended). The `user-data` record will also contain a copy of the `userName` property so that they can both be pulled together via a DynamoDB query. This record should also contain the `passwordHash` property which consists of a bcrypt hash of the users password. These two records are combined and stored within the users JWT that is created by the service upon authentication. Optionally, an `enabled` property can be created on the `user-name` record. If set to false, the username will not be authenticated. 

## Deployment

See [SCEPTER-command-service](https://github.com:source4societyorg/SCEPTER-command-service) and [Serverless.com](https://www.serverless.com) for information on how to deploy services to various cloud providers. 

## Usage

This service is intended to be used to authenticate user credentials and return a json web token signed by the service that can be used for stateless authentication.

A payload is passed to the service containing the users username and password credentials. If the username exists, the service will attempt to compare the password with the stored password hash and validate if there is a match or not. If the password hash matches, then the response consists of a newly minted and signed json web token with the users id, username, and roles stored within the token. Furthermore, the expiration time for the token is set and configurable using the `tokenDuration` key in credentials.json. See [Json Web Tokens RFC 7519](https://tools.ietf.org/html/rfc7519) for information about JWT's. A mismatch of either the username or the password will return an error message with a false `status` key.

Two tables are used in DynamoDb to ensure a unique constraint on the username and userId properties.

## Example

Data passed to the service should resemble the following format:

    {
      "username": "someuser", 
      "password": "theirpass" 
    }

If you are using [SCEPTER-GatewayService](https://github.com/source4societyorg/SCEPTER-GatewayService) for your API Gateway, this would go in the `payload` key of your gateway body. A successful authentication result is as follows:

    {
      "status": true,
      "result": {
        "jwt": "eyJhbGciOiJIUzI1NiIsnR5cCI6IkpXVCJ9.eyJwYXNzd29yZEhhc2giOiIkMmEkMDgkb3Bsa28yZW9FQTFLNTZZa2lkQzJ6LkRReHI0YnFjR201V3dIcHh4MW0va3J1Li9UVFhFLjYiLCJ1c2VybmFtZSI6Im5yYWNhZG1pbiIsInJvbGVzIjpbIk5SQUNfQURNSU4iXSwidXNlcklkIjoiMzRjMmJkZDItYTg2My00NDg5LTkyNzQtZmY4Y2JkYjkxZGM2IiwiaWF0IjoxNTEyOTkxNjY2LCJleHAiOjE1MTU1ODM2NjZ9.QDDvZXqO77BvHwX80tdZn4o5IHlS9FD3BwxYqbpxrw"
      }
    }	


## Tests

To run tests and eslint, run `yarn test`.

Before running tests, you need to be sure that you have a `test` environment and parameters credential configuration set created. These are provided by default in the test folder and are automaticaly referenced by the test library.
