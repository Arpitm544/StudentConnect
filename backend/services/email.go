package services

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
)

type EmailData struct {
	UserName        string
	AssignmentTitle string
	Description     string
	PostedBy        string
	AcceptedBy      string
	Message         string
	VerificationOTP string
}

func SendEmail(to []string, subject, body string, isHTML bool) error {
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	if from == "" {
		return fmt.Errorf("SMTP_EMAIL is missing")
	}
	if password == "" {
		return fmt.Errorf("SMTP_PASSWORD is missing")
	}
	if host == "" {
		return fmt.Errorf("SMTP_HOST is missing")
	}
	if port == "" {
		return fmt.Errorf("SMTP_PORT is missing")
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
	fmt.Printf("📧 Sending email to %s via %s...\n", to[0], addr)
	err := smtp.SendMail(addr, auth, from, to, []byte(message))
	if err != nil {
		fmt.Printf("❌ SMTP Error: %v\n", err)
		return err
	}
	fmt.Println("✅ Email sent successfully")

	return nil
}

const welcomeTemplate = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
		<h2 style="color: #4A90E2;">Welcome to TaskNest, {{.UserName}}!</h2>
		<p>We're thrilled to have you join our community.</p>
		<p>TaskNest is a platform where you can post projects, collaborate with peers, and manage your tasks efficiently.</p>
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
		<p style="font-size: 12px; color: #777;">TaskNest Notification</p>
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
		<p style="font-size: 12px; color: #777;">TaskNest Notification</p>
	</div>
</body>
</html>
`

const invitationTemplate = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
		<h2 style="color: #4A90E2;">You've Been Invited!</h2>
		<p><strong>Assignment:</strong> {{.AssignmentTitle}}</p>
		<p><strong>Posted By:</strong> {{.PostedBy}}</p>
		<p>{{.Message}}</p>
		<p>Check your "Task Requests" on TaskNest to accept or reject this invitation.</p>
		<hr style="border: 0; border-top: 1px solid #eee;" />
		<p style="font-size: 12px; color: #777;">TaskNest Notification</p>
	</div>
</body>
</html>
`

const verifyEmailTemplate = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
		<h2 style="color: #4A90E2;">Your TaskNest verification code</h2>
		<p>Hi {{.UserName}},</p>
		<p>Thanks for signing up. Please verify your email to activate login for your account.</p>
		<p style="margin: 24px 0; font-size: 28px; letter-spacing: 6px; font-weight: 700; color: #111827;">{{.VerificationOTP}}</p>
		<p style="font-size:12px;color:#666;">This OTP expires in 10 minutes.</p>
	</div>
</body>
</html>
`

const deadlineExtensionTemplate = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
		<h2 style="color: #E67E22;">Deadline Approaching!</h2>
		<p>Hi {{.UserName}},</p>
		<p>The deadline for your project <strong>"{{.AssignmentTitle}}"</strong> is approaching soon.</p>
		<p>Currently, this project is either not yet accepted or has not been submitted by the assignee.</p>
		<p>Would you like to extend the deadline to give more time for completion? You can do this from the project details page.</p>
		<p><strong>Note:</strong> If the deadline passes without any submission or extension, the project will be automatically removed from the system.</p>
		<hr style="border: 0; border-top: 1px solid #eee;" />
		<p style="font-size: 12px; color: #777;">TaskNest Notification</p>
	</div>
</body>
</html>
`


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

		_ = SendEmail([]string{toEmail}, "Welcome to TaskNest!", body.String(), true)
	}()
}

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

func SendInvitationEmail(toEmail, title, postedBy, msg string) {
	go func() {
		tmpl, err := template.New("invitation").Parse(invitationTemplate)
		if err != nil {
			return
		}

		var body bytes.Buffer
		data := EmailData{
			AssignmentTitle: title,
			PostedBy:        postedBy,
			Message:         msg,
		}
		if err := tmpl.Execute(&body, data); err != nil {
			return
		}

		_ = SendEmail([]string{toEmail}, "You've Been Invited: "+title, body.String(), true)
	}()
}

func SendVerificationEmail(toEmail, userName, verificationOTP string) error {
	tmpl, err := template.New("verify_email").Parse(verifyEmailTemplate)
	if err != nil {
		return err
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, EmailData{
		UserName:        userName,
		VerificationOTP: verificationOTP,
	}); err != nil {
		return err
	}

	return SendEmail([]string{toEmail}, "Verify your TaskNest account", body.String(), true)
}

func SendDeadlineExtensionEmail(toEmail, userName, title string) {
	go func() {
		tmpl, err := template.New("deadline_extension").Parse(deadlineExtensionTemplate)
		if err != nil {
			return
		}

		var body bytes.Buffer
		data := EmailData{
			UserName:        userName,
			AssignmentTitle: title,
		}
		if err := tmpl.Execute(&body, data); err != nil {
			return
		}

		_ = SendEmail([]string{toEmail}, "Action Required: Deadline Approaching for "+title, body.String(), true)
	}()
}
