import * as aws from "@pulumi/aws";
import got from "got";

const schedule = process.env.SCHEDULE;
const siteURL = process.env.SITE_URL;
const webhookURL = process.env.WEBHOOK_URL;

if (!schedule || !siteURL || !webhookURL) {
    throw new Error("Missing one or more environment variables.")
}

aws.cloudwatch.onSchedule("subscription", schedule, async () => {
    try {
        const response = await got(siteURL);
        console.log(`Site's up! Status was ${response.statusCode}.`);
    }
    catch(error) {
        const status = error.response.statusCode;
        const message = JSON.parse(error.response.body).message;

        try {
            const response = await got.post(webhookURL, {
                json: {
                    username: "health-check",
                    icon_emoji: ":scream:",
                    text: `${siteURL} returned HTTP ${status} (${message}).`
                }
            });
        }
        catch(error) {
            console.error(`Error posting to Slack: ${error}`);
        }
    }
});
