export default () => ({
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://platform:platform@localhost:5432/platform_db',
});
