FROM python:3.9-slim

WORKDIR /app


RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-latex-extra \
    lmodern \
    # Clean up to reduce image size
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN pip install fastapi uvicorn psycopg2-binary sqlalchemy pydantic pydantic[email] passlib[bcrypt] bcrypt==4.0.1 PyJWT python-multipart pylatex

COPY . .

CMD python setup_db.py && uvicorn app:app --host 0.0.0.0 --port 5000 --reload