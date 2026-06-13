import 'dotenv/config';
import OpenAI from 'openai';

async function testPrompt() {
  const client = new OpenAI({ baseURL: 'https://models.github.ai/inference', apiKey: process.env.GITHUB_TOKEN });
  
  let userPrompt = 'Student scored 1/2. Total Violations: 0. The student got the following questions wrong: "If you lose your job/ have to wind up your business, till how long can you afford your daily expenses without borrowing money?". Please specify which areas they need to improve in and give an actionable recommendation.';
  
  const aiResponse = await client.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an expert test evaluator. Provide a brief (2-3 sentences), constructive recommendation for a student based on their test score and violations (if any). If they got questions wrong, mention the general topics or areas they should focus on studying based on those questions. Use an encouraging tone.' },
      { role: 'user', content: userPrompt }
    ],
    model: 'gpt-4o'
  });
  
  console.log('--- NEW AI OUTPUT ---');
  console.log(aiResponse.choices[0].message.content);
}

testPrompt();
