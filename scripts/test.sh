#!/bin/bash

set -o errexit -o pipefail

pulumi about

programs=$(find . -name "Pulumi.dev.yaml" -not -path "*/node_modules/*" -exec dirname {} \;)

# Iterate through each program to make sure it installs, previews, deploy, and destroys successfully.
for program in $programs; do
    echo
    echo "------------"
    echo "Testing $program"
    echo "------------"
    echo

    pushd "$program" || exit 1
        ncu -u
        npm install

        pulumi stack init dev || true
        pulumi stack select dev
        pulumi destroy --yes

        # Set any required environment variables.
        if [ $program == "./chapter3/health-checker" ]; then
            npm install got@11
            export SCHEDULE="rate(1 minute)";
            export SITE_URL="https://thepulumibook.com/ch03/health-checker/api/dev";
            export WEBHOOK_URL="$HEALTH_CHECKER_SLACK_WEBHOOK_URL";
        fi

        if [ $program == "./chapter4/health-checker" ]; then
            npm install got@11
            pulumi config refresh
        fi

        if [ $program == "./chapter4/health-checker-with-secrets-manager" ]; then
            npm install got@11
            pulumi config refresh
        fi

        pulumi up --yes
        pulumi destroy --yes

    popd || exit 1
done
