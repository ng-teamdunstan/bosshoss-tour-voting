// src/lib/spotify-utils.ts

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Bei 429 (Rate Limit) warten und wiederholen
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        console.log(`Rate limited. Waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // Bei anderen Fehlern sofort werfen
      if (!response.ok && response.status !== 429) {
        throw new Error(`Spotify API Error: ${response.status} ${response.statusText}`);
      }
      
      return response;
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff bei anderen Fehlern
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function fetchSpotifyJSON(
  url: string,
  accessToken: string,
  maxRetries: number = 3
): Promise<any> {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    },
    maxRetries
  );
  
  if (!response.ok) {
    throw new Error(`Spotify API Error: ${response.status}`);
  }
  
  const text = await response.text();
  
  // Prüfen ob Response wirklich JSON ist
  if (!text || text.trim() === '') {
    throw new Error('Empty response from Spotify API');
  }
  
  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.error('JSON Parse Error. Response was:', text);
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
  }
}

// Helper: Batch processing mit Delays zwischen den Batches
export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  delayMs: number = 1000
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)}`);
    
    try {
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Pause zwischen Batches (außer beim letzten)
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error) {
      console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
      // Batch überspringen, aber weitermachen
      continue;
    }
  }
  
  return results;
}