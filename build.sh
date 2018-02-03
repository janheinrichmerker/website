#!/usr/bin/env bash

set -e # Halt script on error.


echo "Installing Ruby dependencies..."
bundle install
echo -e "\e[32mSuccessfully installed Ruby dependencies. \e[0m"
echo -e "\n"

if which bower &> /dev/null; then
  echo "Bower dependency management is already installed, updating it."
  npm update -g bower
else
  echo "Installing Bower dependency management..."
  npm install -g bower
fi
echo "Installing Bower dependencies..."
bower install
echo -e "\e[32mSuccessfully installed Bower dependencies. \e[0m"
echo -e "\n"


echo "Building static pages using Jekyll (minified for production use)..."
JEKYLL_ENV=production
bundle exec jekyll build --incremental | awk NF # `awk` will delete blank lines.
echo -e "\e[32mSuccessfully build all static pages, HTML was checked successfully. \e[0m"
echo -e "\n"
