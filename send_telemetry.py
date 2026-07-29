import os
import sys
import time
import math
import json
import random
import hmac
import hashlib
import datetime
import urllib.parse
import paho.mqtt.client as mqtt

# Load .env file (try python-dotenv, fallback to manual parsing)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                parts = line.split('=', 1)
                if len(parts) == 2:
                    os.environ[parts[0].strip()] = parts[1].strip().strip('"').strip("'")

# Fetch configuration
ENDPOINT = os.getenv('VITE_MQTT_ENDPOINT')
AWS_ACCESS_KEY = os.getenv('VITE_AWS_ACCESS_KEY_ID')
AWS_SECRET_KEY = os.getenv('VITE_AWS_SECRET_ACCESS_KEY')
AWS_SESSION_TOKEN = os.getenv('VITE_AWS_SESSION_TOKEN', '')
REGION = os.getenv('VITE_REGION', 'us-east-1')
TOPIC_TEMPLATE = os.getenv('VITE_MQTT_TOPIC', 'car/+/location')

# Real-World Geographic Waypoint Routes for 5 Farm Machinery units across Punjab / North India
VEHICLE_ROUTES = {
    "T_1": [
        (30.733320, 76.779400), # Farm Machinery 1 - Chandigarh Sector 17
        (30.738000, 76.782500), # Rose Garden
        (30.742000, 76.786000), # Rock Garden
        (30.744500, 76.788500), # Sukhna Lake
        (30.740000, 76.785000), # Secretariat Road
        (30.733320, 76.779400), # Loop back
    ],
    "T_2": [
        (30.901000, 75.857300), # Farm Machinery 2 - Ludhiana Ferozepur Road
        (30.903500, 75.815000), # PAU Campus Gate 1
        (30.906000, 75.808000), # PAU Agri Experimental Fields
        (30.910000, 75.812000), # Sidhwan Canal Road
        (30.906500, 75.845000), # Aarti Chowk
        (30.901000, 75.857300), # Loop back
    ],
    "T_3": [
        (30.704600, 76.717900), # Farm Machinery 3 - Mohali Phase 7 Market
        (30.697000, 76.731000), # PCA Cricket Stadium Mohali
        (30.678000, 76.735000), # IT City Expressway
        (30.665000, 76.722000), # Aerocity Boulevard
        (30.688000, 76.705000), # Fortis Hospital Chowk
        (30.704600, 76.717900), # Loop back
    ],
    "T_4": [
        (31.530300, 75.911500), # Farm Machinery 4 - Hoshiarpur City Centre
        (31.535000, 75.920000), # GT Road Bypass Junction
        (31.542000, 75.931000), # Sonalika Tractor Manufacturing Complex
        (31.548000, 75.925000), # Hoshiarpur Industrial Estate
        (31.538000, 75.905000), # Phagwara Highway Link
        (31.530300, 75.911500), # Loop back
    ],
    "T_5": [
        (31.634000, 74.872300), # Farm Machinery 5 - Amritsar Heritage Street
        (31.620000, 74.876500), # Golden Temple Peripheral Ring
        (31.628000, 74.890000), # GT Road Junction
        (31.645000, 74.885000), # Ranjit Avenue
        (31.640000, 74.865000), # Court Road
        (31.634000, 74.872300), # Loop back
    ],
    "T_10": [
        (30.958060, 76.520890), # Farm Machinery 10 - Chhoti Haveli, Rupnagar, Punjab
    ],
}

DEVICE_IDS = list(VEHICLE_ROUTES.keys())

