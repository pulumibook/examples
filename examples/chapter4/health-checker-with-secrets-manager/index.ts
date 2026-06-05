import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import got from "got";
import { SecretsManager } from "aws-sdk";

const config = new pulumi.Config();
const schedule = config.require("schedule");
const siteURL = config.require("siteURL");
const webhookURL = config.requireSecret("webhookURL");

const secret = new aws.secretsmanager.Secret("webhookURL");
const secretVersion = new aws.secretsmanager.SecretVersion("webhookURLValue", {
    secretId: secret.id,
    secretString: webhookURL,
});

const callback = new aws.lambda.CallbackFunction("callback", {
    callback: async () => {
        const secretsManager = new SecretsManager();
        const secretValue = await secretsManager
            .getSecretValue({
                SecretId: secretVersion.arn.get(),
            })
            .promise();

        if (!secretValue.SecretString) {
            console.log("Unable to retrieve webhookURL. Exiting.");
            return;
        }

        try {
            const response = await got(siteURL);
            console.log(`Site's up! Status was ${response.statusCode}.`);
        } catch (error: any) {
            const status = error.response.statusCode;
            const message = JSON.parse(error.response.body).message;

            try {
                const response = await got.post(secretValue.SecretString, {
                    json: {
                        username: "health-check",
                        icon_emoji: ":scream:",
                        text: `${siteURL} returned HTTP ${status} (${message}).`,
                    },
                });
            } catch (error: any) {
                console.error(`Error posting to Slack: ${error}`);
            }
        }
    },
    policies: [
        aws.iam.ManagedPolicy.CloudWatchFullAccess,
        aws.iam.ManagedPolicy.SecretsManagerReadWrite,
    ],
    environment: {
        variables: {
            WEBHOOK_URL: webhookURL,
        },
    },
});

aws.cloudwatch.onSchedule("subscription", schedule, callback);
