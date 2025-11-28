import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { transcriptionText } = await request.json();

    if (!transcriptionText || typeof transcriptionText !== 'string') {
      return NextResponse.json(
        { error: 'Transcription text is required' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the prompt for GPT analysis
    const prompt = `
You are an expert sales call analyst. Analyze the following call transcription and provide a structured analysis covering:

1. ACCROCHE MISTAKES: Identify any issues with the opening/hook of the call
2. DISCOVERY QUALITY: Evaluate how well the salesperson uncovered the prospect's needs
3. OBJECTION HANDLING: Assess how objections were handled
4. CLOSING QUALITY: Evaluate the effectiveness of the closing attempt
5. FINAL SUMMARY: Overall assessment and recommendations

Transcription:
${transcriptionText}

Please provide your analysis in a clear, structured format with specific examples from the call where relevant.
`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4', // or gpt-3.5-turbo for cost savings
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales call coach providing detailed, actionable feedback on sales calls.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate analysis' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content;

    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: analysis.trim()
    });

  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    );
  }
}