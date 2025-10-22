# GHL Sales Dashboard

A custom reporting widget for GoHighLevel (GHL) that connects to Google Sheets to visualize sales data, track goals, and monitor project performance.

## Features

- 📊 **Real-time Data Sync** - Connects directly to Google Sheets via Apps Script
- 🎯 **Goal Tracking** - Set and track sales goals with visual progress indicators
- 📈 **Sales Projections** - Automatic projections based on current performance
- 📅 **Date Range Filtering** - Filter data by custom date ranges
- 💹 **Interactive Charts** - Month-to-month trend visualization with toggleable metrics
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

### 3. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload these files:
   - `index.html`
   - `script.js`
   - `styles.css`
3. Go to **Settings → Pages**
4. Source: Deploy from **main** branch
5. Save and wait for deployment
6. Copy your GitHub Pages URL (e.g., `https://yourusername.github.io/repo-name/`)

### 4. Connect the Dashboard

1. Open your GitHub Pages URL
2. Paste your **Apps Script Web App URL**
3. Click **Connect**
4. Your dashboard is ready! 🎉

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

Toggle visibility of Sales, Costs, and Profit lines using the checkboxes above the chart.

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

**Dashboard won't connect:**
- Verify Apps Script is deployed as "Web app" with "Anyone" access
- Check that your Apps Script URL is correct
- Make sure your Google Sheet has the correct column headers

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
