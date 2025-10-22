# GHL Sales Dashboard

A custom reporting widget for GoHighLevel (GHL) that connects to Google Sheets to visualize sales data, track goals, and monitor project performance.

## Features

- 📊 **Real-time Data Sync** - Connects directly to Google Sheets via Apps Script
- 🎯 **Goal Tracking** - Set and track sales goals with visual progress indicators  
- 📈 **Sales Projections** - Automatic projections based on current performance
- 📅 **Date Range Filtering** - Filter data by custom date ranges
- 💹 **Interactive Charts** - Multiple view modes (Daily, Weekly, Monthly, Yearly) with toggleable metrics
- 💰 **Financial Metrics** - Track total sales, costs, profit, and profit margins
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🔗 **GHL Compatible** - Embeddable via iframe or custom HTML widget

## Setup Instructions

### 1. Prepare Your Google Sheet

Your Google Sheet should have these columns (in any order):

- First Name
- Last Name
- Email
- Phone
- Source City
- Project Description
- Created Date
- Contracted Date
- Labor Cost
- Material Cost
- Marketing Cost
- Commision Cost
- Profit
- Profit Margin
- Total Sold Price

**Important:** Cell **P1** will store your goal value.

### 2. Deploy Apps Script

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete any existing code
4. Copy and paste the code from `apps-script.js` (provided separately)
5. Click **Deploy → New deployment**
6. Settings:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy**
8. **Copy the Web App URL** - you'll need this!

### 3. Update script.js with Your Apps Script URL

1. Open `script.js`
2. Find line 3: `const scriptUrl = 'https://script.google.com/...'`
3. **Replace with your Apps Script Web App URL**
4. Save the file

### 4. Deploy to GitHub Pages

1. Create a new GitHub repository
2. **IMPORTANT**: Update `script.js` line 3 with your Apps Script URL
3. Upload these files:
   - `index.html`
   - `script.js` (with your URL)
   - `styles.css`
4. Go to **Settings → Pages**
5. Source: Deploy from **main** branch
6. Save and wait for deployment
7. Copy your GitHub Pages URL (e.g., `https://yourusername.github.io/repo-name/`)
8. Open the URL - your dashboard should load automatically!

## Chart View Options

The dashboard now includes four view modes for the Sales Trend chart:

- **Daily**: View sales by individual days
- **Weekly**: Aggregated weekly data (Sunday - Saturday)
- **Monthly**: Month-to-month trends (default)
- **Yearly**: Year-over-year comparison

Click the view buttons above the chart to switch between modes.

## Embedding in GoHighLevel

To embed this dashboard in GHL:

1. Go to your GHL dashboard
2. Add a **Custom HTML Widget** or **Iframe Widget**
3. Use your GitHub Pages URL:

```html
<iframe 
  src="https://yourusername.github.io/repo-name/" 
  width="100%" 
  height="1200px" 
  frameborder="0">
</iframe>
```

## Usage

### Setting Goals

1. Enter your sales goal in the "Goal" card
2. Click **Save**
3. The goal is stored in cell P1 of your sheet

### Date Range Filtering

1. Select start and end dates using the date pickers
2. All metrics and charts update automatically
3. Running sales and projections calculate based on selected range

### Chart Controls

- **View Mode**: Switch between Daily, Weekly, Monthly, and Yearly views
- **Line Toggles**: Show/hide Sales, Costs, and Profit lines using checkboxes

### Understanding Metrics

- **Running Sales**: Total sales within selected date range vs goal
- **Projected Sales**: Estimated total based on daily average pace
- **Total Sales**: Sum of all "Total Sold Price" values
- **Total Costs**: Sum of Labor + Material + Marketing + Commission costs
- **Profit**: Total Sales - Total Costs
- **Profit Margin**: (Profit / Total Sales) × 100

## Data Flow

```
GHL Opportunity → Webhook → Apps Script → Google Sheet
                                              ↓
                                        Dashboard reads data
                                              ↓
                                    Visual metrics & charts
```

## Future Webhook Integration

To automatically send data from GHL to your sheet:

1. In your Apps Script, the `doPost()` function is ready to receive webhook data
2. Set up a GHL workflow to trigger on opportunity events
3. Configure webhook to POST to your Apps Script URL with this format:

```json
{
  "rowData": {
    "First Name": "John",
    "Last Name": "Doe",
    "Contracted Date": "2024-01-15",
    "Total Sold Price": "50000",
    ...
  }
}
```

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Charts**: Chart.js
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Hosting**: GitHub Pages

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

**Dashboard won't load or shows errors:**
- Verify your Apps Script URL is correctly hardcoded in `script.js` line 3
- Check that Apps Script is deployed as "Web app" with "Anyone" access
- Open browser console (F12) to check for specific errors

**Data not showing:**
- Ensure your sheet has data in rows 2 and below (row 1 is headers)
- Verify "Contracted Date" column has valid dates
- Check browser console for errors

**Goal not saving:**
- Confirm Apps Script has permission to edit the sheet
- Check that cell P1 is not protected or merged

## Contributing

Feel free to fork this repo and submit pull requests for improvements!

## License

MIT License - feel free to use and modify for your projects.

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for GoHighLevel users
