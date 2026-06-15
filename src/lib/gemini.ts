export enum Type {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  BOOLEAN = 'BOOLEAN',
  INTEGER = 'INTEGER'
}

export async function generateContentWithFallback(params: any): Promise<any> {
  const response = await fetch("/api/v1/gemini-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Proxy failed with status ${response.status}`);
  }
  
  return await response.json();
}
