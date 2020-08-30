# SYZOJ NG

[![Build Status](https://img.shields.io/github/workflow/status/syzoj/syzoj-ng/CI?style=flat-square)](https://github.com/syzoj/syzoj-ng/actions?query=workflow%3ACI)
[![Dependencies](https://img.shields.io/david/syzoj/syzoj-ng?style=flat-square)](https://david-dm.org/syzoj/syzoj-ng)
[![Known Vulnerabilities](https://snyk.io/test/github/syzoj/syzoj-ng/badge.svg?targetFile=package.json&style=flat-square)](https://snyk.io/test/github/syzoj/syzoj-ng?targetFile=package.json)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License](https://img.shields.io/github/license/syzoj/syzoj-ng?style=flat-square)](LICENSE)

The next generation SYZOJ server.

# Deploying & Development

Clone this git repo and install dependencies:

```bash
$ git clone git@github.com:syzoj/syzoj-ng.git
$ cd syzoj-ng
$ yarn
```

Create a `config.yaml` file based on `config-example.yaml`:

```bash
$ cp config-example.yaml config.yaml
```

## Database

Create a database and user in MySQL or MariaDB:

```mysql
CREATE DATABASE `syzoj-ng` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `syzoj-ng`.* TO "syzoj-ng"@"localhost" IDENTIFIED BY "syzoj-ng-password";
```

Then fill the database connection information in the configuration file.

## Redis

Install Redis (>= 5) and change the `redis` url in the config (if your redis isn't listening on the default address and port).

## MinIO

Install MinIO file storage server and run with a data directory (if you're not running locally, please specify the environmental variables `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` for security):

```
$ wget https://dl.min.io/server/minio/release/linux-amd64/minio
$ chmod +x minio
$ MINIO_ACCESS_KEY=AKAK MINIO_SECRET_KEY=SKSK ./minio server /mnt/data # /mnt/data is the data directory
```

After starting MinIO server, create a bucket with MinIO's management tool `mc`:

```
$ wget https://dl.min.io/client/mc/release/linux-amd64/mc
$ chmod +x mc
$ ./mc config host add minio http://127.0.0.1:9000 "AKAK" "SKSK"
$ ./mc mb -p minio/syzoj-ng-files
```

Then fill the MinIO server information in the config file. Notice that the endpoint should be accessible by both the API server and the user.

## Run

By default this app listens on `127.0.0.1:2002`. You can change this in the configuration file. You can use nginx as reversed proxy to access the app with a domain name like `syzoj-ng.test`.

```bash
$ SYZOJ_NG_CONFIG_FILE=./config.yaml yarn start
```

Add `SYZOJ_NG_LOG_SQL` to enable TypeORM logging:

```bash
$ SYZOJ_NG_LOG_SQL=1 SYZOJ_NG_CONFIG_FILE=./config.yaml yarn start
```

Refer to [syzoj-ng-app](https://github.com/syzoj/syzoj-ng-app) for the guide of the front-end app server.  
Refer to [syzoj-ng-judge](https://github.com/syzoj/syzoj-ng-judge) for the guide of the judge client.
