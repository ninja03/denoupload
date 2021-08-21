FROM denoland/deno:1.13.1

WORKDIR /app

COPY . .

EXPOSE 8881
CMD ["run", "-A", "--unstable", "main.js"]
