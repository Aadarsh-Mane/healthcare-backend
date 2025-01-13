FROM ghcr.io/puppeteer/puppeteer:23.10.1 



# Set the executable path for Puppeteer to used
RUN apt-get update && apt-get install -y google-chrome-stable

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app
RUN which chromium || echo "Chromium not found"

COPY package.json ./
RUN npm ci 

COPY . .

CMD ["node", "index.js"]
