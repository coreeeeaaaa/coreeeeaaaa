#!/bin/bash

# Check FIREBASE_TOKEN
if [ -z "$FIREBASE_TOKEN" ]; then
  echo "Error: FIREBASE_TOKEN environment variable is not set."
  exit 1
fi

# Deploy Firebase functions
firebase deploy --only functions --token "$FIREBASE_TOKEN"