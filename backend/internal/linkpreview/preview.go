package linkpreview

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"
)

const (
	maxHTMLBytes = 1_000_000
	maxRedirects = 4
	cacheTTL     = 6 * time.Hour
)

type Result struct {
	ImageURL string
	PageURL  string
	Source   string
}

type cacheEntry struct {
	expiresAt time.Time
	result    *Result
}

var previewCache = struct {
	sync.Mutex
	entries map[string]cacheEntry
}{entries: map[string]cacheEntry{}}

func privateIPv4(ip net.IP) bool {
	v4 := ip.To4()
	if v4 == nil {
		return false
	}
	a, b := v4[0], v4[1]
	return a == 0 || a == 10 || a == 127 ||
		(a == 100 && b >= 64 && b <= 127) ||
		(a == 169 && b == 254) ||
		(a == 172 && b >= 16 && b <= 31) ||
		(a == 192 && b == 0) ||
		(a == 192 && b == 168) || a >= 224
}

func privateIP(ip net.IP) bool {
	if ip == nil || ip.IsUnspecified() || ip.IsLoopback() || ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() {
		return true
	}
	if privateIPv4(ip) {
		return true
	}
	return strings.HasPrefix(strings.ToLower(ip.String()), "2001:db8:")
}

func publicIPs(ctx context.Context, hostname string) ([]net.IP, error) {
	hostname = strings.TrimSuffix(strings.ToLower(hostname), ".")
	if hostname == "localhost" || strings.HasSuffix(hostname, ".localhost") ||
		strings.HasSuffix(hostname, ".local") || strings.HasSuffix(hostname, ".internal") {
		return nil, errors.New("private host")
	}
	addresses, err := net.DefaultResolver.LookupIP(ctx, "ip", hostname)
	if err != nil || len(addresses) == 0 {
		return nil, errors.New("host lookup failed")
	}
	for _, ip := range addresses {
		if privateIP(ip) {
			return nil, errors.New("private address")
		}
	}
	return addresses, nil
}

func validateURL(ctx context.Context, target *url.URL) error {
	if target == nil || (target.Scheme != "http" && target.Scheme != "https") {
		return errors.New("unsupported protocol")
	}
	if target.User != nil {
		return errors.New("credentials are not allowed")
	}
	_, err := publicIPs(ctx, target.Hostname())
	return err
}

func safeDialContext(ctx context.Context, network, address string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, err
	}
	addresses, err := publicIPs(ctx, host)
	if err != nil {
		return nil, err
	}
	dialer := net.Dialer{Timeout: 5 * time.Second}
	var lastErr error
	for _, ip := range addresses {
		connection, dialErr := dialer.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
		if dialErr == nil {
			return connection, nil
		}
		lastErr = dialErr
	}
	return nil, lastErr
}

func client() *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	transport.DialContext = safeDialContext
	return &http.Client{
		Timeout:   5 * time.Second,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) > maxRedirects {
				return errors.New("too many redirects")
			}
			return validateURL(req.Context(), req.URL)
		},
	}
}

func metaImage(body []byte, pageURL *url.URL) *Result {
	tokenizer := html.NewTokenizer(bytes.NewReader(body))
	var openGraph, twitter string
	for {
		tokenType := tokenizer.Next()
		if tokenType == html.ErrorToken {
			break
		}
		if tokenType != html.StartTagToken && tokenType != html.SelfClosingTagToken {
			continue
		}
		token := tokenizer.Token()
		if !strings.EqualFold(token.Data, "meta") {
			continue
		}
		attrs := map[string]string{}
		for _, attr := range token.Attr {
			attrs[strings.ToLower(attr.Key)] = strings.TrimSpace(attr.Val)
		}
		key := strings.ToLower(attrs["property"])
		if key == "" {
			key = strings.ToLower(attrs["name"])
		}
		content := attrs["content"]
		if content == "" {
			continue
		}
		if openGraph == "" && (key == "og:image" || key == "og:image:url" || key == "og:image:secure_url") {
			openGraph = content
		}
		if twitter == "" && (key == "twitter:image" || key == "twitter:image:src") {
			twitter = content
		}
	}
	for _, candidate := range []struct {
		value  string
		source string
	}{{openGraph, "open_graph"}, {twitter, "twitter_card"}} {
		if candidate.value == "" {
			continue
		}
		imageURL, err := pageURL.Parse(candidate.value)
		if err == nil && (imageURL.Scheme == "http" || imageURL.Scheme == "https") {
			return &Result{ImageURL: imageURL.String(), PageURL: pageURL.String(), Source: candidate.source}
		}
	}
	return nil
}

func cached(key string) (*Result, bool) {
	previewCache.Lock()
	defer previewCache.Unlock()
	entry, ok := previewCache.entries[key]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(previewCache.entries, key)
		return nil, false
	}
	return entry.result, true
}

func remember(key string, result *Result) {
	previewCache.Lock()
	defer previewCache.Unlock()
	if len(previewCache.entries) >= 200 {
		for oldest := range previewCache.entries {
			delete(previewCache.entries, oldest)
			break
		}
	}
	previewCache.entries[key] = cacheEntry{expiresAt: time.Now().Add(cacheTTL), result: result}
}

func Resolve(ctx context.Context, rawURL string) *Result {
	target, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || validateURL(ctx, target) != nil {
		return nil
	}
	key := target.String()
	if result, ok := cached(key); ok {
		return result
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, key, nil)
	if err != nil {
		return nil
	}
	request.Header.Set("Accept", "text/html,application/xhtml+xml")
	request.Header.Set("User-Agent", "IdeaPlatform-LinkPreview/1.0")
	response, err := client().Do(request)
	if err != nil {
		remember(key, nil)
		return nil
	}
	defer response.Body.Close()
	contentType := strings.ToLower(response.Header.Get("Content-Type"))
	if response.StatusCode < 200 || response.StatusCode >= 300 ||
		(contentType != "" && !strings.Contains(contentType, "text/html") && !strings.Contains(contentType, "application/xhtml+xml")) ||
		response.ContentLength > maxHTMLBytes {
		remember(key, nil)
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, maxHTMLBytes+1))
	if err != nil || len(body) > maxHTMLBytes {
		remember(key, nil)
		return nil
	}
	result := metaImage(body, response.Request.URL)
	if result != nil {
		imageURL, parseErr := url.Parse(result.ImageURL)
		if parseErr != nil || validateURL(ctx, imageURL) != nil {
			result = nil
		}
	}
	remember(key, result)
	return result
}
