
export const fetchCityInsights = async (city: string): Promise<string | null> => {
  // Integrated provided API key
  const apiKey = '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';
  
  if (!apiKey) {
    console.warn("Groq API key is missing");
    return null;
  }

  const prompt = `
    Analyze the tourism and business potential for the city of "${city}".
    
    Please provide a structured response in plain text (no markdown formatting symbols like ** or ##) covering the following:
    
    1. Location Context: State/Province and where it is located geographically.
    2. City Attractions: Top 3-5 key tourist spots within the city.
    3. Nearby Destinations: Major tourist places within a 100km radius suitable for self-drive trips.
    4. Major Industries/Companies: Key industries or major companies present in the region (relevant for corporate rentals).
    
    Keep the tone professional and focused on travel/transport business potential.
  `;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 600,
      })
    });

    if (!response.ok) {
        throw new Error(`Groq API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;

  } catch (error) {
    console.error("Groq analysis failed", error);
    return null;
  }
};
