FROM ghcr.io/puppeteer/puppeteer:23.10.1 

# Install Chromium and required dependencies
RUN apt-get update && apt-get install -y chromium


# Set the executable path for Puppeteer to used
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app
RUN which chromium || echo "Chromium not found"

COPY package.json ./
RUN npm ci 

COPY . .

CMD ["node", "index.js"]
