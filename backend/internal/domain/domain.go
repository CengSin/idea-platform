package domain

const (
	DefaultUserID  = "user_linshen"
	StallAfterDays = 21
)

var ActiveAttemptStatuses = []string{"understanding", "prototyping", "testing"}

type ActorRef struct {
	Kind        string `json:"kind"`
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

type License struct {
	Implementation bool   `json:"implementation"`
	Derivatives    bool   `json:"derivatives"`
	CommercialUse  string `json:"commercialUse"`
}

func DefaultLicense() License {
	return License{
		Implementation: true,
		Derivatives:    true,
		CommercialUse:  "with_attribution",
	}
}

type ExistingAttemptRef struct {
	Title string `json:"title"`
	URL   string `json:"url,omitempty"`
	Note  string `json:"note,omitempty"`
}

type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type ProjectLink struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	URL       string `json:"url"`
	Note      string `json:"note,omitempty"`
	CreatedAt string `json:"createdAt"`
}

type User struct {
	ID           string        `json:"id" gorm:"primaryKey;size:64"`
	DisplayName  string        `json:"displayName" gorm:"size:128"`
	Initials     string        `json:"initials" gorm:"size:16"`
	Accent       string        `json:"accent" gorm:"size:16"`
	Bio          string        `json:"bio" gorm:"type:text"`
	Skills       []string      `json:"skills" gorm:"serializer:json;type:json"`
	Visibility   string        `json:"visibility" gorm:"size:32"`
	CreatedAt    string        `json:"createdAt" gorm:"column:created_at;size:40;autoCreateTime:false"`
	ProjectLinks []ProjectLink `json:"projectLinks" gorm:"serializer:json;type:json"`
}

func (User) TableName() string { return "users" }

type Idea struct {
	ID               string               `json:"id" gorm:"primaryKey;size:64"`
	Title            string               `json:"title" gorm:"size:512"`
	Summary          string               `json:"summary" gorm:"type:text"`
	Problem          string               `json:"problem" gorm:"type:text"`
	WhyItMatters     string               `json:"whyItMatters" gorm:"type:text"`
	Constraints      []string             `json:"constraints" gorm:"serializer:json;type:json"`
	ExistingAttempts []ExistingAttemptRef `json:"existingAttempts" gorm:"serializer:json;type:json"`
	OpenQuestions    []string             `json:"openQuestions" gorm:"serializer:json;type:json"`
	DesiredOutputs   []string             `json:"desiredOutputs" gorm:"serializer:json;type:json"`
	Tags             []string             `json:"tags" gorm:"serializer:json;type:json"`
	Author           ActorRef             `json:"author" gorm:"serializer:json;type:json"`
	AuthorUserID     string               `json:"-" gorm:"size:64;index"`
	License          License              `json:"license" gorm:"serializer:json;type:json"`
	Visibility       string               `json:"visibility" gorm:"size:32;index"`
	Status           string               `json:"status" gorm:"size:32;index"`
	ParentIdeaID     string               `json:"parentIdeaId,omitempty" gorm:"size:64;index"`
	SourceWorkID     string               `json:"sourceWorkId,omitempty" gorm:"size:64;index"`
	Graph            Point                `json:"graph" gorm:"serializer:json;type:json"`
	CreatedAt        string               `json:"createdAt" gorm:"column:created_at;size:40;autoCreateTime:false"`
	UpdatedAt        string               `json:"updatedAt" gorm:"column:updated_at;size:40;autoUpdateTime:false"`
}

func (Idea) TableName() string { return "ideas" }

type Attempt struct {
	ID                 string   `json:"id" gorm:"primaryKey;size:64"`
	IdeaID             string   `json:"ideaId" gorm:"size:64;index"`
	OwnerID            string   `json:"ownerId" gorm:"size:64;index"`
	Title              string   `json:"title" gorm:"size:256"`
	Approach           string   `json:"approach" gorm:"type:text"`
	ProjectDescription string   `json:"projectDescription,omitempty" gorm:"type:text"`
	ProjectPurpose     string   `json:"projectPurpose,omitempty" gorm:"type:text"`
	ExecutionPrompt    string   `json:"executionPrompt,omitempty" gorm:"type:text"`
	Status             string   `json:"status" gorm:"size:32;index"`
	ProgressNote       string   `json:"progressNote" gorm:"type:text"`
	Visibility         string   `json:"visibility" gorm:"size:32"`
	Blockers           []string `json:"blockers" gorm:"serializer:json;type:json"`
	StartedAt          string   `json:"startedAt" gorm:"size:40"`
	LastActiveAt       string   `json:"lastActiveAt" gorm:"size:40"`
	CreatedAt          string   `json:"createdAt" gorm:"column:created_at;size:40;autoCreateTime:false"`
	TargetDate         string   `json:"targetDate,omitempty" gorm:"size:32"`
	WorkIDs            []string `json:"workIds" gorm:"serializer:json;type:json"`
	Graph              *Point   `json:"graph,omitempty" gorm:"serializer:json;type:json"`
	FeaturedOnGraph    bool     `json:"featuredOnGraph"`
}

func (Attempt) TableName() string { return "attempts" }

type Credit struct {
	UserID string `json:"userId,omitempty"`
	Role   string `json:"role"`
	Name   string `json:"name"`
}

