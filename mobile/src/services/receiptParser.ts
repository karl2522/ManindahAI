import { OCRBlock } from './ocrService';

export interface ParsedReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  confidence: number;
  isConfirmed: boolean;
}

export const ReceiptParser = {
  /**
   * Main Pipeline Coordinator
   * Stage 1: Clean Text
   * Stage 2: Classify (Header/Footer/Noise)
   * Stage 3: Parse & Extract Data
   */
  parse(blocks: OCRBlock[]): ParsedReceiptItem[] {
    const items: ParsedReceiptItem[] = [];

    blocks.forEach((block, index) => {
      // Stage 1: Clean
      const cleanLine = this.cleanText(block.text);

      // Stage 2: Classify (Reject noise & headers)
      if (this.isHeaderOrFooter(cleanLine)) return;
      if (this.isGibberish(cleanLine)) return;

      // Stage 3: Parse Regex
      const item = this.parseItemLine(cleanLine, index, block.confidence);
      
      if (item) {
        items.push(item);
      }
    });

    return items;
  },

  /**
   * Stage 1: Clean common OCR misreads and normalize whitespace
   */
  cleanText(text: string): string {
    return text
      .trim()
      .replace(/\|/g, 'I') // Often OCR reads 'l' or 'I' as a pipe
      .replace(/\s{2,}/g, ' '); // Compress multiple spaces
  },

  /**
   * Stage 3: Apply strict regex patterns to extract Qty, Name, and Price
   */
  parseItemLine(text: string, index: number, confidence: number): ParsedReceiptItem | null {
    // Pattern 1: {Qty} {Name} @ {Price}  (e.g., "10 Lucky Me @ 8.50")
    const pattern1 = /^(\d+)\s+([a-zA-Z\s]+)\s*@\s*(\d+\.?\d*)/;
    const match1 = text.match(pattern1);
    if (match1) {
      return {
        id: `item-${index}`,
        quantity: parseInt(match1[1], 10),
        name: match1[2].trim(),
        unitPrice: parseFloat(match1[3]),
        confidence,
        isConfirmed: false,
      };
    }

    // Pattern 2: {Qty} {Name} {Price} (e.g., "5 Coke Kasalo 25.00")
    const pattern2 = /^(\d+)\s+([a-zA-Z\s]+)\s+(\d+\.?\d*)$/;
    const match2 = text.match(pattern2);
    if (match2) {
      return {
        id: `item-${index}`,
        quantity: parseInt(match2[1], 10),
        name: match2[2].trim(),
        unitPrice: parseFloat(match2[3]),
        confidence,
        isConfirmed: false,
      };
    }

    // Pattern 3: Simple Name and Qty (e.g., "3 Sardines")
    const pattern3 = /^(\d+)\s+([a-zA-Z\s]+)$/;
    const match3 = text.match(pattern3);
    if (match3) {
      return {
        id: `item-${index}`,
        quantity: parseInt(match3[1], 10),
        name: match3[2].trim(),
        confidence: confidence * 0.8, 
        isConfirmed: false,
      };
    }

    // Fallback: If it survived the Gibberish filter, but didn't match a strict pattern, 
    // it is likely a messy item name. Return as an unconfirmed raw item.
    if (text.length > 2) {
      return {
        id: `raw-item-${index}`,
        quantity: 1, 
        name: text, 
        confidence: confidence * 0.5,
        isConfirmed: false,
      };
    }

    return null;
  },

  /**
   * Identifies if a line is likely a header, total, or footer rather than an item.
   * Now uses word boundary checks to prevent accidental filtering of products (e.g., "Cashew").
   */
  isHeaderOrFooter(text: string): boolean {
    const noiseWords = [
      'TOTAL', 'SUBTOTAL', 'TAX', 'THANK YOU', 'DATE', 'CASHIER', 'RECEIPT', 'STORE', 'CASH',
      'QUANTITY', 'QTY', 'PRICE', 'UNIT', 'AMOUNT', 'ITEMS', 'DESCRIPTION', 'SRN', 'UNIT COST',
      'ITEM', 'PCS', 'BAL', 'DISC', 'UNITS', 'COST', 'VAT', 'NET', 'GROSS', 'CHANGE', 'TENDERED'
    ];
    
    const upperText = text.toUpperCase();
    
    // Check if any noise word exists as a standalone word in the line
    return noiseWords.some(word => {
      const regex = new RegExp(`\\b${word}\\b`);
      return regex.test(upperText);
    });
  },

  /**
   * Regex rules to identify and filter out OCR gibberish and artifacts
   */
  isGibberish(text: string): boolean {
    if (text.length < 3) return true;

    // Remove spaces for character analysis
    const noSpaceText = text.replace(/\s+/g, '');
    if (noSpaceText.length === 0) return true;

    const lettersCount = (noSpaceText.match(/[a-zA-Z]/g) || []).length;
    const specialCount = noSpaceText.replace(/[a-zA-Z0-9]/g, '').length;

    // Rule 1: Must contain at least one actual word (2+ consecutive letters)
    if (!/[a-zA-Z]{2,}/.test(text)) return true;

    // Rule 2: If there are more special symbols than letters, it's definitely noise
    if (specialCount >= lettersCount) return true;

    // Rule 3: Repeating special characters (e.g., '==', '--', '¢¢') are almost always OCR tracking errors
    if (/([^a-zA-Z0-9\s])\1+/.test(text)) return true;

    return false;
  }
};
