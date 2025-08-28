FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y wget
# Install dependencies from requirements-dev.txt if present, else fallback
COPY requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt || pip install fastapi uvicorn psycopg2-binary sqlalchemy pydantic pydantic[email] passlib[bcrypt] bcrypt==4.0.1 PyJWT python-multipart

COPY . .

# Use environment variables for DB and secret key
ENV DB_USER=mealplanner
ENV DB_PASSWORD=password
ENV DB_NAME=mealplanner
ENV DB_HOST=localhost
ENV SECRET_KEY=your_secret_key

# Production: no --reload, run setup_db then start app
CMD python setup_db.py && uvicorn app:app --host 0.0.0.0 --port 5000