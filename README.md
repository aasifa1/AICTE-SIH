
# AICTE Complaint Monitoring Dashboard

A React/Vite dashboard prototype for monitoring and tracking institution-related complaint cases across AICTE Bureaus and Cells.

## Run Locally

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Features

- Dashboard KPI cards and complaint statistics
- Search and filter complaints by case ID, institution name, category, Bureau, status, and priority
- Overdue case indicators and priority alerts
- Bureau workload monitoring
- Institution and complaint tracking
- Demonstration data stored in `aicte_demo_data.json`

## Data and Limitations

- All included institutions and complaint records are fictional demonstration data.
- Assigned user IDs, submission dates, due dates, and recent activity are for demonstration only.
- Due dates and priority values do not represent official AICTE policies.
- The current prototype does not include a live API server, database, authentication system, or live AICTE integration.
- Actual AICTE Permanent IDs must be verified against an authoritative source before use.

## Future Integration

When a backend API becomes available, replace the JSON data adapter in `src/services/dashboard` with the appropriate API integration. Verify the actual service file path in the project before making changes.

## Technology Stack

- React
- Vite
- JavaScript
- JSON demonstration data

