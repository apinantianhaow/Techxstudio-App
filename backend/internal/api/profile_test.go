package api

import (
	"encoding/json"
	"strings"
	"testing"
)

const otherUserID = "22222222-2222-2222-2222-222222222222"

// profileUsers fakes users/username_history for the username checks.
type profileUsers struct {
	taken, held bool
	patchStatus int
	patchBody   string
}

func (p *profileUsers) respond(c restCall) (int, string) {
	switch {
	case c.Method == "GET" && c.Table == "users" && c.Query.Has("username_key"):
		if p.taken {
			return 200, `[{"id":"` + otherUserID + `"}]`
		}
	case c.Method == "GET" && c.Table == "username_history" && c.Query.Has("old_key"):
		if p.held {
			return 200, `[{"id":"h1"}]`
		}
	case c.Method == "PATCH" && c.Table == "users":
		if p.patchStatus != 0 {
			return p.patchStatus, p.patchBody
		}
		return 200, `[{"id":"` + testUserID + `","email":"a@b.co","username":"APXNAN"}]`
	}
	return 200, "[]"
}

func TestChangeUsername(t *testing.T) {
	users := &profileUsers{}
	env := newEnv(t, users.respond)
	tok := env.token(t)
	rename := func(name string) (int, map[string]any) {
		return call(t, env.handler, "PUT", "/api/auth/me", tok, map[string]any{"username": name})
	}

	for _, bad := range []string{"ab", "_apx", ".apx", "has space", "ไทยนะ", strings.Repeat("a", 31)} {
		status, body := rename(bad)
		wantError(t, status, body, 400, "Usernames are 3-30 characters: letters, numbers, _ or . (starting with a letter or number)")
	}
	status, body := rename("Admin")
	wantError(t, status, body, 409, "This username isn't available")

	users.taken = true
	status, body = rename("APXNAN")
	wantError(t, status, body, 409, "This username is already taken")
	q := env.rest.find("GET", "users")[0].Query
	if q.Get("username_key") != "eq.apxnan" || q.Get("id") != "neq."+testUserID {
		t.Fatalf("taken check must ignore case and the caller: %v", q)
	}

	users.taken, users.held = false, true
	status, body = rename("APXNAN")
	wantError(t, status, body, 409, "Someone used this username recently. Please choose another.")
	q = env.rest.find("GET", "username_history")[0].Query
	if q.Get("old_key") != "eq.apxnan" || q.Get("user_id") != "neq."+testUserID || !strings.HasPrefix(q.Get("changed_at"), "gte.") {
		t.Fatalf("hold check: %v", q)
	}
	if len(env.rest.find("PATCH", "users")) != 0 {
		t.Fatal("rejected names must not reach the update")
	}

	users.held = false
	status, body = rename("  APXNAN ")
	if status != 200 || body["user"].(map[string]any)["username"] != "APXNAN" {
		t.Fatalf("rename: got %d %v", status, body)
	}
	if patch := env.rest.find("PATCH", "users"); len(patch) != 1 || patch[0].Body != `{"username":"APXNAN"}` {
		t.Fatalf("update: %v", patch)
	}

	users.patchStatus, users.patchBody = 409, `{"code":"23505","message":"duplicate key value violates unique constraint \"idx_users_username_key\""}`
	status, body = rename("APXNAN")
	wantError(t, status, body, 409, "This username is already taken")
}

func TestUsernameAvailableAndHistory(t *testing.T) {
	users := &profileUsers{}
	env := newEnv(t, func(c restCall) (int, string) {
		if c.Table == "username_history" && c.Query.Get("select") == "old_username,new_username,changed_at" {
			return 200, `[{"old_username":"aphinan.thia","new_username":"APXNAN","changed_at":"2026-09-28T09:00:00+00:00"}]`
		}
		return users.respond(c)
	})
	tok := env.token(t)

	status, body := call(t, env.handler, "GET", "/api/auth/username-available?username=APXNAN", "", nil)
	wantError(t, status, body, 401, "Please log in")

	status, body = call(t, env.handler, "GET", "/api/auth/username-available?username=APXNAN", tok, nil)
	if status != 200 || body["available"] != true || body["reason"] != nil {
		t.Fatalf("available: got %d %v", status, body)
	}
	users.taken = true
	status, body = call(t, env.handler, "GET", "/api/auth/username-available?username=apxnan", tok, nil)
	if status != 200 || body["available"] != false || body["reason"] != "This username is already taken" {
		t.Fatalf("taken: got %d %v", status, body)
	}

	status, body = call(t, env.handler, "GET", "/api/auth/me/username-history", tok, nil)
	history, _ := body["history"].([]any)
	if status != 200 || len(history) != 1 || history[0].(map[string]any)["old_username"] != "aphinan.thia" {
		t.Fatalf("history: got %d %v", status, body)
	}
	calls := env.rest.find("GET", "username_history")
	q := calls[len(calls)-1].Query // earlier ones are the availability checks
	if q.Get("user_id") != "eq."+testUserID || q.Get("order") != "changed_at.desc" {
		t.Fatalf("history query: %v", q)
	}
}

