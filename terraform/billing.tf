# Cost monitoring and billing alerts
data "google_billing_account" "account" {
  billing_account = var.billing_account_id
}

resource "google_billing_budget" "mealplanner_budget" {
  provider        = google-beta
  billing_account = data.google_billing_account.account.id
  display_name    = "MealPlanner Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "30"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 0.75
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 0.9
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = []
    disable_default_iam_recipients   = false
    
    # Send email notifications to project owners
    pubsub_topic = google_pubsub_topic.budget_alerts.id
  }

  depends_on = [google_project_service.billing]
}

# Pub/Sub topic for budget alerts
resource "google_pubsub_topic" "budget_alerts" {
  name = "mealplanner-budget-alerts"
  
  depends_on = [google_project_service.billing]
}

# Subscription for budget alerts (can be used by Cloud Functions)
resource "google_pubsub_subscription" "budget_alerts_sub" {
  name  = "mealplanner-budget-alerts-sub"
  topic = google_pubsub_topic.budget_alerts.name
  
  ack_deadline_seconds = 20
}
