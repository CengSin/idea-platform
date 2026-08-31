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

func TestPreviewFallsBackToFaviconWhenOpenGraphIsDefaultCover(t *testing.T) {
	pageURL, err := url.Parse("https://mood.example.com/")
	if err != nil {
		t.Fatal(err)
	}
	body := []byte(`<html><head>
		<meta property="og:image" content="https://idea.example.com/covers/hushcity.jpg">
		<link rel="icon" type="image/svg+xml" href="/favicon.svg">
	</head></html>`)
	result := metaImage(body, pageURL)
	if result == nil {
		t.Fatal("expected favicon fallback")
	}
	if result.ImageURL != "https://mood.example.com/favicon.svg" {
		t.Fatalf("unexpected image URL: %s", result.ImageURL)
	}
	if result.Source != "favicon" {
		t.Fatalf("unexpected source: %s", result.Source)
	}
}

func TestIsDefaultCover(t *testing.T) {
	if !IsDefaultCover("/covers/hushcity.jpg") {
		t.Fatal("relative default cover")
	}
	if !IsDefaultCover("https://idea-platform-delta.vercel.app/covers/hushcity.jpg") {
		t.Fatal("absolute default cover")
	}
	if IsDefaultCover("https://mood.example.com/og-image.jpg") {
		t.Fatal("unique cover should not be default")
	}
}

func TestSiteMark(t *testing.T) {
	got := SiteMark("https://mood.z-agent.ccwu.cc/admin")
	want := "https://www.google.com/s2/favicons?sz=128&domain=mood.z-agent.ccwu.cc"
	if got != want {
		t.Fatalf("got %s want %s", got, want)
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
