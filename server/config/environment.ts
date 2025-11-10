import * as dotenv from 'dotenv';
dotenv.config({path: '../.env'});

/**
 * Configuration interface for environment variables
 * @property server_port - Port number for the server to listen on
 * @property server_id - Unique identifier for this server instance
 * @property data_key - Secret key for data encryption/authentication
 */
interface Config {
  server_port: string | undefined;
  server_id: string | undefined;
  data_key: string | undefined;
}

/**
 * Application configuration object populated from environment variables
 * @description Loads configuration from .env file using dotenv
 */
const config: Config = {
  server_port: process.env.PORT,
  server_id: process.env.SERVER_ID,
  data_key: process.env.DATA_KEY,
};

export default config;