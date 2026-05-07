import { OCRBlock } from './ocrService';

// The API key should be stored in your .env file
const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;
const API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

export const GoogleVisionService = {
  /**
   * Sends a base64 encoded image to Google Cloud Vision API (DOCUMENT_TEXT_DETECTION).
   * It extracts the high-fidelity text and converts it into OCRBlock format
   * so our local ReceiptParser can process it.
   */
  async recognizeTextFromBase64(base64Image: string): Promise<OCRBlock[]> {
    if (!GOOGLE_VISION_API_KEY) {
      throw new Error('Missing EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY. Please add it to your .env file.');
    }

    try {
      const payload = {
        requests: [
          {
            image: {
              content: base64Image.replace(/^data:image\/\w+;base64,/, '')
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Vision API Error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      
      // textAnnotations[0] contains the full merged text with newlines
      const annotations = result.responses?.[0]?.textAnnotations;
      
      if (!annotations || annotations.length === 0) {
        return [];
      }

      const fullText = annotations[0].description || '';
      
      // Split the full text into lines to mimic block-level OCR output
      const lines = fullText.split('\n').filter((line: string) => line.trim().length > 0);

      // Convert to OCRBlock format
      const blocks: OCRBlock[] = lines.map((line: string) => ({
        text: line.trim(),
        confidence: 0.9, // Vision API is generally highly confident
      }));

      return blocks;

    } catch (error) {
      console.error('[GoogleVisionService] Error recognizing text:', error);
      throw error;
    }
  }
};
