[![codecov](https://codecov.io/gh/hms-dbmi-cellenics/api/branch/master/graph/badge.svg?token=hC9LshrTQm)](https://codecov.io/gh/hms-dbmi-cellenics/api)
API
======

testting dco signoff

A nodejs service that sits in between the UI, the Cellenics backends and the Data store and does the following:
- Authorizes and validates requests. 
- Creates and starts gem2s and qc state machines for data processing tasks.
- Creates a SQS queue and assigns available worker to an experiement that needs one for data analysis tasks.
- Deletes worker pods that are no longer needed.
- Listens to broadcasted messages by the worker on Redis and processes the message that's relevant to it (based on the value of `socketId` in the message body).
See the [Emitters](https://socket.io/docs/v4/redis-adapter/#emitter) section in the Redis adapter documention for more details about how the worker-API communication happens.
- Communicates to the UI via socket connections to send the status of worker requests and details about where they can be found.
- Contains HTTP endpoints that allow programmatic access and modification to experiment data by authorized users.

## Running locally

In most cases, developing on the API requires having other parts of Cellenics set up and started too. This is why this readme includes instructions not only for the API, but for how to set up Cellenics to run end-to-end. If you still want to run only the API, do only Step 0 and Step 2 from the steps outlined below and skip the rest.

#### Step 0. Prerequisites

We highly recommend using VSCode for local development. Make sure you also have `npm` and `docker` installed.

You will also need to have aws command line interface `aws-cli` installed and configured. See [install guide](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html). In MacOS you can run:

        brew install awscli

Once installed, run `aws configure`. You will need an AWS access & secret key for the configuration. Alternatively you can use the example data provided below:

```bash
AWS Access Key ID: BLABLAEXAMPLE
AWS Secret Access Key: BLABLABLAEXAMPLEKEY
Default region name: eu-west-1
Default output format: json
```

#### Step 1. Connect with Inframock

Inframock is a tool that we have developed in order to run Cellenics locally, without the need to access AWS resources. It enables local end-to-end testing and development and it is compulsory to have it running when developing a new feature.
Go to the [Inframock repo](https://github.com/hms-dbmi-cellenics/inframock) and follow the instructions in the README to set it up and start it on a separate terminal.
After Inframock service is started, the next step is to start the API.

#### Step 2. Start the API

To run the API, first install the dependencies with:

        make install

And then run it with:

        make run

If you haven't completed step 1 and run Inframock locally, you should see the following output on your terminal:

```bash
[2021-01-03T11:51:36.037Z] We are running on a development cluster, patching AWS to use InfraMock endpoint...
[2021-01-03T11:51:36.304Z] Generating configuration for cache...
[2021-01-03T11:51:36.304Z] Attempting to fetch URLs for Redis cluster endpoints...
[2021-01-03T11:51:36.304Z] Running locally, keeping base configuration.
[2021-01-03T11:51:36.305Z] Primary: localhost:6379, reader: localhost:6379
[2021-01-03T11:51:36.305Z] Setting up L1 (in-memory) cache, size: 1000, TTL: 129600000
[2021-01-03T11:51:36.305Z] Now setting up Redis connections...
[2021-01-03T11:51:36.305Z] Running in development, patching out TLS connection.
[2021-01-03T11:51:36.306Z] Running in development, patching out TLS connection.
[2021-01-03T11:51:36.307Z] Cache instance created.
[2021-01-03T11:51:36.310Z] NODE_ENV: development, cluster env: development
[2021-01-03T11:51:36.310Z] Server listening on port: 3000
[2021-01-03T11:51:36.312Z] redis:reader An error occurred: connect ECONNREFUSED 127.0.0.1:6379
```
The reason for the Redis error is that the API is not connected with the rest of the platform.

If you did complete step 1 and are runnig Inframock locally, you should see the following output on your terminal:

```bash
[2020-12-18T07:06:20.852Z] We are running on a development cluster, patching AWS to use InfraMock endpoint...
[2020-12-18T07:06:21.097Z] Generating configuration for cache...
[2020-12-18T07:06:21.097Z] Attempting to fetch URLs for Redis cluster endpoints...
[2020-12-18T07:06:21.097Z] Running locally, keeping base configuration.
[2020-12-18T07:06:21.098Z] Primary: localhost:6379, reader: localhost:6379
[2020-12-18T07:06:21.098Z] Setting up L1 (in-memory) cache, size: 1000, TTL: 129600000
[2020-12-18T07:06:21.098Z] Now setting up Redis connections...
[2020-12-18T07:06:21.098Z] Running in development, patching out TLS connection.
[2020-12-18T07:06:21.100Z] Running in development, patching out TLS connection.
[2020-12-18T07:06:21.100Z] Cache instance created.
[2020-12-18T07:06:21.104Z] NODE_ENV: development, cluster env: development
[2020-12-18T07:06:21.104Z] Server listening on port: 3000
[2020-12-18T07:06:21.108Z] redis:primary Connection successfully established.
[2020-12-18T07:06:21.109Z] redis:reader Connection successfully established.
[2020-12-18T07:06:21.111Z] redis:primary Connection ready.
[2020-12-18T07:06:21.112Z] redis:reader Connection ready.
```

#### Step 3. Run the UI locally
This is required to run the API with a local version of the UI.
Go to the [UI repo](https://github.com/hms-dbmi-cellenics/ui) and follow the instructions in the README to set it up and start it on a separate terminal.
After the UI service is started, any request from the UI will be automatically forwarded to the API and vice versa.

#### Step 4. Run the pipeline locally

This is required for working on the Data Processing module of Cellenics or if you want to obtain an `.rds` file for the Data Exploration module.
Go to the [pipeline repo](https://github.com/hms-dbmi-cellenics/pipeline) and follow the instructions in the README to set up and start it on a separate terminal.
After the pipeline service is started, any request from the API will be automatically forwarded to the pipeline and vice versa.

#### Step 5. Run the worker locally

This is required for running the API with a local version of the worker.
Go to the [worker repo](https://github.com/hms-dbmi-cellenics/worker) and follow the instructions in the README to set up and start it on a separate terminal.
After the worker service is started, any request from the API will be automatically forwarded to the worker by default and the reponse from the worker will be received back by the API.

## Deployment

The API is deployed as a Helm chart to an AWS-managed Kubernetes cluster. The deployment is handled by the cluster Helm operator and the [API Github Actions workflow](https://github.com/hms-dbmi-cellenics/api/blob/master/.github/workflows/ci.yaml). 

During a deployment, API Github Actions workflow does the following:
- It pushes new API images to ECR.
- Adds API-specific configurations to the [nodejs Helm chart](https://github.com/hms-dbmi-cellenics/iac/tree/master/charts/nodejs), that is used for the deployment of the API. 
- Pushes the API-specific configuration changes into the [releases/](https://github.com/hms-dbmi-cellenics/iac/tree/master/releases) folder in iac, under the relevant environment.
