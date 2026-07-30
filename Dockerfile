FROM node:22-alpine
WORKDIR /app

# تثبيت Chromium من حزم Alpine (أخف وأسرع من تحميل Puppeteer الافتراضي)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# إخبار Puppeteer يستخدم Chromium النظام بدل تحميل نسخته الخاصة
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN npm install -g pnpm@10.15.1
COPY package.json ./
COPY patches ./patches
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/index.js"]
