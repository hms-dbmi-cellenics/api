API
======

The API of Cellscope (the Biomage single cell analysis platform).

Development
-----------

The instructions in this section include all information that you need to know in order to run the api locally and
or connect it to the other parts of the Biomage Single Cell Platform.

### Prerequisites

We hihgly recommend using VSCode for local development. Make sure you also have `npm` and `docker` installed.

You will also need to have aws command line interface `aws-cli` installed and configured. See [install guide](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html). In MacOS you can run:

        brew install awscli

Once installed, run `aws configure`. You will need an AWS access & secret key for the configuration. Alternatively you can use the example data provided below:

```bash
AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name: eu-west-1
Default output format: json
```

### Running locally

To run the API, you can install the dependencies with:

        make install

And then run it with:

        make run 

You should see the following output on your terminal:

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

The reason for this is that the API is not connected with the rest of the platform. To get the API running end-to-end
with a mocked dataset, you will need to set up each of these:

- Inframock: https://github.com/biomage-ltd/inframock
- worker: https://github.com/biomage-ltd/worker
- UI: https://github.com/biomage-ltd/ui

The following steps explain in more details on how to get the Cellscope platform running end-to-end locally.

#### 1. Connect with Inframock

Inframock is a tool that we have developed in order to run the single cell sequencing platform locally,
without the need to access AWS resources. It enables local end-to-end testing and development
and it is highly recommended that you set it up when developing a new feature.

In order to connect with Inframock, follow the instructions in here next: https://github.com/biomage-ltd/inframock

After Inframock is started, the next step is to start the API.

#### 2. Start the API

Whether the API runs with the local InfraMock instance, which should have Redis as well as all the mocked AWS
services ready for use, or with a ***live*** cluster instead, is controlled by an enviornment variable called
`CLUSTER_ENV`, which is set to `development` by default.

Run `make run` to run the API locally, while running Inframock from the previous step in a separate terminal tab.
The output on the terminal should look similarly to this:

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

To use a **live** (`staging` or `production`) cluster, make sure you run the API with the `CLUSTER_ENV` environment
variable set to the appropriate value. For example, running `CLUSTER_ENV='production' make run` will connect you to the
production cluster and as a result you should see an output on the terminal similar to this:

```bash
[2020-12-18T07:20:04.229Z] Generating configuration for cache...
[2020-12-18T07:20:04.231Z] Attempting to fetch URLs for Redis cluster endpoints...
[2020-12-18T07:20:05.578Z] Found replication group biomage-redis-production (Biomage ElastiCache cluster for environment production).
[2020-12-18T07:20:05.578Z] Updating cache configuration to use proper endpoints...
[2020-12-18T07:20:05.579Z] Primary: master.biomage-redis-production, reader: replica.biomage-redis-production
[2020-12-18T07:20:05.579Z] Setting up L1 (in-memory) cache, size: 1000, TTL: 129600000
[2020-12-18T07:20:05.579Z] Now setting up Redis connections...
[2020-12-18T07:20:05.582Z] Cache instance created.
[2020-12-18T07:20:05.584Z] NODE_ENV: development, cluster env: production
[2020-12-18T07:20:05.584Z] Server listening on port: 3000
[2020-12-18T07:20:05.594Z] redis:reader An error occurred: connect ETIMEDOUT
```

Note the last message, which is an error: this is expected and is due to the fact that we cannot connect to the Redis cluster
directly. This means that caching of data will not work in this case.

Also note that if you decide to run the API with a ***live*** cluster, you won't be able to receive responses back from the
worker. This is because the live SNS topic cannot push messages to a local development machine, only to an endpoint
exposed to the internet. See the system achitecture here for more context: https://github.com/biomage-ltd/developer-docs/wiki/Biomage-Single-Cell-Platform:-Architecture

#### 3. (Optional) Run the UI locally

This is required only if you want to run the API with a local version of the UI.
Go to the UI repo found in here: https://github.com/biomage-ltd/ui and follow the instructions to set it up and start it.
After the UI is launched on a separate terminal tab, any request from the UI will be automatically forwarded to the API.

#### 4. (Optional) Run the worker locally

This is required only if you want to run the API with a local version of the worker.
Go to the worker repo found in here: https://github.com/biomage-ltd/worker and clone the repository.
On a separate terminal inside the worker project, start the worker locally by following the instructions in the worker README.

After the worker is launched, any request from the API will be automatically forwarded to the worker by default
(unless you have set `CLUSTER_ENV` in the api to `staging` or `production`) and the reponse from the worker will be sent
back to the API.

#### 4'. Receive responses back from the worker

This is only possible if you run InfraMock for local development. This is because the live SNS topic cannot push
messages to a local development machine, only to an endpoint exposed to the internet.

You can simply run the worker locally as well, in which case results processed by the worker will automatically get
pushed to the SNS topic the API is configured to listen to.

If you want to test a custom response that you wrote yourself, you can use `aws-cli` pointed to the InfraMock endpoint.
To do this, make sure that you:

1. Have `aws-cli` installed. See Prerequisites section.
2. Create a file `payload.json` at the same  
Then you can push mocked worker responses as follows:

        aws --endpoint-url=http://localhost:4566 sns publish --topic-arn arn:aws:sns:eu-west-1:000000000000:work-results-development --message "$(< payload.json)"

from the file `payload.json`.

#### 5. (Optional) Run the pipeline locally

This is required only if you are going to work on functionality involving the QC pipeline.
Go to the pipeline repo found in here: https://github.com/biomage-ltd/pipeline and clone the repository.
On a separate terminal inside the worker pipeline, start the worker locally by following the instructions in the pipeline README.

You can inspect the inframock state machines that drive the pipeline with

```bash
aws --endpoint-url=http://localhost:4566 stepfunctions get-execution-history --execution-arn arn:aws:states:eu-west-1:...

aws --endpoint-url=http://localhost:4566 stepfunctions describe-state-machine --state-machine-arn arn:aws:states:eu-west-1:...
```

One of the test suites creates a snapshot with the definition of the [state machine used in inframock and in non-local
deployments](https://github.com/biomage-ltd/api/blob/master/tests/api/general-services/__snapshots__/state-machine-definition.test.js.snap).

Deployment
----------

The api is deployed to an AWS-managed Kubernetes cluster during a CI build via Github Actions upon a merged Pull Request.
For more information on the deployment, see the deploy step of the CI script for the API: https://github.com/biomage-ltd/api/blob/master/.github/workflows/ci.yaml
and the iac repo: https://github.com/biomage-ltd/iac

To inspect the state of the state machine that drives the pipeline, you can access the [AWS Step Functions
console](https://eu-west-1.console.aws.amazon.com/states/home?region=eu-west-1#/statemachines), or from the
CLI with `aws stepfunctions...`.
