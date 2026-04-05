#!/bin/bash
# Saves GitHub traffic stats to traffic/ directory
# Run weekly to persist beyond GitHub's 14-day window

REPO="brainrot-battles/brainrot-battles"
DIR="$(cd "$(dirname "$0")/../traffic" && pwd)"
DATE=$(date +%Y-%m-%d)
FILE="$DIR/traffic-$DATE.json"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "Fetching traffic data for $REPO..."

VIEWS=$(gh api "repos/$REPO/traffic/views" 2>/dev/null)
CLONES=$(gh api "repos/$REPO/traffic/clones" 2>/dev/null)
REFERRERS=$(gh api "repos/$REPO/traffic/popular/referrers" 2>/dev/null)
PATHS=$(gh api "repos/$REPO/traffic/popular/paths" 2>/dev/null)

cat > "$FILE" << ENDJSON
{
  "date": "$DATE",
  "views": $VIEWS,
  "clones": $CLONES,
  "referrers": $REFERRERS,
  "paths": $PATHS
}
ENDJSON

# Extract summary
TOTAL_VIEWS=$(echo "$VIEWS" | grep -o '"count":[0-9]*' | head -1 | cut -d: -f2)
UNIQUE_VIEWS=$(echo "$VIEWS" | grep -o '"uniques":[0-9]*' | head -1 | cut -d: -f2)

echo "Saved to $FILE"
echo "Summary: ${TOTAL_VIEWS:-0} views, ${UNIQUE_VIEWS:-0} unique visitors (14-day window)"
