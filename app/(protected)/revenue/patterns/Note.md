# EV Scooter Analytics: Complete ML Implementation Guide

## 📊 Overview

This guide provides data science methodologies to analyze telemetry data and create optimal package recommendations for your EV scooter business - similar to how telecom companies optimize their plans.

---

## 🎯 1. CUSTOMER SEGMENTATION APPROACHES

### A. K-Means Clustering (Most Common)

**Best For:** Creating distinct package tiers (Light/Standard/Premium/Enterprise)

**Algorithm:**

```
1. Normalize features (distance, swaps, speed, usage patterns)
2. Run K-Means with k=3-5 clusters
3. Use Elbow Method or Silhouette Score to find optimal K
4. Analyze cluster centers to define package limits
```

**Key Features to Use:**

- `monthly_km` - Total distance traveled
- `weekly_swaps` - Battery swap frequency
- `km_per_swap` - Efficiency metric
- `peak_hour_ratio` - Usage timing
- `avg_speed` - Riding intensity
- `trip_duration` - Usage pattern

**Output:** Customer labels (0, 1, 2, 3) mapping to package tiers

---

### B. RFM Analysis (Telecom-Style)

**Best For:** Understanding customer value and behavior

**Metrics:**

- **Recency:** Days since last ride/swap
- **Frequency:** Rides per week
- **Monetary:** Monthly spend

**Segments Created:**

- **Champions** (R:4-5, F:4-5, M:4-5) - Your best customers
- **Loyal Customers** (R:3-5, F:3-5, M:3-5) - Regular users
- **Potential Loyalists** (R:3-5, F:1-3, M:1-3) - Growing customers
- **At Risk** (R:1-2, F:2-5, M:2-5) - Declining engagement
- **Lost** (R:1-2, F:1-2, M:1-2) - About to churn

---

### C. Hierarchical Clustering

**Best For:** Understanding nested segments and sub-groups

**Use Case:**

- Find sub-segments within main tiers
- Example: "Power Users" might split into "Delivery Riders" vs "Long Commuters"
- Helps create specialized packages

**Implementation:**

```python
from scipy.cluster.hierarchy import dendrogram, linkage
import matplotlib.pyplot as plt

# Create linkage matrix
Z = linkage(scaled_features, method='ward')

# Plot dendrogram
plt.figure(figsize=(10, 6))
dendrogram(Z)
plt.show()

# Cut tree at desired height
from scipy.cluster.hierarchy import fcluster
clusters = fcluster(Z, t=4, criterion='maxclust')
```

---

### D. DBSCAN (Density-Based)

**Best For:** Finding outliers and unusual patterns

**Use Cases:**

- Identify VIP customers with unique usage
- Detect fraudulent patterns
- Find niche segments for custom packages

**Advantages:**

- No need to specify number of clusters
- Automatically finds outliers
- Discovers arbitrarily shaped clusters

---

## 🔮 2. PREDICTIVE MODELS

### A. Usage Prediction Model

**Goal:** Predict next month's usage to recommend right-sized package

**Approach: Gradient Boosting Regressor**

**Features:**

```python
Historical Features:
- avg_daily_km (last 30, 60, 90 days)
- swaps_per_week (last 30 days)
- weekend_vs_weekday_ratio

Trend Features:
- usage_growth_rate (month-over-month)
- seasonal_index (if you have 12+ months data)

Behavioral Features:
- peak_hour_percentage
- night_ride_frequency
- avg_trip_distance

Customer Features:
- tenure_months
- battery_health
- vehicle_age
```

**Model Selection:**

1. **Gradient Boosting** (XGBoost/LightGBM) - Best overall
2. **Random Forest** - Good for non-linear patterns
3. **LSTM** (if you have time-series) - For sequential patterns
4. **Prophet** (Facebook) - For seasonality

**Evaluation Metrics:**

- **RMSE** (Root Mean Squared Error) - Prediction accuracy in km
- **MAPE** (Mean Absolute Percentage Error) - % error
- **R²** - How well model explains variance

