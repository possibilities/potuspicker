#!/bin/bash
set -e

CLEAN_BRANCH_NAME=${CIRCLE_BRANCH//\//-};

JSON=$(cat <<-EOF
{
  "version": 2,
  "name": "potuspicker-features",
  "alias": "branch-$CLEAN_BRANCH_NAME.potuspicker.com",
  "builds": [
    { "src": "package.json", "use": "@now/static-build" }
  ]
}
EOF
)

echo $JSON > .now/now.feature.json
