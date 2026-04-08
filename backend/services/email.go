package services

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
)

// EmailData represents the info for templates
type EmailData struct {
	UserName        string
	AssignmentTitle string
	Description     string
	PostedBy        string
	AcceptedBy      string
	Message         string
}

// SendEmail sends a plain text or HTML email using Gmail SMTP
func SendEmail(to []string, subject, body string, isHTML bool) error {
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	if from == "" || password == "" || host == "" || port == "" {
		return fmt.Errorf("SMTP credentials not fully configured in environment variables")
	}

	auth := smtp.PlainAuth("", from, password, host)
	
	header := make(map[string]string)
	header["From"] = from
	header["To"] = to[0] // Primary recipient
	header["Subject"] = subject
	
	if isHTML {
		header["MIME-Version"] = "1.0"
		header["Content-Type"] = "text/html; charset=\"utf-8\""
	} else {
		header["Content-Type"] = "text/plain; charset=\"utf-8\""
	}

	message := ""
	for k, v := range header {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	addr := fmt.Sprintf("%s:%s", host, port)
	err := smtp.SendMail(addr, auth, from, to, []byte(message))
	if err != nil {
		return err
	}

	return nil
}

// Templates
const welcomeTemplate = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
		<h2 style="color: #4A90E2;">Welcome to StudentConnect, {{.UserName}}!</h2>
		<p>We're thrilled to have you join our community.</p>
		<p>StudentConnect is a platform where you can post assignments, collaborate with peers, and manage your academic tasks efficiently.</p>
		<p>Get started by exploring the dashboard and posting your first task!</p>
		<hr style="border: 0; border-top: 1px solid #eee;" />
		<p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
	</div>
</body>
</html>
`

const newAssignmentTemplate = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
		<h2 style="color: #4A90E2;">New Assignment Posted: {{.AssignmentTitle}}</h2>
		<p><strong>Posted By:</strong> {{.PostedBy}}</p>
		<p><strong>Description:</strong> {{.Description}}</p>
		<p>Check the marketplace to accept this assignment!</p>
		<hr style="border: 0; border-top: 1px solid #eee;" />
		<p style="font-size: 12px; color: #777;">StudentConnect Notification</p>
	</div>
</body>
</html>
`

const assignmentAcceptedTemplate = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
		<h2 style="color: #27AE60;">Assignment Accepted!</h2>
		<p><strong>Assignment:</strong> {{.AssignmentTitle}}</p>
		<p><strong>Status:</strong> Accepted</p>
		<p>The assignment has been successfully linked. {{.Message}}</p>
		<hr style="border: 0; border-top: 1px solid #eee;" />
		<p style="font-size: 12px; color: #777;">StudentConnect Notification</p>
	</div>
</body>
</html>
`

// SendWelcomeEmail notifies a new user
func SendWelcomeEmail(toEmail, userName string) {
	go func() {
		tmpl, err := template.New("welcome").Parse(welcomeTemplate)
		if err != nil {
			return
		}

		var body bytes.Buffer
		if err := tmpl.Execute(&body, EmailData{UserName: userName}); err != nil {
			return
		}

		_ = SendEmail([]string{toEmail}, "Welcome to StudentConnect!", body.String(), true)
	}()
}

// SendNewAssignmentEmail notifies all relevant users
func SendNewAssignmentEmail(toEmails []string, title, description, postedBy string) {
	if len(toEmails) == 0 {
		return
	}
	go func() {
		tmpl, err := template.New("new_assignment").Parse(newAssignmentTemplate)
		if err != nil {
			return
		}

		var body bytes.Buffer
		data := EmailData{
			AssignmentTitle: title,
			Description:     description,
			PostedBy:        postedBy,
		}
		if err := tmpl.Execute(&body, data); err != nil {
			return
		}

		_ = SendEmail(toEmails, "New Assignment Available: "+title, body.String(), true)
	}()
}

// SendAssignmentAcceptedEmail notifies both parties
func SendAssignmentAcceptedEmail(toEmail, title, msg string) {
	go func() {
		tmpl, err := template.New("accepted").Parse(assignmentAcceptedTemplate)
		if err != nil {
			return
		}

		var body bytes.Buffer
		data := EmailData{
			AssignmentTitle: title,
			Message:         msg,
		}
		if err := tmpl.Execute(&body, data); err != nil {
			return
		}

		_ = SendEmail([]string{toEmail}, "Assignment Accepted: "+title, body.String(), true)
	}()
}
