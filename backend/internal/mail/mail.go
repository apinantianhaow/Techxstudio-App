// Package mail sends transactional email (sign-in codes) over SMTP.
package mail

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log/slog"
	"mime"
	"mime/multipart"
	"net"
	netmail "net/mail"
	"net/smtp"
	"net/textproto"
	"strings"
	"time"
)

// Message is a plain-text email with an optional HTML version.
type Message struct {
	To      string
	Subject string
	Text    string
	HTML    string
}

// Sender delivers messages.
type Sender interface {
	Send(ctx context.Context, m Message) error
}

// SMTP sends through an SMTP server that supports STARTTLS on port 587,
// e.g. smtp.gmail.com with a Google App Password.
type SMTP struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string // "TechXStudio <no-reply@example.com>"
}

func (s SMTP) Send(ctx context.Context, m Message) error {
	from, err := netmail.ParseAddress(s.From)
	if err != nil {
		return fmt.Errorf("mail: invalid SMTP_FROM %q: %w", s.From, err)
	}
	body, err := build(from, m)
	if err != nil {
		return err
	}

	addr := net.JoinHostPort(s.Host, s.Port)
	dialer := net.Dialer{Timeout: 10 * time.Second}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("mail: connect %s: %w", addr, err)
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(30 * time.Second))

	c, err := smtp.NewClient(conn, s.Host)
	if err != nil {
		return fmt.Errorf("mail: %w", err)
	}
	defer c.Close()
	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: s.Host}); err != nil {
			return fmt.Errorf("mail: starttls: %w", err)
		}
	}
	if s.Username != "" {
		// PlainAuth refuses to send the password over an unencrypted connection.
		if err := c.Auth(smtp.PlainAuth("", s.Username, s.Password, s.Host)); err != nil {
			return fmt.Errorf("mail: auth: %w", err)
		}
	}
	if err := c.Mail(from.Address); err != nil {
		return fmt.Errorf("mail: MAIL FROM: %w", err)
	}
	if err := c.Rcpt(m.To); err != nil {
		return fmt.Errorf("mail: RCPT TO: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("mail: DATA: %w", err)
	}
	if _, err := w.Write(body); err != nil {
		return fmt.Errorf("mail: write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("mail: send: %w", err)
	}
	return c.Quit()
}

// build renders m as a MIME message (multipart/alternative when it has HTML).
func build(from *netmail.Address, m Message) ([]byte, error) {
	var buf bytes.Buffer
	domain := from.Address[strings.LastIndex(from.Address, "@")+1:]
	id := make([]byte, 12)
	rand.Read(id)

	header := func(k, v string) { fmt.Fprintf(&buf, "%s: %s\r\n", k, v) }
	header("From", from.String())
	header("To", m.To)
	header("Subject", mime.QEncoding.Encode("utf-8", m.Subject))
	header("Date", time.Now().Format(time.RFC1123Z))
	header("Message-ID", "<"+hex.EncodeToString(id)+"@"+domain+">")
	header("MIME-Version", "1.0")

	if m.HTML == "" {
		header("Content-Type", "text/plain; charset=utf-8")
		header("Content-Transfer-Encoding", "base64")
		buf.WriteString("\r\n")
		writeBase64(&buf, m.Text)
		return buf.Bytes(), nil
	}

	mw := multipart.NewWriter(&buf)
	header("Content-Type", `multipart/alternative; boundary="`+mw.Boundary()+`"`)
	buf.WriteString("\r\n")
	for _, part := range []struct{ kind, content string }{{"text/plain", m.Text}, {"text/html", m.HTML}} {
		pw, err := mw.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {part.kind + "; charset=utf-8"},
			"Content-Transfer-Encoding": {"base64"},
		})
		if err != nil {
			return nil, err
		}
		var enc bytes.Buffer
		writeBase64(&enc, part.content)
		pw.Write(enc.Bytes())
	}
	if err := mw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// writeBase64 writes s base64-encoded in 76-character lines (RFC 2045).
func writeBase64(buf *bytes.Buffer, s string) {
	enc := base64.StdEncoding.EncodeToString([]byte(s))
	for len(enc) > 76 {
		buf.WriteString(enc[:76] + "\r\n")
		enc = enc[76:]
	}
	buf.WriteString(enc + "\r\n")
}

// Log prints messages instead of sending them. It's used when SMTP isn't
// configured so sign-in codes can still be read in local development.
type Log struct {
	Logger *slog.Logger
}

func (l Log) Send(_ context.Context, m Message) error {
	l.Logger.Warn("email NOT sent (SMTP not configured) — showing it here instead", "to", m.To, "subject", m.Subject, "text", m.Text)
	return nil
}
