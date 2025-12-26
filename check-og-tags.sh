#!/bin/bash

# Simple script to check Open Graph tags locally

URL="${1:-http://localhost:4000/}"

echo "🔍 Checking Open Graph tags for: $URL"
echo ""

echo "📋 Meta Tags Found:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -s "$URL" | grep -E 'property="og:|name="twitter:|name="description"' | \
    sed 's/^[[:space:]]*//' | \
    sed 's/<meta /\n<meta /g' | \
    grep -E '^<meta'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extract and test the OG image URL
OG_IMAGE=$(curl -s "$URL" | grep -oP 'property="og:image" content="\K[^"]+')

if [ -n "$OG_IMAGE" ]; then
    echo "📸 Testing screenshot endpoint: $OG_IMAGE"

    # Test if the image endpoint works
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$OG_IMAGE")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Screenshot endpoint is working! (HTTP $HTTP_CODE)"
        echo ""
        echo "💾 Downloading preview..."
        curl -s "$OG_IMAGE" -o /tmp/og-preview.png
        echo "✅ Saved to: /tmp/og-preview.png"
        echo ""
        echo "🖼️  Opening preview..."
        xdg-open /tmp/og-preview.png 2>/dev/null || open /tmp/og-preview.png 2>/dev/null
    else
        echo "❌ Screenshot endpoint returned HTTP $HTTP_CODE"
    fi
else
    echo "⚠️  No og:image meta tag found!"
fi
