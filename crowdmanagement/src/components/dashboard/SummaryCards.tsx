interface SummaryCardsProps {
  liveOccupancy: number | null;
  todayFootfall: number | null;
  avgDwellTime: number | null;
}

export function SummaryCards({
  liveOccupancy,
  todayFootfall,
  avgDwellTime,
}: SummaryCardsProps) {
  const formatDwellTime = (minutes: number | null): string => {
    if (minutes === null) return "N/A";
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}min ${String(secs).padStart(
      2,
      "0"
    )}sec`;
  };

  // Mock trend data - in real app, this would come from API comparing with yesterday
  // For now, we'll show positive trends as examples
  const getTrend = (
    value: number | null
  ): { direction: "up" | "down"; percentage: number } | null => {
    if (value === null) return null;
    // Mock: positive trend for occupancy and dwell time, negative for footfall
    if (value === liveOccupancy) {
      return { direction: "up", percentage: 10 };
    }
    if (value === todayFootfall) {
      return { direction: "down", percentage: 10 };
    }
    if (value === avgDwellTime) {
      return { direction: "up", percentage: 6 };
    }
    return null;
  };

  const TrendIndicator = ({
    trend,
  }: {
    trend: { direction: "up" | "down"; percentage: number } | null;
  }) => {
    if (!trend) return null;
    const isUp = trend.direction === "up";
    return (
      <div className={`trend-indicator ${isUp ? "trend-up" : "trend-down"}`}>
        <span className="trend-arrow"></span>
        <span className="trend-text">
          {trend.percentage}% {isUp ? "more" : "less"} than yesterday
        </span>
      </div>
    );
  };

  const formatDwellTimeDisplay = (minutes: number | null): string => {
    if (minutes === null) return "N/A";
    return `${minutes.toFixed(2)} min`;
  };

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div className="card-content">
          <h3>Live Occupancy</h3>
          <p className="card-value">
            {liveOccupancy !== null ? liveOccupancy.toLocaleString() : "N/A"}
          </p>
          <TrendIndicator trend={getTrend(liveOccupancy)} />
        </div>
      </div>

      <div className="summary-card">
        <div className="card-content">
          <h3>Today's Footfall</h3>
          <p className="card-value">
            {todayFootfall !== null ? todayFootfall.toLocaleString() : "N/A"}
          </p>
          <TrendIndicator trend={getTrend(todayFootfall)} />
        </div>
      </div>

      <div className="summary-card">
        <div className="card-content">
          <h3>Avg Dwell Time</h3>
          <p className="card-value">{formatDwellTimeDisplay(avgDwellTime)}</p>
          <TrendIndicator trend={getTrend(avgDwellTime)} />
        </div>
      </div>
    </div>
  );
}
