import { Product } from './product';
import { Sale } from './sales';

export type InsightType =
  | 'low_stock'
  | 'trending_up'
  | 'trending_down'
  | 'stock_opportunity'
  | 'general_tip';

export type InsightPriority = 'urgent' | 'opportunity' | 'info';
export type InsightAction = 'restock' | 'review_pricing' | null;

export interface AIInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  body: string;
  action: InsightAction;
}

export interface InsightContext {
  storeName: string;
  products: Product[];
  lowStockProducts: Product[];
  thisWeekSales: Sale[];
  lastWeekSales: Sale[];
  language?: 'english' | 'tagalog' | 'cebuano';
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export const AIInsightService = {
  async generate(ctx: InsightContext): Promise<AIInsight[]> {
    console.log('[AIInsightService] Starting insight generation...');
    
    if (!GEMINI_API_KEY) {
      console.error('[AIInsightService] GEMINI_API_KEY is undefined!');
      throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Please add it to your .env file.');
    }

    const thisWeekTotal = ctx.thisWeekSales.reduce((s, sale) => s + sale.total_amount, 0);
    const lastWeekTotal = ctx.lastWeekSales.reduce((s, sale) => s + sale.total_amount, 0);
    const weeklyChangePct =
      lastWeekTotal > 0
        ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
        : null;

    const catValue: Record<string, number> = {};
    for (const p of ctx.products) {
      const cat = p.category || 'Uncategorized';
      catValue[cat] = (catValue[cat] || 0) + p.selling_price * p.quantity;
    }
    const topCat =
      Object.entries(catValue).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const prompt = `You are a helpful business advisor for a Filipino sari-sari store (small neighborhood convenience store).

Store Name: ${ctx.storeName}
Today: ${new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

SALES DATA:
- This week: ₱${thisWeekTotal.toLocaleString()}${weeklyChangePct !== null ? ` (${weeklyChangePct >= 0 ? '+' : ''}${weeklyChangePct}% vs last week)` : ' (no comparison data yet)'}
- Last week: ₱${lastWeekTotal.toLocaleString()}
- Total transactions this week: ${ctx.thisWeekSales.length}

INVENTORY SUMMARY:
- Total products in catalog: ${ctx.products.length}
- Products well-stocked (>5 units): ${ctx.products.filter((p) => p.quantity > 5).length}
- Top category by stock value: ${topCat ?? 'None set'}

LOW STOCK ITEMS (5 units or fewer — need restocking soon):
${
  ctx.lowStockProducts.length > 0
    ? ctx.lowStockProducts
        .slice(0, 6)
        .map((p) => `  - ${p.name}: ${p.quantity} unit${p.quantity !== 1 ? 's' : ''} remaining`)
        .join('\n')
    : '  - None (all items are well-stocked!)'
}

Generate 3 to 5 practical business insights for the store owner.

RULES:
- Write ALL responses in ${ctx.language ? ctx.language.toUpperCase() : 'ENGLISH'}.
- Be specific — use actual product names and numbers from the data above
- If there are low stock items, at least one insight MUST address them with priority "urgent"
- Write in a friendly, encouraging tone suitable for a non-tech-savvy Filipino small business owner
- If sales improved vs last week, be encouraging; if they dropped, be constructive
- Do NOT invent product names or numbers not present in the data above
- Each insight must suggest a concrete next step
Return ONLY a raw JSON array with no markdown code fences:
[
  {
    "type": "low_stock|trending_up|trending_down|stock_opportunity|general_tip",
    "priority": "urgent|opportunity|info",
    "title": "Short title, max 7 words",
    "body": "1 to 2 sentences. Be specific and practical.",
    "action": "restock|review_pricing|null"
  }
]`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    };

    // Use v1beta and flash-latest for better compatibility
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log(`[AIInsightService] Calling Gemini API...`);
    
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (networkError: any) {
      console.error('[AIInsightService] Network Error:', networkError);
      throw new Error(`Network Error: ${networkError.message}`);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[AIInsightService] API Error Response:', JSON.stringify(err, null, 2));
      throw new Error(`Gemini Error: ${err.error?.message || response.statusText}`);
    }

    const result = await response.json();
    let aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      console.warn('[AIInsightService] No text in candidates:', result);
      return [];
    }

    // Robust parsing: strip markdown code fences if present
    aiText = aiText.trim();
    if (aiText.startsWith('```')) {
      aiText = aiText.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    }

    try {
      const parsed: any[] = JSON.parse(aiText);
      return parsed.map((item, i) => ({
        id: `insight-${Date.now()}-${i}`,
        type: (item.type as InsightType) ?? 'general_tip',
        priority: (item.priority as InsightPriority) ?? 'info',
        title: item.title ?? 'Business Insight',
        body: item.body ?? '',
        action:
          !item.action || item.action === 'null' ? null : (item.action as InsightAction),
      }));
    } catch (parseError) {
      console.error('[AIInsightService] Failed to parse AI response:', aiText);
      console.error('[AIInsightService] Parse error details:', parseError);
      throw new Error('Received invalid data format from AI. Please try refreshing.');
    }
  },
};
