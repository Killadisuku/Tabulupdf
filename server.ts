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

// Endpoint: Natural Language AI PDF Edit & In-Place Modification
app.post('/api/ai-edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { instruction, activePageNumber, totalPages, documentContext, currentDate } = req.body;

    if (!instruction || !instruction.trim()) {
      res.status(400).json({
        success: false,
        error: 'Please provide an instruction for the AI edit.',
      });
      return;
    }

    const todayDateStr = currentDate || new Date().toISOString().split('T')[0];

    const systemInstruction = `You are TabulaPDF's precision PDF Document In-Place Semantic Modification AI.
Your purpose is to understand what the user wants to change in natural language, inspect the actual PDF content, detect semantic fields (e.g. Date, PO No, TC No, Purchaser/Company, Quantity, Price, Address, Phone, Item descriptions), identify the current value automatically from the PDF, and generate surgical in-place modifications.

TODAY'S REFERENCE DATE: ${todayDateStr}

CORE OPERATIONAL PRINCIPLES:
1. SEMANTIC & INTENT-DRIVEN UNDERSTANDING (DO NOT BE RIGID OR LITERAL):
   - The user describes WHAT THEY WANT, NOT necessarily the exact text that currently exists.
   - If the user says "Change the date to 30/08/2026" (or "Update date to tomorrow", "Change certificate date to 30-08-2026"):
     * Inspect the PDF document context to find existing date fields (e.g. "Date: 20-08-2026", "Issue Date: 18-08-2026", "TC Date", dates in tables).
     * Automatically extract the current value (e.g. "20-08-2026").
     * Set targetText to the exact old value found in the document ("20-08-2026") and replacementText to the new date ("30/08/2026" or format-matched "30-08-2026").
     * Provide a clear explanation: "I found the Date field on page 1.\\nCurrent value: 20-08-2026\\nNew value: 30/08/2026".
   - The user NEVER needs to know or type the old date if it exists in the PDF!

2. CONTEXT-AWARE RELATIONSHIPS & LABELS:
   - Identify key-value pairs across the document:
     * Label "Date:" / "Date of Issue:" / "Certificate Date:" -> Date value
     * Label "PO NO:" / "PO Number:" / "PO #" -> PO Number (e.g. "AOT-SG-2008-01" -> "AOT-SG-3008-01")
     * Label "TC No:" / "TC NO:" / "Test Certificate No:" -> TC Number (e.g. "SHPL/260820-006" -> "SHPL/300820-006")
     * Label "Purchaser:" / "Customer:" / "Buyer:" / "Company:" -> Purchaser name (e.g. "ALLIANCE OVERSEAS TRADING LLC" -> "XYZ Trading LLC")
     * Label "QTY:" / "Quantity:" -> Quantity value (e.g. "05 NOS" -> "10 NOS" or "10")
     * Label "Price:" / "Unit Price:" / "Total:" -> Price value
     * Label "Phone:" / "Tel:" / "Mobile:" -> Phone number
     * Label "Email:" -> Email address
     * Label "Address:" -> Address text

3. SMART SUGGESTIONS (NEVER FAIL UNHELPFULLY):
   - If the user explicitly asks to replace something (e.g. "Replace 24/08/2026 with 30/08/2026") and the exact text "24/08/2026" does NOT exist, DO NOT just say "Not Found".
   - Check if there is a semantically matching field (e.g. Date field containing "20-08-2026").
   - Set isSuggestion=true, set suggestionMessage="I couldn't find 24/08/2026, but I found a Date field containing 20-08-2026. Would you like to change it to 30/08/2026?", and populate the edit targeting "20-08-2026" -> "30/08/2026".

4. MULTIPLE MATCHES & AMBIGUITY HANDLING:
   - If there are multiple dates or fields in the document (e.g. Date: 20-08-2026, Issue Date: 18-08-2026, Expiry Date: 20-09-2026) and the user says "Change the date to 30/08/2026" without specifying which one:
     * If one is the primary/main document Date, prioritize it, but also populate ambiguityChoices with all candidate fields: [{ label: "Date", oldValue: "20-08-2026", targetText: "20-08-2026", pageNumber: 1, replacementText: "30/08/2026" }, { label: "Issue Date", oldValue: "18-08-2026", ... }].
     * Set isAmbiguous=true so the user can tap their preferred field or replace all.

5. RELATIVE & TEMPORAL COMMANDS:
   - "today" -> ${todayDateStr} (formatted appropriately to match document style)
   - "tomorrow" -> calculate next calendar day from ${todayDateStr}
   - "increase quantity by X" -> add X to existing numerical quantity
   - "reduce price by X%" -> calculate new price from existing price

6. TABLE-AWARE EDITING:
   - When modifying a table cell (e.g. "Change quantity of Needle Valve to 10" or "Change price of Hose to 150"):
     * Locate the table containing "Needle Valve" row and "Quantity" / "Qty" column.
     * Return action 'update_table_cell' with tableId, rowIndex, colIndex, oldValue (e.g. "5"), and newValue ("10").
   - When adding a row (e.g. "Add a row below Needle Valve for Ball Valve, qty 4, price 90"):
     * Return action 'add_table_row' with tableId, afterRowIndex, and newRowValues.
   - When deleting a row (e.g. "Delete the Valve row"):
     * Return action 'delete_table_row' with tableId and rowIndex.

7. MULTI-COMMAND SUPPORT:
   - If the instruction contains multiple changes (e.g. "Change date to 30/08/2026, change Needle Valve quantity to 10, and remove phone number"):
     * Return all 3 separate edits in the edits array with clear descriptions.

8. NO HALLUCINATIONS:
   - Only target content that actually exists in the provided document context. If a requested concept truly does not exist in any form, set found=false with a clear explanation.`;

    const promptContext = `USER INSTRUCTION: "${instruction}"
ACTIVE PAGE NUMBER: ${activePageNumber || 1}
TOTAL PAGES: ${totalPages || 1}
TODAY'S REFERENCE DATE: ${todayDateStr}

DOCUMENT STRUCTURE & CONTENT:
${JSON.stringify(documentContext, null, 2)}

Analyze the instruction semantically against the document data above and produce the exact in-place edit plan.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            found: {
              type: Type.BOOLEAN,
              description: 'Whether target content or relevant field was found in the document',
            },
            notFoundMessage: {
              type: Type.STRING,
              description: 'Helpful message if no relevant field or content was found',
            },
            isSuggestion: {
              type: Type.BOOLEAN,
              description: 'True if an alternative field was inferred (e.g. user typed 24/08/2026 but doc has 20-08-2026)',
            },
            suggestionMessage: {
              type: Type.STRING,
              description: 'Friendly suggestion explanation explaining what was inferred from the document',
            },
            explanation: {
              type: Type.STRING,
              description: 'Clear description of what the AI identified (e.g. "I found the Date field on page 1. Current value: 20-08-2026 -> New value: 30/08/2026")',
            },
            isAmbiguous: {
              type: Type.BOOLEAN,
              description: 'True if multiple candidate fields exist and user did not specify which one',
            },
            ambiguityMessage: {
              type: Type.STRING,
              description: 'Explanation asking user to pick which field to modify',
            },
            ambiguityChoices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: 'Field label (e.g. "Date", "Issue Date", "Expiry Date")' },
                  oldValue: { type: Type.STRING, description: 'Current value found in this field' },
                  targetText: { type: Type.STRING, description: 'Text to replace' },
                  pageNumber: { type: Type.INTEGER, description: 'Page number' },
                  replacementText: { type: Type.STRING, description: 'Proposed new value' },
                },
                required: ['label', 'oldValue', 'targetText', 'pageNumber', 'replacementText'],
              },
              description: 'List of choices for user selection when multiple fields match',
            },
            occurrencesCount: {
              type: Type.INTEGER,
              description: 'Number of occurrences found',
            },
            changesSummary: {
              type: Type.STRING,
              description: 'Concise summary of changes (e.g. "Date: 20-08-2026 -> 30/08/2026")',
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
                    description: 'Identified field name (e.g. Date, PO No, TC No, Purchaser, Qty)',
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
                    description: 'Identifying text from this row (e.g. item name)',
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
                },
                required: ['type', 'description', 'pageNumber'],
              },
              description: 'List of discrete in-place edits to perform',
            },
          },
          required: ['found', 'changesSummary', 'edits'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    res.json({
      success: true,
      found: parsed.found ?? true,
      notFoundMessage: parsed.notFoundMessage,
      isSuggestion: parsed.isSuggestion ?? false,
      suggestionMessage: parsed.suggestionMessage,
      explanation: parsed.explanation,
      isAmbiguous: parsed.isAmbiguous ?? false,
      ambiguityMessage: parsed.ambiguityMessage,
      ambiguityChoices: parsed.ambiguityChoices || [],
      occurrencesCount: parsed.occurrencesCount || parsed.edits?.length || 0,
      changesSummary: parsed.changesSummary || 'AI Edit generated',
      edits: parsed.edits || [],
    });
  } catch (error: any) {
    console.error('AI Edit analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process AI edit instruction.',
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
