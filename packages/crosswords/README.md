# Crosswords Generation Package

This package contains the scripts for generating crosswords.

## Setup

For crossword generation, we need a local supabase instance for storing huge number of words. We store these locally, because these words are not relevant to the application until they have been used to generate a crossword.

1. Download and install [Docker](https://docs.docker.com/desktop/install/mac-install/)
2. Start Docker

### Local Supabase setup

1. `npx supabase init --workingDir .`
2. `npx supabase start`
3. Copy the connection params from the terminal and paste them in `src/local-supabase-client.ts`

### Loading words

1. Run `yarn load-words`
2. Run `yarn load-xd-words`

These scripts take a lot of time to run. They store open ai embeddings of words into our local supabase instance.

## Generating Crosswords

Run `yarn create-crossword`
