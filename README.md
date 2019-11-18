[![npm version][npm-image]][npm-url]
[![downloads][downloads-image]][npm-url]
[![build status][travis-image]][travis-url]
[![coverage status][coverage-image]][coverage-url]
[![greenkeeper badge][greenkeeper-image]][greenkeeper-url]
[![Language grade: JavaScript][lgtm-image]][lgtm-url]

# compd

`compd` (or _composed_) is a program that spawns of a custom command while ensuring a `docker-compose` set of containers are running. It will wait for the containers to be started (and the programs within to be _ready_ for requests, such as SQL databases), and (optionally) teardown the docker-composed containers. It forwards the exit code from the custom command and exits with the same exit code after the containers have been stopped.

Ports that are only specified on the container side (i.e. without hard-coded host ports) are deduced, and environment variables are provided to the running command. If a docker-compose file has a service called `"redis"` and a container port `6379`, this will cause an environment variable to be created called `REDIS_PORT_6379` with the value being the host port.


# Installation

Use `compd` by installing it globally:

```
npm install -g compd
# or with yarn
yarn global add compd

compd --file docker-compise.yaml my-app
```

or run through `npx`:

```
npx compd --file docker-compise.yaml my-app
```



[npm-image]: https://img.shields.io/npm/v/compd.svg
[npm-url]: https://npmjs.org/package/compd
[downloads-image]: https://img.shields.io/npm/dm/compd.svg
[travis-image]: https://img.shields.io/travis/grantila/compd/master.svg
[travis-url]: https://travis-ci.org/grantila/compd
[coverage-image]: https://coveralls.io/repos/github/grantila/compd/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/grantila/compd?branch=master
[greenkeeper-image]: https://badges.greenkeeper.io/grantila/compd.svg
[greenkeeper-url]: https://greenkeeper.io/
[lgtm-image]: https://img.shields.io/lgtm/grade/javascript/g/grantila/compd.svg?logo=lgtm&logoWidth=18
[lgtm-url]: https://lgtm.com/projects/g/grantila/compd/context:javascript
