package idgen

import (
	"crypto/rand"
	"fmt"
	"time"
)

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

func New(prefix string) string {
	return prefix + randString(8)
}

func NowISO() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}

func randString(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())[:n]
	}
	out := make([]byte, n)
	for i := 0; i < n; i++ {
		out[i] = alphabet[int(b[i])%len(alphabet)]
	}
	return string(out)
}
