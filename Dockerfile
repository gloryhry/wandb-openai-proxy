# Stage 1: Build the application using a Debian-based image
# Change from denoland/deno:alpine to denoland/deno:debian
FROM denoland/deno:debian AS build

WORKDIR /app

# Cache dependencies
COPY deno.json .
RUN deno cache main.ts --config deno.json

# Copy source code and compile
COPY src/ ./src/
COPY main.ts .
COPY config.ts .
RUN deno compile --allow-net --allow-env --config deno.json --output server main.ts

# Stage 2: Create the final, small image
# Use a base distroless image that includes glibc and other common libraries
# We use 'base-debian11' instead of 'static-debian11' because the compiled
# binary is dynamically linked to glibc, not a fully static binary.
FROM gcr.io/distroless/base-debian11

WORKDIR /app

# Copy the compiled executable from the build stage
COPY --from=build /app/server .

# Expose the port the app runs on
EXPOSE 8000

# Set the entrypoint to be your compiled application
ENTRYPOINT ["./server"]