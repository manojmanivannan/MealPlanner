---
layout: home
title: 🍽️ Meal Planner
description: Plan your weekly meals, manage recipes, and track ingredients.
---

A simple, intuitive web application for planning your weekly meals, managing recipes, and tracking ingredients.

---

## 📸 Screenshots

![Weekly Planner](https://github.com/manojmanivannan/mealplanner/blob/master/samples/planner.png?raw=true)
![Recipe Hub](https://github.com/manojmanivannan/mealplanner/blob/master/samples/recipe_hub.png?raw=true)
![Ingredients](https://github.com/manojmanivannan/mealplanner/blob/master/samples/ingredients.png?raw=true)

---

## 🚀 **How to Run**

This project uses **Docker** for easy setup and deployment. You can run it locally or in production with **Tailscale** for secure remote access.

### 🖥️ **Local Development**

**Prerequisites:**

- Docker & Docker Compose installed

**Steps:**

```bash
docker-compose --profile local up --build
```

Access the application in your browser at: [http://localhost:8080](http://localhost:8080)


### 🌐 **Production with Tailscale**

#### Prerequisites:

- Docker & Docker Compose installed
- Tailscale account & auth key

#### Setup:

1. Create a .env file in the project root:
```bash
TS_AUTHKEY=your_tailscale_auth_key
```

2. Run:
```bash
docker-compose --profile prod up --build
```

Access the app on your Tailscale network: [http://meal_planner](http://meal_planner)

## ✨ **Features**

- Weekly Meal Planner: Interactive grid for assigning recipes to each meal.
- Recipe Hub: Store, edit, delete, and filter recipes by type & dietary preference.
- Ingredient Management: Track ingredients, monitor freshness, and sort by shelf life.
- Responsive Design: Works on both desktop & mobile devices.

## 🛠️ **Technologies Used**

**Backend:**
- FastAPI: Fast, modern Python API framework
- PostgreSQL: Relational database
- Psycopg2: PostgreSQL adapter for Python

**Frontend:**
- Tailwind CSS: Utility-first CSS
- JavaScript (ES6+): Frontend logic

**Deployment:**
- Docker: Containerization
- Nginx: Reverse proxy
- Tailscale: Secure networking