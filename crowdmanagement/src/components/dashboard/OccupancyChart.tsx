import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
// OccupancyChart now receives transformed data with timestamp and occupancy
import { format } from "date-fns";

interface OccupancyChartProps {
  data: { timestamp: string; occupancy: number }[];
  liveOccupancy: number | null;
}

export function OccupancyChart({ data, liveOccupancy }: OccupancyChartProps) {
  // Safety check for empty data
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="chart-no-data">No occupancy data available</div>;
  }

  // Transform data for chart with safety checks
  const chartData = data
    .filter(
      (point) =>
        point &&
        point.timestamp &&
        typeof point.occupancy === "number" &&
        !isNaN(point.occupancy)
    )
    .map((point) => {
      try {
        return {
          time: format(new Date(point.timestamp), "HH:mm"),
          timestamp: point.timestamp,
          occupancy: point.occupancy,
        };
      } catch (error) {
        console.warn("Invalid timestamp in occupancy data:", point.timestamp);
        return null;
      }
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);

  // Add current live occupancy if available and not already in data
  const hasRecentData = chartData.length > 0;
  const lastDataPoint = chartData[chartData.length - 1];
  const shouldAddLivePoint =
    liveOccupancy !== null &&
    typeof liveOccupancy === "number" &&
    !isNaN(liveOccupancy) &&
    hasRecentData &&
    lastDataPoint &&
    lastDataPoint.timestamp &&
    Math.abs(new Date(lastDataPoint.timestamp).getTime() - Date.now()) > 60000; // More than 1 min old

  if (shouldAddLivePoint && liveOccupancy !== null) {
    chartData.push({
      time: "Now",
      timestamp: new Date().toISOString(),
      occupancy: liveOccupancy,
    });
  }

  if (chartData.length === 0) {
    return (
      <div className="chart-no-data">No valid occupancy data available</div>
    );
  }

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            label={{ value: "Time", position: "insideBottom", offset: -5 }}
            stroke="#666"
          />
          <YAxis
            label={{ value: "Count", angle: -90, position: "insideLeft" }}
            stroke="#666"
          />
          <Tooltip
            labelFormatter={(value) => {
              if (!value) return "Unknown";
              const point = chartData.find((d) => d && d.time === value);
              if (point?.timestamp) {
                try {
                  return format(
                    new Date(point.timestamp),
                    "MMM dd, yyyy HH:mm"
                  );
                } catch (error) {
                  return value;
                }
              }
              return value;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="occupancy"
            stroke="#667eea"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Occupancy"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
