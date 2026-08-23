import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, pageText, customPrompt, preset } = req.body || {};

    if (!imageBase64 && !pageText) {
      return res.status(400).json({
        success: false,
        error: 'Either imageBase64 or pageText must be provided for table extraction.',
      });
    }

    let presetInstructions = '';
    switch (preset) {
      case 'bank_statement':
        presetInstructions =
          'Focus on bank transaction ledgers. Extract Post Date, Transaction Description, Check/Ref #, Type (Debit/Credit), Amount, and Balance. Standardize negative amounts and debits.';
        break;
      case 'invoice':
        presetInstructions =
          'Focus on line items, descriptions, quantities, unit prices, tax rates, line totals, and subtotal/tax/balance rows.';
        break;
      case 'sales_report':
        presetInstructions =
          'Extract sales performance metrics, region, products, units, revenues, costs, margins, and status.';
        break;
      case 'inventory':
        presetInstructions =
          'Extract SKU codes, item descriptions, warehouse locations, stock counts, reorder points, unit costs, and valuations.';
        break;
      default:
        presetInstructions =
          'Extract all distinct tables, data matrices, tabular lists, key-value summaries, and schedules accurately.';
    }

    const contents: any[] = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64,
        },
      });
    }

    const promptText = `
You are an expert OCR and table extraction AI engine for TabulaPDF.
Your job is to analyze the document image and/or text and extract EVERY table with 100% precision.

Domain Guidelines:
${presetInstructions}
${customPrompt ? `User Specific Instructions: ${customPrompt}` : ''}

Output strict JSON schema containing an array of tables.
Each table must have:
- title: string description of the table
- headers: string[] array of column names
- rows: string[][] 2D array of cell values
- summary: brief 1-line note

Text context from PDF layer:
${pageText ? pageText.substring(0, 4000) : 'None'}
`;

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction:
          'You are a specialized document table extraction engine. You extract structured data from PDF pages, invoices, and bank statements into pristine JSON tables.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  headers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  rows: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  summary: { type: Type.STRING },
                },
                required: ['title', 'headers', 'rows'],
              },
            },
          },
          required: ['tables'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{"tables": []}');

    return res.status(200).json({
      success: true,
      tables: parsedJson.tables || [],
    });
  } catch (error: any) {
    console.error('AI Table Extraction Serverless Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process document table with AI.',
    });
  }
}