type Work struct {
	ID            string   `json:"id" gorm:"primaryKey;size:64"`
	AttemptID     string   `json:"attemptId" gorm:"size:64;index"`
	IdeaID        string   `json:"ideaId" gorm:"size:64;index"`
	Title         string   `json:"title" gorm:"size:256"`
	Summary       string   `json:"summary" gorm:"type:text"`
	Type          string   `json:"type" gorm:"size:32"`
	CoverURL      string   `json:"coverUrl" gorm:"size:1024"`
	ExternalURL   string   `json:"externalUrl,omitempty" gorm:"size:1024"`
	RepositoryURL string   `json:"repositoryUrl,omitempty" gorm:"size:1024"`
	Status        string   `json:"status" gorm:"size:32;index"`
	Credits       []Credit `json:"credits" gorm:"serializer:json;type:json"`
	License       License  `json:"license" gorm:"serializer:json;type:json"`
	PublishedAt   string   `json:"publishedAt,omitempty" gorm:"size:40"`
	Views         int      `json:"views"`
	Saves         int      `json:"saves"`
	Citations     int      `json:"citations"`
	Graph         *Point   `json:"graph,omitempty" gorm:"serializer:json;type:json"`
}

func (Work) TableName() string { return "works" }

type Event struct {
	ID        string `json:"id" gorm:"primaryKey;size:64"`
	At        string `json:"at" gorm:"size:40;index"`
	ActorID   string `json:"actorId" gorm:"size:64"`
	ActorName string `json:"actorName" gorm:"size:128"`
	Text      string `json:"text" gorm:"type:text"`
	IdeaID    string `json:"ideaId,omitempty" gorm:"size:64;index"`
	AttemptID string `json:"attemptId,omitempty" gorm:"size:64"`
	WorkID    string `json:"workId,omitempty" gorm:"size:64"`
}

func (Event) TableName() string { return "events" }

type Notification struct {
	ID     string `json:"id" gorm:"primaryKey;size:64"`
	UserID string `json:"userId,omitempty" gorm:"size:64;index"`
	At     string `json:"at" gorm:"size:40"`
	Title  string `json:"title" gorm:"size:256"`
	Body   string `json:"body" gorm:"type:text"`
	Read   bool   `json:"read" gorm:"column:is_read"`
	Href   string `json:"href" gorm:"size:256"`
	Kind   string `json:"kind" gorm:"size:32"`
}

type Account struct {
	UserID       string `json:"userId" gorm:"primaryKey;size:64"`
	Email        string `json:"email" gorm:"size:255;uniqueIndex"`
	DisplayName  string `json:"displayName" gorm:"size:128"`
	PasswordSalt string `json:"passwordSalt" gorm:"size:128"`
	PasswordHash string `json:"passwordHash" gorm:"size:256"`
	CreatedAt    string `json:"createdAt" gorm:"column:created_at;size:40;autoCreateTime:false"`
}

func (Account) TableName() string { return "accounts" }

type Session struct {
	TokenHash string `json:"tokenHash" gorm:"primaryKey;size:64"`
	UserID    string `json:"userId" gorm:"size:64;index"`
	ExpiresAt string `json:"expiresAt" gorm:"size:40"`
}

func (Session) TableName() string { return "sessions" }

type AgentToken struct {
	TokenHash string `json:"tokenHash" gorm:"primaryKey;size:64"`
	UserID    string `json:"userId" gorm:"size:64;index"`
	AttemptID string `json:"attemptId" gorm:"size:64;index"`
	CreatedAt string `json:"createdAt" gorm:"size:40"`
	ExpiresAt string `json:"expiresAt" gorm:"size:40"`
}

func (AgentToken) TableName() string { return "agent_tokens" }

type AuthDump struct {
	Version     int          `json:"version"`
	Accounts    []Account    `json:"accounts"`
	Sessions    []Session    `json:"sessions"`
	AgentTokens []AgentToken `json:"agentTokens"`
}

func (Notification) TableName() string { return "notifications" }

type Follow struct {
	UserID string `json:"userId" gorm:"primaryKey;size:64"`
	IdeaID string `json:"ideaId" gorm:"primaryKey;size:64;index"`
}

func (Follow) TableName() string { return "follows" }

type IdeaMetrics struct {
	WatchingCount      int `json:"watchingCount"`
	ActiveAttemptCount int `json:"activeAttemptCount"`
	PausedAttemptCount int `json:"pausedAttemptCount"`
	WorkCount          int `json:"workCount"`
	ForkCount          int `json:"forkCount"`
	TotalAttemptCount  int `json:"totalAttemptCount"`
}

type IdeaContext struct {
	IdeaID           string               `json:"idea_id"`
	Title            string               `json:"title"`
	Summary          string               `json:"summary"`
	Problem          string               `json:"problem"`
	WhyItMatters     string               `json:"why_it_matters"`
	Constraints      []string             `json:"constraints"`
	ExistingAttempts []ExistingAttemptRef `json:"existing_attempts"`
	OpenQuestions    []string             `json:"open_questions"`
	DesiredOutputs   []string             `json:"desired_outputs"`
	License          License              `json:"license"`
	Tags             []string             `json:"tags"`
	Source           IdeaContextSource    `json:"source"`
}

type IdeaContextSource struct {
	URL    string `json:"url"`
	Author string `json:"author"`
}

type Snapshot struct {
	Users         []User         `json:"users"`
	Ideas         []Idea         `json:"ideas"`
	Attempts      []Attempt      `json:"attempts"`
	Works         []Work         `json:"works"`
	Events        []Event        `json:"events"`
	Notifications []Notification `json:"notifications"`
	Follows       []Follow       `json:"follows"`
	Me            User           `json:"me"`
	UnreadCount   int            `json:"unreadCount"`
}

type IdeaListItem struct {
	Idea
	Metrics IdeaMetrics `json:"metrics"`
}

type AttemptListItem struct {
	Attempt
	IdeaTitle   string `json:"ideaTitle"`
	GraphStatus string `json:"graphStatus"`
	OwnerName   string `json:"ownerName,omitempty"`
}

type WorkListItem struct {
	Work
	IdeaTitle string `json:"ideaTitle"`
}
