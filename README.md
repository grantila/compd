[![npm version][npm-image]][npm-url]
[![downloads][downloads-image]][npm-url]
[![build status][build-image]][build-url]
[![greenkeeper badge][greenkeeper-image]][greenkeeper-url]
[![Language grade: JavaScript][lgtm-image]][lgtm-url]

# compd

`compd` (or _**comp**ose**d**_) is a program that spawns of a custom command while ensuring a `docker-compose` set of containers are running. It will wait for the containers to be started (and the programs within to be _ready_ for requests, such as SQL databases), and (optionally) teardown the docker-composed containers. It forwards the exit code from the custom command and exits with the same exit code after the containers have been stopped.

Ports that are only specified on the container side (i.e. without hard-coded host ports) are deduced, and environment variables are provided to the running command. If a docker-compose file has a service called `"redis"` and a container port `6379`, this will cause an environment variable to be created called `REDIS_PORT_6379` with the value being the host port. If only one port is exposed, a shortcut environment variable without the the container port will be provided too, e.g. `REDIS_PORT`.


# Installation

Use `compd` by installing it globally:

```
npm install -g compd
# or with yarn
yarn global add compd

compd --file docker-compose.yaml my-app
```

or run through `npx`:

```
npx compd --file docker-compose.yaml my-app
```


# Readiness detectors

When all host ports are deduced from the container ports, `compd` start scanning the ports to see if they are open. When they are, `compd` will try to deduce what potentially _known_ services are being run (such as a redis server, a Postgres server etc) and will use different mechanisms for each type of server to detect if it is ready for requests. E.g. a Postgres port can be open, but the server not be available for requests immediately. It can take seconds for it to be ready.

The custom command won't be spawned until all ports with _known_ servers are positively ready.


## Current detectors

There is support for:

 * Open TCP ports (before trying the below detectors)
 * Redis
 * Postgres



[npm-image]: https://img.shields.io/npm/v/compd.svg
[npm-url]: https://npmjs.org/package/compd
[downloads-image]: https://img.shields.io/npm/dm/compd.svg
[build-image]: https://img.shields.io/github/workflow/status/grantila/compd/Master.svg
[build-url]: https://github.com/grantila/compd/actions?query=workflow%3AMaster
[coverage-image]: https://coveralls.io/repos/github/grantila/compd/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/grantila/compd?branch=master
[greenkeeper-image]: https://badges.greenkeeper.io/grantila/compd.svg
[greenkeeper-url]: https://greenkeeper.io/
[lgtm-image]: https://img.shields.io/lgtm/grade/javascript/g/grantila/compd.svg?logo=lgtm&logoWidth=18
[lgtm-url]: https://lgtm.com/projects/g/grantila/compd/context:javascript