---

### B. Churn Prediction Model

**Goal:** Identify customers likely to cancel subscription

**Approach: Random Forest Classifier**

**Critical Features:**

```python
Decline Indicators:
- usage_decline_30d (decreasing km)
- swap_frequency_drop
- speed_reduction (riding less aggressively)

Service Issues:
- days_since_last_service (overdue maintenance)
- complaint_count
- payment_delays
- low_battery_health

Engagement Metrics:
- app_login_frequency
- days_since_last_ride
- referral_count (negative correlation with churn)
- tenure (U-shaped: high churn at 0-3 months and 24+ months)

Economic:
- price_per_km (if too high, at risk)
- competitor_pricing_delta
```

**Churn Risk Scoring:**

```
High Risk (>60%): Immediate retention action needed
Medium Risk (30-60%): Monitor closely, soft intervention
Low Risk (<30%): Standard engagement
```

**Interventions by Risk Level:**

- **High Risk:** Personalized retention offer (20% discount, free service, loyalty points)
- **Medium Risk:** Engagement campaigns (new features, community events, usage tips)
- **Low Risk:** Standard nurturing (newsletters, referral programs)

---

### C. Battery Health Prediction

**Goal:** Predict when batteries need replacement/service

**Approach: Time-Series Regression**

**Features:**

```python
Usage Patterns:
- cumulative_km
- total_swap_cycles
- fast_charge_frequency
- deep_discharge_events

Environmental:
- avg_temperature_during_rides
- monsoon_season_usage
- terrain_difficulty (hilly vs flat)

Battery Metrics:
- current_health_percentage
- voltage_stability
- charge_hold_time
```

**Output:** Predicted months until <80% health

**Business Value:**

- Proactive maintenance scheduling
- Inventory planning for batteries
- Customer satisfaction (no surprises)

---

## 📦 3. PACKAGE OPTIMIZATION STRATEGIES

### A. Rule-Based Engine (Simple but Effective)

**Logic:**

```python
if monthly_km < 500 and swaps < 10:
    package = "Light Rider"
elif monthly_km < 1000 and swaps < 20:
    package = "Daily Commuter"
elif monthly_km < 2000 and swaps < 35:
    package = "Power User"
else:
    package = "Enterprise"

# Add 20% buffer for growth
recommended_km_limit = predicted_monthly_km * 1.2
```

**Refinements:**

- **Seasonality Buffer:** Add 30% during peak seasons
- **Growth Factor:** New customers get +25% buffer
- **Downgrade Protection:** Don't suggest downgrade if <6 months on current plan

---

### B. ML-Based Recommendation System

**Collaborative Filtering Approach:**

1. **Find Similar Customers:**

   ```python
   from sklearn.neighbors import NearestNeighbors

   # Find 10 most similar customers
   knn = NearestNeighbors(n_neighbors=10, metric='cosine')
   knn.fit(customer_features)
   distances, indices = knn.kneighbors(current_customer)

   # See what packages they're on
   similar_packages = [customers[i]['package'] for i in indices]
   recommended = most_common(similar_packages)
   ```

2. **Matrix Factorization:**
   - Similar to Netflix recommendations
   - Learn latent features of customers and packages
   - Predict satisfaction score for each package

---

### C. Multi-Armed Bandit (Experimental)

**For Dynamic Pricing:**

```python
"""
Thompson Sampling approach:
- Test different package configurations
- Learn which packages work best for which segments
- Automatically optimize over time
"""

class PackageBandit:
    def __init__(self, packages):
        self.packages = packages
        self.successes = {p: 1 for p in packages}  # Priors
        self.failures = {p: 1 for p in packages}

    def select_package(self, customer_segment):
        # Sample from Beta distribution
        samples = {
            p: np.random.beta(self.successes[p], self.failures[p])
            for p in self.packages
        }
        return max(samples, key=samples.get)

    def update(self, package, accepted):
        if accepted:
            self.successes[package] += 1
        else:
            self.failures[package] += 1
```

