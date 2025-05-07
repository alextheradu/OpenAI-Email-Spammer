require('dotenv').config();
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const inquirer = require('inquirer');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: { rejectUnauthorized: false }
});

async function generateEmailContent(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: 'You are an email content assistant. Generate professional sounding email content.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating content with OpenAI:', error);
    return null;
  }
}

async function sendEmails(recipients, subject, message) {
  const results = [];
  for (const recipient of recipients) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipient,
        subject,
        html: message,
      });
      console.log(`Email sent to ${recipient}: ${info.messageId}`);
      results.push({ email: recipient, status: 'success', messageId: info.messageId });
    } catch (error) {
      console.error(`Failed to send email to ${recipient}:`, error);
      results.push({ email: recipient, status: 'failed', error: error.message });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return results;
}

async function sendMultipleEmails(recipients, emailCount, uniquePerEmail, contentPrompt) {
  console.log(`Starting to send ${emailCount} emails to each of ${recipients.length} recipients...`);
  for (const recipient of recipients) {
    console.log(`Processing recipient: ${recipient}`);
    if (uniquePerEmail) {
      for (let i = 0; i < emailCount; i++) {
        console.log(`Generating unique email ${i+1}/${emailCount} for ${recipient}`);
        const subject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}. This is email ${i+1} for ${recipient}`);
        const message = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. This is email ${i+1} for ${recipient}. Subject: ${subject}`);
        console.log(`Sending email ${i+1}/${emailCount} to ${recipient}`);
        console.log(`Subject: ${subject}`);
        await sendEmails([recipient], subject, message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      console.log(`Generating a single email template for ${recipient} to be sent ${emailCount} times`);
      const subject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}. This is for ${recipient}`);
      const message = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. This is for ${recipient}. Subject: ${subject}`);
      console.log(`Subject: ${subject}`);
      for (let i = 0; i < emailCount; i++) {
        console.log(`Sending identical email ${i+1}/${emailCount} to ${recipient}`);
        await sendEmails([recipient], subject, message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.log('All multiple emails have been processed.');
}

async function main() {
  try {
    const recipientMethodAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'recipientMethod',
        message: 'How do you want to specify recipients?',
        choices: ['Enter recipients directly', 'Use a file with recipients']
      }
    ]);
    let recipients = [];
    if (recipientMethodAnswer.recipientMethod === 'Enter recipients directly') {
      const recipientsAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'recipients',
          message: 'Enter recipient email addresses (separated by commas):',
          validate: input => {
            const emails = input.split(',').map(email => email.trim());
            if (!emails[0]) return 'At least one recipient is required';
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const invalid = emails.filter(email => !emailRegex.test(email));
            return invalid.length ? `Invalid email format: ${invalid.join(', ')}` : true;
          }
        }
      ]);
      recipients = recipientsAnswer.recipients.split(',').map(email => email.trim());
      console.log(`Using ${recipients.length} recipient(s): ${recipients.join(', ')}`);
    } else {
      const fileAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'recipientsFile',
          message: 'Enter the path to your recipients list (one per line):',
          default: 'recipients.txt'
        }
      ]);
      try {
        recipients = fs.readFileSync(fileAnswer.recipientsFile, 'utf8')
          .split('\n')
          .map(email => email.trim())
          .filter(email => email);
      } catch (error) {
        console.error(`Error reading recipients file: ${error.message}`);
        console.log('Please create a file with one email per line and try again.');
        return;
      }
      if (!recipients.length) {
        console.error('No recipients found in the file.');
        return;
      }
      console.log(`Found ${recipients.length} recipients in file.`);
    }
    const countAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'emailCount',
        message: 'How many emails do you want to send to each recipient?',
        default: '1',
        validate: input => (parseInt(input.trim()) > 0 ? true : 'Enter a number greater than 0'),
        filter: input => parseInt(input.trim())
      }
    ]);
    const emailCount = countAnswer.emailCount;
    const contentAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'contentType',
        message: 'How do you want to generate the email content?',
        choices: ['Manual', 'AI Generated']
      }
    ]);
    let subject, message;
    if (contentAnswer.contentType === 'Manual') {
      const contentAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'subject',
          message: 'Enter the subject of your email:',
          validate: input => input.trim() ? true : 'Subject cannot be empty'
        },
        {
          type: 'input',
          name: 'message',
          message: 'Enter the HTML content of your email:',
          validate: input => input.trim() ? true : 'Message cannot be empty'
        }
      ]);
      subject = contentAnswers.subject;
      message = contentAnswers.message;
      if (emailCount > 1) {
        for (let i = 0; i < emailCount; i++) {
          console.log(`Sending batch ${i+1}/${emailCount}`);
          await sendEmails(recipients, subject, message);
          if (i < emailCount - 1) await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        await sendEmails(recipients, subject, message);
      }
    } else {
      let uniquePerRecipient, uniquePerEmail;
      const aiOptions = await inquirer.prompt([
        {
          type: 'list',
          name: 'uniqueMessages',
          message: 'Do you want unique messages for different recipients?',
          choices: ['Same base message for all recipients', 'Unique message for each recipient']
        }
      ]);
      uniquePerRecipient = aiOptions.uniqueMessages === 'Unique message for each recipient';
      if (emailCount > 1) {
        const multipleOptions = await inquirer.prompt([
          {
            type: 'list',
            name: 'uniquePerEmail',
            message: `Do you want each of the ${emailCount} emails to be unique?`,
            choices: ['Same email sent multiple times', 'Generate unique content for each email']
          }
        ]);
        uniquePerEmail = multipleOptions.uniquePerEmail === 'Generate unique content for each email';
      }
      const promptAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'contentPrompt',
          message: 'Describe the email content (purpose, tone, etc.):',
          validate: input => input.trim() ? true : 'Prompt cannot be empty'
        }
      ]);
      const contentPrompt = promptAnswer.contentPrompt;
      if (emailCount > 1) {
        if (uniquePerRecipient) {
          await sendMultipleEmails(recipients, emailCount, uniquePerEmail, contentPrompt);
        } else {
          if (uniquePerEmail) {
            for (let i = 0; i < emailCount; i++) {
              console.log(`Generating email batch ${i+1}/${emailCount}...`);
              subject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}. This is email batch ${i+1}`);
              message = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. This is email batch ${i+1}. Subject: ${subject}`);
              console.log(`Sending batch ${i+1}/${emailCount} to all recipients`);
              console.log(`Subject: ${subject}`);
              await sendEmails(recipients, subject, message);
              if (i < emailCount - 1) await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } else {
            console.log('Generating one email template for all recipients...');
            subject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}`);
            message = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. Subject: ${subject}`);
            console.log('Content generated successfully!');
            console.log(`Subject: ${subject}`);
            for (let i = 0; i < emailCount; i++) {
              console.log(`Sending identical batch ${i+1}/${emailCount} to all recipients`);
              await sendEmails(recipients, subject, message);
              if (i < emailCount - 1) await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      } else {
        if (uniquePerRecipient) {
          console.log('Generating unique AI content for each recipient...');
          for (const recipient of recipients) {
            subject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}. This is for ${recipient}`);
            message = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. This is for ${recipient}. Subject: ${subject}`);
            console.log(`Sending unique message to ${recipient}`);
            console.log(`Subject: ${subject}`);
            await sendEmails([recipient], subject, message);
          }
        } else {
          console.log('Generating AI content for all recipients...');
          subject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}`);
          message = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. Subject: ${subject}`);
          console.log('Content generated successfully!');
          console.log(`Subject: ${subject}`);
          await sendEmails(recipients, subject, message);
        }
      }
    }
    console.log('Email campaign completed!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main().catch(console.error);