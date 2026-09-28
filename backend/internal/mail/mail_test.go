package mail

import (
	"bufio"
	"context"
	"encoding/base64"
	"io"
	"mime"
	"mime/multipart"
	"net"
	netmail "net/mail"
	"strings"
	"testing"
)

// fakeSMTP accepts one message on localhost (no TLS, AUTH PLAIN) and records it.
type fakeSMTP struct {
	addr string
	auth chan string
	data chan string
}

func startFakeSMTP(t *testing.T) *fakeSMTP {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	f := &fakeSMTP{addr: ln.Addr().String(), auth: make(chan string, 1), data: make(chan string, 1)}

	go func() {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		r := bufio.NewReader(conn)
		reply := func(s string) { io.WriteString(conn, s+"\r\n") }
		reply("220 localhost ESMTP fake")
		for {
			line, err := r.ReadString('\n')
			if err != nil {
				return
			}
			cmd := strings.ToUpper(strings.Fields(line + " x")[0])
			switch cmd {
			case "EHLO", "HELO":
				reply("250-localhost")
				reply("250 AUTH PLAIN")
			case "AUTH":
				f.auth <- strings.TrimSpace(line)
				reply("235 2.7.0 Authentication successful")
			case "MAIL", "RCPT":
				reply("250 OK")
			case "DATA":
				reply("354 End data with <CR><LF>.<CR><LF>")
				var b strings.Builder
				for {
					l, err := r.ReadString('\n')
					if err != nil {
						return
					}
					if l == ".\r\n" {
						break
					}
					b.WriteString(l)
				}
				f.data <- b.String()
				reply("250 OK queued")
			case "QUIT":
				reply("221 Bye")
				return
			default:
				reply("502 unknown")
			}
		}
	}()
	return f
}

func TestSMTPSendsMultipartThaiMessage(t *testing.T) {
	f := startFakeSMTP(t)
	host, port, _ := net.SplitHostPort(f.addr)
	s := SMTP{Host: host, Port: port, Username: "shop@example.com", Password: "app-password", From: "TechXStudio <shop@example.com>"}

	err := s.Send(context.Background(), Message{
		To:      "ann@example.com",
		Subject: "รหัสยืนยัน TechXStudio",
		Text:    "รหัสของคุณคือ 042917",
		HTML:    "<p>รหัสของคุณคือ <b>042917</b></p>",
	})
	if err != nil {
		t.Fatal(err)
	}

	auth := <-f.auth
	creds, _ := base64.StdEncoding.DecodeString(strings.TrimPrefix(auth, "AUTH PLAIN "))
	if string(creds) != "\x00shop@example.com\x00app-password" {
		t.Fatalf("auth: %q", creds)
	}

	msg, err := netmail.ReadMessage(strings.NewReader(<-f.data))
	if err != nil {
		t.Fatal(err)
	}
	subject, _ := new(mime.WordDecoder).DecodeHeader(msg.Header.Get("Subject"))
	if subject != "รหัสยืนยัน TechXStudio" || msg.Header.Get("To") != "ann@example.com" || !strings.Contains(msg.Header.Get("From"), "shop@example.com") {
		t.Fatalf("headers: %v (subject %q)", msg.Header, subject)
	}
	mediaType, params, _ := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	if mediaType != "multipart/alternative" {
		t.Fatalf("content type %q", mediaType)
	}

	mr := multipart.NewReader(msg.Body, params["boundary"])
	var parts []string
	for {
		p, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(p)
		decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(string(raw), "\r\n", ""))
		if err != nil {
			t.Fatal(err)
		}
		parts = append(parts, p.Header.Get("Content-Type")+" | "+string(decoded))
	}
	want := []string{
		"text/plain; charset=utf-8 | รหัสของคุณคือ 042917",
		"text/html; charset=utf-8 | <p>รหัสของคุณคือ <b>042917</b></p>",
	}
	if strings.Join(parts, "\n") != strings.Join(want, "\n") {
		t.Fatalf("parts:\n%s", strings.Join(parts, "\n"))
	}
}

func TestSMTPRejectsBadFrom(t *testing.T) {
	err := SMTP{Host: "127.0.0.1", Port: "1", From: "not an address"}.Send(context.Background(), Message{To: "a@b.co"})
	if err == nil || !strings.Contains(err.Error(), "SMTP_FROM") {
		t.Fatalf("got %v", err)
	}
}

func TestBase64LinesAreShort(t *testing.T) {
	from, _ := netmail.ParseAddress("a@b.co")
	body, _ := build(from, Message{To: "c@d.co", Subject: "s", Text: strings.Repeat("ก", 500)})
	for _, line := range strings.Split(string(body), "\r\n") {
		if len(line) > 78 {
			t.Fatalf("line too long (%d): %q", len(line), line)
		}
	}
}
