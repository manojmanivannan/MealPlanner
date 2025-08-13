FROM python:3.9-slim

WORKDIR /app


RUN apt-get update && apt-get install -y wget
RUN pip install fastapi uvicorn psycopg2-binary sqlalchemy pydantic pydantic[email] passlib[bcrypt] bcrypt==4.0.1 PyJWT python-multipart

COPY . .

CMD python setup_db.py && uvicorn app:app --host 0.0.0.0 --port 5000 --reload