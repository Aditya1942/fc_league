#!/bin/sh
set -e

java_major() {
  java -version 2>&1 | sed -n 's/.* version "\([0-9][0-9]*\).*/\1/p' | head -n 1
}

major="$(java_major || true)"
if [ -z "$major" ] || [ "$major" -lt 21 ]; then
  if [ -x /opt/homebrew/opt/openjdk/bin/java ]; then
    JAVA_HOME="/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
    export JAVA_HOME
    PATH="$JAVA_HOME/bin:$PATH"
    export PATH
  fi
fi

exec firebase emulators:start --only auth,firestore
