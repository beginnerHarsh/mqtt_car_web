/**
 * AWS SigV4 WebSocket URL Signer using Native Web Crypto API (crypto.subtle)
 * Zero external npm dependencies required. Works natively in all modern browsers.
 */

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  iotEndpoint: string; // e.g. "a1b2c3d4e5f6g7-ats.iot.us-east-1.amazonaws.com"
}

// SHA-256 hash of an empty string (standard for AWS SigV4 GET requests)
const EMPTY_STRING_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Convert ArrayBuffer to Hex String
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Perform SHA-256 hash on a string using SubtleCrypto
 */
async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Perform HMAC-SHA256 signing using SubtleCrypto
 */
async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

/**
 * Generate AWS SigV4 Derived Signing Key
 */
async function getSigningKey(
  secretAccessKey: string,
  date: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kSecret = encoder.encode('AWS4' + secretAccessKey);
  const kDate = await hmacSha256(kSecret, date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

/**
 * Sign AWS IoT Core WebSocket URL with SigV4
 */
export async function generateSignedIotWebsocketUrl(credentials: AWSCredentials): Promise<string> {
  const { accessKeyId, secretAccessKey, sessionToken, region, iotEndpoint } = credentials;

  // Clean host (remove wss:// or https:// if included by mistake)
  const host = iotEndpoint.replace(/^(wss:\/\/|https:\/\/)/, '').replace(/\/.*$/, '');
  const service = 'iotdevicegateway';

  // Format ISO 8601 timestamps
  const now = new Date();
  const datetime = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // e.g. 20260721T162000Z
  const date = datetime.substring(0, 8); // e.g. 20260721

  const credentialScope = `${date}/${region}/${service}/aws4_request`;

  // Build Query Parameters (Must be alphabetically sorted)
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': datetime,
    'X-Amz-SignedHeaders': 'host',
  };

  if (sessionToken) {
    queryParams['X-Amz-Security-Token'] = sessionToken;
  }

  // URI Encode and Join Query String
  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  const canonicalHeaders = `host:${host.toLowerCase()}\n`;
  const signedHeaders = 'host';

  // Step 1: Canonical Request
  const canonicalRequest = [
    'GET',
    '/mqtt',
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    EMPTY_STRING_SHA256,
  ].join('\n');

  // Step 2: String to Sign
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  // Step 3: Signature Calculation
  const signingKey = await getSigningKey(secretAccessKey, date, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = bufferToHex(signatureBuffer);

  // Final WebSocket URL
  return `wss://${host}/mqtt?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
