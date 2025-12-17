import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import type { AnalyticsDemographicsResponse } from "../../types/api";
import { format } from "date-fns";

interface DemographicsChartProps {
  data: AnalyticsDemographicsResponse | null;
}

const MALE_COLOR = "#14b8a6"; // Teal
const FEMALE_COLOR = "#06b6d4"; // Light blue-green

export function DemographicsChart({ data }: DemographicsChartProps) {
  if (!data || !Array.isArray(data.buckets) || data.buckets.length === 0) {
    return <div className="chart-no-data">No demographics data available</div>;
  }

  // Calculate total from all buckets for pie chart
  const totalMale = data.buckets.reduce((sum: number, bucket: any) => {
    const male =
      typeof bucket.male === "number" && !isNaN(bucket.male) ? bucket.male : 0;
    return sum + male;
  }, 0);

  const totalFemale = data.buckets.reduce((sum: number, bucket: any) => {
    const female =
      typeof bucket.female === "number" && !isNaN(bucket.female)
        ? bucket.female
        : 0;
    return sum + female;
  }, 0);

  const total = totalMale + totalFemale;

  // Prepare pie/donut chart data
  const pieData = [
    {
      name: "Male",
      value: totalMale,
    },
    {
      name: "Female",
      value: totalFemale,
    },
  ].filter((item) => item && item.value > 0);

  // Prepare timeseries chart data from buckets
  const timeseriesData = data.buckets
    .filter((bucket: any) => bucket && bucket.utc)
    .map((bucket: any) => {
      let time = "";
      if (bucket.utc) {
        try {
          time = format(new Date(bucket.utc), "HH:mm");
        } catch (error) {
          console.warn(
            "Invalid UTC timestamp in demographics bucket:",
            bucket.utc
          );
          time = "";
        }
      }
      return {
        time,
        timestamp: bucket.utc ? new Date(bucket.utc).toISOString() : "",
        male:
          typeof bucket.male === "number" && !isNaN(bucket.male)
            ? bucket.male
            : 0,
        female:
          typeof bucket.female === "number" && !isNaN(bucket.female)
            ? bucket.female
            : 0,
      };
    })
    .filter((point: any) => point.time !== ""); // Remove points with invalid timestamps

  // Calculate percentages for donut chart
  const malePercent = total > 0 ? Math.round((totalMale / total) * 100) : 0;
  const femalePercent = total > 0 ? Math.round((totalFemale / total) * 100) : 0;

  return (
    <div className="demographics-container">
      {/* Left Panel: Donut Chart */}
      <div className="demographics-panel">
        <h3 className="demographics-panel-title">Chart of Demographics</h3>
        <div className="donut-chart-wrapper">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((entry, index) => {
                  const color =
                    entry.name === "Male"
                      ? MALE_COLOR
                      : entry.name === "Female"
                      ? FEMALE_COLOR
                      : "#9ca3af";
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <text
                x="50%"
                y="45%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="donut-center-text"
                style={{ fontSize: "14px", fontWeight: "600", fill: "#333" }}
              >
                Total Crowd
              </text>
              <text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="donut-center-text"
                style={{ fontSize: "18px", fontWeight: "700", fill: "#333" }}
              >
                100%
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="demographics-legend">
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: MALE_COLOR }}
            ></span>
            <span className="legend-label">Male {malePercent}%</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: FEMALE_COLOR }}
            ></span>
            <span className="legend-label">Female {femalePercent}%</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Timeseries Chart */}
      <div className="demographics-panel">
        <h3 className="demographics-panel-title">Demographics Analysis</h3>
        {timeseriesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={timeseriesData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorMale" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={MALE_COLOR} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={MALE_COLOR} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorFemale" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={FEMALE_COLOR}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={FEMALE_COLOR}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
                  const point = timeseriesData.find(
                    (d) => d && d.time === value
                  );
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
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="circle"
                formatter={(value) => (
                  <span
                    style={{
                      color: value === "Male" ? MALE_COLOR : FEMALE_COLOR,
                    }}
                  >
                    {value}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="male"
                stroke={MALE_COLOR}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMale)"
                name="Male"
              />
              <Area
                type="monotone"
                dataKey="female"
                stroke={FEMALE_COLOR}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorFemale)"
                name="Female"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-no-data" style={{ height: "300px" }}>
            No timeseries data available
          </div>
        )}
      </div>
    </div>
  );
}
