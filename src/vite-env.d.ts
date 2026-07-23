/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MQTT_ENDPOINT: string;
  readonly VITE_MQTT_TOPIC: string;
  readonly VITE_REGION: string;
  readonly VITE_SIMULATOR: string;
  readonly VITE_AWS_ACCESS_KEY_ID: string;
  readonly VITE_AWS_SECRET_ACCESS_KEY: string;
  readonly VITE_AWS_SESSION_TOKEN: string;
  readonly VITE_AWS_COGNITO_IDENTITY_POOL_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
