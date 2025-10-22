// Global variables
let allData = [];
let scriptUrl = '';
let currentGoal = 450000;
let salesChart = null;

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    const savedUrl = localStorage.getItem('scriptUrl');
    if (savedUrl) {
        scriptUrl = savedUrl;
        document.getElementById('configModal').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadData();
    } else {
        document.getElementById('configModal').style.display = 'flex';
    }

    // Set up date change listeners
    document.getElementById('startDate').addEventListener('change', updateDashboard);
    document.getElementById('endDate').addEventListener('change', updateDashboard);
});

// Connect to sheet
async function connectSheet() {
    const url = document.getElementById('scriptUrl').value.trim();
    if (!url) {
        alert('Please enter a valid Apps Script URL');
        return;
    }

    scriptUrl = url;
    localStorage.setItem('scriptUrl', url);
    document.getElementById('configModal').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadData();
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

// Calculate monthly data
function getMonthlyData() {
    const filtered = getFilteredData();
    const monthlyMap = {};

    filtered.forEach(row => {
        const date = new Date(row['Contracted Date']);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = {
                month: monthKey,
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

        monthlyMap[monthKey].sales += sales;
        monthlyMap[monthKey].costs += costs;
        monthlyMap[monthKey].profit += profit;
    });

    return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
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