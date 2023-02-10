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
        npm install

        pulumi stack init dev || true
        pulumi stack select dev

        # Set any required environment variables.
        if [ $program == "./chapter3/health-checker" ]; then
            export SCHEDULE="foo";
            export SITE_URL="foo";
            export WEBHOOK_URL="foo";
        fi

        if [ $program == "./chapter4/health-checker-with-secrets-manager" ]; then
            pulumi -C $program config set webhookURL https://some-url --secret
        fi

        pulumi destroy --yes
        pulumi preview --non-interactive

        # pulumi up --yes --non-interactive

        pulumi destroy --yes

    popd || exit 1
done
