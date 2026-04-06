FROM python:3.12-slim

# Install system dependencies + Terraform
RUN apt-get update && apt-get install -y \
    curl wget unzip gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Terraform
ARG TERRAFORM_VERSION=1.8.3
RUN wget -q https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
    && unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
    && mv terraform /usr/bin/terraform \
    && rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

WORKDIR /app

# Install Python deps first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create terraform workdir
RUN mkdir -p /tmp/terraform

# Non-root user
RUN useradd -m -u 1001 appuser \
    && chown -R appuser:appuser /app /tmp/terraform
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
