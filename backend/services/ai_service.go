package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

type GroqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GroqRequest struct {
	Model    string        `json:"model"`
	Messages []GroqMessage `json:"messages"`
}

type GroqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func CallGroq(prompt string) (string, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		log.Printf("[AI] CRITICAL ERROR: GROQ_API_KEY is not set in environment")
		return "", fmt.Errorf("GROQ_API_KEY not set")
	}
	log.Printf("[AI] Calling Groq API with key (first 8 chars): %s...", apiKey[:8])

	url := "https://api.groq.com/openai/v1/chat/completions"
	reqBody := GroqRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []GroqMessage{
			{Role: "system", Content: "You are a helpful assistant for StudentConnect, a task management platform. Provide concise, structured JSON responses when asked."},
			{Role: "user", Content: prompt},
		},
	}

	jsonData, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[AI] Request failed: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		log.Printf("[AI] API Error (Status %d): %s", resp.StatusCode, string(body))
		return "", fmt.Errorf("Groq API error: %s", string(body))
	}

	var groqResp GroqResponse
	if err := json.Unmarshal(body, &groqResp); err != nil {
		log.Printf("[AI] JSON Parse Error: %v", err)
		return "", err
	}

	if len(groqResp.Choices) == 0 {
		return "", fmt.Errorf("no response from Groq")
	}

	return groqResp.Choices[0].Message.Content, nil
}

func PredictTaskPriority(title, description string) (string, error) {
	prompt := fmt.Sprintf("Analyze this task and determine its priority (Low, Medium, High, or Critical). Return ONLY the priority word itself. No punctuation, no explanation. Task: %s - %s", title, description)
	resp, err := CallGroq(prompt)
	if err != nil {
		return "", err
	}
	log.Printf("[AI] Priority Prediction for '%s': %s", title, resp)
	return strings.TrimSpace(resp), nil
}

func SuggestMilestones(title, description, subject string) ([]string, error) {
	prompt := fmt.Sprintf("Analyze this task for the subject '%s': Title: '%s', Description: '%s'. Suggest 3-5 logical, professional milestones required to complete it. Return ONLY a raw JSON array of strings. Focus strictly on academic and project execution steps.", subject, title, description)
	resp, err := CallGroq(prompt)
	if err != nil {
		return nil, err
	}
	log.Printf("[AI] Milestone Suggestion for '%s': %s", title, resp)

	var milestones []string
	cleanedResp := cleanJSONResponse(resp)

	if err := json.Unmarshal([]byte(cleanedResp), &milestones); err != nil {
		return nil, fmt.Errorf("failed to parse milestones: %v", err)
	}
	return milestones, nil
}

func cleanJSONResponse(resp string) string {
	start := strings.Index(resp, "[")
	end := strings.LastIndex(resp, "]")
	
	if start != -1 && end != -1 && end > start {
		return strings.TrimSpace(resp[start : end+1])
	}

	if start := strings.Index(resp, "```"); start != -1 {
		contentStart := strings.Index(resp[start+3:], "\n")
		if contentStart == -1 {
			contentStart = start + 3
		} else {
			contentStart = start + 3 + contentStart + 1
		}
		
		if end := strings.LastIndex(resp, "```"); end != -1 && end > contentStart {
			return strings.TrimSpace(resp[contentStart:end])
		}
	}
	return strings.TrimSpace(resp)
}

func RecommendAssignees(taskSubject string, candidates []map[string]interface{}) (string, error) {
	candidatesJSON, _ := json.Marshal(candidates)
	prompt := fmt.Sprintf("Given a task about '%s' and these candidates: %s, who is the best fit? Consider their 'field' and current 'active_tasks'. Return a concise explanation of why the top candidate is chosen.", taskSubject, string(candidatesJSON))
	return CallGroq(prompt)
}
