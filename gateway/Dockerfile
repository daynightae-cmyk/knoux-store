FROM python:3.13-slim

WORKDIR /app

COPY requirements.lock ./
RUN pip install --no-cache-dir --only-binary :all: --require-hashes -r requirements.lock

COPY control.py server.py ./

ENV PYTHONUNBUFFERED=1
USER 10001:10001
EXPOSE 8080

CMD ["python", "server.py"]
