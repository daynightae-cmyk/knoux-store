FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastmcp==2.13.1 \
    httpx==0.28.1

COPY control.py server.py ./

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["python", "server.py"]
