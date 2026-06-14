import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const RESEND_API_KEY = 're_4r7NGSb1_BzHAtj8mW6L4DaB5TcJGQxjo';

app.post('/api/send-email', async (req, res) => {
  const { targetEmail, subject, html } = req.body;
  
  console.log(`Attempting to send email to ${targetEmail}...`);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [targetEmail],
        subject: subject,
        html: html
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend API Error:', data);
      return res.status(response.status).json({ success: false, error: data });
    }

    console.log('Email sent successfully!', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Email proxy server running on http://localhost:${PORT}`);
});
