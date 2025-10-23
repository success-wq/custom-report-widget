// Global variables
let allData = [];

// Get Apps Script URL from URL parameter or use default
function getScriptUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const scriptId = urlParams.get('script');
    
    if (scriptId) {
        // Build full URL from script ID parameter
        return `https://script.google.com/macros/s/${scriptId}/exec`;
    }
    
    // Fallback to default (for testing) - REPLACE THIS WITH YOUR DEFAULT SCRIPT ID
    return 'https://script.google.com/macros/s/AKfycbx9QJSfl7Zcp5SfpDhZNSMPbHZdO1FuX9LcX804WGXjMTEbWoa0vtozMTQV7eIukpNiGw/exec';
}

const scriptUrl = getScriptUrl();
let currentGoal = 0; // Will be loaded from P1 in Google Sheet
let salesChart = null;


// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initialized');
    console.log('Using Apps Script URL:', scriptUrl);
    
    loadData();
    
    // Set default to MTD on page load
    setDateRangePreset('mtd');
    
    // Update MTD titles
    updateMTDTitles();
});

// Update MTD titles and sub-header
function updateMTDTitles() {
    const today = new Date();
    const monthName = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    
    // Update sub-header
    document.getElementById('mtdSubheader').textContent = `MTD for ${monthName} ${year}`;
    
    // Update Goal title
    document.getElementById('goalTitle').textContent = `Goal for the month of ${monthName} ${year}`;
}

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
            
            // Load goal from P1 cell in sheet
            currentGoal = result.goal || 0;
            document.getElementById('goalInput').value = currentGoal || '';
            
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

