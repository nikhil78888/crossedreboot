# Crossed Turborepo

### Apps and Packages

- `api`: an [Express](https://expressjs.com/) server
- `admin`: a [Next.js](https://nextjs.org/) app
- `crossed`: an expo app
- `database`: prisma setup and migrations.
- `types-and-validators`: shared types and zod validators
- `crosswords`: package for generating crosswords

### Setup

- Install [Homebrew](https://brew.sh/)
- Install [asdf](https://asdf-vm.com/) with Homebrew
  - Install dependencies - `brew install coreutils curl git`
  - Download asdf - `brew install asdf`
  - Install asdf - `echo -e "\n. $(brew --prefix asdf)/libexec/asdf.sh" >> ${ZDOTDIR:-~}/.zshrc`
- Install `nodejs` with `asdf`
  - Install plugin dependencies - `brew install gpg gawk`
  - Install plugin - `asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git`
  - Install node - `asdf install nodejs 18.15.0`
- Install `ruby` with `asdf`
  - Install plugin - `asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git`
  - Install ruby - `asdf install ruby 3.1.0`
- Install `cocoapods` - `gem install cocoapods`

### Environment Variables

Refer to `.env.example` in each of the directories to setup environment variables.

### Running locally

#### Running api and admin

Run `yarn dev` in project root

#### Running the app

1. `cd apps/crossed`
2. `yarn ios`
