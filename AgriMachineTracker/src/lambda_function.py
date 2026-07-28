import json
import boto3
import math
from decimal import Decimal
from datetime import datetime

TABLE_NAME = "AgriMachine_Tracker_Data"
STATS_TABLE_NAME = "AgriMachine_Stats_Summary"

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)
stats_table = dynamodb.Table(STATS_TABLE_NAME)


def decimal_converter(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: decimal_converter(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [decimal_converter(v) for v in obj]
    return obj


def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    try:
        # Earth's radius in meters
        R = 6371000.0

        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        delta_phi = math.radians(float(lat2) - float(lat1))
        delta_lambda = math.radians(float(lon2) - float(lon1))

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2.0) ** 2

        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c
    except Exception as e:
        print(f"Error calculating distance: {e}")
        return 0.0


def lambda_handler(event, context):
    try:
        print(f"Received event: {json.dumps(event)}")
        # IoT Core may send event as dict or JSON string
        if isinstance(event, str):
            payload = json.loads(event)
        else:
            payload = event

        # Safely extract fields from the final MQTT payload
        device_id = payload.get("Device_ID") or payload.get("deviceId")
        timestamp_raw = payload.get("Timestamp") or payload.get("timestamp")
        start_time = payload.get("StartTime") or payload.get("startTime") or timestamp_raw
        latitude_raw = payload.get("Latitude") or payload.get("lat")
        longitude_raw = payload.get("Longitude") or payload.get("lng")
        battery_voltage_raw = payload.get("BatteryVoltage") or payload.get("batteryVoltage")

        if not device_id or timestamp_raw is None:
            raise KeyError("Payload must contain device ID and timestamp")

        # Map friendly name for logging (e.g., T_1 -> Farm Machinery 1)
        friendly_name = device_id
        if str(device_id).startswith("T_") or str(device_id).startswith("T-"):
            num = str(device_id)[2:]
            friendly_name = f"Farm Machinery {num}"
        print(f"Processing telemetry for {device_id} ({friendly_name})")

        # Parse timestamp (can be epoch numeric or formatted YYYY-MM-DD HH:MM:SS / ISO string)
        try:
            timestamp = float(timestamp_raw)
        except (ValueError, TypeError):
            try:
                ts_str = str(timestamp_raw).strip().replace('T', ' ')
                dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                timestamp = dt.timestamp()
            except Exception as e:
                raise ValueError(f"Could not parse timestamp: {timestamp_raw}. Error: {e}")

        # Parse latitude and longitude (float conversion)
        latitude = None
        longitude = None
        if latitude_raw is not None and str(latitude_raw).strip() != "":
            try:
                latitude = float(latitude_raw)
            except ValueError:
                pass
        if longitude_raw is not None and str(longitude_raw).strip() != "":
            try:
                longitude = float(longitude_raw)
            except ValueError:
                pass

        # Load existing summary stats if available
        try:
            stats_response = stats_table.get_item(Key={"Device_ID": device_id})
            stats_item = stats_response.get("Item")
        except Exception as err:
            print(f"Error fetching stats for {device_id}: {err}")
            stats_item = None

        # Fallback to last known position if current coords are empty strings
        if latitude is None or longitude is None:
            if stats_item:
                if latitude is None and stats_item.get("Last_Latitude") is not None:
                    latitude = float(stats_item.get("Last_Latitude"))
                if longitude is None and stats_item.get("Last_Longitude") is not None:
                    longitude = float(stats_item.get("Last_Longitude"))
            
            # Default fallback if still None
            if latitude is None:
                latitude = 30.73332
            if longitude is None:
                longitude = 76.7794

        # Parse Battery Voltage
        battery_voltage = str(battery_voltage_raw).strip() if battery_voltage_raw is not None else None

        # 1. Save exact raw payload to AgriMachine_Tracker_Data table without timestamp conversion
        item = dict(payload)
        item["Device_ID"] = str(device_id)
        item["Timestamp"] = str(timestamp_raw) # Preserve raw human timestamp string from payload
        if latitude is not None:
            item["Latitude"] = Decimal(str(latitude))
        if longitude is not None:
            item["Longitude"] = Decimal(str(longitude))
        if battery_voltage is not None:
            item["BatteryVoltage"] = str(battery_voltage)

        item = decimal_converter(item)
        table.put_item(Item=item)

        # 2. Update real-time summary statistics
        speed = 0.0
        if stats_item:
            # Extract previous state
            total_distance = float(stats_item.get("Total_Distance", 0.0))
            active_duration = float(stats_item.get("Active_Duration", 0.0))
            idle_duration = float(stats_item.get("Idle_Duration", 0.0))
            last_lat = float(stats_item.get("Last_Latitude")) if stats_item.get("Last_Latitude") is not None else None
            last_lng = float(stats_item.get("Last_Longitude")) if stats_item.get("Last_Longitude") is not None else None
            last_timestamp = float(stats_item.get("Last_Timestamp")) if stats_item.get("Last_Timestamp") is not None else None

            # Calculate time difference
            delta_t = timestamp - last_timestamp if last_timestamp is not None else 0.0

            # Calculate distance difference
            delta_d = 0.0
            if last_lat is not None and last_lng is not None:
                delta_d = calculate_haversine_distance(last_lat, last_lng, latitude, longitude)

            # Auto calculate speed from displacement
            if delta_t > 0:
                speed = (delta_d / delta_t) * 3.6

            # Determine activity state (active if vehicle moved > 2 meters or speed > 2 km/h)
            is_active = (delta_d > 2.0 or speed > 2.0)

            # Update stats if delta_t is valid (e.g. positive and less than 1 hour)
            if 0 < delta_t < 3600:
                if is_active:
                    active_duration += delta_t
                    total_distance += delta_d
                else:
                    idle_duration += delta_t

            status = "moving" if is_active else "idle"
        else:
            # First time seeing this device
            total_distance = 0.0
            active_duration = 0.0
            idle_duration = 0.0
            status = "moving"

        # Save back updated summary stats
        new_stats = {
            "Device_ID": str(device_id),
            "Total_Distance": Decimal(str(round(total_distance, 4))),
            "Active_Duration": Decimal(str(round(active_duration, 2))),
            "Idle_Duration": Decimal(str(round(idle_duration, 2))),
            "Last_Latitude": Decimal(str(latitude)),
            "Last_Longitude": Decimal(str(longitude)),
            "Last_Timestamp": Decimal(str(round(timestamp, 2))),
            "Last_Status": str(status)
        }
        if battery_voltage is not None:
            new_stats["Last_BatteryVoltage"] = str(battery_voltage)

        new_stats = decimal_converter(new_stats)
        
        try:
            stats_table.put_item(Item=new_stats)
        except Exception as err:
            print(f"Error saving stats for {device_id}: {err}")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Data stored and statistics updated successfully"
            })
        }

    except Exception as e:
        print(f"Error in lambda_handler: {e}")
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": str(e)
            })
        }