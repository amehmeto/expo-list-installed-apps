#!/usr/bin/env bash
set -e

# Script to send Slack notification for APK build
# Usage: ./send-slack-notification.sh

if [ -z "$SLACK_WEBHOOK_URL" ]; then
  echo "Error: SLACK_WEBHOOK_URL environment variable not set"
  exit 1
fi

if [ -z "$PR_NUMBER" ] || [ -z "$PR_TITLE" ] || [ -z "$PR_URL" ]; then
  echo "Error: Missing required PR environment variables"
  exit 1
fi

if [ -z "$DOWNLOAD_URL" ] || [ -z "$TAG_NAME" ]; then
  echo "Error: Missing required release environment variables"
  exit 1
fi

RELEASE_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/releases/tag/${TAG_NAME}"

# Generate Slack payload
PAYLOAD=$(cat <<EOF
{
  "text": "New List Installed Apps APK ready for testing!",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "List Installed Apps - Android Build Ready"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*PR:*\n<${PR_URL}|#${PR_NUMBER} - ${PR_TITLE}>"
        },
        {
          "type": "mrkdwn",
          "text": "*Branch:*\n\`${BRANCH}\`"
        },
        {
          "type": "mrkdwn",
          "text": "*Build:*\n#${GITHUB_RUN_NUMBER}"
        },
        {
          "type": "mrkdwn",
          "text": "*Commit:*\n\`${COMMIT_SHA:0:7}\`"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Download APK",
            "emoji": true
          },
          "url": "${DOWNLOAD_URL}",
          "style": "primary"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View PR",
            "emoji": true
          },
          "url": "${PR_URL}"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Release",
            "emoji": true
          },
          "url": "${RELEASE_URL}"
        }
      ]
    }
  ]
}
EOF
)

# Send to Slack
curl -X POST \
  -H 'Content-type: application/json' \
  --data "$PAYLOAD" \
  "$SLACK_WEBHOOK_URL"

echo "Slack notification sent successfully"
