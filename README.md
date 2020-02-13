# SYZOJ NG

[![Build Status](https://img.shields.io/travis/syzoj/syzoj-ng?style=flat-square)](https://travis-ci.org/syzoj/syzoj-ng)
[![Dependencies](https://img.shields.io/david/syzoj/syzoj-ng?style=flat-square)](https://david-dm.org/syzoj/syzoj-ng)
[![Known Vulnerabilities](https://snyk.io/test/github/syzoj/syzoj-ng/badge.svg?targetFile=package.json&style=flat-square)](https://snyk.io/test/github/syzoj/syzoj-ng?targetFile=package.json)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License](https://img.shields.io/github/license/syzoj/syzoj-ng?style=flat-square)](LICENSE)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fsyzoj%2Fsyzoj-ng.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fsyzoj%2Fsyzoj-ng?ref=badge_shield)

The next generation SYZOJ server.

# Development
Clone this git repo and install dependencies:

```bash
$ git clone git@github.com:syzoj/syzoj-ng.git
$ cd syzoj-ng
$ yarn
```

Create a `config.json` file based on `config-example.json`:

```bash
$ cp config-example.json config.json
```

Create a database and user in MySQL or MariaDB:

```mysql
CREATE DATABASE `syzoj-ng` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `syzoj-ng`.* TO "syzoj-ng"@"localhost" IDENTIFIED BY "syzoj-ng-password";
```

Fill the database connection information in the configuration file:

```json
{
    ...
    "database": {
        "type": "mariadb",
        "host": "127.0.0.1",
        "port": 3306,
        "username": "syzoj-ng",
        "password": "syzoj-ng-password",
        "database": "syzoj-ng"
    },
    ...
}
```

By default this app listens on `127.0.0.1:2002`. You can change this in the configuration file. You can use nginx as reversed proxy to access the app with a domain name like `syzoj-ng.test`.

```bash
$ SYZOJ_NG_CONFIG_FILE=./config.json yarn start
```

Add `SYZOJ_NG_LOG_SQL` to enable TypeORM logging:

```bash
$ SYZOJ_NG_LOG_SQL=1 SYZOJ_NG_CONFIG_FILE=./config.json yarn start
```

Refer to [syzoj-ng-app](https://github.com/syzoj/syzoj-ng-app) for the guide for the front-end app server.


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fsyzoj%2Fsyzoj-ng.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fsyzoj%2Fsyzoj-ng?ref=badge_large)