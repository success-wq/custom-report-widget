// Global variables
let allData = [];
let currentStageFilter = 'all'; // NEW: Track current stage filter

// Get Apps Script URL from URL parameter or use default
function getScriptUrl() {
    // NEW: Try to get script ID from URL path first (e.g., /dashboard/SCRIPT_ID)
    const pathname = window.location.pathname;
    const pathParts = pathname.split('/').filter(part => part.length > 0);
    
    // Check if last part of path looks like a script ID (starts with AKfycb)
    if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.startsWith('AKfycb') && lastPart.length > 20) {
            console.log('Script ID found in URL path:', lastPart);
            return `https://script.google.com/macros/s/${lastPart}/exec`;
        }
    }
    
    // Fallback: Check for ?script= query parameter (backward compatible)
    const urlParams = new URLSearchParams(window.location.search);
    const scriptId = urlParams.get('script');
    
    if (scriptId) {
        console.log('Script ID found in query parameter:', scriptId);
        return `https://script.google.com/macros/s/${scriptId}/exec`;
    }
    
    // No script ID provided - show error
    alert('Error: No script ID provided in URL. Please use the correct dashboard link.');
    console.error('No script ID found in URL. Expected format: /dashboard/SCRIPT_ID or ?script=SCRIPT_ID');
    return null; // This will cause loadData() to fail gracefully
}


const scriptUrl = getScriptUrl();
let currentGoal = 0; // Will be loaded from R1 in Google Sheet
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
    
    // Setup export dropdown
    setupExportDropdown();
});

// NEW: Setup export dropdown functionality
function setupExportDropdown() {
    const exportBtn = document.getElementById('exportBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    
    // Toggle dropdown on button click
    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        exportDropdown.classList.remove('show');
    });
    
    // Prevent dropdown from closing when clicking inside it
    exportDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// NEW: Export as PDF
async function exportAsPDF() {
    try {
        // Hide export dropdown before capturing
        document.getElementById('exportDropdown').classList.remove('show');
        
        // Wait a moment for dropdown to disappear
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const element = document.getElementById('dashboard');
        const today = new Date().toISOString().split('T')[0];
        const filename = `Sales_Dashboard_${today}.pdf`;
        
        const opt = {
            margin: 10,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'landscape' 
            }
        };
        
        // Use html2pdf library
        await html2pdf().set(opt).from(element).save();
        
        console.log('PDF exported successfully');
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Failed to export PDF. Please try again.');
    }
}

