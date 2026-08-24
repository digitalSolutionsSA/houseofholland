#!/bin/sh
set -e

# Xcode Cloud only clones the git repository — node_modules is gitignored
# (as normal), but CapApp-SPM's Package.swift references Capacitor plugins
# by a relative path *inside* node_modules (@capacitor/push-notifications,
# @capacitor-community/fcm), so those packages can't resolve until
# node_modules actually exists. This script restores it before Xcode
# attempts to resolve Swift Package dependencies.

cd "$CI_WORKSPACE"

if ! command -v npm >/dev/null 2>&1; then
  brew install node
fi

npm ci
