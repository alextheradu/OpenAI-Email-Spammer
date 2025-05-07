# Email Spammer

An email spamming tool that uses Zoho Mail SMTP servers and integrates with OpenAI's GPT-4.1 Nano for AI-generated content.

## Setup

1. Install dependencies:
```
npm install
```

2. Configure your environment variables by creating a `.env` file:
```
EMAIL_USER=your_zoho_email@zohomail.com
EMAIL_PASSWORD=your_zoho_app_password
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
OPENAI_API_KEY=your_openai_api_key
```

Note: For Zoho Mail, you'll need to generate an app-specific password rather than using your actual account password.

## Creating a Recipients List

Create a text file with one email address per line, for example:
```
recipient1@example.com
recipient2@example.com
recipient3@example.com
```

## Usage

Run the application with:
```
node index.js
```

Follow the interactive prompts to:
1. Specify your recipients file
2. Choose between manual content entry or AI-generated content
3. If using AI generation, decide whether to send the same message to all recipients or create unique messages for each

## Features

- **Manual Mode**: Enter your own subject and HTML message content
- **AI Generation**: Use OpenAI's GPT-4.1 Nano to generate email content
  - **Same Message Option**: Generate one subject/message for all recipients
  - **Unique Message Option**: Generate different content for each recipient

## Security Notice

This tool is meant for legitimate bulk emailing purposes. Use responsibly and in compliance with anti-spam laws and email service provider terms of service.