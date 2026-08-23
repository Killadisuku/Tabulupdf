import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini client setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Intelligent AI Vision & Document Table Extraction
app.post('/api/ai-extract', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, pageText, customPrompt, preset } = req.body;

    if (!imageBase64 && !pageText) {
      res.status(400).json({
        success: false,
        error: 'Either imageBase64 or pageText must be provided for table extraction.',
      });
      return;
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
          'Extract all tabular data present with accurate column headers and pristine row separation. Handle merged cells gracefully.';
    }

    const systemInstruction = `You are a world-class Document & PDF Table Extraction AI.
Your job is to analyze the document image or raw text and convert all tabular data into a structured 2D table (column headers and rows).
Rules:
1. Return ONLY valid JSON conforming to the schema.
2. Ensure column headers are concise and clean.
3. Every row in 'rows' must have the exact same number of columns as 'headers'.
4. Do not drop rows or omit numeric decimal points.
5. If numbers have currencies or commas, keep the readable numerical representation.
6. ${presetInstructions}
7. Additional instructions: ${customPrompt || 'None'}`;

    const parts: any[] = [];

    if (imageBase64) {
      // Remove header if data URL
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }

    const userTextPrompt = `Please extract the table from this PDF document page.
${pageText ? `Raw extracted text content:\n${pageText}\n\n` : ''}
Extract all columns, headers, and rows with 100% precision.`;

    parts.push({
      text: userTextPrompt,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tableName: {
              type: Type.STRING,
              description: 'Inferred name or title of the table',
            },
            headers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of column header names',
            },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Cell values in this row matching the header order',
              },
              description: 'Array of data rows',
            },
            summary: {
              type: Type.STRING,
              description: 'Brief summary of extracted table content (e.g. 15 transactions found)',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score from 0.0 to 1.0',
            },
          },
          required: ['headers', 'rows'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    res.json({
      success: true,
      tableName: parsed.tableName || 'Extracted Table',
      headers: parsed.headers || [],
      rows: parsed.rows || [],
      summary: parsed.summary || `${parsed.rows?.length || 0} rows extracted successfully`,
      confidence: parsed.confidence ?? 0.95,
    });
  } catch (error: any) {
    console.error('AI Table extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract table using AI vision model.',
    });
  }
});

// Health check endpoint for Cloud Run
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Serve static frontend assets in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`TabulaPDF server running on http://${HOST}:${PORT}`);
});
