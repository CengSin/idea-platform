package linkpreview

import (
	"net"
	"net/url"
	"testing"
)

func TestMetaImagePrefersOpenGraphAndResolvesRelativeURL(t *testing.T) {
	pageURL, err := url.Parse("https://example.com/projects/demo")
	if err != nil {
		t.Fatal(err)
	}
	body := []byte(`<html><head>
		<meta name="twitter:image" content="https://cdn.example.com/twitter.jpg">
		<meta content="/images/preview.jpg" property="og:image">
	</head></html>`)
	result := metaImage(body, pageURL)
	if result == nil {
		t.Fatal("expected preview image")
	}
	if result.ImageURL != "https://example.com/images/preview.jpg" {
		t.Fatalf("unexpected image URL: %s", result.ImageURL)
	}
	if result.Source != "open_graph" {
		t.Fatalf("unexpected source: %s", result.Source)
	}
}

func TestPrivateIP(t *testing.T) {
	private := []string{"127.0.0.1", "10.0.0.2", "172.16.0.1", "192.168.1.2", "169.254.1.1", "::1", "fd00::1"}
	for _, address := range private {
		if !privateIP(net.ParseIP(address)) {
			t.Errorf("expected %s to be private", address)
		}
	}
	if privateIP(net.ParseIP("8.8.8.8")) {
		t.Error("expected 8.8.8.8 to be public")
	}
}
