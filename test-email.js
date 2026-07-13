import 'dotenv/config';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';

async function test() {
  console.log('Testing GitHub Models AI...');
  let aiRecommendation = 'Fallback recommendation.';
  try {
    const client = new OpenAI({ baseURL: 'https://models.github.ai/inference', apiKey: process.env.GITHUB_TOKEN });
    const response = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert test evaluator. Provide a brief (2-3 sentences), constructive recommendation for a student based on their test score and violations (if any). Use encouraging tone.' },
        { role: 'user', content: 'Student scored 4/5. Total Violations: 0. Give a brief recommendation.' }
      ],
      model: 'gpt-4o'
    });
    aiRecommendation = response.choices[0].message.content;
    console.log('AI Recommendation generated:\\n', aiRecommendation);
  } catch (e) {
    console.error('AI Error:', e.message);
  }

  console.log('\\nTesting Email...');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS instead of implicit TLS
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: 'Nexora Assessments <' + process.env.EMAIL_USERNAME + '>',
    to: process.env.EMAIL_USERNAME, // Send to yourself for testing
    subject: 'Test AI Results Email',
    html: `
      <h3>Test Email</h3>
      <p><strong>Recommendation:</strong> ${aiRecommendation}</p>
      <p>View Result: <a href="http://localhost:5173/#/result/123">Click Here</a></p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully! Message ID:', info.messageId);
  } catch (e) {
    console.error('Email Error:', e.message);
  }
}

test();
