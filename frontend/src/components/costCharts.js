export function renderCostChart(canvasId, data) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;

  if (window.costChart) {
    window.costChart.destroy();
  }

  window.costChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Cost ($)',
        data: data.values,
        borderColor: '#1a472a',
        backgroundColor: 'rgba(26, 71, 42, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });

  return window.costChart;
}

export function prepareCostData(updates) {
  // Group updates by month
  const monthlyCosts = {};
  
  updates.forEach(update => {
    const date = new Date(update.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    
    if (!monthlyCosts[monthKey]) {
      monthlyCosts[monthKey] = {
        label: monthLabel,
        total: 0
      };
    }
    
    monthlyCosts[monthKey].total += parseFloat(update.cost || 0);
  });

  // Sort by date
  const sortedMonths = Object.keys(monthlyCosts).sort();
  
  return {
    labels: sortedMonths.map(key => monthlyCosts[key].label),
    values: sortedMonths.map(key => monthlyCosts[key].total)
  };
}
