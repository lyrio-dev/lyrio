export interface MigrationConfig {
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  uploads: string;
}
