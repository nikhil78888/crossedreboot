# Database

This package is for development purpose only. It is not used to connect to database by apps.

It is used to manage database migrations using prisma.

## Usage

1. Make schema changes in `primsa/schema.prisma` file
2. Run `yarn db:migrate:dev` - This will test the changes against shadow database and generate migration file.
3. Run `yarn db:migrate:deploy` - This will apply the changes to the application database.
