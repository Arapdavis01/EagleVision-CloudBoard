export function renderProjectHealthScore(score) {
  let healthLevel, healthColor, healthIcon;
  
  if (score >= 80) {
    healthLevel = 'Excellent';
    healthColor = '#10b981';
    healthIcon = 'fa-check-circle';
  } else if (score >= 60) {
    healthLevel = 'Good';
    healthColor = '#3b82f6';
    healthIcon = 'fa-thumbs-up';
  } else if (score >= 40) {
    healthLevel = 'Fair';
    healthColor = '#f59e0b';
    healthIcon = 'fa-exclamation-triangle';
  } else {
    healthLevel = 'Poor';
    healthColor = '#ef4444';
    healthIcon = 'fa-times-circle';
  }

  return `
    <div class="health-score-container">
      <div class="health-score-ring" style="background: conic-gradient(${healthColor} ${score}%, #e2e8f0 ${score}%);">
        <div class="health-score-inner">
          <span class="health-score-value" style="color: ${healthColor};">${score}%</span>
        </div>
      </div>
      <div class="health-score-info">
        <div class="health-score-label">
          <i class="fas ${healthIcon}" style="color: ${healthColor};"></i>
          <strong>${healthLevel}</strong>
        </div>
        <p>Project Health Score</p>
      </div>
    </div>
  `;
}

export function calculateHealthScore(metrics) {
  const {
    totalUpdates,
    overdueCount,
    avgUpdateInterval,
    costVariance,
    hasRecentUpdate
  } = metrics;

  let score = 100;

  // Deduct for overdue items
  if (overdueCount > 0) {
    score -= Math.min(overdueCount * 10, 30);
  }

  // Deduct for infrequent updates
  if (avgUpdateInterval > 30) {
    score -= 15;
  } else if (avgUpdateInterval > 60) {
    score -= 30;
  }

  // Deduct for cost overruns
  if (costVariance > 0) {
    score -= Math.min(costVariance * 2, 20);
  }

  // Bonus for recent activity
  if (hasRecentUpdate) {
    score += 5;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}