# Math helpers
def calculate_distance_meters(lat1, lng1, lat2, lng2):
    R = 6371e3  # Earth radius in meters
    rad_lat1 = lat1 * math.pi / 180
    rad_lat2 = lat2 * math.pi / 180
    delta_lat = (lat2 - lat1) * math.pi / 180
    delta_lng = (lng2 - lng1) * math.pi / 180

    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(rad_lat1) * math.cos(rad_lat2) * (math.sin(delta_lng / 2) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_bearing(lat1, lng1, lat2, lng2):
    rad_lat1 = lat1 * math.pi / 180
    rad_lat2 = lat2 * math.pi / 180
    delta_lng = (lng2 - lng1) * math.pi / 180

    y = math.sin(delta_lng) * math.cos(rad_lat2)
    x = (math.cos(rad_lat1) * math.sin(rad_lat2) -
         math.sin(rad_lat1) * math.cos(rad_lat2) * math.cos(delta_lng))

    bearing_rad = math.atan2(y, x)
    bearing_deg = bearing_rad * 180 / math.pi
    return (bearing_deg + 360) % 360

# SigV4 helpers
def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def get_signature_key(key, date_stamp, region_name, service_name):
    k_date = sign(('AWS4' + key).encode('utf-8'), date_stamp)
    k_region = sign(k_date, region_name)
    k_service = sign(k_region, service_name)
    k_signing = sign(k_service, 'aws4_request')
    return k_signing

def generate_signed_url(endpoint, region, access_key, secret_key, session_token=''):
    host = endpoint.lower()
    service = 'iotdevicegateway'
    
    t = datetime.datetime.now(datetime.timezone.utc)
    amz_date = t.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = t.strftime('%Y%m%d')
    
    canonical_uri = '/mqtt'
    
    # Query parameters (must be sorted alphabetically)
    params = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': f"{access_key}/{date_stamp}/{region}/{service}/aws4_request",
        'X-Amz-Date': amz_date,
        'X-Amz-SignedHeaders': 'host',
    }
    if session_token:
        params['X-Amz-Security-Token'] = session_token
        
    canonical_querystring = urllib.parse.urlencode(sorted(params.items()), quote_via=urllib.parse.quote)
    
    canonical_headers = f"host:{host}\n"
    signed_headers = 'host'
    payload_hash = hashlib.sha256(''.encode('utf-8')).hexdigest()
    
    canonical_request = '\n'.join([
        'GET',
        canonical_uri,
        canonical_querystring,
        canonical_headers,
        signed_headers,
        payload_hash
    ])
    
    credential_scope = f"{date_stamp}/{region}/{service}/aws4_request"
    string_to_sign = '\n'.join([
        'AWS4-HMAC-SHA256',
        amz_date,
        credential_scope,
        hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
    ])
    
    signing_key = get_signature_key(secret_key, date_stamp, region, service)
    signature = hmac.new(signing_key, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
    
    signed_url = f"wss://{host}{canonical_uri}?{canonical_querystring}&X-Amz-Signature={signature}"
    return signed_url

def main():
    if not ENDPOINT or not AWS_ACCESS_KEY or not AWS_SECRET_KEY:
        print("Error: Missing AWS configuration in .env file.")
        print("Ensure VITE_MQTT_ENDPOINT, VITE_AWS_ACCESS_KEY_ID, and VITE_AWS_SECRET_ACCESS_KEY are set.")
        sys.exit(1)

    print("AWS Configuration:")
    print(f"  Endpoint: {ENDPOINT}")
    print(f"  Region:   {REGION}")
    print(f"  Topic Template: {TOPIC_TEMPLATE}")
    print(f"  Access Key: {AWS_ACCESS_KEY[:8]}... (hidden)")
    
    print("\nGenerating AWS SigV4 signed WebSocket URL...")
    try:
        signed_url = generate_signed_url(ENDPOINT, REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_SESSION_TOKEN)
        parsed_url = urllib.parse.urlparse(signed_url)
        ws_path = f"{parsed_url.path}?{parsed_url.query}"
    except Exception as e:
        print(f"Failed to generate signed URL: {e}")
        sys.exit(1)

    print("Connecting to AWS IoT Core via WebSockets (paho-mqtt)...")
    client_id = f"python_publisher_{random.randint(1000, 9999)}"
    
    try:
        from paho.mqtt.enums import CallbackAPIVersion
        client = mqtt.Client(CallbackAPIVersion.VERSION2, client_id=client_id, transport="websockets")
    except ImportError:
        client = mqtt.Client(client_id=client_id, transport="websockets")

    client.ws_set_options(path=ws_path)
    client.tls_set()  # Enables SSL/TLS

    connected = False
    
    def on_connect(c, userdata, flags, rc, properties=None):
        nonlocal connected
        rc_val = getattr(rc, 'value', rc)
        if rc_val == 0:
            print("Connected successfully!")
            connected = True
        else:
            print(f"Connection failed with code/reason: {rc}")

    client.on_connect = on_connect

    try:
        client.connect(ENDPOINT, 443, keepalive=60)
        client.loop_start()
    except Exception as e:
        print(f"Failed to initiate connection: {e}")
        sys.exit(1)

    # Wait for connection flag
    timeout = 10
    start_time = time.time()
    while not connected and (time.time() - start_time) < timeout:
        time.sleep(0.1)

    if not connected:
        print("Error: Connection timed out.")
        client.loop_stop()
        sys.exit(1)

    # Simulation variables: Transmit telemetry for device T_10 at 1 minute interval (60 seconds)
    vehicles_state = [
        {"deviceId": "T_10", "lat": 30.95806, "lng": 76.52089},
    ]
    update_interval_sec = 60.0

    print(f"\nStarting live telemetry transmission for device 'T_10' at (30.95806, 76.52089) every 60 seconds on topic '{TOPIC_TEMPLATE}'...")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            for veh in vehicles_state:
                device_id = veh["deviceId"]
                lat = veh["lat"]
                lng = veh["lng"]

                payload = {
                    "Device_ID": device_id,
                    "Timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "Latitude": f"{lat:.5f}",
                    "Longitude": f"{lng:.5f}",
                    "BatteryVoltage": "3.7"
                }

                payload_str = json.dumps(payload)
                topic = TOPIC_TEMPLATE.replace('+', device_id)
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Publishing [{device_id}]: {payload_str}")

                client.publish(
                    topic=topic,
                    payload=payload_str,
                    qos=0
                )

            time.sleep(update_interval_sec)

    except KeyboardInterrupt:
        print("\nStopping telemetry generator...")
    finally:
        client.loop_stop()
        client.disconnect()
        print("Disconnected.")

if __name__ == '__main__':
    main()
