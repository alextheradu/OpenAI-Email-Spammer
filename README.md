# Email Spammer

An email spamming tool that uses Nodemailer and integrates with OpenAI's GPT-4.1 Nano for AI-generated content. You can change the OpenAI Model in the .env file.

## Setup

1. Install dependencies:
```
npm install
```

2. Configure your environment variables by creating a `.env` file:
```
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_HOST=
EMAIL_PORT=587
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-nano
WEB_PORT=3000
```

## Usage

### CLI-Only
Run the application with:
```
npm start
```
or
```
node script.js
```

Follow the interactive prompts to:
1. Specify your recipients
2. Choose between manual content entry or AI-generated content
3. If using AI generation, decide whether to send the same message to all recipients or create unique messages for each

### WebUI
Run the application with:
```
npm run web
```
or
```
node web-script.js
```
Open the designated port in your browser and then follow the interactive prompts to:
1. Choose between manual content entry or AI-generated content
2. If using AI generation, decide whether to send the same message to all recipients or create unique messages for each recipient.

## Features

- **Manual Mode**: Enter your own subject and HTML message content
- **AI Generation**: Use OpenAI's GPT-4.1 Nano to generate email content
  - **Same Message Option**: Generate one subject/message for all recipients
  - **Unique Message Option**: Generate different content for each recipient

## Security Notice

This tool is meant for legitimate bulk emailing purposes. Use responsibly and in compliance with anti-spam laws and email service provider terms of service.
