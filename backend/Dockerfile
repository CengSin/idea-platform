FROM golang:1.24-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=build /out/api /app/api
COPY seed/db.json /app/seed/db.json
ENV SEED_PATH=/app/seed/db.json
EXPOSE 8081
USER nonroot:nonroot
ENTRYPOINT ["/app/api"]
