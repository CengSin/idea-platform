.PHONY: up down logs tidy run test

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=80

tidy:
	go mod tidy

run:
	go run ./cmd/api

test:
	go test ./...
