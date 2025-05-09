# Email Spammer

An email spamming tool that uses Nodemailer and integrates with OpenAI's GPT-4.1 Nano for AI-generated content. You can change the OpenAI Model in the .env file.

## Setup

1. Install dependencies:
```
npm install
```

2. Configure your environment variables by creating a `.env` file:
```
# Custom SMTP configuration
EMAIL_USER=your_email@domain.com
EMAIL_PASSWORD=your_password
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Gmail configuration (App Password recommended for accounts with 2FA)
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASSWORD=your_app_password_or_account_password
GMAIL_HOST=smtp.gmail.com
GMAIL_PORT=587
GMAIL_SECURE=false

# Default SMTP provider (gmail, custom)
DEFAULT_SMTP=

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-nano
```

### Gmail Setup

If you're using Gmail:

1. For accounts with 2-Factor Authentication (2FA):
   - Generate an App Password at https://myaccount.google.com/apppasswords
   - Use this App Password in your `.env` file as `GMAIL_PASSWORD`

2. For accounts without 2FA:
   - Make sure "Less secure app access" is turned on in your Google account security settings
   - Use your regular Gmail password in your `.env` file as `GMAIL_PASSWORD`

## Usage

Run the application with:
```
npm start
```
or
```
node script.js
```

Follow the interactive prompts to:
1. Select your SMTP provider (Gmail or Custom)
2. Specify your recipients
3. Choose between manual content entry or AI-generated content
4. If using AI generation, decide whether to send the same message to all recipients or create unique messages for each

## Features

- **Multiple SMTP Providers**: Support for Gmail or custom SMTP servers
- **Manual Mode**: Enter your own subject and HTML message content
- **AI Generation**: Use OpenAI's GPT-4.1 Nano to generate email content
  - **Same Message Option**: Generate one subject/message for all recipients
  - **Unique Message Option**: Generate different content for each recipient

## Security Notice

This tool is meant for legitimate bulk emailing purposes. Use responsibly and in compliance with anti-spam laws and email service provider terms of service.

When using Gmail, it's recommended to use App Passwords rather than your account password, especially if you have 2-Factor Authentication enabled on your account.
