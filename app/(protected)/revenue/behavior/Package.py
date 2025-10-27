"""
EV Scooter Analytics: Customer Segmentation & Predictive Models
================================================================

This module contains various ML models and clustering techniques for:
1. Customer Segmentation (Finding optimal packages)
2. Usage Prediction
3. Churn Prediction
4. Package Recommendation
5. Revenue Optimization
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import silhouette_score, davies_bouldin_score
from scipy.cluster.hierarchy import dendrogram, linkage
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# 1. CUSTOMER SEGMENTATION MODELS
# ============================================================================

class CustomerSegmentation:
    """
    Multiple clustering approaches to segment customers into package tiers
    """
    
    def __init__(self, n_clusters=4):
        self.n_clusters = n_clusters
        self.scaler = StandardScaler()
        self.models = {}
        
    def prepare_features(self, df):
        """
        Feature engineering for clustering
        """
        features = pd.DataFrame()
        
        # Usage features
        features['monthly_km'] = df['daily_km'] * 30
        features['weekly_swaps'] = df['swaps_per_week']
        features['km_per_swap'] = features['monthly_km'] / (features['weekly_swaps'] * 4 + 0.1)
        
        # Temporal features
        features['peak_usage_ratio'] = df['peak_hour_usage']
        features['weekend_ratio'] = df['weekend_usage']
        features['night_ride_ratio'] = df['night_rides']
        
        # Behavioral features
        features['avg_speed'] = df['avg_speed']
        features['avg_trip_duration'] = df['avg_trip_duration']
        features['rides_per_day'] = features['monthly_km'] / (df['avg_trip_duration'] * df['avg_speed'] / 60)
        
        # Value features
        features['current_spend'] = df['monthly_spend']
        features['spend_per_km'] = df['monthly_spend'] / (features['monthly_km'] + 0.1)
        
        # Loyalty features
        features['tenure_months'] = df['tenure']
        features['service_adherence'] = 1 / (df['last_service_days'] + 1)
        
        return features
    
    def kmeans_segmentation(self, features):
        """
        K-Means clustering - Best for well-separated spherical clusters
        Use Case: Basic package tier segmentation
        """
        scaled_features = self.scaler.fit_transform(features)
        
        # Elbow method to find optimal k
        inertias = []
        silhouette_scores = []
        K_range = range(2, 8)
        
        for k in K_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(scaled_features)
            inertias.append(kmeans.inertia_)
            silhouette_scores.append(silhouette_score(scaled_features, kmeans.labels_))
        
        # Fit final model
        kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(scaled_features)
        
        self.models['kmeans'] = kmeans
        
        return {
            'clusters': clusters,
            'centers': self.scaler.inverse_transform(kmeans.cluster_centers_),
            'inertias': inertias,
            'silhouette_scores': silhouette_scores,
            'optimal_k_elbow': K_range[np.argmin(np.diff(inertias, 2)) + 2],  # Elbow point
            'optimal_k_silhouette': K_range[np.argmax(silhouette_scores)]
        }
    
    def hierarchical_clustering(self, features):
        """
        Agglomerative Hierarchical Clustering
        Use Case: Understanding customer hierarchy and nested segments
        """
        scaled_features = self.scaler.fit_transform(features)
        
        # Create linkage matrix for dendrogram
        linkage_matrix = linkage(scaled_features, method='ward')
        
        # Fit model
        hierarchical = AgglomerativeClustering(n_clusters=self.n_clusters, linkage='ward')
        clusters = hierarchical.fit_predict(scaled_features)
        
        self.models['hierarchical'] = hierarchical
        
        return {
            'clusters': clusters,
            'linkage_matrix': linkage_matrix
        }
    
    def dbscan_clustering(self, features, eps=0.5, min_samples=5):
        """
        DBSCAN - Density-based clustering
        Use Case: Finding unusual usage patterns, outliers, special customer groups
        """
        scaled_features = self.scaler.fit_transform(features)
        
        dbscan = DBSCAN(eps=eps, min_samples=min_samples)
        clusters = dbscan.fit_predict(scaled_features)
        
        n_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
        n_noise = list(clusters).count(-1)
        
        self.models['dbscan'] = dbscan
        
        return {
            'clusters': clusters,
            'n_clusters': n_clusters,
            'n_outliers': n_noise,
            'outlier_indices': np.where(clusters == -1)[0]
        }
    
    def rfm_segmentation(self, df):
        """
        RFM Analysis (Recency, Frequency, Monetary)
        Use Case: Customer value segmentation like telecom companies
        """
        # Recency: Days since last service (proxy for engagement)
        recency_score = pd.qcut(df['last_service_days'], q=4, labels=[4, 3, 2, 1])
        
        # Frequency: Usage frequency (rides per day)
        frequency = (df['daily_km'] / (df['avg_trip_duration'] * df['avg_speed'] / 60))
        frequency_score = pd.qcut(frequency.rank(method='first'), q=4, labels=[1, 2, 3, 4])
        
        # Monetary: Monthly spend
        monetary_score = pd.qcut(df['monthly_spend'].rank(method='first'), q=4, labels=[1, 2, 3, 4])
        
        # Combined RFM score
        rfm_score = recency_score.astype(int) + frequency_score.astype(int) + monetary_score.astype(int)
        
        # Segment customers
        def segment_rfm(score):
            if score >= 10:
                return 'Champions'
            elif score >= 8:
                return 'Loyal'
            elif score >= 6:
                return 'Potential'
            elif score >= 4:
                return 'At Risk'
            else:
                return 'Lost'
        
        segments = rfm_score.apply(segment_rfm)
        
        return {
            'rfm_scores': rfm_score,
            'segments': segments,
            'recency': recency_score,
            'frequency': frequency_score,
            'monetary': monetary_score
        }


# ============================================================================
# 2. USAGE PREDICTION MODELS
# ============================================================================

class UsagePrediction:
    """
    Predict future usage patterns to recommend appropriate packages
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        
    def prepare_features(self, df, target='future_monthly_km'):
        """
        Feature engineering for prediction
        """
        features = pd.DataFrame()
        
        # Historical usage
        features['avg_daily_km'] = df['daily_km']
        features['swaps_per_week'] = df['swaps_per_week']
        features['avg_speed'] = df['avg_speed']
        
        # Temporal patterns
        features['peak_usage'] = df['peak_hour_usage']
        features['weekend_usage'] = df['weekend_usage']
        features['night_rides'] = df['night_rides']
        
        # Customer characteristics
        features['tenure'] = df['tenure']
        features['battery_health'] = df['battery_health']
        
        # Derived features
        features['usage_intensity'] = df['daily_km'] * df['swaps_per_week']
        features['speed_distance_ratio'] = df['avg_speed'] / (df['daily_km'] + 1)
        
        # Seasonal/trend (if you have time series data)
        # features['month'] = df['date'].dt.month
        # features['day_of_week'] = df['date'].dt.dayofweek
        
        return features
    
    def train_gradient_boosting(self, X, y):
        """
        Gradient Boosting for usage prediction
        Best for: Capturing non-linear patterns
        """
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        model.fit(X_train_scaled, y_train)
        
        train_score = model.score(X_train_scaled, y_train)
        test_score = model.score(X_test_scaled, y_test)
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        self.model = model
        
        return {
            'model': model,
            'train_r2': train_score,
            'test_r2': test_score,
            'feature_importance': feature_importance
        }
    
    def predict_future_usage(self, customer_features):
        """
        Predict next month's usage
        """
        if self.model is None:
            raise ValueError("Model not trained yet!")
        
        scaled_features = self.scaler.transform(customer_features)
        predictions = self.model.predict(scaled_features)
        
        return predictions


