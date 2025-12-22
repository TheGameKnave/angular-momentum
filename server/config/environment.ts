import * as dotenv from 'dotenv';
dotenv.config({ debug: false, quiet: true });

/**
 * Configuration interface for environment variables
 * @property server_port - Port number for the server to listen on
 * @property server_id - Unique identifier for this server instance
 * @property data_key - Secret key for data encryption/authentication
 * @property supabase_url - Supabase project URL
 * @property supabase_service_key - Supabase service role key (for server-side operations)
 */
interface Config {
  server_port: string | undefined;
  server_id: string | undefined;
  data_key: string | undefined;
  turnstile_secret_key: string | undefined;
  supabase_url: string | undefined;
  supabase_service_key: string | undefined;
}

/**
 * Application configuration object populated from environment variables
 * @description Loads configuration from .env file using dotenv
 */
const config: Config = {
  // istanbul ignore next - API_PORT takes precedence for the API server (default 4201 for SSR proxy compatibility)
  server_port: process.env.API_PORT || '4201',
  server_id: process.env.SERVER_ID,
  data_key: process.env.DATA_KEY,
  turnstile_secret_key: process.env.TURNSTILE_SECRET_KEY,
  supabase_url: process.env.SUPABASE_URL,
  supabase_service_key: process.env.SUPABASE_SERVICE_KEY,
};

export default config;