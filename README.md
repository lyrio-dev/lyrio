# Lyrio

[![Build Status](https://img.shields.io/github/workflow/status/lyrio-dev/lyrio/CI?style=flat-square)](https://github.com/lyrio-dev/lyrio/actions?query=workflow%3ACI)
[![Dependencies](https://img.shields.io/david/lyrio-dev/lyrio?style=flat-square)](https://david-dm.org/lyrio-dev/lyrio)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License](https://img.shields.io/github/license/lyrio-dev/lyrio?style=flat-square)](LICENSE)

The backend service of Lyrio.

# Deploying & Development

Clone this git repo and install dependencies:

```bash
$ git clone git@github.com:lyrio-dev/lyrio.git
$ cd lyrio
$ yarn
```

Create a `config.yaml` file based on `config-example.yaml`:

```bash
$ cp config-example.yaml config.yaml
```

## Database

Create a database and user in MySQL or MariaDB:

```mysql
CREATE DATABASE `lyrio` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `lyrio`.* TO "lyrio"@"localhost" IDENTIFIED BY "lyrio-password";
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
$ ./mc alias set minio http://127.0.0.1:9000 "AKAK" "SKSK"
$ ./mc mb -p minio/lyrio-files
```

Then fill the MinIO server information in the config file. The `endpoint` property is used by the server. If you want the user or judge to connect to MinIO with other host as the endpoint, set `endpointForUser` or `endpointForJudge` to a URL path. Make sure you configure Nginx properly, especially when you use a sub-directory.

## Run

By default this app listens on `127.0.0.1:2002`. You can change this in the configuration file. You can use nginx as reversed proxy to access the app with a domain name like `lyrio.test`.

```bash
$ LYRIO_CONFIG_FILE=./config.yaml yarn start
```

Add `LYRIO_LOG_SQL` to enable TypeORM logging:

```bash
$ LYRIO_LOG_SQL=1 LYRIO_CONFIG_FILE=./config.yaml yarn start
```

Refer to [lyrio-ui](https://github.com/lyrio-dev/ui) for the guide of the front-end app server.  
Refer to [lyrio-judge](https://github.com/lyrio-dev/judge) for the guide of the judge client.
