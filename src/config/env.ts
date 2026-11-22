export type DataSourceMode = 'local' | 'rest' | 'supabase';

const metaEnv = (import.meta as any).env || {};

export const env = {
  dataSource: (metaEnv.VITE_DATA_SOURCE as DataSourceMode) || 'local',
  apiBaseUrl: (metaEnv.VITE_API_BASE_URL as string) || '/api',
  authEndpoint: (metaEnv.VITE_AUTH_ENDPOINT as string) || '',
  supabaseUrl: (metaEnv.VITE_SUPABASE_URL as string) || '',
  supabaseAnonKey: (metaEnv.VITE_SUPABASE_ANON_KEY as string) || '',
  appName: 'SunMedX',
};
