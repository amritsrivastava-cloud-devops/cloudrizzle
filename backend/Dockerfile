############################
# Stage 1 – install deps
############################
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

############################
# Stage 2 – production runner
############################
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime tools: curl (healthcheck) + Terraform
RUN apk add --no-cache curl wget unzip && \
    wget -q https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zip && \
    unzip -q terraform_1.7.0_linux_amd64.zip && \
    mv terraform /usr/local/bin/terraform && \
    rm terraform_1.7.0_linux_amd64.zip && \
    apk del wget unzip && \
    # Create logs dir and set ownership BEFORE switching user
    mkdir -p /app/logs && \
    chown -R node:node /app

ENV NODE_ENV=production

# Copy node_modules from deps stage (already owned by root, readable by all)
COPY --from=deps /app/node_modules ./node_modules

# Copy app source and set ownership
COPY --chown=node:node . .

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "src/index.js"]