// Save goal to sheet (P1 cell) - Try POST first, fallback to GET
async function saveGoal() {
    const newGoal = parseFloat(document.getElementById('goalInput').value);
    if (isNaN(newGoal) || newGoal <= 0) {
        alert('Please enter a valid goal amount');
        return;
    }

    console.log('Attempting to save goal:', newGoal);

    // Try POST first (preferred method)
    try {
        console.log('Method 1: Trying POST request...');
        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ goal: newGoal }),
        });

        if (response.ok) {
            const result = await response.json();
            console.log('POST result:', result);
            
            if (result.success) {
                currentGoal = newGoal;
                updateDashboard();
                alert('Goal saved successfully to cell P1!');
                return;
            }
        }
        
        // If POST didn't work, try GET fallback
        console.log('POST failed, trying GET fallback...');
        throw new Error('POST failed, switching to GET');
        
    } catch (postError) {
        console.log('POST error:', postError.message);
        
        // Fallback to GET method
        try {
            console.log('Method 2: Trying GET with parameter...');
            const saveUrl = `${scriptUrl}?goal=${newGoal}`;
            const response = await fetch(saveUrl);
            
            const result = await response.json();
            console.log('GET result:', result);
            
            if (result.success) {
                currentGoal = newGoal;
                updateDashboard();
                alert('Goal saved successfully to cell P1!');
            } else {
                console.error('GET failed:', result);
                alert('Error saving goal: ' + (result.error || 'Unknown error'));
            }
        } catch (getError) {
            console.error('Both POST and GET failed:', getError);
            alert('Failed to save goal. Please check:\n1. Apps Script is deployed correctly\n2. "Who has access" is set to "Anyone"\n3. Browser console (F12) for details');
        }
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

// Get MTD data (always month-to-date, regardless of date selector)
function getMTDData() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return allData.filter(row => {
        const contractedDate = row['Contracted Date'];
        if (!contractedDate) return false;
        const rowDate = new Date(contractedDate);
        return rowDate >= startOfMonth && rowDate <= today;
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

// Calculate MTD totals (for Running Sales and Projected Sales)
function calculateMTDTotals() {
    const mtdData = getMTDData();
    const totals = {
        totalSoldPrice: 0,
        laborCost: 0,
        materialCost: 0,
        marketingCost: 0,
        commisionCost: 0,
        profit: 0
    };

    mtdData.forEach(row => {
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

// Get chart data - shows actual dates with sales (no aggregation)
function getChartData() {
    const filtered = getFilteredData();
    const dataMap = {};

    // Group by actual contracted date
    filtered.forEach(row => {
        const contractedDate = row['Contracted Date'];
        if (!contractedDate) return;
        
        const date = new Date(contractedDate);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!dataMap[dateKey]) {
            dataMap[dateKey] = {
                date: dateKey,
                displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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

        dataMap[dateKey].sales += sales;
        dataMap[dateKey].costs += costs;
        dataMap[dateKey].profit += profit;
    });

    // Sort by date
    return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
}

// Calculate projection
// Calculate projection (MTD only)
function calculateProjection() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month

    const totalDays = Math.ceil((endOfMonth - startOfMonth + 1) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today - startOfMonth + 1) / (1000 * 60 * 60 * 24));

    if (elapsedDays <= 0 || totalDays <= 0) return null;

    const mtdTotals = calculateMTDTotals();
    const dailyAverage = mtdTotals.totalSoldPrice / elapsedDays;
    const projection = dailyAverage * totalDays;

    return {
        current: mtdTotals.totalSoldPrice,
        projected: projection,
        percentComplete: ((elapsedDays / totalDays) * 100).toFixed(1),
        goalProgress: ((mtdTotals.totalSoldPrice / currentGoal) * 100).toFixed(1)
    };
}

// Update dashboard
function updateDashboard() {
    // Get filtered data for Summary Cards, Chart, and Table
    const totals = calculateTotals();
    
    // Get MTD data for Running Sales and Projected Sales (ALWAYS MTD, never affected by date selector)
    const mtdTotals = calculateMTDTotals();
    const projection = calculateProjection();

    // Update summary cards (these ARE affected by date selector)
    document.getElementById('totalSales').textContent = `$${totals.totalSoldPrice.toLocaleString()}`;
    document.getElementById('totalCosts').textContent = `$${totals.totalCosts.toLocaleString()}`;
    document.getElementById('totalProfit').textContent = `$${totals.profit.toLocaleString()}`;
    document.getElementById('profitMargin').textContent = `${totals.profitMargin}%`;

    // Update running sales (ALWAYS MTD - uses mtdTotals, not totals)
    document.getElementById('runningSales').textContent = `$${mtdTotals.totalSoldPrice.toLocaleString()}`;
    document.getElementById('runningProgress').style.width = `${Math.min(projection?.goalProgress || 0, 100)}%`;
    document.getElementById('runningPercent').textContent = `${projection?.goalProgress || 0}% of goal`;

    // Update projected sales (ALWAYS MTD - uses projection which is MTD-based)
    const projectedAmount = projection?.projected ? Math.round(projection.projected) : 0;
    document.getElementById('projectedSales').textContent = `$${projectedAmount.toLocaleString()}`;
    document.getElementById('projectedProgress').style.width = `${projection?.percentComplete || 0}%`;
    document.getElementById('projectedPercent').textContent = `${projection?.percentComplete || 0}% period elapsed`;

    // Update table (affected by date selector)
    updateTable();

    // Update chart (affected by date selector)
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
// Update chart
function updateChart() {
    const chartData = getChartData();
    const ctx = document.getElementById('salesChart').getContext('2d');

    const showSales = document.getElementById('showSales').checked;
    const showCosts = document.getElementById('showCosts').checked;
    const showProfit = document.getElementById('showProfit').checked;

    const datasets = [];

    if (showSales) {
        datasets.push({
            label: 'Sales',
            data: chartData.map(d => d.sales),
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointHitRadius: 15,  // Bigger hover area for easier targeting
            tension: 0.4,
            fill: false
        });
    }

    if (showCosts) {
        datasets.push({
            label: 'Costs',
            data: chartData.map(d => d.costs),
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointHitRadius: 15,  // Bigger hover area for easier targeting
            tension: 0.4,
            fill: false
        });
    }

    if (showProfit) {
        datasets.push({
            label: 'Profit',
            data: chartData.map(d => d.profit),
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointHitRadius: 15,  // Bigger hover area for easier targeting
            tension: 0.4,
            fill: false
        });
    }

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.displayDate),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',        // Show tooltip for all lines at X position
                intersect: false      // Trigger when hovering near, not requiring exact hit
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
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
