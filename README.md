# SCEPTER-authentication
Authentication Service for the SCEPTER project

[![Build Status](https://travis-ci.org/source4societyorg/SCEPTER-AuthenticationService.svg?branch=master)](https://travis-ci.org/source4societyorg/SCEPTER-AuthenticationService)
[![Serverless](http://public.serverless.com/badges/v1.svg)](http://serverless.com)

## Installation

We recommend forking this repository.

If you are using the [SCEPTER](https://www.github.com/source4societyorg/SCEPTER-core) framework you can install this service using the following command from your project folder:

    node bin/scepter.js service:add git@github.com:source4societyorg/SCEPTER-AuthenticationService.git AuthenticationService

You can replace the github uri with the uri of your forked repository.

This will clone the service into your services folder as a submodule, and run `yarn install` as well as `yarn test`. We are currently working on initialization scripts that will help setup configuration files after running this command. 

Alternatively if you are running this as a standalone service, you can simply `git clone` this repository or it's fork, and setup the configuration files locally.

## Configuration

The repository comes with `./credentials.json` simlinked to  their respective files in `../../config/` by default. If you are using [SCEPTER](https://www.github.com/source4societyorg/SCEPTER-core) then these files are likely already present. If you are using this service as a standalone service, then you can replace these simlinks with their appropriate files. 

Currently the library only supports the `aws` provider, but we hope to support others in the future.

If you are using SCEPTER, just create a simlink to your projects `config/credentials.json`. Otherwise you can create a credentials.json in your service folder. Your configuration should have the `jwtKeySecret`, `tokenDuration`, and `userTableName` properties in addition to the standard provider configuration:

    {
        "environments": {
            "dev": {
                "provider": "aws",
                "configuration": {
                    "accessKeyId": "yourawskey",
                    "secretAccessKey": "yourawssecret",
                    "region":"us-east-1",
                    "account":"123456789", 
                    "maxRetries":2
                }, 
                "jwtKeySecret": "chooseasecret", 
                "tokenDuration": "30d",
                "userTableName": "sometablename", 
            }
        }
    }

This service currently relies on AWS [DynamoDB](https://aws.amazon.com/dynamodb/) to store the user records. Future releases will abstract this dependence away and allow for greater flexibility with regards to how the data can be stored and accessed. 

There are two types of records to be stored in the user table under the recordType property: `user-id` and `user-data`. The `user-id` records consist of two properties, a `recordId` consisting of the username, and a `userId` consisting of a guid. This guid maps to the corresponding `user-data` record containing the `passwordHash`, `created` timestamp, and `roles` list.


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

If you are using [SCEPTER-GatewayService](https://github.com/source4societyorg/SCEPTER-GatewayService) for your API Gateway, this would go in the `payload` key of your gateway body. 

    {
      "status": true,
      "result": {
        "jwt": "eyJhbGciOiJIUzI1NiIsnR5cCI6IkpXVCJ9.eyJwYXNzd29yZEhhc2giOiIkMmEkMDgkb3Bsa28yZW9FQTFLNTZZa2lkQzJ6LkRReHI0YnFjR201V3dIcHh4MW0va3J1Li9UVFhFLjYiLCJ1c2VybmFtZSI6Im5yYWNhZG1pbiIsInJvbGVzIjpbIk5SQUNfQURNSU4iXSwidXNlcklkIjoiMzRjMmJkZDItYTg2My00NDg5LTkyNzQtZmY4Y2JkYjkxZGM2IiwiaWF0IjoxNTEyOTkxNjY2LCJleHAiOjE1MTU1ODM2NjZ9.QDDvZXqO77BvHwX80tdZn4o5IHlS9FD3BwxYqbpxrw"
      }
    }	


## Tests

To run tests and eslint, run `yarn test`.

Before running tests, you need to be sure that you have a `test` environment credential configuration set created. These are provided by default in the test folder and are automaticaly referenced by the test library,
