#!/bin/bash

# Build TypeScript to JavaScript
npm run build

# Publish all workspaces
npm publish --workspaces