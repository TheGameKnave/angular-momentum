import * as dotenv from 'dotenv';
dotenv.config({ debug: false, quiet: true });

/**
 * Configuration interface for environment variables
 * @property server_port - Port number for the server to listen on
 * @property supabase_url - Supabase project URL
 * @property supabase_service_key - Supabase service role key (for server-side operations)
 */
interface Config {
  server_port: string | undefined;
  supabase_url: string | undefined;
  supabase_service_key: string | undefined;
}

/**
 * Application configuration object populated from environment variables
 * @description Loads configuration from .env file using dotenv
 */
const config: Config = {
  // API_PORT for the API server (default 4201 for SSR proxy compatibility)
  server_port: process.env.API_PORT || /* istanbul ignore next - fallback literal for environments without API_PORT; no logic to test */ '4201',
  supabase_url: process.env.SUPABASE_URL,
  supabase_service_key: process.env.SUPABASE_SERVICE_KEY,
};

export default config;