**Use Case:** Test package variations with different customer segments

---

## 💰 4. REVENUE OPTIMIZATION

### A. Customer Lifetime Value (CLV) Model

**Formula:**

```
CLV = (Monthly Revenue × Margin × Expected Lifespan) + Referral Value

Expected Lifespan = f(churn_risk, tenure, satisfaction)
```

**Advanced CLV with Discounting:**

```python
def calculate_clv(customer, discount_rate=0.1):
    monthly_revenue = customer['monthly_spend']
    margin = 0.40  # 40% gross margin

    # Predicted lifespan
    survival_rate = 1 - customer['churn_risk']
    expected_months = -np.log(0.01) / -np.log(survival_rate)

    # Discounted CLV
    clv = 0
    for month in range(int(expected_months)):
        discount_factor = (1 / (1 + discount_rate)) ** month
        clv += monthly_revenue * margin * discount_factor

    # Add referral value
    clv += customer['referrals'] * 500

    return clv
```

**Segmentation by CLV:**

- **Platinum** (CLV > ₹100K): VIP treatment, custom packages
- **Gold** (CLV ₹50-100K): Priority support, loyalty benefits
- **Silver** (CLV ₹25-50K): Standard service
- **Bronze** (CLV < ₹25K): Acquisition cost recovery focus

---

### B. Price Elasticity Analysis

**Goal:** Understand how price changes affect demand

**Method:**

```python
"""
For each customer segment:
1. Historical data: price changes vs usage/cancellation
2. Calculate elasticity: % change in demand / % change in price
3. Find optimal price point
"""

def calculate_elasticity(price_history, demand_history):
    price_changes = np.diff(price_history) / price_history[:-1]
    demand_changes = np.diff(demand_history) / demand_history[:-1]

    elasticity = demand_changes / price_changes
    return np.mean(elasticity)

# Elasticity < -1: Elastic (price sensitive)
# Elasticity > -1: Inelastic (less price sensitive)
```

**Pricing Strategy:**

- **Inelastic Segments:** Can increase prices (premium customers)
- **Elastic Segments:** Focus on volume, competitive pricing

---

### C. Dynamic Pricing Model

**Real-time package pricing based on:**

```python
def dynamic_price(base_price, factors):
    price = base_price

    # Demand-based
    if factors['demand'] > 0.8:
        price *= 1.1  # High demand surge

    # Time-based
    if factors['off_peak']:
        price *= 0.9  # Off-peak discount

    # Loyalty-based
    if factors['tenure'] > 12:
        price *= 0.95  # Loyalty discount

    # Utilization-based
    if factors['utilization'] > 0.9:
        price *= 1.05  # Heavy user premium

    return price
```

---

## 🧮 5. ADVANCED ANALYTICS TECHNIQUES

### A. Survival Analysis (Kaplan-Meier)

**For Customer Retention:**

```python
from lifelines import KaplanMeierFitter

kmf = KaplanMeierFitter()
kmf.fit(durations=customer_tenure, event_observed=churned)

# Predict survival probability
survival_at_12_months = kmf.survival_function_at_times(12)

# Compare different segments
kmf_premium.fit(premium_customers['tenure'], premium_customers['churned'])
kmf_basic.fit(basic_customers['tenure'], basic_customers['churned'])
```

**Use Case:** Understand at what tenure customers are most likely to churn

---

### B. Propensity Score Matching

**For A/B Testing Package Changes:**

```python
"""
Match customers in treatment (new package) vs control (old package)
based on similar characteristics to measure true impact
"""

from sklearn.linear_model import LogisticRegression

# Calculate propensity scores
X = customer_features
treatment = package_assignment
lr = LogisticRegression()
lr.fit(X, treatment)
propensity_scores = lr.predict_proba(X)[:, 1]

# Match customers with similar scores
# Measure retention difference
```

---

### C. Cohort Analysis

**Track customer behavior over time:**