// NEW: Export as CSV
function exportAsCSV() {
    try {
        // Hide export dropdown
        document.getElementById('exportDropdown').classList.remove('show');
        
        // Get filtered data (respects current date range AND stage filter)
        const filtered = getFilteredData();
        
        if (filtered.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Define CSV headers
        const headers = [
            'Customer',
            'City',
            'Date',
            'Total Sold',
            'Labor Cost',
            'Material Cost',
            'Marketing Cost',
            'Commission Cost',
            'Total Costs',
            'Profit',
            'Margin',
            'Stage'
        ];
        
        // Build CSV content
        let csvContent = headers.join(',') + '\n';
        
        // Initialize totals for columns D-K (Total Sold through Profit)
        let totalSoldSum = 0;
        let laborCostSum = 0;
        let materialCostSum = 0;
        let marketingCostSum = 0;
        let commissionCostSum = 0;
        let totalCostsSum = 0;
        let profitSum = 0;
        
        filtered.forEach(row => {
            const laborCost = parseFloat(row['Labor Cost'] || 0);
            const materialCost = parseFloat(row['Material Cost'] || 0);
            const marketingCost = parseFloat(row['Marketing Cost'] || 0);
            const commissionCost = parseFloat(row['Commision Cost'] || 0);
            const totalCosts = laborCost + materialCost + marketingCost + commissionCost;
            
            const customer = `"${row['First Name']} ${row['Last Name']}"`;
            const city = `"${row['Source City'] || ''}"`;
            
            // Format date as MM-DD-YYYY
            let date = '';
            if (row['Contracted Date']) {
                const d = new Date(row['Contracted Date']);
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const year = d.getFullYear();
                date = `${month}-${day}-${year}`;
            }
            
            const totalSold = parseFloat(row['Total Sold Price'] || 0);
            const profit = parseFloat(row['Profit'] || 0);
            const margin = row['Profit Margin'] || 0;
            const stage = `"${row['Stages'] || ''}"`;
            
            // Add to totals
            totalSoldSum += totalSold;
            laborCostSum += laborCost;
            materialCostSum += materialCost;
            marketingCostSum += marketingCost;
            commissionCostSum += commissionCost;
            totalCostsSum += totalCosts;
            profitSum += profit;
            
            const csvRow = [
                customer,
                city,
                date,
                totalSold,
                laborCost,
                materialCost,
                marketingCost,
                commissionCost,
                totalCosts,
                profit,
                margin,
                stage
            ].join(',');
            
            csvContent += csvRow + '\n';
        });
        
        // Calculate overall margin
        const overallMargin = totalSoldSum > 0 ? ((profitSum / totalSoldSum) * 100).toFixed(1) : 0;
        
        // Add totals row - columns D through K have calculated values
        const totalsRow = [
            '""',              // A: Customer (empty)
            '""',              // B: City (empty)
            '"TOTAL"',         // C: Date (shows TOTAL label)
            totalSoldSum,      // D: Total Sold
            laborCostSum,      // E: Labor Cost
            materialCostSum,   // F: Material Cost
            marketingCostSum,  // G: Marketing Cost
            commissionCostSum, // H: Commission Cost
            totalCostsSum,     // I: Total Costs
            profitSum,         // J: Profit
            overallMargin,     // K: Margin (calculated)
            '""'               // L: Stage (empty)
        ].join(',');
        
        csvContent += totalsRow + '\n';
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const today = new Date().toISOString().split('T')[0];
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Project_Details_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('CSV exported successfully');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Failed to export CSV. Please try again.');
    }
}

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

// NEW: Populate stage filter dropdown
function populateStageFilter() {
    const stageFilter = document.getElementById('stageFilter');
    if (!stageFilter) return;
    
    // Get unique stages from all data
    const stages = new Set();
    allData.forEach(row => {
        const stage = row['Stages'];
        if (stage && stage.trim()) {
            stages.add(stage.trim());
        }
    });
    
    // Clear existing options except "All Stages"
    stageFilter.innerHTML = '<option value="all">All Stages</option>';
    
    // Add stage options
    Array.from(stages).sort().forEach(stage => {
        const option = document.createElement('option');
        option.value = stage;
        option.textContent = stage;
        stageFilter.appendChild(option);
    });
}

// NEW: Handle stage filter change
function handleStageFilterChange() {
    currentStageFilter = document.getElementById('stageFilter').value;
    updateDashboard();
}

// Load data from Apps Script
async function loadData() {
    try {
        const response = await fetch(scriptUrl);
        const result = await response.json();

        if (result.success) {
            allData = result.data;
            
            // Load goal from R1 cell in sheet
            currentGoal = result.goal || 0;
            document.getElementById('goalInput').value = currentGoal || '';
            
            // NEW: Populate stage filter dropdown
            populateStageFilter();
            
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

// Save goal to sheet (R1 cell) - Try POST first, fallback to GET
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
            if (result.success) {
                currentGoal = newGoal;
                alert('Goal saved successfully!');
                updateDashboard();
                return;
            }
        }
        console.log('POST failed, trying GET fallback...');
    } catch (error) {
        console.log('POST error:', error, '- Trying GET fallback...');
    }

    // Fallback to GET with query parameter
    try {
        console.log('Method 2: Trying GET request with query parameter...');
        const getUrl = `${scriptUrl}?goal=${newGoal}`;
        const response = await fetch(getUrl);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                currentGoal = newGoal;
                alert('Goal saved successfully!');
                updateDashboard();
                return;
            }
        }
        
        alert('Failed to save goal. Please check your Apps Script permissions.');
    } catch (error) {
        console.error('Both save methods failed:', error);
        alert('Failed to save goal. Please check your Apps Script permissions.');
    }
}

