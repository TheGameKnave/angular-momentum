#!/bin/bash

set -e

ENV=$1

if [[ -z "$ENV" ]]; then
  echo "Usage: ./deploy.sh [dev|staging|production]"
  exit 1
fi

echo "🚀 Deploying to $ENV..."

case "$ENV" in
  dev)
    GIT_REMOTE="dev"
    GIT_BRANCH="dev"
    USE_LINODE=false
    ;;
  staging)
    GIT_REMOTE="staging"
    GIT_BRANCH="staging"
    LINODE_FOLDER="staging"
    USE_LINODE=true
    ;;
  production)
    GIT_REMOTE="production"
    GIT_BRANCH="origin/main"
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
if $USE_LINODE; then
  echo "🗂️ Syncing assets to Linode for '$LINODE_FOLDER'..."
  rclone sync ./assets/ linode:cdn.angularmomentum.app/assets/$LINODE_FOLDER/ \
    --header "Cache-Control: no-cache, must-revalidate" \
    --s3-acl public-read

  # if [[ "$ENV" == "production" ]]; then
  #   echo "📦 Syncing Tauri dist to Linode..."
  #   rclone sync ./dist/ linode:cdn.angularmomentum.app/dist/ \
  #     --header "Cache-Control: no-cache, must-revalidate" \
  #     --s3-acl public-read
  # fi
else
  echo "⚠️ Skipping Linode sync for dev environment."
fi

echo "✅ Deployment to '$ENV' complete."
