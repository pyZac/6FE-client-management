# Subscription Analytics Pipeline

An **automated data infrastructure** for subscription lifecycle analytics, combining real-time ETL processes with SQL-based exploratory analysis to enable data-driven subscription management and churn prediction.

---

## 📊 Project Overview

This project establishes a **production-grade data pipeline** that:
- Continuously extracts subscription and membership data from operational systems
- Maintains a structured MySQL database for analytics workloads
- Enables SQL-based cohort analysis and subscription metrics tracking
- Provides the data foundation for downstream ML models and dashboards

**Business Context:** Built for a subscription-based online education platform (6 Figure Earner) managing ~500+ active members across multiple payment tiers.

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Telegram Bot  │ ──► Data Collection Layer
│  (ETL Source)   │     (Membership events, payments, user activity)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MySQL Database │ ──► Central Data Warehouse
│   (payment DB)  │     (Subscription records, user profiles, transactions)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Python Analytics│ ──► Analysis Layer
│ (SQL + Pandas)  │     (Cohort analysis, churn metrics, visualizations)
└─────────────────┘
```

---

## 🔧 Technical Components

### 1. **ETL Layer** (`/etl/`)
Automated data extraction and loading system:
- **fetch.js**: Database query engine and data sync orchestration
- **bot.js**: Event-driven data collection from Telegram API
- Real-time membership status tracking
- Scheduled data refreshes via polling mechanism

**Key Data Flows:**
- User subscription events → MySQL warehouse
- Payment status updates → Real-time validation
- Expiration tracking → Automated data quality checks

### 2. **Exploratory Analysis** (`/exploratory_analysis/`)
SQL-based analytics notebooks for subscription insights:

**pandasql.ipynb** - Core analytics queries:
- Payment plan distribution analysis (`GROUP BY paymentPlan`)
- Subscription expiration cohort analysis
- Customer lifetime value calculations
- Revenue metrics by segment

**visualization.ipynb** - Data visualization:
- Subscription trends over time
- Churn rate analysis
- Payment plan performance comparison

### 3. **Data Layer** (`/data/`)
- **payments.csv**: Sample subscription dataset
- Schema includes: `telegram_id`, `username`, `paymentPlan`, `ExpDate`, `status`, `updated_at`

---

## 📈 Analytics Capabilities

### Current Metrics & Analysis

**Subscription Metrics:**
- Monthly Recurring Revenue (MRR) tracking
- Customer acquisition and churn rates
- Payment plan conversion analysis
- Subscription lifecycle staging

**SQL Queries Implemented:**
```sql
-- Payment plan distribution
SELECT paymentPlan, COUNT(*) as count 
FROM subscriptions 
GROUP BY paymentPlan

-- Upcoming expirations (churn risk)
SELECT username, ExpDate 
FROM subscriptions 
ORDER BY ExpDate DESC
```

**Use Cases:**
- Identify high-value customer segments
- Predict churn risk based on expiration patterns
- Optimize pricing strategies through cohort analysis
- Monitor subscription health metrics

---

## 🛠️ Technology Stack

**Data Engineering:**
- Node.js - ETL orchestration
- MySQL - Data warehouse
- PM2 - Process management for continuous data sync

**Analytics:**
- Python - Data analysis and modeling
- Pandas - Data manipulation
- pandasql - SQL interface for DataFrames
- Jupyter - Interactive analysis environment

**Data Sources:**
- Telegram Bot API - Membership events
- MySQL payment database - Transaction records

---

## 🚀 Setup & Configuration

### Prerequisites
```bash
Node.js >= 14
Python >= 3.8
MySQL >= 5.7
```

### Environment Configuration
```bash
# Copy example environment file
cp .env.example .env

# Configure database connection
DB_HOST=your_host
DB_USER=your_user
DB_PASS=your_password
DB_NAME=subscription_analytics
DB_TABLE=payment
```

### Installation
```bash
# Install ETL dependencies
npm install

# Install Python analytics dependencies
pip install pandas pandasql jupyter matplotlib seaborn

# Start data pipeline
pm2 start ecosystem.config.js
```

---

## 📊 Database Schema

```sql
CREATE TABLE payment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    telegram_id VARCHAR(50) NOT NULL,
    username VARCHAR(100),
    paymentPlan VARCHAR(50),
    status ENUM('active', 'inactive', 'expired'),
    ExpDate DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_telegram_id (telegram_id),
    INDEX idx_status (status),
    INDEX idx_expdate (ExpDate)
);
```

---

## 📁 Project Structure

```
subscription-analytics-pipeline/
├── etl/                      # Data extraction & loading
│   ├── bot.js               # Event collection orchestrator
│   └── fetch.js             # Database sync engine
├── exploratory_analysis/     # SQL & Python analytics
│   ├── pandasql.ipynb       # SQL-based analysis
│   └── visualization.ipynb   # Data visualizations
├── data/                     # Sample datasets
│   └── payments.csv         # Subscription records
├── node_modules/             # Dependencies
├── .env.example             # Configuration template
├── ecosystem.config.js      # PM2 process config
├── package.json             # Node.js dependencies
└── README.md                # Documentation
```

---

## 🎯 Future Development

**Planned Analytics Enhancements:**
- [ ] dbt integration for dimensional modeling (fact_subscriptions, dim_customers)
- [ ] Automated churn prediction model using scikit-learn
- [ ] Tableau/Power BI dashboard for stakeholder reporting
- [ ] Customer lifetime value (LTV) forecasting
- [ ] A/B testing framework for pricing experiments

**Data Engineering Roadmap:**
- [ ] Implement data quality validation framework
- [ ] Add automated testing for ETL pipelines
- [ ] Create data lineage documentation
- [ ] Set up monitoring and alerting for pipeline health

---

## 📝 Key Learnings & Technical Highlights

**Data Engineering:**
- Built production ETL system handling real-time subscription data
- Designed normalized database schema for analytical queries
- Implemented automated data validation and quality checks

**Analytics:**
- Performed cohort analysis to identify subscription patterns
- Applied SQL aggregations for business metric calculations
- Created reproducible analysis workflows using Jupyter notebooks

**Business Impact:**
- Enabled data-driven subscription management decisions
- Provided foundation for predictive churn modeling
- Automated reporting of key subscription KPIs

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

This is a portfolio project demonstrating data analytics engineering skills. Feedback and suggestions are welcome!

---

**Built by Zac** | [LinkedIn](#) | [Portfolio](#)  
*Data & Automation Specialist transitioning to Analytics Engineering*
