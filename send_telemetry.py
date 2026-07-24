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

# Predefined closed loop route waypoints around Chandigarh city center
SIMULATOR_WAYPOINTS = [
    (30.733320, 76.779400),
    (30.734500, 76.782000),
    (30.737000, 76.784500),
    (30.740500, 76.785000),
    (30.744000, 76.782500),
    (30.746500, 76.778000),
    (30.748000, 76.772500),
    (30.746000, 76.767000),
    (30.742000, 76.764000),
    (30.737500, 76.763500),
    (30.734000, 76.766000),
    (30.731500, 76.770500),
    (30.730500, 76.775000),
    (30.733320, 76.779400), # Closes loop
]

DEVICE_IDS = ['MAHINDRA', 'JOHN_DEERE', 'SWARAJ', 'SONALIKA', 'FARMTRAC']

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
        # In paho-mqtt v2, rc is a ReasonCode object. In v1, it's an integer.
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

    # Simulation variables for 5 field tractors
    vehicles_state = [
        {"deviceId": "MAHINDRA", "wp_idx": 0, "progress": 0.0, "base_speed": 22},
        {"deviceId": "JOHN_DEERE", "wp_idx": 2, "progress": 0.2, "base_speed": 26},
        {"deviceId": "SWARAJ", "wp_idx": 5, "progress": 0.4, "base_speed": 18},
        {"deviceId": "SONALIKA", "wp_idx": 8, "progress": 0.1, "base_speed": 30},
        {"deviceId": "FARMTRAC", "wp_idx": 11, "progress": 0.5, "base_speed": 20},
    ]
    update_interval_sec = 1.0

    print(f"\nStarting telemetry transmission for 5 tractors on topic template '{TOPIC_TEMPLATE}'...")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            for veh in vehicles_state:
                device_id = veh["deviceId"]
                current_wp_idx = veh["wp_idx"]
                segment_progress = veh["progress"]
                base_speed_kmh = veh["base_speed"]

                # Route logic
                current_wp = SIMULATOR_WAYPOINTS[current_wp_idx]
                next_wp_idx = (current_wp_idx + 1) % len(SIMULATOR_WAYPOINTS)
                next_wp = SIMULATOR_WAYPOINTS[next_wp_idx]

                distance_m = calculate_distance_meters(
                    current_wp[0], current_wp[1],
                    next_wp[0], next_wp[1]
                )
                heading = calculate_bearing(
                    current_wp[0], current_wp[1],
                    next_wp[0], next_wp[1]
                )

                speed_ms = (base_speed_kmh * 1000.0) / 3600.0
                step_fraction = speed_ms / max(distance_m, 10.0)

                segment_progress += step_fraction

                if segment_progress >= 1.0:
                    segment_progress = 0.0
                    current_wp_idx = next_wp_idx

                # Save updated state
                veh["wp_idx"] = current_wp_idx
                veh["progress"] = segment_progress

                wp_a = SIMULATOR_WAYPOINTS[current_wp_idx]
                wp_b = SIMULATOR_WAYPOINTS[(current_wp_idx + 1) % len(SIMULATOR_WAYPOINTS)]

                lat = wp_a[0] + (wp_b[0] - wp_a[0]) * segment_progress
                lng = wp_a[1] + (wp_b[1] - wp_a[1]) * segment_progress

                speed_noise = (random.random() - 0.5) * 4
                current_speed = max(5, int(base_speed_kmh + speed_noise))

                # Construct Telemetry Payload (Matching the real GPS device structure)
                # 5% chance of empty coords to verify robust Lambda & Frontend fallbacks
                test_empty = random.random() < 0.05
                lat_str = "" if test_empty else f"{lat:.6f}"
                lng_str = "" if test_empty else f"{lng:.6f}"

                payload = {
                    "Device_ID": device_id,
                    "Timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "Latitude": lat_str,
                    "Longitude": lng_str,
                    "RunningTime": str(int(segment_progress * 100)),
                    "RunningStatus": "On" if current_speed > 0 else "Off"
                }

                payload_str = json.dumps(payload)
                topic = TOPIC_TEMPLATE.replace('+', device_id)
                print(f"Publishing [{device_id}]: {payload_str}")

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
