import { ParsedReceiptItem } from './receiptParser';

// The API key should be stored in your .env file
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

export const GeminiService = {
  /**
   * Sends a base64 encoded image to Gemini Flash to extract inventory data.
   * Returns structured JSON matching ParsedReceiptItem.
   */
  async recognizeReceiptFromBase64(base64Image: string): Promise<ParsedReceiptItem[]> {
    if (!GEMINI_API_KEY) {
      throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Please add it to your .env file.');
    }

    try {

      // 2. Construct the Gemini payload
      // We instruct it explicitly to return JSON to skip regex parsing entirely.
      const payload = {
        contents: [
          {
            parts: [
              {
                text: `You are an expert inventory data extractor. Extract only saleable inventory items from this image. 
                       
                       CRITICAL RULES:
                       1. IGNORE Table Headers/Column Names: Do not extract text like "Quantity", "Qty", "Description", "Items", "Price", "Amount", "Unit Cost", "Subtotal", or "Total" as products. These are metadata, not inventory items.
                       2. IGNORE Handwritten Labels: If you see words like "Item name" or "Total amount" written by hand as labels for columns, ignore them.
                       3. Only extract actual product items (e.g., "Coke 1.5L", "Ariel 70g", "Eggs").
                       4. If the image is a single product package, extract the product name and brand.
                       
                       Format the output exactly as a JSON array of objects.
                       Each object must have exactly these keys:
                       "name" (string, the product name),
                       "quantity" (number, default to 1 if not specified),
                       "unitPrice" (number, the price if found, otherwise 0).
                       
                       If no items are found, return an empty array [].
                       Return raw JSON only.`
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Low temperature for factual extraction
          responseMimeType: "application/json", // Force JSON output
        }
      };

      // 3. Make the API request
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      
      // 4. Parse the AI response
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) {
        return [];
      }

      // The AI should return a JSON array thanks to responseMimeType="application/json"
      const extractedItems: any[] = JSON.parse(aiText.trim());

      // 5. Map to our app's internal format
      return extractedItems.map((item, index) => ({
        id: `gemini-item-${Date.now()}-${index}`,
        name: item.name || 'Unknown Item',
        quantity: typeof item.quantity === 'number' ? item.quantity : 1,
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
        confidence: 0.95, // Gemini is highly confident
        isConfirmed: false,
      }));

    } catch (error) {
      console.error('[GeminiService] Error recognizing image:', error);
      throw error;
    }
  }
};