# ============================================================================
# 3. CHURN PREDICTION MODEL
# ============================================================================

class ChurnPrediction:
    """
    Predict which customers are likely to churn
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        
    def engineer_churn_features(self, df):
        """
        Features that indicate churn risk
        """
        features = pd.DataFrame()
        
        # Usage decline indicators
        features['low_utilization'] = (df['daily_km'] < 10).astype(int)
        features['infrequent_swaps'] = (df['swaps_per_week'] < 2).astype(int)
        
        # Service issues
        features['overdue_service'] = (df['last_service_days'] > 60).astype(int)
        features['complaints'] = df['complaints']
        features['payment_delays'] = df['payment_delays']
        
        # Engagement metrics
        features['tenure'] = df['tenure']
        features['tenure_squared'] = df['tenure'] ** 2  # New customers & very old
        features['referrals'] = df['referrals']
        
        # Usage patterns
        features['weekend_usage'] = df['weekend_usage']
        features['peak_usage'] = df['peak_hour_usage']
        features['avg_speed'] = df['avg_speed']
        
        # Economic factors
        features['spend_per_km'] = df['monthly_spend'] / (df['daily_km'] * 30 + 0.1)
        features['value_perception'] = df['battery_health'] / (df['monthly_spend'] + 1)
        
        # Interaction features
        features['engagement_score'] = (
            df['tenure'] * df['referrals'] * (1 + df['swaps_per_week'])
        ) / (df['complaints'] + 1)
        
        return features
    
    def train_churn_model(self, X, y):
        """
        Random Forest for churn prediction
        """
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            class_weight='balanced'  # Handle imbalanced churn data
        )
        
        model.fit(X_train_scaled, y_train)
        
        train_score = model.score(X_train_scaled, y_train)
        test_score = model.score(X_test_scaled, y_test)
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        self.model = model
        
        return {
            'model': model,
            'train_accuracy': train_score,
            'test_accuracy': test_score,
            'feature_importance': feature_importance
        }
    
    def predict_churn_probability(self, customer_features):
        """
        Get churn probability for customers
        """
        if self.model is None:
            raise ValueError("Model not trained yet!")
        
        scaled_features = self.scaler.transform(customer_features)
        churn_probabilities = self.model.predict_proba(scaled_features)[:, 1]
        
        return churn_probabilities


# ============================================================================
# 4. PACKAGE RECOMMENDATION ENGINE
# ============================================================================

class PackageRecommender:
    """
    Recommend optimal package based on usage patterns
    """
    
    def __init__(self):
        self.packages = {
            'Light Rider': {'km': 400, 'swaps': 8, 'price': 999},
            'Daily Commuter': {'km': 900, 'swaps': 16, 'price': 1799},
            'Power User': {'km': 1800, 'swaps': 30, 'price': 2999},
            'Enterprise': {'km': float('inf'), 'swaps': float('inf'), 'price': 4999}
        }
    
    def rule_based_recommendation(self, customer_data):
        """
        Simple rule-based recommendation
        """
        monthly_km = customer_data['daily_km'] * 30
        monthly_swaps = customer_data['swaps_per_week'] * 4
        
        # Add buffer (20% extra for growth)
        km_needed = monthly_km * 1.2
        swaps_needed = monthly_swaps * 1.2
        
        for package_name, limits in self.packages.items():
            if km_needed <= limits['km'] and swaps_needed <= limits['swaps']:
                return {
                    'recommended_package': package_name,
                    'confidence': 'high',
                    'utilization': (monthly_km / limits['km']) * 100 if limits['km'] != float('inf') else 0,
                    'monthly_cost': limits['price']
                }
        
        return {
            'recommended_package': 'Enterprise',
            'confidence': 'high',
            'utilization': 0,
            'monthly_cost': self.packages['Enterprise']['price']
        }
    
    def ml_based_recommendation(self, customer_features, predicted_usage, churn_risk):
        """
        ML-enhanced recommendation considering multiple factors
        """
        # Calculate optimal package
        base_recommendation = self.rule_based_recommendation({
            'daily_km': predicted_usage / 30,
            'swaps_per_week': customer_features['swaps_per_week']
        })
        
        # Adjust for churn risk
        if churn_risk > 0.6:
            # High churn risk - suggest downgrade to reduce cost
            current_idx = list(self.packages.keys()).index(base_recommendation['recommended_package'])
            if current_idx > 0:
                base_recommendation['recommended_package'] = list(self.packages.keys())[current_idx - 1]
                base_recommendation['reason'] = 'Cost optimization to reduce churn risk'
        
        # Adjust for growth trajectory
        if customer_features.get('tenure', 0) < 6:
            # New customer - likely to grow usage
            current_idx = list(self.packages.keys()).index(base_recommendation['recommended_package'])
            if current_idx < len(self.packages) - 1:
                base_recommendation['recommended_package'] = list(self.packages.keys())[current_idx + 1]
                base_recommendation['reason'] = 'Growth buffer for new customer'
        
        return base_recommendation


# ============================================================================
# 5. REVENUE OPTIMIZATION
# ============================================================================

class RevenueOptimizer:
    """
    Optimize pricing and packages for maximum revenue
    """
    
    def calculate_customer_lifetime_value(self, customer_data):
        """
        CLV = (Monthly Revenue × Gross Margin × Customer Lifespan) + Referral Value
        """
        monthly_revenue = customer_data['monthly_spend']
        gross_margin = 0.4  # Assume 40% margin
        
        # Expected lifespan based on churn risk
        churn_risk = customer_data.get('churn_risk', 0.3)
        expected_months = 36 * (1 - churn_risk)
        
        # Referral value
        referral_value = customer_data.get('referrals', 0) * 500  # ₹500 per referral
        
        clv = (monthly_revenue * gross_margin * expected_months) + referral_value
        
        return clv
    
    def optimize_package_pricing(self, customer_segments, usage_data):
        """
        Price elasticity and optimization
        """
        insights = {
            'upsell_opportunities': [],
            'downsell_risks': [],
            'price_sensitive': [],
            'premium_candidates': []
        }
        
        for idx, customer in customer_segments.iterrows():
            utilization = usage_data.loc[idx, 'utilization']
            
            if utilization > 85:
                insights['upsell_opportunities'].append({
                    'customer_id': idx,
                    'current_package': customer['current_package'],
                    'utilization': utilization,
                    'recommendation': 'Upgrade before overage charges'
                })
            
            elif utilization < 40:
                insights['downsell_risks'].append({
                    'customer_id': idx,
                    'current_package': customer['current_package'],
                    'utilization': utilization,
                    'recommendation': 'Proactive downgrade to retain'
                })
            
            # Price sensitivity based on payment behavior
            if customer.get('payment_delays', 0) > 0:
                insights['price_sensitive'].append(idx)
            
            # Premium candidates: high usage, high loyalty, low churn
            if (customer.get('tenure', 0) > 12 and 
                customer.get('churn_risk', 1) < 0.2 and
                usage_data.loc[idx, 'monthly_km'] > 1500):
                insights['premium_candidates'].append(idx)
        
        return insights


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Sample data (replace with your actual telemetry data)
    sample_data = pd.DataFrame({
        'daily_km': np.random.normal(30, 15, 100),
        'swaps_per_week': np.random.poisson(4, 100),
        'peak_hour_usage': np.random.uniform(0.3, 0.9, 100),
        'weekend_usage': np.random.uniform(0.2, 0.7, 100),
        'night_rides': np.random.uniform(0.1, 0.5, 100),
        'avg_speed': np.random.normal(35, 5, 100),
        'avg_trip_duration': np.random.normal(40, 15, 100),
        'tenure': np.random.randint(1, 36, 100),
        'battery_health': np.random.uniform(80, 98, 100),
        'monthly_spend': np.random.normal(1800, 600, 100),
        'last_service_days': np.random.randint(5, 90, 100),
        'complaints': np.random.poisson(0.3, 100),
        'payment_delays': np.random.poisson(0.2, 100),
        'referrals': np.random.poisson(1.5, 100)
    })
    
    print("="*80)
    print("EV SCOOTER ANALYTICS - MODEL DEMONSTRATION")
    print("="*80)
    
    # 1. Customer Segmentation
    print("\n1. CUSTOMER SEGMENTATION")
    print("-"*80)
    segmenter = CustomerSegmentation(n_clusters=4)
    features = segmenter.prepare_features(sample_data)
    
    kmeans_result = segmenter.kmeans_segmentation(features)
    print(f"K-Means Clustering:")
    print(f"  - Optimal K (Elbow): {kmeans_result['optimal_k_elbow']}")
    print(f"  - Optimal K (Silhouette): {kmeans_result['optimal_k_silhouette']}")
    print(f"  - Cluster distribution: {np.bincount(kmeans_result['clusters'])}")
    
    rfm_result = segmenter.rfm_segmentation(sample_data)
    print(f"\nRFM Segmentation:")
    print(rfm_result['segments'].value_counts())
    
    # 2. Usage Prediction
    print("\n2. USAGE PREDICTION")
    print("-"*80)
    predictor = UsagePrediction()
    
    # Create synthetic target (next month usage)
    sample_data['future_monthly_km'] = sample_data['daily_km'] * 30 * np.random.uniform(0.9, 1.1, len(sample_data))
    
    X = predictor.prepare_features(sample_data)
    y = sample_data['future_monthly_km']
    
    prediction_results = predictor.train_gradient_boosting(X, y)
    print(f"Model Performance:")
    print(f"  - Training R²: {prediction_results['train_r2']:.3f}")
    print(f"  - Testing R²: {prediction_results['test_r2']:.3f}")
    print(f"\nTop Features:")
    print(prediction_results['feature_importance'].head())
    
    # 3. Churn Prediction
    print("\n3. CHURN PREDICTION")
    print("-"*80)
    churn_predictor = ChurnPrediction()
    
    # Create synthetic churn labels
    sample_data['churned'] = ((sample_data['payment_delays'] > 0) | 
                                (sample_data['complaints'] > 1) |
                                (sample_data['last_service_days'] > 70)).astype(int)
    
    X_churn = churn_predictor.engineer_churn_features(sample_data)
    y_churn = sample_data['churned']
    
    churn_results = churn_predictor.train_churn_model(X_churn, y_churn)
    print(f"Model Performance:")
    print(f"  - Training Accuracy: {churn_results['train_accuracy']:.3f}")
    print(f"  - Testing Accuracy: {churn_results['test_accuracy']:.3f}")
    print(f"\nTop Churn Indicators:")
    print(churn_results['feature_importance'].head())
    
    # 4. Package Recommendations
    print("\n4. PACKAGE RECOMMENDATIONS")
    print("-"*80)
    recommender = PackageRecommender()
    
    sample_customer = {
        'daily_km': 35,
        'swaps_per_week': 5
    }
    
    recommendation = recommender.rule_based_recommendation(sample_customer)
    print(f"Sample Recommendation:")
    print(f"  - Package: {recommendation['recommended_package']}")
    print(f"  - Monthly Cost: ₹{recommendation['monthly_cost']}")
    print(f"  - Expected Utilization: {recommendation['utilization']:.1f}%")
    
    print("\n" + "="*80)
    print("Models ready for production deployment!")
    print("="*80)