// avatarEnv serves one user whose current photo is currentAvatar.
func avatarEnv(t *testing.T, currentAvatar func(base string) string) *testEnv {
	t.Helper()
	var env *testEnv
	env = newEnv(t, func(c restCall) (int, string) {
		switch {
		case c.Method == "GET" && c.Table == "users":
			avatar, _ := json.Marshal(currentAvatar(env.baseURL))
			return 200, `[{"id":"` + testUserID + `","email":"a@b.co","username":"apx","avatar_url":` + string(avatar) + `}]`
		case c.Method == "PATCH" && c.Table == "users":
			var patch map[string]any
			json.Unmarshal([]byte(c.Body), &patch)
			avatar, _ := json.Marshal(patch["avatar_url"])
			return 200, `[{"id":"` + testUserID + `","email":"a@b.co","username":"apx","avatar_url":` + string(avatar) + `}]`
		}
		return 200, "{}" // storage calls
	})
	return env
}

func storageCalls(env *testEnv, method string) []restCall {
	var out []restCall
	for _, c := range env.rest.calls {
		if c.Method == method && strings.HasPrefix(c.Table, "/storage/v1/") {
			out = append(out, c)
		}
	}
	return out
}

const pngHeader = "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"

func TestUploadAvatar(t *testing.T) {
	env := avatarEnv(t, func(base string) string {
		return base + "/storage/v1/object/public/avatars/" + testUserID + "/old.jpg"
	})
	tok := env.token(t)
	upload := func(body string) (int, map[string]any) {
		return call(t, env.handler, "PUT", "/api/auth/me/avatar", tok, body)
	}

	status, body := call(t, env.handler, "PUT", "/api/auth/me/avatar", "", pngHeader)
	wantError(t, status, body, 401, "Please log in")
	status, body = upload("")
	wantError(t, status, body, 400, "Choose a photo to upload")
	status, body = upload("<svg onload=alert(1)></svg>")
	wantError(t, status, body, 415, "Photos must be JPEG, PNG or WebP")
	status, body = upload(pngHeader + strings.Repeat("x", 2<<20))
	wantError(t, status, body, 413, "Photos must be 2 MB or smaller")
	if len(storageCalls(env, "POST")) != 0 {
		t.Fatal("rejected uploads must not reach storage")
	}

	status, body = upload(pngHeader + "pixels")
	if status != 200 {
		t.Fatalf("upload: got %d %v", status, body)
	}
	up := storageCalls(env, "POST")
	if len(up) != 1 || !strings.HasPrefix(up[0].Table, "/storage/v1/object/avatars/"+testUserID+"/") || !strings.HasSuffix(up[0].Table, ".png") ||
		up[0].Header.Get("Content-Type") != "image/png" || up[0].Header.Get("Authorization") != "Bearer service-key" || up[0].Header.Get("x-upsert") != "false" {
		t.Fatalf("storage upload: %+v", up)
	}
	newURL := env.baseURL + strings.Replace(up[0].Table, "/object/avatars/", "/object/public/avatars/", 1)
	if got := body["user"].(map[string]any)["avatar_url"]; got != newURL {
		t.Fatalf("avatar_url = %v, want %v", got, newURL)
	}
	del := storageCalls(env, "DELETE")
	if len(del) != 1 || del[0].Table != "/storage/v1/object/avatars" || del[0].Body != `{"prefixes":["`+testUserID+`/old.jpg"]}` {
		t.Fatalf("old photo should be removed: %+v", del)
	}
}

func TestDeleteAvatarLeavesForeignFilesAlone(t *testing.T) {
	for name, avatar := range map[string]func(string) string{
		"google photo":       func(string) string { return "https://lh3.googleusercontent.com/a/photo" },
		"another user's key": func(base string) string { return base + "/storage/v1/object/public/avatars/" + otherUserID + "/x.jpg" },
	} {
		env := avatarEnv(t, avatar)
		status, body := call(t, env.handler, "DELETE", "/api/auth/me/avatar", env.token(t), nil)
		if status != 200 || body["user"].(map[string]any)["avatar_url"] != nil {
			t.Fatalf("%s: got %d %v", name, status, body)
		}
		if patch := env.rest.find("PATCH", "users"); len(patch) != 1 || patch[0].Body != `{"avatar_url":null}` {
			t.Fatalf("%s: update %v", name, patch)
		}
		if del := storageCalls(env, "DELETE"); len(del) != 0 {
			t.Fatalf("%s: must not delete %+v", name, del)
		}
	}
}

func TestDeleteAccountRemovesAvatar(t *testing.T) {
	env := avatarEnv(t, func(base string) string {
		return base + "/storage/v1/object/public/avatars/" + testUserID + "/me.webp"
	})
	status, body := call(t, env.handler, "DELETE", "/api/auth/me", env.token(t), nil)
	if status != 200 || body["success"] != true {
		t.Fatalf("got %d %v", status, body)
	}
	if del := env.rest.find("DELETE", "users"); len(del) != 1 {
		t.Fatalf("account not deleted: %v", del)
	}
	if del := storageCalls(env, "DELETE"); len(del) != 1 || del[0].Body != `{"prefixes":["`+testUserID+`/me.webp"]}` {
		t.Fatalf("photo not removed: %+v", del)
	}
}