```python
def cohort_analysis(df):
    # Group by signup month
    df['cohort'] = df['signup_date'].dt.to_period('M')

    # Calculate retention by cohort
    cohort_data = df.groupby(['cohort', 'months_since_signup']).agg({
        'customer_id': 'count',
        'monthly_spend': 'mean',
        'usage_km': 'mean'
    })

    return cohort_data
```

**Insights:**

- Which acquisition channels produce best customers?
- When do customers typically upgrade/downgrade?
- Seasonal patterns in usage

---

### D. Market Basket Analysis

**Find complementary services:**

```python
from mlxtend.frequent_patterns import apriori, association_rules

# Transaction data: customer x services used
transactions = df.groupby('customer_id')['services'].apply(list)

# Find associations
frequent_itemsets = apriori(transactions, min_support=0.1)
rules = association_rules(frequent_itemsets, metric="confidence")

# Example output:
# {Battery Swap Premium} → {Extended Warranty} (confidence: 0.75)
```

**Use Case:** Bundle packages, cross-sell opportunities

---

## 🔧 6. FEATURE ENGINEERING TECHNIQUES

### Critical Derived Features:

```python
# 1. Usage Intensity Score
usage_intensity = (daily_km * swaps_per_week * avg_speed) / 1000

# 2. Efficiency Ratio
efficiency = monthly_km / (swaps_per_month * battery_capacity)

# 3. Peak Load Factor
peak_factor = peak_hour_usage / total_usage

# 4. Consistency Score (lower variance = more predictable)
consistency = 1 / (std_daily_km / mean_daily_km + 0.1)

# 5. Value Perception
value_score = (battery_health * uptime) / monthly_spend

# 6. Engagement Score
engagement = (app_logins + swaps + referrals) / days_active

# 7. Growth Trajectory
growth_rate = (usage_current_month - usage_last_month) / usage_last_month

# 8. Weekend Warrior Index
weekend_index = weekend_km / weekday_km

# 9. Distance per Trip
avg_trip_distance = total_km / total_trips

# 10. Swap Efficiency
swap_efficiency = km_per_swap / battery_range_new
```

---

## 📈 7. MODEL EVALUATION METRICS

### For Clustering:

- **Silhouette Score** (0.5-1.0: good separation)
- **Davies-Bouldin Index** (lower is better)
- **Calinski-Harabasz Score** (higher is better)
- **Business Validation:** Do clusters make business sense?

### For Classification (Churn):

- **Precision:** Of predicted churners, how many actually churned?
- **Recall:** Of actual churners, how many did we catch?
- **F1-Score:** Harmonic mean of precision & recall
- **AUC-ROC:** Overall discriminative ability
- **Profit Curve:** Expected profit from interventions

### For Regression (Usage Prediction):

- **RMSE:** Average prediction error (in km)
- **MAPE:** Percentage error
- **R²:** Variance explained
- **Prediction Intervals:** Confidence ranges

---

## 🚀 8. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Month 1-2)

1. **Data Collection Pipeline:**

   - Set up telemetry data warehouse
   - Clean and validate historical data
   - Define key metrics and KPIs

2. **Exploratory Analysis:**
   - Basic statistics and distributions
   - Correlation analysis
   - Identify data quality issues

### Phase 2: Basic Models (Month 3-4)

1. **Simple Segmentation:**

   - K-Means clustering (3-4 segments)
   - RFM analysis
   - Define initial package tiers

2. **Rule-Based Recommendations:**
   - Usage-based rules
   - A/B test with 10% of customers

### Phase 3: Advanced Models (Month 5-6)

1. **Predictive Models:**

   - Usage prediction (Gradient Boosting)
   - Churn prediction (Random Forest)
   - Feature importance analysis

2. **Automated Recommendations:**
   - Deploy ML-based recommender
   - Real-time scoring API

### Phase 4: Optimization (Month 7-8)

1. **Revenue Optimization:**

   - CLV modeling
   - Dynamic pricing experiments
   - Package restructuring

