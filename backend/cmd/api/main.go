package main

import (
	"context"
	"log"
	"time"

	"idea_platform/internal/config"
	"idea_platform/internal/httpapi"
	"idea_platform/internal/service"
	"idea_platform/internal/store"
)

func main() {
	cfg := config.Load()
	var st *store.Store
	var err error
	for i := 1; i <= 30; i++ {
		st, err = store.Open(cfg)
		if err == nil {
			break
		}
		log.Printf("waiting for deps (%d/30): %v", i, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("store: %v", err)
	}

	svc := service.New(st, cfg)
	if err := svc.SeedIfEmpty(context.Background()); err != nil {
		log.Fatalf("seed: %v", err)
	}

	r := httpapi.New(cfg, svc)
	log.Printf("idea-platform api listening on %s", cfg.HTTPAddr)
	if err := r.Run(cfg.HTTPAddr); err != nil {
		log.Fatal(err)
	}
}
