FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
EXPOSE 3000
ENV NEXT_PUBLIC_API_URL=http://localhost:5000/api
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
