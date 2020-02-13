# SYZOJ NG

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

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