2. **Continuous Improvement:**
   - Model retraining pipeline
   - A/B testing framework
   - Feedback loops

---

## 🛠️ 9. TECHNOLOGY STACK

### Data Storage:

- **PostgreSQL/MySQL** - Customer data, transactions
- **InfluxDB/TimescaleDB** - Telemetry time-series data
- **Redis** - Real-time caching

### Processing:

- **Apache Spark** - Large-scale data processing
- **Apache Kafka** - Real-time streaming
- **Airflow** - Workflow orchestration

### ML Platform:

- **Python** (scikit-learn, XGBoost, TensorFlow)
- **MLflow** - Experiment tracking
- **SageMaker/Vertex AI** - Model deployment

### Visualization:

- **Tableau/Power BI** - Business dashboards
- **Plotly/Streamlit** - Interactive analytics

---

## 📊 10. KEY METRICS TO TRACK

### Customer Metrics:

- **Monthly Active Users (MAU)**
- **Average Revenue Per User (ARPU)**
- **Customer Acquisition Cost (CAC)**
- **CAC Payback Period**
- **Net Promoter Score (NPS)**

### Usage Metrics:

- **Average km per customer**
- **Swaps per customer per month**
- **Battery utilization rate**
- **Peak vs off-peak usage ratio**

### Financial Metrics:

- **Monthly Recurring Revenue (MRR)**
- **Customer Lifetime Value (CLV)**
- **CLV:CAC Ratio** (should be >3:1)
- **Gross Margin per customer**
- **Churn Rate** (monthly & annual)

### Operational Metrics:

- **Battery swap wait time**
- **Vehicle uptime %**
- **Service request resolution time**
- **Complaint rate**

---

## 🎓 11. RESOURCES & NEXT STEPS

### Learn More:

1. **Books:**

   - "Python for Data Analysis" - Wes McKinney
   - "Hands-On Machine Learning" - Aurélien Géron
   - "Data Science for Business" - Provost & Fawcett

2. **Courses:**

   - Coursera: Machine Learning (Andrew Ng)
   - Fast.ai: Practical Deep Learning
   - Kaggle: Feature Engineering

3. **Papers:**
   - "Customer Lifetime Value Prediction" (Harvard Business Review)
   - "Churn Prediction in Subscription Services" (KDD)

### Getting Started Checklist:

- [ ] Audit current data collection (what's missing?)
- [ ] Set up data warehouse/pipeline
- [ ] Create baseline segmentation (simple rules)
- [ ] Build usage prediction model
- [ ] Deploy churn prediction model
- [ ] A/B test package recommendations
- [ ] Monitor and iterate

### Questions to Answer:

1. What's your current churn rate by package tier?
2. What % of customers are in the wrong package?
3. What's your average CLV?
4. Which customer segments are most profitable?
5. What factors predict high-value customers?

---

## 🔐 12. IMPORTANT CONSIDERATIONS

### Data Privacy:

- Anonymize personal data
- GDPR/local compliance
- Secure API endpoints
- Customer consent for tracking

### Model Fairness:

- Avoid discrimination by location/demographics
- Regular bias audits
- Transparent recommendation logic

### Business Constraints:

- Minimum package prices (profitability floor)
- Maximum discount limits
- Competitive positioning
- Brand perception

---

## 📞 CONCLUSION

This framework provides a complete roadmap from basic segmentation to advanced predictive models. Start simple with rule-based segmentation and RFM analysis, then gradually add ML models as you collect more data and validate approaches.

**Remember:** The best model is one that's actually deployed and used. Start with 70% accuracy that drives decisions, rather than pursuing 95% accuracy that never ships.

**Key Success Factors:**

1. ✅ Clean, reliable data
2. ✅ Clear business objectives
3. ✅ Simple initial models
4. ✅ Rapid iteration and testing
5. ✅ Cross-functional collaboration (data + business + product)

Good luck building your analytics platform! 🚀
