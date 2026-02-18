set -e

version=${VERSION-}
if [ -z ${version} ]; then
  echo "Need to have a version"
  exit 1
fi

version=${version:1}
echo "Using Version: ${version}"

# Sed -i doesn't work on mac unless you add the extension for fallback.
sed -i.bak "s/VERSION/${version}/g" package.json
rm package.json.bak