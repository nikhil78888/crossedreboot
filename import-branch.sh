#!/bin/sh
#
# Merges a branch from another repository into this repository,
# putting it under a directory.
#
# Example to bring main from widget-api into the api folder:
#
# import-branch \
#   git@github.com:example/widget-api.git develop \
#   api
#
# If the directory is omitted, the rewrite step will be skipped, importing
# into the root directory of this repository instead.

if [ -z "$2" ]
then
    echo usage: $0 REMOTE_URL BRANCH [DIRECTORY]
    exit 1
fi

cleanup() {
    [ -z "${clone}" ] || rm -rf "${clone}"
    [ -z "${remote_name}" ] || git remote remove "${remote_name}"
}
trap cleanup EXIT

set -ex

remote_url="$1"
branch="$2"
directory="$3"

clone=$(mktemp -d)
git clone "$1" "${clone}"

pushd "${clone}"
git checkout "${branch}"
commit="$(git rev-parse --short HEAD)"
[ -z "${directory}" ] || git filter-repo --to-subdirectory-filter "${directory}" --force

popd
remote_name="$(uuidgen)"
git remote add "${remote_name}" "${clone}"
git fetch "${remote_name}"

[ -z "${directory}" ] || directory_message=" into ${directory}"
git merge -m "imported ${commit}@${remote_url}/${branch}${directory_message}" "${remote_name}/${branch}" --allow-unrelated-histories

# Copyright (c) 2023 Mattie Behrens
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.