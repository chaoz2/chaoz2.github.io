#!/bin/sh
# Stamp styles.css / main.js links in index.html with a short content hash,
# so browsers never pair a fresh index.html with stale cached assets.
set -e
cd "$(dirname "$0")/.."
css=$(shasum styles.css | cut -c1-8)
js=$(shasum main.js | cut -c1-8)
sed -i '' -E "s#href=\"styles\.css(\?v=[a-f0-9]+)?\"#href=\"styles.css?v=$css\"#; s#src=\"main\.js(\?v=[a-f0-9]+)?\"#src=\"main.js?v=$js\"#" index.html
echo "styles.css?v=$css  main.js?v=$js"
