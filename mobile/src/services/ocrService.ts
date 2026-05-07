import { Platform } from 'react-native';

/**
 * OCR Service - Universal Local Extraction Engine
 * 
 * Performs high-fidelity text recognition directly on the device.
 * - Android/iOS: Uses Google ML Kit (Native)
 * - Web: Uses Browser Shape Detection API (Local)
 */

export interface OCRBlock {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OCRResult {
  fullText: string;
  blocks: OCRBlock[];
}

export const OCRService = {
  /**
   * Universal entry point for real-time text extraction.
   */
  async recognizeText(imageUri: string): Promise<OCRResult> {
    console.log(`[OCR] Direct extraction initiated on ${Platform.OS}`);

    try {
      if (Platform.OS === 'web') {
        return await this.recognizeWeb(imageUri);
      } else {
        return await this.recognizeNative(imageUri);
      }
    } catch (error: any) {
      console.error('[OCR] Extraction Failed:', error.message);
      throw error;
    }
  },

  /**
   * Web Implementation: On-device extraction via Tesseract.js.
   * This is a pure JavaScript OCR engine that runs locally in the browser
   * without requiring any experimental flags.
   */
  async recognizeWeb(imageUri: string): Promise<OCRResult> {
    try {
      console.log('[OCR-Web] Initializing Tesseract.js local engine...');
      
      // Dynamic import to prevent loading the heavy Tesseract library on Native builds
      const Tesseract = await import('tesseract.js');
      
      // Perform the real extraction locally
      const { data } = await Tesseract.recognize(
        imageUri,
        'eng', // English/Standard alphanumeric
        {
          logger: m => console.log(`[OCR-Web] ${m.status}: ${Math.round(m.progress * 100)}%`)
        }
      );

      // Fallback: If Tesseract v7 doesn't provide structured lines, we manually parse the text block
      let blocks: OCRBlock[] = [];
      if (data && (data as any).lines) {
        blocks = (data as any).lines.map((line: any) => ({
          text: line.text.trim(),
          confidence: line.confidence ? line.confidence / 100 : 0.9, 
          boundingBox: line.bbox ? {
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0,
          } : undefined
        }));
      } else if (data && data.text) {
        // Pure text fallback
        const rawLines = data.text.split('\n').filter(l => l.trim().length > 0);
        blocks = rawLines.map(text => ({
          text: text.trim(),
          confidence: 0.9,
        }));
      }

      console.log('[OCR-Web] Extraction complete. Found', blocks.length, 'lines.');

      return {
        fullText: data.text || '',
        blocks
      };
    } catch (error: any) {
      console.error('[OCR-Web] Tesseract Extraction Error:', error.message);
      throw error;
    }
  },

  /**
   * Native Implementation: Bridge for @react-native-ml-kit/text-recognition.
   * Strictly calls the local ML Kit engine.
   */
  async recognizeNative(imageUri: string): Promise<OCRResult> {
    try {
      const MLKit = require('@react-native-ml-kit/text-recognition')?.default;
      
      if (!MLKit) {
        throw new Error('ML Kit Native Module not linked. Run "npx expo install @react-native-ml-kit/text-recognition".');
      }

      return await MLKit.recognize(imageUri);
    } catch (e: any) {
      console.error('[OCR-Native] Extraction Error:', e.message);
      throw e;
    }
  }
};
