// Global variables
let allData = [];
const scriptUrl = 'https://script.google.com/macros/s/AKfycbx9QJSfl7Zcp5SfpDhZNSMPbHZdO1FuX9LcX804WGXjMTEbWoa0vtozMTQV7eIukpNiGw/exec'; // Hardcoded Apps Script URL
let currentGoal = 450000;
let salesChart = null;
let chartView = 'monthly'; // daily, weekly, monthly, yearly

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Set default to MTD on page load
    setDateRangePreset('mtd');
});

// Update period display
function updatePeriodDisplay(preset) {
    const periodElement = document.getElementById('currentPeriod');
    const today = new Date();
    const monthName = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    
    switch(preset) {
        case 'mtd':
            periodElement.textContent = `MTD for ${monthName} ${year}`;
            break;
        case 'ytd':
            periodElement.textContent = `YTD for ${year}`;
            break;
        case 'last7':
            periodElement.textContent = `Last 7 Days`;
            break;
        case 'last30':
            periodElement.textContent = `Last 30 Days`;
            break;
        case 'last90':
            periodElement.textContent = `Last 90 Days`;
            break;
        case 'custom':
            periodElement.textContent = `Custom Date Range`;
            break;
    }
}

// Update date range display
function updateDateRangeDisplay() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const startFormatted = start.toLocaleDateString('en-GB');
        const endFormatted = end.toLocaleDateString('en-GB');
        
        document.getElementById('dateRangeDisplay').textContent = `${startFormatted} - ${endFormatted}`;
    }
}

// Auto-detect best chart view based on date range
function autoDetectChartView() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        chartView = 'monthly';
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 14) {
        chartView = 'daily';
    } else if (daysDiff <= 90) {
        chartView = 'weekly';
    } else if (daysDiff <= 730) {
        chartView = 'monthly';
    } else {
        chartView = 'yearly';
    }
}

// Handle preset change
function handlePresetChange() {
    const preset = document.getElementById('dateRangePreset').value;
    setDateRangePreset(preset);
}

// Handle manual date change
function handleDateChange() {
    // When user manually changes dates, switch to "Custom Range"
    document.getElementById('dateRangePreset').value = 'custom';
    updatePeriodDisplay('custom');
    updateDateRangeDisplay();
    updateDashboard();
}

// Set date range based on preset
function setDateRangePreset(preset) {
    const today = new Date();
    let startDate, endDate;
    
    switch(preset) {
        case 'mtd':
            // Month to date
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
            break;
            
        case 'ytd':
            // Year to date
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today);
            break;
            
        case 'last7':
            // Last 7 days
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6); // 6 days ago + today = 7 days
            endDate = new Date(today);
            break;
            
        case 'last30':
            // Last 30 days
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 29); // 29 days ago + today = 30 days
            endDate = new Date(today);
            break;
            
        case 'last90':
            // Last 90 days
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 89); // 89 days ago + today = 90 days
            endDate = new Date(today);
            break;
            
        case 'custom':
            // Don't change dates for custom
            return;
    }
    
    // Format dates as YYYY-MM-DD for input fields
    document.getElementById('startDate').value = formatDateForInput(startDate);
    document.getElementById('endDate').value = formatDateForInput(endDate);
    
    // Update displays
    updatePeriodDisplay(preset);
    updateDateRangeDisplay();
    
    updateDashboard();
}

// Format date for input fields (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Load data from Apps Script
async function loadData() {
    try {
        const response = await fetch(scriptUrl);
        const result = await response.json();

        if (result.success) {
            allData = result.data;
            currentGoal = result.goal || 450000;
            document.getElementById('goalInput').value = currentGoal;
            updateDashboard();
        } else {
            alert('Error loading data: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load data. Check your Apps Script URL and deployment settings.');
    }
}

// Hard refresh - reload data from sheet
async function hardRefresh() {
    const button = event.target.closest('.refresh-btn');
    button.style.transform = 'rotate(360deg)';
    
    await loadData();
    
    setTimeout(() => {
        button.style.transform = 'rotate(0deg)';
    }, 500);
}

// Save goal to sheet
async function saveGoal() {
    const newGoal = parseFloat(document.getElementById('goalInput').value);
    if (isNaN(newGoal) || newGoal <= 0) {
        alert('Please enter a valid goal amount');
        return;
    }

    try {
        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal: newGoal })
        });

        const result = await response.json();
        if (result.success) {
            currentGoal = newGoal;
            updateDashboard();
            alert('Goal saved successfully!');
        } else {
            alert('Error saving goal: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to save goal');
    }
}

// Get filtered data
function getFilteredData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) return allData;

    const start = new Date(startDate);
    const end = new Date(endDate);

    return allData.filter(row => {
        const contractedDate = row['Contracted Date'];
        if (!contractedDate) return false;
        const rowDate = new Date(contractedDate);
        return rowDate >= start && rowDate <= end;
    });
}

// Calculate totals
function calculateTotals() {
    const filtered = getFilteredData();
    const totals = {
        totalSoldPrice: 0,
        laborCost: 0,
        materialCost: 0,
        marketingCost: 0,
        commisionCost: 0,
        profit: 0
    };

    filtered.forEach(row => {
        totals.totalSoldPrice += parseFloat(row['Total Sold Price'] || 0);
        totals.laborCost += parseFloat(row['Labor Cost'] || 0);
        totals.materialCost += parseFloat(row['Material Cost'] || 0);
        totals.marketingCost += parseFloat(row['Marketing Cost'] || 0);
        totals.commisionCost += parseFloat(row['Commision Cost'] || 0);
        totals.profit += parseFloat(row['Profit'] || 0);
    });

    totals.totalCosts = totals.laborCost + totals.materialCost + totals.marketingCost + totals.commisionCost;
    totals.profitMargin = totals.totalSoldPrice > 0 
        ? ((totals.profit / totals.totalSoldPrice) * 100).toFixed(1)
        : 0;

    return totals;
}

