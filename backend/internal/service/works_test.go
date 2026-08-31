package service

import "testing"

func str(value string) *string { return &value }

func TestWorkUpdateValidation(t *testing.T) {
	for _, input := range []UpdateWorkInput{
		{}, {Title: str(" ")}, {Type: str("invalid")},
		{ExternalURL: str("javascript:alert(1)")}, {RepositoryURL: str("https://secret:password@example.com")},
		{CoverURL: str("//example.com/x")}, {CoverURL: str("/\\example.com/x")}, {ExternalURL: str("https://")},
	} {
		if err := validateWorkUpdate(&input); err == nil {
			t.Fatalf("invalid update accepted: %+v", input)
		}
	}
	input := UpdateWorkInput{Title: str(" 新作品 "), Summary: str(""), RepositoryURL: str(""), CoverURL: str("/covers/test.jpg")}
	if err := validateWorkUpdate(&input); err != nil {
		t.Fatal(err)
	}
	if *input.Title != "新作品" || *input.Summary != "" || input.ExternalURL != nil {
		t.Fatal("partial update semantics changed")
	}
}
