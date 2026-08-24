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

// Endpoint: Natural Language Conversational AI PDF Assistant & In-Place Editor
app.post('/api/ai-edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      instruction,
      activePageNumber,
      totalPages,
      documentContext,
      currentDate,
      imageBase64,
      chatHistory,
    } = req.body;

    if (!instruction || !instruction.trim()) {
      res.status(400).json({
        success: false,
        error: 'Please provide an instruction or question for Tabula AI.',
      });
      return;
    }

    const todayDateStr = currentDate || new Date().toISOString().split('T')[0];

    const systemInstruction = `You are Tabula AI, a conversational, intelligent PDF Assistant and In-Place Editor designed like Gemini or ChatGPT, but deeply integrated with the uploaded PDF document.

TODAY'S REFERENCE DATE: ${todayDateStr}

CORE BEHAVIOR & PERSONALITY:
1. NATURAL CONVERSATION & ZERO JARGON:
   - Always speak warmly, clearly, and concisely directly to the user.
   - NEVER output technical error messages like "Field Not Recognized", "Target not found", "Extraction failed", "Parser error", or "String mismatch".
   - If the user made a typo or specified an old value that does not match (e.g., asked to change "24/08/2026" but document has "09/07/2026"), be smart and helpful:
     "I couldn't find 24/08/2026, but I found the document's Date field: 09/07/2026. Would you like me to change it to 30/08/2026?"
   - If the user asks a question about the document (e.g. "What is the quotation number?", "What is the price?", "Summarize this proposal", "Who is the purchaser?"), answer the question directly and concisely in natural text. Set responseType to 'answer'.

2. INTENT UNDERSTANDING & NO NEED FOR OLD VALUE:
   - If user says: "Change the date to 30/08/2026", inspect the document, find the Date field (e.g. 09/07/2026), and reply:
     "I found the Date field on page 1. It currently says 09/07/2026. I'll change it to 30/08/2026."
   - If user says: "Change the price to 208", inspect the document, find the price field/table cell (e.g. "210 including vat" in "Purchase Price / Drum"), and reply:
     "I found '210 including vat' in the Purchase Price / Drum cell. I can update it to '208 including vat'."
   - If user says: "Remove the phone number", identify the phone number and propose deleting it.
   - If user says: "Change the purchaser to XYZ Trading LLC", identify the purchaser/customer field (e.g. "AL SHURAWI ENTERPRISES L.L.C") and propose replacing it.

3. MULTIPLE ACTIONS:
   - If the user gives multiple instructions at once (e.g. "Change the date to 30/08/2026, change the price to 208, and change the purchaser to XYZ Trading LLC"):
     Identify all 3 distinct modifications, summarize them cleanly in conversationText as a numbered list, and return all discrete edits in the 'edits' array.

4. SURGICAL TABLE MODIFICATION (NO FULL OVERLAYS):
   - When modifying a table cell, identify the tableId, rowIndex, and colIndex. Set edit.type to 'update_table_cell'.
   - DO NOT create duplicate tables or overwrite whole tables. Only update the targeted cell.

5. CONVERSATION CONTEXT & FOLLOW-UPS:
   - Remember the conversational history. If user asks "What is the price?", you answer "210 including vat", and user replies "Change it to 208", understand that "it" refers to the price discussed.
   - If user says "Yes", "Apply it", "Go ahead", or asks to undo, understand and acknowledge it.

6. AMBIGUITY HANDLING:
   - If multiple candidates exist (e.g. 3 different prices or multiple dates like "Date" vs "Valid Until") and user didn't specify which one:
     Set responseType to 'ambiguity', formulate a polite question ("I found 2 dates in the document. Which one would you like to change?"), and list the choices in ambiguityChoices.`;

    const parts: any[] = [];

    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }

    let historyPrompt = '';
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      historyPrompt = `\nRECENT CONVERSATION HISTORY:\n` +
        chatHistory
          .slice(-6)
          .map((m: any) => `${m.role === 'user' ? 'USER' : 'TABULA AI'}: ${m.text}`)
          .join('\n') +
        `\n`;
    }

    const promptContext = `${historyPrompt}
LATEST USER MESSAGE: "${instruction}"
ACTIVE PAGE NUMBER: ${activePageNumber || 1}
TOTAL PAGES: ${totalPages || 1}
TODAY'S REFERENCE DATE: ${todayDateStr}

DOCUMENT STRUCTURE & CONTENT (CATALOG OF TEXT, TABLES, FIELDS):
${JSON.stringify(documentContext, null, 2)}

Inspect the user's intent, the conversational context, and the document structure. Return a conversational response and any structured in-place edit instructions.`;

    parts.push({ text: promptContext });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            responseType: {
              type: Type.STRING,
              description: 'One of: edit_proposal, answer, confirmation, ambiguity, suggestion, not_found_help',
            },
            conversationText: {
              type: Type.STRING,
              description: 'The natural conversational AI response to display to the user in the chat bubble',
            },
            found: {
              type: Type.BOOLEAN,
              description: 'Whether target content or relevant field was identified in the document',
            },
            isSuggestion: {
              type: Type.BOOLEAN,
              description: 'True if an alternative field was inferred (e.g. user typed 24/08/2026 but doc has 09/07/2026)',
            },
            suggestionMessage: {
              type: Type.STRING,
              description: 'Friendly suggestion explanation explaining what was inferred from the document',
            },
            isAmbiguous: {
              type: Type.BOOLEAN,
              description: 'True if multiple candidate fields exist and user did not specify which one',
            },
            ambiguityChoices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: 'Field label (e.g. "Purchase Price / Drum", "Date", "Reference")' },
                  oldValue: { type: Type.STRING, description: 'Current value found in this field' },
                  targetText: { type: Type.STRING, description: 'Text to replace' },
                  pageNumber: { type: Type.INTEGER, description: 'Page number' },
                  replacementText: { type: Type.STRING, description: 'Proposed new value' },
                },
                required: ['label', 'oldValue', 'targetText', 'pageNumber', 'replacementText'],
              },
              description: 'List of choices for user selection when multiple fields match',
            },
            changesSummary: {
              type: Type.STRING,
              description: 'Short single-line summary of changes (e.g. "Date: 09/07/2026 → 30/08/2026")',
            },
            edits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'One of: replace_text, delete_text, update_table_cell, add_table_row, delete_table_row, add_table_col, delete_table_col, delete_element, replace_image',
                  },
                  description: {
                    type: Type.STRING,
                    description: 'Human-readable action description',
                  },
                  fieldLabel: {
                    type: Type.STRING,
                    description: 'Identified field name (e.g. Purchase Price / Drum, Date, PO No, TC No, Purchaser, Qty)',
                  },
                  pageNumber: {
                    type: Type.INTEGER,
                    description: 'Page number where this edit applies (1-indexed)',
                  },
                  targetText: {
                    type: Type.STRING,
                    description: 'Exact text or substring to be replaced or deleted',
                  },
                  replacementText: {
                    type: Type.STRING,
                    description: 'New replacement text string',
                  },
                  tableId: {
                    type: Type.STRING,
                    description: 'ID of the table if modifying a table',
                  },
                  rowIndex: {
                    type: Type.INTEGER,
                    description: '0-based row index in the table',
                  },
                  colIndex: {
                    type: Type.INTEGER,
                    description: '0-based column index in the table',
                  },
                  colHeader: {
                    type: Type.STRING,
                    description: 'Column header name if applicable',
                  },
                  rowMatchText: {
                    type: Type.STRING,
                    description: 'Identifying text from this row (e.g. USED OIL PER DRUM or item name)',
                  },
                  oldValue: {
                    type: Type.STRING,
                    description: 'Previous cell or field value',
                  },
                  newValue: {
                    type: Type.STRING,
                    description: 'New cell or field value',
                  },
                  newRowValues: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Array of cell strings for newly added row',
                  },
                  newColHeader: {
                    type: Type.STRING,
                    description: 'Header name for newly added column',
                  },
                  elementId: {
                    type: Type.STRING,
                    description: 'Element ID for non-text items like images or signatures',
                  },
                  elementType: {
                    type: Type.STRING,
                    description: 'Type of element: image, signature, shape, etc.',
                  },
                  highlightBox: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                      width: { type: Type.NUMBER },
                      height: { type: Type.NUMBER },
                    },
                    description: 'Bounding box on the page in PDF points',
                  },
                },
                required: ['type', 'description', 'pageNumber'],
              },
              description: 'List of discrete in-place edits to perform',
            },
          },
          required: ['responseType', 'conversationText', 'found', 'edits'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    res.json({
      success: true,
      responseType: parsed.responseType || (parsed.edits?.length > 0 ? 'edit_proposal' : 'answer'),
      conversationText: parsed.conversationText || parsed.explanation || 'I have analyzed your request.',
      found: parsed.found ?? true,
      notFoundMessage: parsed.notFoundMessage,
      isSuggestion: parsed.isSuggestion ?? false,
      suggestionMessage: parsed.suggestionMessage,
      explanation: parsed.conversationText || parsed.explanation,
      isAmbiguous: parsed.isAmbiguous ?? false,
      ambiguityMessage: parsed.ambiguityMessage || parsed.conversationText,
      ambiguityChoices: parsed.ambiguityChoices || [],
      occurrencesCount: parsed.occurrencesCount || parsed.edits?.length || 0,
      changesSummary: parsed.changesSummary || (parsed.edits?.length > 0 ? parsed.edits[0].description : 'AI Response'),
      edits: parsed.edits || [],
    });
  } catch (error: any) {
    console.error('AI Edit analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process AI conversation with PDF.',
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
