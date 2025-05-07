require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const fs = require('fs');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
      model: process.env.OPENAI_MODEL,
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
        await sendEmails([recipient], subject, message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      console.log(`Generating a single email template for ${recipient} to be sent ${emailCount} times`);
      const subject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}. This is for ${recipient}`);
      const message = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. This is for ${recipient}. Subject: ${subject}`);
      for (let i = 0; i < emailCount; i++) {
        console.log(`Sending identical email ${i+1}/${emailCount} to ${recipient}`);
        await sendEmails([recipient], subject, message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.log('All multiple emails have been processed.');
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Email Campaign</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
        <style>
          body { padding: 20px; }
          .container { max-width: 600px; margin: auto; }
          .mb-3 { margin-bottom: 1rem; }
          #progressArea { margin-top: 20px; }
          /* Make the AI prompt field more prominent */
          #aiFields { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="mb-3">Email Campaign</h2>
          <form id="emailForm" method="post" action="/send">
            <div class="mb-3">
              <label>Recipients (comma separated):</label>
              <input type="text" name="recipients" class="form-control" required />
            </div>
            <div class="mb-3">
              <label>Number of emails per recipient:</label>
              <input type="number" name="emailCount" min="1" value="1" class="form-control" required />
            </div>
            <div class="mb-3">
              <label>Content Type:</label>
              <select name="contentType" id="contentType" class="form-select">
                <option value="manual">Manual</option>
                <option value="ai">AI Generated</option>
              </select>
            </div>
            
            <!-- Manual fields - only shown when Manual is selected -->
            <div id="manualFields" class="mb-3">
              <label>Subject:</label>
              <input type="text" name="manualSubject" class="form-control" placeholder="Enter email subject" />
              <label class="mt-2">Message (HTML):</label>
              <textarea name="manualMessage" class="form-control" rows="5" placeholder="Enter email body"></textarea>
            </div>
            
            <!-- AI fields - only shown when AI Generated is selected -->
            <div id="aiFields" class="mb-3">
              <div class="card">
                <div class="card-header bg-primary text-white">
                  <h5 class="mb-0">AI Content Generation</h5>
                </div>
                <div class="card-body">
                  <label class="form-label"><strong>Enter your prompt for AI:</strong></label>
                  <textarea name="contentPrompt" class="form-control border border-primary" rows="5" 
                    placeholder="Describe what content you want the AI to generate (tone, purpose, etc.)"
                  ></textarea>
                  <div class="form-text mb-3">The AI will generate both subject and content based on your prompt.</div>
                  <div class="mb-3">
                    <label class="form-label"><strong>Unique emails?</strong></label>
                    <select name="uniquePerEmail" class="form-select">
                      <option value="true">Yes - Generate unique content for each email</option>
                      <option value="false">No - Send same content to all recipients</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mb-3">
              <button type="submit" name="action" value="preview" class="btn btn-primary me-2">Preview</button>
              <button type="submit" name="action" value="sendNow" class="btn btn-success">Send Emails</button>
            </div>
          </form>
          <div id="progressArea"></div>
        </div>
        <script>
          // Toggle fields based on content type
          const contentTypeSelect = document.getElementById('contentType');
          const manualFields = document.getElementById('manualFields');
          const aiFields = document.getElementById('aiFields');
          
          function toggleFields() {
            // Set initial display styles directly in the elements
            if (contentTypeSelect.value === 'manual') {
              manualFields.style.display = 'block';
              aiFields.style.display = 'none';
            } else {
              manualFields.style.display = 'none';
              aiFields.style.display = 'block';
            }
          }
          
          // Run the toggle immediately when the script runs
          toggleFields();
          
          // Also run when the selection changes
          contentTypeSelect.addEventListener('change', toggleFields);
          
          // And also run after DOM content is loaded (belt and suspenders approach)
          document.addEventListener('DOMContentLoaded', toggleFields);
          window.addEventListener('load', toggleFields);

          // Intercept form submission
          const form = document.getElementById('emailForm');
          form.addEventListener('submit', async function(e) {
            const action = this.elements['action'].value;
            if (action === 'preview') return;
            e.preventDefault();
            const progressArea = document.getElementById('progressArea');
            progressArea.innerHTML = '<h4>Sending Emails...</h4>';
            const formData = new FormData(this);
            
            // Copy the correct fields based on content type
            if (contentTypeSelect.value === 'manual') {
              formData.set('subject', formData.get('manualSubject'));
              formData.set('message', formData.get('manualMessage'));
            }
            
            const params = new URLSearchParams(formData);
            const response = await fetch('/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString()
            });
            
            // Process streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
              const {value, done} = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, {stream: true});
              const messages = buffer.split('\n\n');
              buffer = messages.pop();
              messages.forEach(msg => {
                if (msg.startsWith('data: ')) {
                  const dataStr = msg.substring(6).trim();
                  try {
                    const data = JSON.parse(dataStr);
                    progressArea.innerHTML += '<div class="alert alert-info p-2 my-1">' 
                      + data.message + ' (' + data.sent + '/' + data.total + ', ' + data.progress + '%)</div>';
                  } catch(e){}
                }
              });
            }
          });
        </script>
      </body>
    </html>
  `);
});

app.post('/send', async (req, res) => {
  try {
    const recipients = req.body.recipients.split(',').map(email => email.trim()).filter(email => email);
    const emailCount = parseInt(req.body.emailCount);
    const contentType = req.body.contentType;
    const action = req.body.action;
    let subject, message, previewContent;
    
    if (contentType === 'manual') {
      // Use the manual fields
      subject = req.body.manualSubject || req.body.subject; // Support both old and new field names
      message = req.body.manualMessage || req.body.message; // Support both old and new field names
      previewContent = { subject, message };
    } else if (contentType === 'ai') {
      // Generate content using AI
      const contentPrompt = req.body.contentPrompt;
      if (action === 'preview') {
        // For preview, just generate one example
        subject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}`);
        message = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. Subject: ${subject}`);
        previewContent = { subject, message };
      } else {
        // For actual sending, we'll generate in the sending section
        previewContent = { 
          subject: "Will be AI generated during sending",
          message: "Content will be generated during the sending process based on your prompt: " + req.body.contentPrompt
        };
      }
    }
    
    if (action === 'preview') {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Email Preview</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
              body { padding: 20px; }
              .container { max-width: 600px; margin: auto; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Email Preview</h2>
              <div class="mb-3">
                <strong>Subject:</strong>
                <p>${previewContent.subject}</p>
              </div>
              <div class="mb-3">
                <strong>Message:</strong>
                <div style="border:1px solid #ccc; padding:10px;">${previewContent.message}</div>
              </div>
              <form method="post" action="/send">
                <input type="hidden" name="recipients" value="${req.body.recipients}">
                <input type="hidden" name="emailCount" value="${emailCount}">
                <input type="hidden" name="contentType" value="${contentType}">
                <input type="hidden" name="subject" value="${previewContent.subject}">
                <input type="hidden" name="message" value="${previewContent.message}">
                <input type="hidden" name="contentPrompt" value="${req.body.contentPrompt || ''}">
                <input type="hidden" name="uniquePerEmail" value="${req.body.uniquePerEmail || 'false'}">
                <button type="submit" name="action" value="sendNow" class="btn btn-success">Confirm and Send</button>
                <a href="/" class="btn btn-secondary">Cancel</a>
              </form>
            </div>
          </body>
        </html>
      `);
      return;
    } else if (action === 'sendNow') {
      const totalEmails = emailCount * recipients.length;
      let sentCount = 0;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });

      const sseSend = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      sseSend({ message: 'Email sending started', progress: 0, sent: sentCount, total: totalEmails });

      if (contentType === 'manual') {
        for (let i = 0; i < emailCount; i++) {
          sseSend({ message: `Sending batch ${i+1} of ${emailCount}`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
          await sendEmails(recipients, previewContent.subject, previewContent.message);
          sentCount += recipients.length;
          sseSend({ message: `Batch ${i+1} complete`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
        }
      } else {
        // AI generated mode
        const contentPrompt = req.body.contentPrompt;
        const uniquePerEmail = req.body.uniquePerEmail === 'true';
        
        if (emailCount > 1) {
          if (uniquePerEmail) {
            for (const recipient of recipients) {
              for (let i = 0; i < emailCount; i++) {
                sseSend({ message: `Generating unique email ${i+1}/${emailCount} for ${recipient}...`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
                const aiSubject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}. This is email ${i+1} for ${recipient}`);
                const aiMessage = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. This is email ${i+1} for ${recipient}. Subject: ${aiSubject}`);
                sseSend({ message: `Sending unique email ${i+1} to ${recipient}...`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
                await sendEmails([recipient], aiSubject, aiMessage);
                sentCount++;
                sseSend({ message: `Email ${i+1} sent to ${recipient}`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
              }
            }
          } else {
            for (let i = 0; i < emailCount; i++) {
              sseSend({ message: `Generating email batch ${i+1}/${emailCount}...`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
              const aiSubject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}. This is email batch ${i+1}`);
              const aiMessage = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. This is email batch ${i+1}. Subject: ${aiSubject}`);
              sseSend({ message: `Sending batch ${i+1} to all recipients...`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
              await sendEmails(recipients, aiSubject, aiMessage);
              sentCount += recipients.length;
              sseSend({ message: `Batch ${i+1} sent to all recipients`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
            }
          }
        } else {
          // Single email
          sseSend({ message: `Generating AI email content...`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
          const aiSubject = await generateEmailContent(`Generate an email subject for: ${contentPrompt}`);
          const aiMessage = await generateEmailContent(`Generate an HTML email body for: ${contentPrompt}. Subject: ${aiSubject}`);
          sseSend({ message: `Sending AI generated email to ${recipients.length} recipient(s)...`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
          await sendEmails(recipients, aiSubject, aiMessage);
          sentCount += recipients.length;
          sseSend({ message: `Email sent successfully`, progress: Math.round((sentCount / totalEmails) * 100), sent: sentCount, total: totalEmails });
        }
      }
      
      sseSend({ message: 'Email campaign completed!', progress: 100, sent: sentCount, total: totalEmails });
      res.write("event: complete\ndata: Complete\n\n");
      res.end();
      return;
    }
  } catch (error) {
    console.error('Error in /send:', error);
    res.status(500).send('An error occurred while sending emails.');
  }
});

const PORT = process.env.WEB_PORT;
app.listen(PORT, () => {
  console.log(`Email spamming web server running on port ${PORT}`);
});
