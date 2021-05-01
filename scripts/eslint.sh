DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
npx eslint --ext .mjs,.jsx,.js --ignore-path "${DIR}/../.gitignore" "${DIR}/../" "$@"
