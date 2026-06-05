import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import got from "got";

const config = new pulumi.Config();
const schedule = config.require("schedule");
const siteURL = config.require("siteURL");
const webhookURL = config.requireSecret("webhookURL");

const callback = new aws.lambda.CallbackFunction("callback", {
    callback: async () => {
        const webhookURLFromEnv = process.env.WEBHOOK_URL;

        if (!webhookURLFromEnv) {
            console.error("WEBHOOK_URL not set. Skipping.");
            return;
        }

        try {
            const response = await got(siteURL);
            console.log(`Site's up! Status was ${response.statusCode}.`);
        } catch (error: any) {
            const status = error.response.statusCode;
            const message = JSON.parse(error.response.body).message;

            try {
                const response = await got.post(webhookURLFromEnv, {
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
    environment: {
        variables: {
            WEBHOOK_URL: webhookURL,
        },
    },
});

aws.cloudwatch.onSchedule("subscription", schedule, callback);
