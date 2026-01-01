#!/bin/bash

set -e

# Load environment variables from server/.env if it exists
if [[ -f "server/.env" ]]; then
  set -a
  source server/.env
  set +a
fi

ENV=$1

if [[ -z "$ENV" ]]; then
  echo "Usage: ./deploy.sh [dev|staging|production]"
  exit 1
fi

echo "🚀 Deploying to $ENV..."

case "$ENV" in
  dev)
    GIT_REMOTE="heroku-dev"
    GIT_BRANCH="dev"
    APP_URL="https://dev.angularmomentum.app"
    USE_LINODE=false
    ;;
  staging)
    GIT_REMOTE="heroku-staging"
    GIT_BRANCH="staging"
    APP_URL="https://staging.angularmomentum.app"
    LINODE_FOLDER="staging"
    USE_LINODE=true
    ;;
  production)
    GIT_REMOTE="heroku-production"
    GIT_BRANCH="origin/main"
    APP_URL="https://angularmomentum.app"
    LINODE_FOLDER="production"
    USE_LINODE=true
    ;;
  *)
    echo "❌ Invalid environment: $ENV"
    exit 1
    ;;
esac

# Push to the appropriate Heroku remote
git fetch --all
echo "📦 Pushing branch '$GIT_BRANCH' to remote '$GIT_REMOTE'..."
git push $GIT_REMOTE $GIT_BRANCH:main

# Sync to Linode only if needed
# if $USE_LINODE; then
#   # TODO maybe someday figure out how to host files on CDN for web AND in Tauri
#   # echo "🗂️ Syncing assets to Linode for '$LINODE_FOLDER'..."
#   # rclone sync ./assets/ linode:cdn.angularmomentum.app/assets/$LINODE_FOLDER/ \
#   #   --header "Cache-Control: no-cache, must-revalidate" \
#   #   --s3-acl public-read

#   # if [[ "$ENV" == "production" ]]; then
#   #   echo "📦 Syncing Tauri dist to Linode..."
#   #   rclone sync ./dist/ linode:cdn.angularmomentum.app/dist/ \
#   #     --header "Cache-Control: no-cache, must-revalidate" \
#   #     --s3-acl public-read
#   # fi
# else
#   echo "⚠️ Skipping Linode sync for dev environment."
# fi

echo "✅ Deployment to '$ENV' complete."

echo ""
echo "⏳ Waiting for Heroku to finish deploying..."
sleep 30

# Purge Cloudflare cache if credentials are set
if [[ -n "$CLOUDFLARE_ZONE_ID" && -n "$CLOUDFLARE_API_TOKEN" ]]; then
  echo "🔄 Purging Cloudflare cache..."
  PURGE_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')

  if echo "$PURGE_RESPONSE" | grep -q '"success": *true'; then
    echo "✅ Cloudflare cache purged successfully"
  else
    echo "⚠️ Cloudflare cache purge may have failed: $PURGE_RESPONSE"
  fi

  # Give Cloudflare a moment to propagate
  sleep 5
else
  echo "⚠️ Skipping Cloudflare cache purge (CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not set)"
fi

echo "🧪 Running smoke tests against $APP_URL..."
APP_BASE_URL="$APP_URL" npx @playwright/test test --config=tests/e2e/playwright.smoke.config.ts --reporter=list
SMOKE_EXIT=$?

if [[ $SMOKE_EXIT -ne 0 ]]; then
  echo ""
  echo "❌ Smoke tests failed! Check the deployment."
  exit $SMOKE_EXIT
fi

echo "✅ Smoke tests passed!"
