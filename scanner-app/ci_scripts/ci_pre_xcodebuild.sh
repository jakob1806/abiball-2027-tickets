#!/bin/sh
# Xcode Cloud: Buildnummer = fortlaufende Xcode-Cloud-Nummer (+100, damit sie über den manuell hochgeladenen Builds liegt).
set -e
if [ -n "$CI_BUILD_NUMBER" ]; then
  cd "$CI_PRIMARY_REPOSITORY_PATH/scanner-app"
  NEW=$((CI_BUILD_NUMBER + 100))
  sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = $NEW;/g" AbiballEinlass.xcodeproj/project.pbxproj
  echo "Buildnummer gesetzt: $NEW"
fi