// Calculate monthly data - NOW SUPPORTS MULTIPLE VIEWS
function getMonthlyData() {
    const filtered = getFilteredData();
    const dataMap = {};

    filtered.forEach(row => {
        const date = new Date(row['Contracted Date']);
        let key;

        switch(chartView) {
            case 'daily':
                key = date.toISOString().split('T')[0]; // YYYY-MM-DD
                break;
            case 'weekly':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                key = weekStart.toISOString().split('T')[0];
                break;
            case 'monthly':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
            case 'yearly':
                key = date.getFullYear().toString();
                break;
        }

        if (!dataMap[key]) {
            dataMap[key] = {
                month: key,
                sales: 0,
                costs: 0,
                profit: 0
            };
        }

        const sales = parseFloat(row['Total Sold Price'] || 0);
        const costs = parseFloat(row['Labor Cost'] || 0) +
                     parseFloat(row['Material Cost'] || 0) +
                     parseFloat(row['Marketing Cost'] || 0) +
                     parseFloat(row['Commision Cost'] || 0);
        const profit = parseFloat(row['Profit'] || 0);

        dataMap[key].sales += sales;
        dataMap[key].costs += costs;
        dataMap[key].profit += profit;
    });

    return Object.values(dataMap).sort((a, b) => a.month.localeCompare(b.month));
}

// Calculate projection
function calculateProjection() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24));

    if (elapsedDays <= 0 || totalDays <= 0) return null;

    const totals = calculateTotals();
    const dailyAverage = totals.totalSoldPrice / elapsedDays;
    const projection = dailyAverage * totalDays;

    return {
        current: totals.totalSoldPrice,
        projected: projection,
        percentComplete: ((elapsedDays / totalDays) * 100).toFixed(1),
        goalProgress: ((totals.totalSoldPrice / currentGoal) * 100).toFixed(1)
    };
}

// Update dashboard
function updateDashboard() {
    const totals = calculateTotals();
    const projection = calculateProjection();

    // Update summary cards
    document.getElementById('totalSales').textContent = `$${totals.totalSoldPrice.toLocaleString()}`;
    document.getElementById('totalCosts').textContent = `$${totals.totalCosts.toLocaleString()}`;
    document.getElementById('totalProfit').textContent = `$${totals.profit.toLocaleString()}`;
    document.getElementById('profitMargin').textContent = `${totals.profitMargin}%`;

    // Update running sales
    document.getElementById('runningSales').textContent = `$${totals.totalSoldPrice.toLocaleString()}`;
    document.getElementById('runningProgress').style.width = `${Math.min(projection?.goalProgress || 0, 100)}%`;
    document.getElementById('runningPercent').textContent = `${projection?.goalProgress || 0}% of goal`;

    // Update projected sales
    const projectedAmount = projection?.projected ? Math.round(projection.projected) : 0;
    document.getElementById('projectedSales').textContent = `$${projectedAmount.toLocaleString()}`;
    document.getElementById('projectedProgress').style.width = `${projection?.percentComplete || 0}%`;
    document.getElementById('projectedPercent').textContent = `${projection?.percentComplete || 0}% period elapsed`;

    // Update table
    updateTable();

    // Update chart
    updateChart();
}

// Update table
function updateTable() {
    const filtered = getFilteredData();
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    document.getElementById('projectCount').textContent = `(${filtered.length} projects)`;

    filtered.forEach(row => {
        const totalCosts = parseFloat(row['Labor Cost'] || 0) +
                          parseFloat(row['Material Cost'] || 0) +
                          parseFloat(row['Marketing Cost'] || 0) +
                          parseFloat(row['Commision Cost'] || 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row['First Name']} ${row['Last Name']}</td>
            <td>${row['Source City']}</td>
            <td>${row['Contracted Date']}</td>
            <td class="font-bold">$${parseFloat(row['Total Sold Price'] || 0).toLocaleString()}</td>
            <td class="red">$${totalCosts.toLocaleString()}</td>
            <td class="green font-bold">$${parseFloat(row['Profit'] || 0).toLocaleString()}</td>
            <td class="blue font-bold">${row['Profit Margin']}%</td>
        `;
        tbody.appendChild(tr);
    });
}

// Update chart
function updateChart() {
    // Auto-detect best chart view based on date range
    autoDetectChartView();
    
    const monthlyData = getMonthlyData();
    const ctx = document.getElementById('salesChart').getContext('2d');

    const showSales = document.getElementById('showSales').checked;
    const showCosts = document.getElementById('showCosts').checked;
    const showProfit = document.getElementById('showProfit').checked;

    const datasets = [];

    if (showSales) {
        datasets.push({
            label: 'Sales',
            data: monthlyData.map(d => d.sales),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
        });
    }

    if (showCosts) {
        datasets.push({
            label: 'Costs',
            data: monthlyData.map(d => d.costs),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
        });
    }

    if (showProfit) {
        datasets.push({
            label: 'Profit',
            data: monthlyData.map(d => d.profit),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
        });
    }

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.map(d => d.month),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                        }
                    }
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
}
