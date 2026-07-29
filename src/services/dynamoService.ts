import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APP_CONFIG } from "../constants/config";

// Initialize DynamoDB Client
const client = new DynamoDBClient({
  region: APP_CONFIG.region,
  credentials: {
    accessKeyId: APP_CONFIG.awsAccessKeyId || "",
    secretAccessKey: APP_CONFIG.awsSecretAccessKey || "",
    sessionToken: APP_CONFIG.awsSessionToken || "",
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export interface VehicleStats {
  Device_ID: string;
  Total_Distance: number;   // cumulative distance in meters
  Active_Duration: number;  // movement duration in seconds
  Idle_Duration: number;    // stationary duration in seconds
  Last_Status: string;      // 'moving' or 'idle'
  Last_Latitude?: number;
  Last_Longitude?: number;
  Last_Location?: string;
  Last_Timestamp?: number;
}

/**
 * Fetch stats summary for a specific device from AgriMachine_Stats_Summary
 */
export async function fetchVehicleStats(deviceId: string): Promise<VehicleStats | null> {
  if (!APP_CONFIG.awsAccessKeyId || !APP_CONFIG.awsSecretAccessKey) {
    console.warn("[DynamoDB] AWS credentials missing in configuration. Skipping DynamoDB read.");
    return null;
  }
  
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: "AgriMachine_Stats_Summary",
        Key: { Device_ID: deviceId },
      })
    );
    
    return (response.Item as VehicleStats) || null;
  } catch (error) {
    console.error(`[DynamoDB] Error fetching summary stats for ${deviceId}:`, error);
    return null;
  }
}

/**
 * Fetch all vehicle summary stats from AgriMachine_Stats_Summary
 */
export async function fetchAllVehicleStats(): Promise<Record<string, VehicleStats>> {
  if (!APP_CONFIG.awsAccessKeyId || !APP_CONFIG.awsSecretAccessKey) {
    console.warn("[DynamoDB] AWS credentials missing. Skipping scan.");
    return {};
  }

  try {
    const response = await docClient.send(
      new ScanCommand({
        TableName: "AgriMachine_Stats_Summary",
      })
    );

    const statsMap: Record<string, VehicleStats> = {};
    if (response.Items) {
      response.Items.forEach((item: Record<string, any>) => {
        const stats = item as VehicleStats;
        if (stats.Device_ID) {
          statsMap[stats.Device_ID] = stats;
        }
      });
    }
    return statsMap;
  } catch (error) {
    console.error("[DynamoDB] Error scanning all vehicle stats:", error);
    return {};
  }
}

/**
 * Fetch raw telemetry coordinates history list for a specific device from AgriMachine_Tracker_Data
 * Sorted chronologically by Sort Key (Timestamp)
 */
export async function fetchVehicleRouteHistory(deviceId: string): Promise<[number, number][]> {
  if (!APP_CONFIG.awsAccessKeyId || !APP_CONFIG.awsSecretAccessKey) {
    console.warn("[DynamoDB] AWS credentials missing. Skipping route history read.");
    return [];
  }

  try {
    const response = await docClient.send(
      new QueryCommand({
        TableName: "AgriMachine_Tracker_Data",
        KeyConditionExpression: "Device_ID = :id",
        ExpressionAttributeValues: {
          ":id": deviceId,
        },
        ScanIndexForward: true, // sort ascending by sort key (Timestamp)
      })
    );

    if (response.Items && response.Items.length > 0) {
      // Map DynamoDB records to coordinate tuples [lat, lng]
      return response.Items.map((item: Record<string, any>) => [
        Number(item.Latitude),
        Number(item.Longitude),
      ]) as [number, number][];
    }
    return [];
  } catch (error) {
    console.error(`[DynamoDB] Error fetching route history for ${deviceId}:`, error);
    return [];
  }
}
