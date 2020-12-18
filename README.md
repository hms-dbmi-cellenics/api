Local development
=================
The instructions in this section include all information that you need to know in order to run the api locally and
or connect it to the other parts of the Biomage Single Cell Platform. 

### 0. Install packages
After cloning this repo, run `npm install` to install all required packages.

### 1. Connect with Inframock
Inframock is a tool that we have developed in order to run the single cell sequencing platform locally, 
without the need to access AWS resources. It enables local end-to-end testing and development
and it is highly recommended that you set it up when developing a new feature.

In order to connect with Inframock, follow the instructions in here next: https://github.com/biomage-ltd/inframock

After Inframock is started, the next step is to start the API.

### 2. Start the API
Whether the API runs with the local InfraMock instance, which should have Redis as well as all the mocked AWS 
services ready for use, or with a ***live*** cluster instead, is controlled by an enviornment variable called
`CLUSTER_ENV`, which is set to `development` by default.

Run `npm start` to run the API locally, while running Inframock from the previous step in a separate terminal tab.
The output on the terminal should look similarly to this:

```
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
variable set to the appropriate value. For example, running `CLUSTER_ENV='production' npm start` will connect you to the
production cluster and as a result you should see an output on the terminal similar to this:

```
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
```

Note that if you decide to run the API with a ***live*** cluster, you won't be able to receive responses back from the
worker. This is because the live SNS topic cannot push messages to a local development machine, only to an endpoint 
exposed to the internet. See the system achitecture here for more context: https://github.com/biomage-ltd/developer-docs/wiki/Biomage-Single-Cell-Platform:-Architecture

### 3. Run the UI locally
Go to the UI repo found in here: https://github.com/biomage-ltd/ui and follow the instructions to set it up.
On a separate terminal inside the UI project, run `npm start` to start the UI locally. After the UI is launched,
any request from the UI will be automatically forwarded to the API.

### 4. Run the worker locally
Go to the worker repo found in here: https://github.com/biomage-ltd/worker and clone the repository.
On a separate terminal inside the worker project, start the worker locally by running `docker-compose up --build`. Note that
the first time this step will take a while - possibly around 40 mins. Time to go and make yourself a cup of tea and read a book
or relax :)

After the worker is launched, any request from the API will be automatically forwarded to the worker by default 
(unless you have set `CLUSTER_ENV` in the api to `staging` or `production`) and the reponse from the worker will be sent 
back to the API.

### 4. Receive responses back from the worker
This is only possible if you run InfraMock for local development. This is because the live SNS topic cannot push
messages to a local development machine, only to an endpoint exposed to the internet.

You can simply run the worker locally as well, in which case results processed by the worker will automatically get
pushed to the SNS topic the API is configured to listen to.

If you want to test a custom response that you wrote yourself, you can use `aws-cli` pointed to the InfraMock endpoint.
To do this, make sure that you:

1. Have `aws-cli` installed. See documentation in here: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
2. Create a file `payload.json` at the same 
Then you can push mocked worker responses as follows:

        aws --endpoint-url=http://localhost:4566 sns publish --topic-arn arn:aws:sns:eu-west-1:000000000000:work-results-development --message "$(< payload.json)"

from the file `payload.json`.

Deployment
==========
The api is deployed to an AWS-managed Kubernetes cluster during a CI build via Github Actions upon a merged Pull Request.
For more information on the deployment, see the deploy step of the CI script for the API: https://github.com/biomage-ltd/api/blob/master/.github/workflows/ci.yaml
and the iac repo: https://github.com/biomage-ltd/iac