// Get filtered data based on date range AND stage filter
function getFilteredData() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);

    return allData.filter(row => {
        // First filter by date
        const contractDate = new Date(row['Contracted Date']);
        const dateMatch = contractDate >= startDate && contractDate <= endDate;
        
        // Then filter by stage
        if (currentStageFilter === 'all') {
            return dateMatch;
        } else {
            const rowStage = row['Stages'] ? row['Stages'].trim() : '';
            return dateMatch && rowStage === currentStageFilter;
        }
    });
}

// Get MTD data (separate function to ensure MTD cards never change with date selector)
function getMTDData() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return allData.filter(row => {
        const contractDate = new Date(row['Contracted Date']);
        return contractDate >= startOfMonth && contractDate <= today;
    });
}

// Calculate totals for Summary Cards (affected by date selector AND stage filter)
function calculateTotals() {
    const filtered = getFilteredData();

    let totalSoldPrice = 0;
    let totalCosts = 0;

    filtered.forEach(row => {
        totalSoldPrice += parseFloat(row['Total Sold Price'] || 0);
        totalCosts += parseFloat(row['Labor Cost'] || 0) +
                      parseFloat(row['Material Cost'] || 0) +
                      parseFloat(row['Marketing Cost'] || 0) +
                      parseFloat(row['Commision Cost'] || 0);
    });

    const profit = totalSoldPrice - totalCosts;
    const profitMargin = totalSoldPrice > 0 ? ((profit / totalSoldPrice) * 100).toFixed(1) : 0;

    return {
        totalSoldPrice,
        totalCosts,
        profit,
        profitMargin
    };
}

// Calculate MTD totals (ALWAYS MTD, never affected by date selector)
function calculateMTDTotals() {
    const mtdData = getMTDData();

    let totalSoldPrice = 0;
    let totalCosts = 0;

    mtdData.forEach(row => {
        totalSoldPrice += parseFloat(row['Total Sold Price'] || 0);
        totalCosts += parseFloat(row['Labor Cost'] || 0) +
                      parseFloat(row['Material Cost'] || 0) +
                      parseFloat(row['Marketing Cost'] || 0) +
                      parseFloat(row['Commision Cost'] || 0);
    });

    const profit = totalSoldPrice - totalCosts;

    return {
        totalSoldPrice,
        totalCosts,
        profit
    };
}

// Get chart data
function getChartData() {
    const filtered = getFilteredData();

    // Group by date
    const dataMap = {};

    filtered.forEach(row => {
        const date = row['Contracted Date'];
        if (!date) return;

        const dateKey = date; // Keep original format for grouping

        if (!dataMap[dateKey]) {
            dataMap[dateKey] = {
                date: dateKey,
                displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
        const profit = sales - costs;

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

    // Update summary cards (these ARE affected by date selector AND stage filter)
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

    // Update table (affected by date selector AND stage filter)
    updateTable();

    // Update chart (affected by date selector AND stage filter)
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

        // Format date as MM-DD-YYYY
        let formattedDate = '';
        if (row['Contracted Date']) {
            const d = new Date(row['Contracted Date']);
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const year = d.getFullYear();
            formattedDate = `${month}-${day}-${year}`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row['First Name']} ${row['Last Name']}</td>
            <td>${row['Source City']}</td>
            <td>${formattedDate}</td>
            <td class="font-bold">$${parseFloat(row['Total Sold Price'] || 0).toLocaleString()}</td>
            <td class="red">$${totalCosts.toLocaleString()}</td>
            <td class="green font-bold">$${parseFloat(row['Profit'] || 0).toLocaleString()}</td>
            <td class="blue font-bold">${row['Profit Margin']}%</td>
            <td>${row['Stages'] || ''}</td>
            <td>${row['Pipelines'] || ''}</td>
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
